import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RawRow {
  reference_of?: string
  client_nom?: string
  gamme?: string
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

  for (const row of rows) {
    if (!row.reference_of || !row.sla_date) {
      errors.push(`Ligne ignorée : reference_of ou sla_date manquant (${JSON.stringify(row).slice(0, 60)})`)
      continue
    }

    const priorite = ['Standard', 'Urgence', 'Constructeur'].includes(row.priorite ?? '')
      ? row.priorite
      : 'Standard'

    toUpsert.push({
      reference_of: String(row.reference_of).trim(),
      client_nom: String(row.client_nom ?? '').trim(),
      gamme: row.gamme ? String(row.gamme).trim() : null,
      sla_date: row.sla_date,
      priorite,
      temps_estime_minutes: Number(row.temps_estime_minutes ?? 60),
      statut: 'A_planifier',
    })
  }

  if (toUpsert.length === 0) {
    return NextResponse.json({ inserted: 0, updated: 0, errors })
  }

  const { data, error } = await supabase
    .from('ordres_fabrication')
    .upsert(toUpsert, { onConflict: 'reference_of', ignoreDuplicates: false })
    .select('id')

  if (error) {
    return NextResponse.json({ inserted: 0, updated: 0, errors: [error.message] }, { status: 500 })
  }

  // Rough estimate: we can't easily distinguish inserted vs updated with upsert
  return NextResponse.json({
    inserted: data?.length ?? 0,
    updated: toUpsert.length - (data?.length ?? 0),
    errors,
  })
}
