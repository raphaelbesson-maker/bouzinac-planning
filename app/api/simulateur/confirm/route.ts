import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const body = await req.json()
  const { machine_id, start_time, end_time, gamme, duree_minutes } = body

  if (!machine_id || !start_time || !end_time || !duree_minutes) {
    return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
  }

  // Generate a unique reference for this urgence SAV
  const ref = `SAV-${Date.now()}`

  // Create the urgence OF
  const { data: of_, error: ofError } = await supabase
    .from('ordres_fabrication')
    .insert({
      reference_of: ref,
      client_nom: 'SAV Interne',
      gamme: gamme || null,
      sla_date: new Date(end_time).toISOString().split('T')[0],
      priorite: 'Urgence',
      temps_estime_minutes: duree_minutes,
      statut: 'Planifie',
      machine_id,
      start_time,
      end_time,
    })
    .select('*')
    .single()

  if (ofError) return NextResponse.json({ error: ofError.message }, { status: 500 })

  // Create the planning slot
  const { data: slot, error: slotError } = await supabase
    .from('planning_slots')
    .insert({ of_id: of_.id, machine_id, start_time, end_time, locked: false })
    .select('*')
    .single()

  if (slotError) {
    // Rollback the OF if slot creation fails (e.g. overlap constraint)
    await supabase.from('ordres_fabrication').delete().eq('id', of_.id)
    if (slotError.code === '23P01') {
      return NextResponse.json(
        { error: 'Chevauchement détecté : une autre commande occupe déjà ce créneau.' },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: slotError.message }, { status: 500 })
  }

  return NextResponse.json({ of: of_, slot })
}
