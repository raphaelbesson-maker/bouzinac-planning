import type { PlanningSlot, OrdreFabrication, Machine, Operateur, Conflict } from '@/lib/types'
import { overlaps, gapMinutes, sortByStart } from './slot-utils'

interface ConflictInput {
  slots: PlanningSlot[]
  ofs: OrdreFabrication[]
  machines: Machine[]
  operateurs: Operateur[]
  bufferMinutes: number
}

export function detectConflicts({
  slots,
  ofs,
  machines,
  operateurs,
  bufferMinutes,
}: ConflictInput): Conflict[] {
  const conflicts: Conflict[] = []
  const ofMap = new Map(ofs.map((o) => [o.id, o]))
  const machineMap = new Map(machines.map((m) => [m.id, m]))

  // Group slots by machine
  const byMachine = new Map<string, PlanningSlot[]>()
  for (const slot of slots) {
    const group = byMachine.get(slot.machine_id) ?? []
    group.push(slot)
    byMachine.set(slot.machine_id, group)
  }

  for (const [machineId, machineSlots] of Array.from(byMachine.entries())) {
    const sorted = sortByStart(machineSlots)
    const machine = machineMap.get(machineId)

    for (let i = 0; i < sorted.length; i++) {
      const slot = sorted[i]
      const of_ = ofMap.get(slot.of_id)
      if (!of_) continue

      // 1. SLA breach
      if (of_.sla_date && new Date(slot.end_time) > new Date(of_.sla_date + 'T23:59:59')) {
        conflicts.push({
          type: 'sla_breach',
          of_id: of_.id,
          reference_of: of_.reference_of,
          message: `OF ${of_.reference_of} dépasse son SLA (${of_.sla_date})`,
        })
      }

      // 2. Overlap with next slot
      if (i < sorted.length - 1) {
        const next = sorted[i + 1]
        if (overlaps(slot, next)) {
          const nextOf = ofMap.get(next.of_id)
          conflicts.push({
            type: 'overlap',
            of_id: slot.of_id,
            reference_of: of_.reference_of,
            message: `Chevauchement entre OF ${of_.reference_of} et OF ${nextOf?.reference_of ?? '?'} sur ${machine?.nom ?? 'machine inconnue'}`,
          })
        }

        // 3. Buffer violation
        const gap = gapMinutes(slot, next)
        if (gap >= 0 && gap < bufferMinutes) {
          conflicts.push({
            type: 'buffer_violation',
            of_id: slot.of_id,
            reference_of: of_.reference_of,
            message: `Temps tampon insuffisant (${Math.round(gap)} min) entre OF ${of_.reference_of} et OF ${ofMap.get(next.of_id)?.reference_of ?? '?'} (minimum ${bufferMinutes} min)`,
          })
        }
      }

      // 4. Competence mismatch (if machine has required competences)
      if (machine && machine.competences_requises.length > 0) {
        const qualifiedOp = operateurs.find(
          (op) =>
            op.competences.includes(machineId) ||
            machine.competences_requises.every((c) => op.competences.includes(c))
        )
        if (!qualifiedOp) {
          conflicts.push({
            type: 'competence_mismatch',
            of_id: of_.id,
            reference_of: of_.reference_of,
            message: `Aucun opérateur qualifié disponible pour ${machine.nom}`,
          })
        }
      }
    }
  }

  // Deduplicate by of_id + type
  const seen = new Set<string>()
  return conflicts.filter((c) => {
    const key = `${c.of_id}:${c.type}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
