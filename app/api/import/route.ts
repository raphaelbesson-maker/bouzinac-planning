import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RawRow {
  reference_of?: string
  client_nom?: string
  gamme?: string
  gamme_id?: string
  sla_date?: string
  priorite?: string
  temps_estime_minutes?: string | number
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { rows }: { rows: RawRow[] } = await req.json()
  const errors: string[] = []
  const toUpsert: object[] = []
  const gammeByRow: (string | null)[] = [] // gamme_id or gamme name per row

  // Pre-load all gammes for name matching
  const { data: allGammes } = await supabase.from('gammes').select('id, nom')
  const gammeByName = new Map((allGammes ?? []).map((g) => [g.nom.toLowerCase().trim(), g.id]))

  for (const row of rows) {
    if (!row.reference_of || !row.sla_date) {
      errors.push(`Ligne ignorée : reference_of ou sla_date manquant (${JSON.stringify(row).slice(0, 60)})`)
      gammeByRow.push(null)
      continue
    }

    const priorite = ['Standard', 'Urgence', 'Constructeur'].includes(row.priorite ?? '')
      ? row.priorite
      : 'Standard'

    // Resolve gamme_id
    let resolvedGammeId: string | null = null
    if (row.gamme_id) {
      resolvedGammeId = row.gamme_id
    } else if (row.gamme) {
      resolvedGammeId = gammeByName.get(row.gamme.toLowerCase().trim()) ?? null
      if (!resolvedGammeId) {
        errors.push(`Gamme "${row.gamme}" introuvable pour ${row.reference_of} — OF créé sans opérations`)
      }
    }
    gammeByRow.push(resolvedGammeId)

    toUpsert.push({
      reference_of: String(row.reference_of).trim(),
      client_nom: String(row.client_nom ?? '').trim(),
      gamme_id: resolvedGammeId,
      sla_date: row.sla_date,
      priorite,
      statut: 'A_planifier',
    })
  }

  if (toUpsert.length === 0) {
    return NextResponse.json({ inserted: 0, updated: 0, errors })
  }

  const { data: upsertedOFs, error } = await supabase
    .from('ordres_fabrication')
    .upsert(toUpsert, { onConflict: 'reference_of', ignoreDuplicates: false })
    .select('id, reference_of, gamme_id')

  if (error) {
    return NextResponse.json({ inserted: 0, updated: 0, errors: [error.message] }, { status: 500 })
  }

  // Create of_operations for OFs that have a gamme and no operations yet (idempotent)
  let opsCreated = 0
  for (const of_ of upsertedOFs ?? []) {
    if (!of_.gamme_id) continue

    // Check if of_operations already exist (idempotency)
    const { count } = await supabase
      .from('of_operations')
      .select('id', { count: 'exact', head: true })
      .eq('of_id', of_.id)

    if ((count ?? 0) > 0) continue // already has operations

    const { data: gammeOps } = await supabase
      .from('gamme_operations')
      .select('*')
      .eq('gamme_id', of_.gamme_id)
      .order('ordre')

    if (!gammeOps || gammeOps.length === 0) continue

    const { error: opErr } = await supabase.from('of_operations').insert(
      gammeOps.map((go) => ({
        of_id: of_.id,
        gamme_operation_id: go.id,
        ordre: go.ordre,
        nom: go.nom,
        categorie_machine: go.categorie_machine,
        duree_minutes: go.duree_minutes,
        statut: 'A_planifier',
        locked: false,
      }))
    )

    if (opErr) {
      errors.push(`Opérations non créées pour ${of_.reference_of} : ${opErr.message}`)
    } else {
      opsCreated++
    }
  }

  return NextResponse.json({
    inserted: upsertedOFs?.length ?? 0,
    updated: toUpsert.length - (upsertedOFs?.length ?? 0),
    ops_created: opsCreated,
    of_ids: (upsertedOFs ?? []).map((of: { id: string }) => of.id),
    errors,
  })
}
