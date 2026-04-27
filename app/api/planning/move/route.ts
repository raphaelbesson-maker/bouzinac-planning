import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { detectConflicts } from '@/lib/planning/conflict-detector'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const body = await req.json()
  const { of_id, machine_id, start_time, end_time, previous_slot_id } = body

  if (!of_id || !machine_id || !start_time || !end_time) {
    return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
  }

  // Check lock: if the OF is already "En_cours", reject the move
  const { data: existingSlot } = await supabase
    .from('planning_slots')
    .select('locked')
    .eq('of_id', of_id)
    .single()

  if (existingSlot?.locked) {
    return NextResponse.json({ error: 'Cet OF est en cours de production et ne peut pas être déplacé.' }, { status: 409 })
  }

  // Delete previous slot if re-scheduling
  if (previous_slot_id) {
    await supabase.from('planning_slots').delete().eq('id', previous_slot_id)
  }

  // Insert new slot
  const { data: newSlot, error } = await supabase
    .from('planning_slots')
    .insert({ of_id, machine_id, start_time, end_time, locked: false })
    .select('*')
    .single()

  if (error) {
    // Handle DB overlap constraint
    if (error.code === '23P01') {
      return NextResponse.json(
        { error: 'Chevauchement détecté : une autre commande occupe déjà ce créneau.' },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Update OF status to Planifie and set machine/times
  await supabase
    .from('ordres_fabrication')
    .update({ statut: 'Planifie', machine_id, start_time, end_time })
    .eq('id', of_id)

  // Run conflict detection
  const [{ data: allSlots }, { data: allOfs }, { data: machines }, { data: operateurs }, { data: bufferRule }] =
    await Promise.all([
      supabase.from('planning_slots').select('*, of:ordres_fabrication(*)').eq('machine_id', machine_id),
      supabase.from('ordres_fabrication').select('*'),
      supabase.from('machines').select('*'),
      supabase.from('operateurs').select('*'),
      supabase.from('reglements').select('value').eq('key', 'buffer_minutes').single(),
    ])

  const bufferMinutes = Number(bufferRule?.value ?? 15)
  const conflicts = detectConflicts({
    slots: allSlots ?? [],
    ofs: allOfs ?? [],
    machines: machines ?? [],
    operateurs: operateurs ?? [],
    bufferMinutes,
  })

  return NextResponse.json({ slot: newSlot, conflicts })
}
