import type { OFOperation, OrdreFabrication, Machine, Operateur, Conflict } from '@/lib/types'
import { overlaps, gapMinutes, sortByStart } from './slot-utils'

interface ConflictInput {
  operations: OFOperation[]
  ofs: OrdreFabrication[]
  machines: Machine[]
  operateurs: Operateur[]
  bufferMinutes: number
}

export function detectConflicts({
  operations,
  ofs,
  machines,
  operateurs,
  bufferMinutes,
}: ConflictInput): Conflict[] {
  const conflicts: Conflict[] = []
  const ofMap = new Map(ofs.map((o) => [o.id, o]))
  const machineMap = new Map(machines.map((m) => [m.id, m]))

  // Only check scheduled operations
  const scheduled = operations.filter((op) => op.start_time && op.end_time && op.machine_id)

  // Group by machine
  const byMachine = new Map<string, OFOperation[]>()
  for (const op of scheduled) {
    const group = byMachine.get(op.machine_id!) ?? []
    group.push(op)
    byMachine.set(op.machine_id!, group)
  }

  for (const [machineId, machineOps] of Array.from(byMachine.entries())) {
    const sorted = sortByStart(machineOps as never[]) as unknown as OFOperation[]
    const machine = machineMap.get(machineId)

    for (let i = 0; i < sorted.length; i++) {
      const op = sorted[i]
      const of_ = ofMap.get(op.of_id)
      if (!of_) continue

      // 1. SLA breach
      if (of_.sla_date && new Date(op.end_time!) > new Date(of_.sla_date + 'T23:59:59')) {
        conflicts.push({
          type: 'sla_breach',
          of_id: of_.id,
          reference_of: of_.reference_of,
          message: `OF ${of_.reference_of} (op. ${op.nom}) dépasse son SLA (${of_.sla_date})`,
        })
      }

      // 2. Overlap with next op on same machine
      if (i < sorted.length - 1) {
        const next = sorted[i + 1]
        if (overlaps(op as never, next as never)) {
          const nextOf = ofMap.get(next.of_id)
          conflicts.push({
            type: 'overlap',
            of_id: op.of_id,
            reference_of: of_.reference_of,
            message: `Chevauchement entre ${of_.reference_of}/${op.nom} et ${nextOf?.reference_of ?? '?'}/${next.nom} sur ${machine?.nom ?? 'machine inconnue'}`,
          })
        }

        // 3. Buffer violation
        const gap = gapMinutes(op as never, next as never)
        if (gap >= 0 && gap < bufferMinutes) {
          conflicts.push({
            type: 'buffer_violation',
            of_id: op.of_id,
            reference_of: of_.reference_of,
            message: `Temps tampon insuffisant (${Math.round(gap)} min < ${bufferMinutes} min) entre ${of_.reference_of}/${op.nom} et ${ofMap.get(next.of_id)?.reference_of ?? '?'}`,
          })
        }
      }

      // 4. Competence mismatch
      if (machine && machine.competences_requises.length > 0) {
        const qualifiedOp = operateurs.find(
          (o) =>
            o.competences.includes(machineId) ||
            machine.competences_requises.every((c) => o.competences.includes(c))
        )
        if (!qualifiedOp) {
          conflicts.push({
            type: 'competence_mismatch',
            of_id: of_.id,
            reference_of: of_.reference_of,
            message: `Aucun opérateur qualifié pour ${machine.nom}`,
          })
        }
      }
    }
  }

  // 5. Sequential constraint: op N must start after op N-1 ends
  const byOf = new Map<string, OFOperation[]>()
  for (const op of scheduled) {
    const group = byOf.get(op.of_id) ?? []
    group.push(op)
    byOf.set(op.of_id, group)
  }

  for (const [ofId, ofOps] of Array.from(byOf.entries())) {
    const sorted = ofOps.slice().sort((a, b) => a.ordre - b.ordre)
    const of_ = ofMap.get(ofId)
    if (!of_) continue

    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1]
      const curr = sorted[i]
      if (prev.end_time && curr.start_time && new Date(curr.start_time) < new Date(prev.end_time)) {
        conflicts.push({
          type: 'sequential',
          of_id: ofId,
          reference_of: of_.reference_of,
          message: `OF ${of_.reference_of} : ${curr.nom} commence avant la fin de ${prev.nom}`,
        })
      }
    }
  }

  // Deduplicate
  const seen = new Set<string>()
  return conflicts.filter((c) => {
    const key = `${c.of_id}:${c.type}:${c.message}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
