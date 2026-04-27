import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendOrderNotification } from '@/lib/email'

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  A_planifier: ['Planifie'],
  Planifie:    ['En_cours', 'A_planifier'],
  En_cours:    ['Termine'],
  Termine:     [],
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const body = await req.json()
  const { of_id, statut } = body

  if (!of_id || !statut) {
    return NextResponse.json({ error: 'of_id et statut sont requis' }, { status: 400 })
  }

  // Fetch current OF
  const { data: order, error: fetchError } = await supabase
    .from('ordres_fabrication')
    .select('*')
    .eq('id', of_id)
    .single()

  if (fetchError || !order) {
    return NextResponse.json({ error: 'OF introuvable' }, { status: 404 })
  }

  // Validate transition
  const allowed = ALLOWED_TRANSITIONS[order.statut] ?? []
  if (!allowed.includes(statut)) {
    return NextResponse.json(
      { error: `Transition ${order.statut} → ${statut} non autorisée` },
      { status: 400 }
    )
  }

  // Update slot lock state
  if (statut === 'En_cours') {
    await supabase.from('planning_slots').update({ locked: true }).eq('of_id', of_id)
  }
  if (statut === 'Termine') {
    await supabase.from('planning_slots').update({ locked: false }).eq('of_id', of_id)
  }

  // Update OF status
  const { data: updated, error: updateError } = await supabase
    .from('ordres_fabrication')
    .update({ statut })
    .eq('id', of_id)
    .select('*')
    .single()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Fire notification on key status changes
  if ((statut === 'Termine' || statut === 'En_cours') && order.client_id) {
    const { data: portalUsers } = await supabase
      .from('operateurs')
      .select('id')
      .eq('client_id', order.client_id)
      .eq('role', 'Client')

    if (portalUsers && portalUsers.length > 0) {
      for (const pu of portalUsers) {
        const { data: authUser } = await createAdminClient().auth.admin.getUserById(pu.id)
        const email = authUser?.user?.email
        if (email) {
          const notifType = statut === 'Termine' ? 'expedition' : 'statut_change'
          const result = await sendOrderNotification({
            order: updated,
            type: notifType,
            recipientEmail: email,
          })
          if (result.success) {
            await supabase.from('notifications_log').insert({
              of_id,
              type: notifType,
              recipient_email: email,
            })
          }
        }
      }
    }
  }

  return NextResponse.json({ order: updated })
}
