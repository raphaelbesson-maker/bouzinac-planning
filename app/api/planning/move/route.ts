import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { detectConflicts } from '@/lib/planning/conflict-detector'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const body = await req.json()
  const { operation_id, machine_id, start_time, end_time } = body

  if (!operation_id || !machine_id || !start_time || !end_time) {
    return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
  }

  // Fetch the operation and its OF
  const { data: op, error: opErr } = await supabase
    .from('of_operations')
    .select('*, of:ordres_fabrication(*)')
    .eq('id', operation_id)
    .single()

  if (opErr || !op) return NextResponse.json({ error: 'Opération introuvable' }, { status: 404 })
  if (op.locked) return NextResponse.json({ error: 'Cette opération est en cours et ne peut pas être déplacée.' }, { status: 409 })

  // Check machine categorie matches operation
  const { data: machine } = await supabase.from('machines').select('categorie, nom').eq('id', machine_id).single()
  if (machine?.categorie && machine.categorie !== op.categorie_machine) {
    return NextResponse.json(
      { error: `Cette machine (${machine.nom}) fait du "${machine.categorie}", mais l'opération requiert "${op.categorie_machine}".` },
      { status: 400 }
    )
  }

  // Sequential constraint: previous operation must be planned and its end <= our start
  const { data: prevOp } = await supabase
    .from('of_operations')
    .select('statut, end_time, nom')
    .eq('of_id', op.of_id)
    .eq('ordre', op.ordre - 1)
    .single()

  if (prevOp) {
    if (prevOp.statut === 'A_planifier') {
      return NextResponse.json(
        { error: `Planifiez d'abord l'étape précédente : ${prevOp.nom}` },
        { status: 400 }
      )
    }
    if (prevOp.end_time && new Date(start_time) < new Date(prevOp.end_time)) {
      return NextResponse.json(
        { error: `Le début de "${op.nom}" doit être après la fin de "${prevOp.nom}" (${new Date(prevOp.end_time).toLocaleString('fr-FR')}).` },
        { status: 400 }
      )
    }
  }

  // Update of_operation
  const { data: updatedOp, error: updateErr } = await supabase
    .from('of_operations')
    .update({ machine_id, start_time, end_time, statut: 'Planifie' })
    .eq('id', operation_id)
    .select('*, of:ordres_fabrication(*), machine:machines(*)')
    .single()

  if (updateErr) {
    if (updateErr.code === '23P01') {
      return NextResponse.json(
        { error: 'Chevauchement détecté : un autre OF occupe déjà ce créneau sur cette machine.' },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  // Update OF statut based on all its operations
  const { data: allOps } = await supabase
    .from('of_operations')
    .select('statut')
    .eq('of_id', op.of_id)

  if (allOps) {
    const allDone = allOps.every((o) => o.statut === 'Termine')
    const anyInProgress = allOps.some((o) => o.statut === 'En_cours')
    const anyPending = allOps.some((o) => o.statut === 'A_planifier')
    const ofStatut = allDone ? 'Termine' : anyInProgress ? 'En_cours' : anyPending ? 'A_planifier' : 'Planifie'
    await supabase.from('ordres_fabrication').update({ statut: ofStatut }).eq('id', op.of_id)
  }

  // Conflict detection
  const [{ data: allOpsForConflict }, { data: allOfs }, { data: machines }, { data: operateurs }, { data: bufferRule }] =
    await Promise.all([
      supabase.from('of_operations').select('*, of:ordres_fabrication(*)').eq('machine_id', machine_id).not('start_time', 'is', null),
      supabase.from('ordres_fabrication').select('*'),
      supabase.from('machines').select('*'),
      supabase.from('operateurs').select('*'),
      supabase.from('reglements').select('value').eq('key', 'buffer_minutes').single(),
    ])

  const bufferMinutes = Number(bufferRule?.value ?? 15)
  const conflicts = detectConflicts({
    operations: allOpsForConflict ?? [],
    ofs: allOfs ?? [],
    machines: machines ?? [],
    operateurs: operateurs ?? [],
    bufferMinutes,
  })

  return NextResponse.json({ operation: updatedOp, conflicts })
}
