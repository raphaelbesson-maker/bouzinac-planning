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

  // Load business rules
  const { data: rules } = await supabase
    .from('reglements')
    .select('key, value')
    .in('key', ['never_delay_premium', 'max_urgence_per_day'])

  const rulesMap = Object.fromEntries((rules ?? []).map((r) => [r.key, r.value]))
  const neverDelayPremium = String(rulesMap.never_delay_premium) === 'true'
  const maxUrgencePerDay = Number(rulesMap.max_urgence_per_day ?? 99)

  // Rule 1: max urgences SAV par jour
  if (maxUrgencePerDay > 0) {
    const today = new Date().toISOString().split('T')[0]
    const { count } = await supabase
      .from('ordres_fabrication')
      .select('id', { count: 'exact', head: true })
      .like('reference_of', 'SAV-%')
      .gte('created_at', today + 'T00:00:00.000Z')
      .lte('created_at', today + 'T23:59:59.999Z')

    if ((count ?? 0) >= maxUrgencePerDay) {
      return NextResponse.json(
        { error: `Limite atteinte : ${maxUrgencePerDay} urgence(s) SAV maximum par jour (règle Admin).` },
        { status: 403 }
      )
    }
  }

  // Rule 2: never delay premium clients
  if (neverDelayPremium) {
    const { data: opsAfter } = await supabase
      .from('of_operations')
      .select('of_id, of:ordres_fabrication(client_id)')
      .eq('machine_id', machine_id)
      .gte('start_time', start_time)
      .not('start_time', 'is', null)

    const clientIds = (opsAfter ?? [])
      .map((o) => (o.of as { client_id?: string } | null)?.client_id)
      .filter(Boolean) as string[]

    if (clientIds.length > 0) {
      const { data: premiumClients } = await supabase
        .from('clients')
        .select('id, nom')
        .in('id', clientIds)
        .eq('is_premium', true)

      if (premiumClients && premiumClients.length > 0) {
        const names = premiumClients.map((c) => c.nom).join(', ')
        return NextResponse.json(
          { error: `Insertion bloquée : le client Premium "${names}" serait décalé. Désactivez la règle "Ne jamais décaler Premium" pour forcer.` },
          { status: 403 }
        )
      }
    }
  }

  const ref = `SAV-${Date.now()}`
  const slaDate = new Date(end_time).toISOString().split('T')[0]

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
