import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { slot_id, of_id } = await request.json()
  if (!slot_id || !of_id) {
    return NextResponse.json({ error: 'slot_id et of_id requis' }, { status: 400 })
  }

  // Delete the planning slot
  const { error: deleteErr } = await supabase
    .from('planning_slots')
    .delete()
    .eq('id', slot_id)

  if (deleteErr) {
    return NextResponse.json({ error: deleteErr.message }, { status: 500 })
  }

  // Reset OF back to A_planifier
  const { error: updateErr } = await supabase
    .from('ordres_fabrication')
    .update({ statut: 'A_planifier', machine_id: null, start_time: null, end_time: null })
    .eq('id', of_id)

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
