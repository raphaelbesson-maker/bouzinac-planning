import type { PlanningSlot, OrdreFabrication, AffectedOF, ImpactResult } from '@/lib/types'
import { sortByStart, addMinutes } from './slot-utils'

interface ImpactInput {
  machineSlots: PlanningSlot[]
  ofs: OrdreFabrication[]
  proposedStartTime: Date
  proposedDurationMinutes: number
  bufferMinutes: number
}

export function calculateDownstreamShift({
  machineSlots,
  ofs,
  proposedStartTime,
  proposedDurationMinutes,
  bufferMinutes,
}: ImpactInput): ImpactResult {
  const ofMap = new Map(ofs.map((o) => [o.id, o]))
  const proposedEnd = addMinutes(proposedStartTime, proposedDurationMinutes)

  // Find slots that start after the proposed start (they will be shifted)
  const sorted = sortByStart(machineSlots)
  const affected: AffectedOF[] = []

  const shiftAccumulated = proposedDurationMinutes + bufferMinutes

  for (const slot of sorted) {
    const slotStart = new Date(slot.start_time)
    if (slotStart < proposedEnd) continue // Before or overlapping the proposed slot

    const of_ = ofMap.get(slot.of_id)
    if (!of_) continue

    const newEnd = addMinutes(new Date(slot.end_time), shiftAccumulated)
    const sla = new Date(of_.sla_date + 'T23:59:59')
    const slaBreach = newEnd > sla

    affected.push({
      of_id: of_.id,
      reference_of: of_.reference_of,
      client_nom: of_.client_nom,
      operation_nom: '',
      shift_minutes: shiftAccumulated,
      new_end_time: newEnd.toISOString(),
      sla_breach: slaBreach,
      sla_date: of_.sla_date,
    })

    // Each subsequent slot accumulates the same shift (they all move together)
  }

  return {
    affected_ofs: affected,
    any_sla_breach: affected.some((a) => a.sla_breach),
  }
}
