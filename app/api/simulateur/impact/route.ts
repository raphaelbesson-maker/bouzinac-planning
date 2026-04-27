import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const body = await req.json()
  const { machine_id, start_time, temps_estime_minutes } = body

  if (!machine_id || !start_time || !temps_estime_minutes) {
    return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
  }

  const urgenceStart = new Date(start_time)
  const urgenceEnd = new Date(urgenceStart.getTime() + Number(temps_estime_minutes) * 60000)

  // Fetch all scheduled operations on this machine that would be affected
  const { data: machineOps } = await supabase
    .from('of_operations')
    .select('*, of:ordres_fabrication(*)')
    .eq('machine_id', machine_id)
    .not('start_time', 'is', null)
    .order('start_time')

  const { data: bufferRule } = await supabase
    .from('reglements')
    .select('value')
    .eq('key', 'buffer_minutes')
    .single()

  const bufferMinutes = Number(bufferRule?.value ?? 15)

  // Simulate cascade shift: operations starting after urgence insertion get pushed
  const affected: {
    of_id: string
    reference_of: string
    client_nom: string
    operation_nom: string
    shift_minutes: number
    new_end_time: string
    sla_breach: boolean
    sla_date: string
  }[] = []

  let pushBy = 0
  for (const op of machineOps ?? []) {
    const opStart = new Date(op.start_time!)
    const opEnd = new Date(op.end_time!)
    const duration = opEnd.getTime() - opStart.getTime()

    if (opStart >= urgenceStart) {
      // This op gets pushed by urgence + buffer
      if (pushBy === 0) {
        // First affected op: pushed just after urgence ends
        const neededPush = urgenceEnd.getTime() + bufferMinutes * 60000 - opStart.getTime()
        pushBy = Math.max(0, neededPush)
      }
      if (pushBy > 0) {
        const newEnd = new Date(opEnd.getTime() + pushBy)
        const slaDate = op.of?.sla_date
        const slaBreached = slaDate ? newEnd > new Date(slaDate + 'T23:59:59') : false
        affected.push({
          of_id: op.of_id,
          reference_of: op.of?.reference_of ?? '?',
          client_nom: op.of?.client_nom ?? '?',
          operation_nom: op.nom,
          shift_minutes: Math.round(pushBy / 60000),
          new_end_time: newEnd.toISOString(),
          sla_breach: slaBreached,
          sla_date: slaDate ?? '',
        })
      }
    }
  }

  return NextResponse.json({
    affected_ofs: affected,
    any_sla_breach: affected.some((a) => a.sla_breach),
  })
}
