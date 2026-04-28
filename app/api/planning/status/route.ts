import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendOrderNotification } from '@/lib/email'

const ALLOWED_OP_TRANSITIONS: Record<string, string[]> = {
  A_planifier: ['Planifie'],
  Planifie:    ['En_cours', 'A_planifier'],
  En_cours:    ['Termine'],
  Termine:     ['A_planifier'],
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const body = await req.json()
  const { operation_id, statut } = body

  if (!operation_id || !statut) {
    return NextResponse.json({ error: 'operation_id et statut sont requis' }, { status: 400 })
  }

  const { data: op, error: fetchErr } = await supabase
    .from('of_operations')
    .select('*')
    .eq('id', operation_id)
    .single()

  if (fetchErr || !op) return NextResponse.json({ error: 'Opération introuvable' }, { status: 404 })

  const allowed = ALLOWED_OP_TRANSITIONS[op.statut] ?? []
  if (!allowed.includes(statut)) {
    return NextResponse.json(
      { error: `Transition ${op.statut} → ${statut} non autorisée` },
      { status: 400 }
    )
  }

  const locked = statut === 'En_cours'

  // Réouvrir (Terminé → A_planifier) : reset this op + all subsequent ones
  if (statut === 'A_planifier') {
    await supabase
      .from('of_operations')
      .update({ statut: 'A_planifier', locked: false, machine_id: null, start_time: null, end_time: null })
      .eq('of_id', op.of_id)
      .gte('ordre', op.ordre)

    await supabase
      .from('ordres_fabrication')
      .update({ statut: 'A_planifier' })
      .eq('id', op.of_id)

    return NextResponse.json({ operation: { ...op, statut: 'A_planifier', locked: false }, of_statut: 'A_planifier' })
  }

  const { data: updatedOp, error: updateErr } = await supabase
    .from('of_operations')
    .update({ statut, locked })
    .eq('id', operation_id)
    .select('*')
    .single()

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  // Recompute OF statut
  const { data: allOps } = await supabase
    .from('of_operations')
    .select('statut')
    .eq('of_id', op.of_id)

  let ofStatut = 'A_planifier'
  if (allOps) {
    const allDone = allOps.every((o) => o.statut === 'Termine')
    const anyInProgress = allOps.some((o) => o.statut === 'En_cours')
    const anyPending = allOps.some((o) => o.statut === 'A_planifier')
    ofStatut = allDone ? 'Termine' : anyInProgress ? 'En_cours' : anyPending ? 'A_planifier' : 'Planifie'
  }

  const { data: updatedOf } = await supabase
    .from('ordres_fabrication')
    .update({ statut: ofStatut })
    .eq('id', op.of_id)
    .select('*')
    .single()

  // Send notification when OF becomes Termine
  if (ofStatut === 'Termine' && updatedOf?.client_id) {
    const { data: portalUsers } = await supabase
      .from('operateurs')
      .select('id')
      .eq('client_id', updatedOf.client_id)
      .eq('role', 'Client')

    if (portalUsers && portalUsers.length > 0) {
      for (const pu of portalUsers) {
        const { data: authUser } = await createAdminClient().auth.admin.getUserById(pu.id)
        const email = authUser?.user?.email
        if (email) {
          const result = await sendOrderNotification({
            order: updatedOf,
            type: 'expedition',
            recipientEmail: email,
          })
          if (result.success) {
            await supabase.from('notifications_log').insert({
              of_id: op.of_id,
              type: 'expedition',
              recipient_email: email,
            })
          }
        }
      }
    }
  }

  return NextResponse.json({ operation: updatedOp, of_statut: ofStatut })
}
