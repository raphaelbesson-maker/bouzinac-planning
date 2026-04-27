import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { operation_id, of_id } = await request.json()
  if (!operation_id || !of_id) {
    return NextResponse.json({ error: 'operation_id et of_id requis' }, { status: 400 })
  }

  // Fetch the operation to get its ordre
  const { data: op } = await supabase
    .from('of_operations')
    .select('ordre, locked')
    .eq('id', operation_id)
    .single()

  if (op?.locked) {
    return NextResponse.json({ error: 'Cette opération est en cours et ne peut pas être retirée.' }, { status: 409 })
  }

  // Reset this operation and all subsequent ones (cascade)
  const { error } = await supabase
    .from('of_operations')
    .update({ machine_id: null, start_time: null, end_time: null, statut: 'A_planifier', locked: false })
    .eq('of_id', of_id)
    .gte('ordre', op?.ordre ?? 0)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Set OF back to A_planifier
  await supabase
    .from('ordres_fabrication')
    .update({ statut: 'A_planifier' })
    .eq('id', of_id)

  return NextResponse.json({ ok: true })
}
