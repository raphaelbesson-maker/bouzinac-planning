import type { PlanningSlot } from '@/lib/types'

export function overlaps(a: PlanningSlot, b: PlanningSlot): boolean {
  const aStart = new Date(a.start_time).getTime()
  const aEnd = new Date(a.end_time).getTime()
  const bStart = new Date(b.start_time).getTime()
  const bEnd = new Date(b.end_time).getTime()
  return aStart < bEnd && bStart < aEnd
}

export function gapMinutes(earlier: PlanningSlot, later: PlanningSlot): number {
  const earlierEnd = new Date(earlier.end_time).getTime()
  const laterStart = new Date(later.start_time).getTime()
  return (laterStart - earlierEnd) / 60000
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60000)
}

export function slotDurationMinutes(slot: PlanningSlot): number {
  return (new Date(slot.end_time).getTime() - new Date(slot.start_time).getTime()) / 60000
}

/** Sort slots by start_time ascending */
export function sortByStart(slots: PlanningSlot[]): PlanningSlot[] {
  return [...slots].sort(
    (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  )
}
