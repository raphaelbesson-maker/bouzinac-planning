import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { anthropic, AI_MODEL } from '@/lib/ai/anthropic'

const START_HOUR = 6
const END_HOUR = 22

// Find earliest available slot on a machine given existing schedule
function findEarliestSlot(
  machineId: string,
  durationMs: number,
  notBefore: Date,
  bufferMs: number,
  schedule: { machine_id: string; start_time: string; end_time: string }[]
): Date {
  const machineOps = schedule
    .filter((op) => op.machine_id === machineId && op.start_time && op.end_time)
    .map((op) => ({ start: new Date(op.start_time), end: new Date(op.end_time) }))
    .sort((a, b) => a.start.getTime() - b.start.getTime())

  // Try to fit starting from notBefore, respecting working hours
  let candidate = new Date(notBefore)
  // Snap to start of working day if before START_HOUR
  if (candidate.getHours() < START_HOUR) {
    candidate.setHours(START_HOUR, 0, 0, 0)
  }

  // Try up to 30 days ahead
  for (let day = 0; day < 30; day++) {
    const dayStart = new Date(candidate)
    dayStart.setHours(START_HOUR, 0, 0, 0)
    const dayEnd = new Date(candidate)
    dayEnd.setHours(END_HOUR, 0, 0, 0)

    // Use candidate if it's within working hours, else start of day
    let tryStart = candidate > dayStart ? candidate : dayStart

    // Check each gap in this day's schedule
    const dayOps = machineOps.filter((op) => {
      const opDay = op.start.toDateString()
      return opDay === tryStart.toDateString()
    })

    let placed = false
    for (const op of dayOps) {
      const gapEnd = new Date(op.start.getTime() - bufferMs)
      if (tryStart.getTime() + durationMs <= gapEnd.getTime()) {
        // Fits before this op
        placed = true
        break
      }
      // Push past this op
      const afterOp = new Date(op.end.getTime() + bufferMs)
      if (afterOp > tryStart) tryStart = afterOp
    }

    // Check if fits before end of day
    if (tryStart.getTime() + durationMs <= dayEnd.getTime()) {
      return tryStart
    }

    // Move to next day
    candidate = new Date(dayStart)
    candidate.setDate(candidate.getDate() + 1)
    candidate.setHours(START_HOUR, 0, 0, 0)
  }

  // Fallback: notBefore rounded to start of next working day
  const fallback = new Date(notBefore)
  fallback.setDate(fallback.getDate() + 1)
  fallback.setHours(START_HOUR, 0, 0, 0)
  return fallback
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  // Load everything we need
  const [
    { data: pendingOFs },
    { data: machines },
    { data: existingOps },
    { data: rules },
  ] = await Promise.all([
    supabase
      .from('ordres_fabrication')
      .select('*, of_operations(*)')
      .in('statut', ['A_planifier', 'Planifie'])
      .order('sla_date'),
    supabase.from('machines').select('*').eq('statut', 'Actif'),
    supabase
      .from('of_operations')
      .select('id, machine_id, start_time, end_time, statut, locked')
      .not('start_time', 'is', null),
    supabase.from('reglements').select('key, value'),
  ])

  const rulesMap = Object.fromEntries((rules ?? []).map((r) => [r.key, r.value]))
  const bufferMinutes = Number(rulesMap.buffer_minutes ?? 15)
  const bufferMs = bufferMinutes * 60000

  // Build list of operations to schedule (A_planifier only, in OF sequential order)
  const opsToSchedule: {
    operation_id: string
    of_id: string
    of_reference: string
    of_priorite: string
    of_sla_date: string
    of_client: string
    nom: string
    categorie_machine: string
    duree_minutes: number
    ordre: number
    prev_op_end_time: string | null
  }[] = []

  for (const of_ of pendingOFs ?? []) {
    const ops = (of_.of_operations ?? []).sort((a: { ordre: number }, b: { ordre: number }) => a.ordre - b.ordre)
    for (const op of ops) {
      if (op.statut !== 'A_planifier') continue
      // Find previous op in this OF
      const prevOp = ops.filter((o: { ordre: number; statut: string }) => o.ordre < op.ordre && o.statut !== 'A_planifier').sort((a: { ordre: number }, b: { ordre: number }) => b.ordre - a.ordre)[0]
      opsToSchedule.push({
        operation_id: op.id,
        of_id: of_.id,
        of_reference: of_.reference_of,
        of_priorite: of_.priorite,
        of_sla_date: of_.sla_date,
        of_client: of_.client_nom,
        nom: op.nom,
        categorie_machine: op.categorie_machine,
        duree_minutes: op.duree_minutes,
        ordre: op.ordre,
        prev_op_end_time: prevOp?.end_time ?? null,
      })
    }
  }

  if (opsToSchedule.length === 0) {
    return NextResponse.json({ scheduled: [], skipped: [], message: 'Aucune opération à planifier.' })
  }

  // Ask Claude to prioritize the operations
  const prompt = `Tu es un optimiseur de planning pour un atelier de fabrication de jantes sur mesure.

Voici les opérations à planifier (JSON) :
${JSON.stringify(opsToSchedule, null, 2)}

Machines disponibles :
${JSON.stringify((machines ?? []).map((m: { id: string; nom: string; categorie: string }) => ({ id: m.id, nom: m.nom, categorie: m.categorie })), null, 2)}

Règles :
- Priorité : Urgence > Constructeur > Standard
- SLA plus proche = plus urgent à priorité égale
- Respecter la séquence des opérations d'un même OF (ordre croissant)
- Buffer entre opérations sur la même machine : ${bufferMinutes} min

Retourne UNIQUEMENT un tableau JSON valide (sans markdown, sans explication) : la liste des operation_id dans l'ordre optimal de planification.
Exemple : ["uuid1", "uuid2", "uuid3"]`

  let orderedIds: string[] = []
  try {
    const message = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })
    const text = (message.content[0] as { type: string; text: string }).text.trim()
    // Extract JSON array even if wrapped in backticks
    const match = text.match(/\[[\s\S]*\]/)
    if (match) orderedIds = JSON.parse(match[0])
  } catch {
    // Fallback: use original order (priority + SLA already sorted by Supabase)
    orderedIds = opsToSchedule.map((op) => op.operation_id)
  }

  // Build ordered list (ops Claude didn't mention go at the end)
  const opMap = new Map(opsToSchedule.map((op) => [op.operation_id, op]))
  const mentioned = orderedIds.filter((id) => opMap.has(id))
  const rest = opsToSchedule.filter((op) => !orderedIds.includes(op.operation_id)).map((op) => op.operation_id)
  const finalOrder = [...mentioned, ...rest]

  // Greedy scheduling: place each op on the earliest compatible machine slot
  const liveSchedule: { machine_id: string; start_time: string; end_time: string }[] = [...(existingOps ?? [])]
  const scheduled: { operation_id: string; of_reference: string; nom: string; machine_nom: string; start_time: string }[] = []
  const skipped: { operation_id: string; of_reference: string; nom: string; reason: string }[] = []

  const compatibleMachines = (categorie: string) =>
    (machines ?? []).filter((m: { categorie: string }) => !m.categorie || m.categorie === categorie)

  for (const opId of finalOrder) {
    const op = opMap.get(opId)
    if (!op) continue

    const compatible = compatibleMachines(op.categorie_machine)
    if (compatible.length === 0) {
      skipped.push({ operation_id: op.operation_id, of_reference: op.of_reference, nom: op.nom, reason: `Aucune machine de catégorie "${op.categorie_machine}"` })
      continue
    }

    // Not before: now or end of previous sequential op + buffer
    let notBefore = new Date()
    if (op.prev_op_end_time) {
      const prevEnd = new Date(new Date(op.prev_op_end_time).getTime() + bufferMs)
      if (prevEnd > notBefore) notBefore = prevEnd
    }
    // Also check live schedule for this OF's previous ops we just placed
    const placedPrev = scheduled.filter((s) => {
      const placed = opsToSchedule.find((o) => o.operation_id === s.operation_id)
      return placed?.of_id === op.of_id && placed.ordre < op.ordre
    })
    for (const prev of placedPrev) {
      const prevEnd = new Date(new Date(prev.start_time).getTime() + (opMap.get(prev.operation_id)?.duree_minutes ?? 0) * 60000 + bufferMs)
      if (prevEnd > notBefore) notBefore = prevEnd
    }

    // Find best machine (earliest available slot)
    let bestMachineId = ''
    let bestMachineNom = ''
    let bestStart = new Date(8640000000000000) // max date

    for (const m of compatible) {
      const slot = findEarliestSlot(m.id, op.duree_minutes * 60000, notBefore, bufferMs, liveSchedule)
      if (slot < bestStart) {
        bestStart = slot
        bestMachineId = m.id
        bestMachineNom = m.nom
      }
    }

    const endTime = new Date(bestStart.getTime() + op.duree_minutes * 60000)

    // Apply to Supabase
    const { error } = await supabase
      .from('of_operations')
      .update({
        machine_id: bestMachineId,
        start_time: bestStart.toISOString(),
        end_time: endTime.toISOString(),
        statut: 'Planifie',
      })
      .eq('id', op.operation_id)

    if (error) {
      skipped.push({ operation_id: op.operation_id, of_reference: op.of_reference, nom: op.nom, reason: error.message })
      continue
    }

    // Update OF statut
    await supabase
      .from('ordres_fabrication')
      .update({ statut: 'Planifie' })
      .eq('id', op.of_id)
      .eq('statut', 'A_planifier')

    // Add to live schedule for subsequent iterations
    liveSchedule.push({ machine_id: bestMachineId, start_time: bestStart.toISOString(), end_time: endTime.toISOString() })
    scheduled.push({ operation_id: op.operation_id, of_reference: op.of_reference, nom: op.nom, machine_nom: bestMachineNom, start_time: bestStart.toISOString() })
  }

  return NextResponse.json({ scheduled, skipped })
}
