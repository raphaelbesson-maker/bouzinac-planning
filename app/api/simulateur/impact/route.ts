import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculateDownstreamShift } from '@/lib/planning/impact-calculator'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const body = await req.json()
  const { machine_id, start_time, temps_estime_minutes } = body

  if (!machine_id || !start_time || !temps_estime_minutes) {
    return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
  }

  const [{ data: machineSlots }, { data: allOfs }, { data: bufferRule }] = await Promise.all([
    supabase
      .from('planning_slots')
      .select('*, of:ordres_fabrication(*)')
      .eq('machine_id', machine_id)
      .order('start_time'),
    supabase.from('ordres_fabrication').select('*'),
    supabase.from('reglements').select('value').eq('key', 'buffer_minutes').single(),
  ])

  const bufferMinutes = Number(bufferRule?.value ?? 15)

  const result = calculateDownstreamShift({
    machineSlots: machineSlots ?? [],
    ofs: allOfs ?? [],
    proposedStartTime: new Date(start_time),
    proposedDurationMinutes: Number(temps_estime_minutes),
    bufferMinutes,
  })

  return NextResponse.json(result)
}
