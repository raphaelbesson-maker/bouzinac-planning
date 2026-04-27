import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const body = await req.json()
  const { machine_id, start_time, end_time, gamme_id, duree_minutes } = body

  if (!machine_id || !start_time || !end_time || !duree_minutes) {
    return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
  }

  const ref = `SAV-${Date.now()}`
  const slaDate = new Date(end_time).toISOString().split('T')[0]

  // Create the urgence OF
  const { data: of_, error: ofError } = await supabase
    .from('ordres_fabrication')
    .insert({
      reference_of: ref,
      client_nom: 'SAV Interne',
      gamme_id: gamme_id ?? null,
      sla_date: slaDate,
      priorite: 'Urgence',
      temps_estime_minutes: duree_minutes,
      statut: 'Planifie',
    })
    .select('*')
    .single()

  if (ofError) return NextResponse.json({ error: ofError.message }, { status: 500 })

  // If a gamme is provided, use its first operation; otherwise create a single "SAV" operation
  let opName = 'SAV'
  let categorieMachine = 'General'

  if (gamme_id) {
    const { data: firstOp } = await supabase
      .from('gamme_operations')
      .select('nom, categorie_machine')
      .eq('gamme_id', gamme_id)
      .order('ordre')
      .limit(1)
      .single()
    if (firstOp) {
      opName = firstOp.nom
      categorieMachine = firstOp.categorie_machine
    }
  }

  // Create a single scheduled operation
  const { data: op, error: opError } = await supabase
    .from('of_operations')
    .insert({
      of_id: of_.id,
      ordre: 1,
      nom: opName,
      categorie_machine: categorieMachine,
      duree_minutes,
      machine_id,
      start_time,
      end_time,
      statut: 'Planifie',
    })
    .select('*')
    .single()

  if (opError) {
    // Rollback OF
    await supabase.from('ordres_fabrication').delete().eq('id', of_.id)
    if (opError.code === '23P01') {
      return NextResponse.json(
        { error: 'Chevauchement détecté : un autre OF occupe déjà ce créneau.' },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: opError.message }, { status: 500 })
  }

  return NextResponse.json({ of: of_, operation: op })
}
