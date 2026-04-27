'use client'

import { useMemo, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { toast } from 'sonner'
import { AppShell } from '@/components/shared/AppShell'
import { GanttBoard } from '@/components/gantt/GanttBoard'
import { SidebarOF } from '@/components/sidebar/SidebarOF'
import { SidebarOFCardOverlay } from '@/components/sidebar/SidebarOFCard'
import { OFDetailModal } from '@/components/gantt/OFDetailModal'
import { usePlanning } from '@/hooks/usePlanning'
import { useRealtimePlanning } from '@/lib/realtime/useRealtimePlanning'
import { usePlanningStore } from '@/stores/planningStore'
import type { Machine, OrdreFabrication, PlanningSlot, UserRole } from '@/lib/types'

const START_HOUR = 6

interface PlanningClientProps {
  machines: Machine[]
  userName: string
  role: UserRole
}

export function PlanningClient({ machines, userName, role }: PlanningClientProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [activeOf, setActiveOf] = useState<OrdreFabrication | null>(null)
  const [detailOf, setDetailOf] = useState<OrdreFabrication | null>(null)
  const [detailSlot, setDetailSlot] = useState<PlanningSlot | null>(null)

  const dateRange = useMemo(() => {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setDate(end.getDate() + 60)
    return { start: start.toISOString(), end: end.toISOString() }
  }, [])

  usePlanning(dateRange)
  useRealtimePlanning(dateRange)

  const { slots, unscheduledOFs, moveSlot, rollback, setConflicts } = usePlanningStore()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  )

  function getSlotsForMachineAndDate(machineId: string, date: Date): PlanningSlot[] {
    return slots.filter((s) => {
      if (s.machine_id !== machineId) return false
      return new Date(s.start_time).toDateString() === date.toDateString()
    })
  }

  function openDetail(of_: OrdreFabrication, slot?: PlanningSlot) {
    setDetailOf(of_)
    setDetailSlot(slot ?? null)
  }

  function handleDragStart(event: DragStartEvent) {
    const of = event.active.data.current?.of as OrdreFabrication | undefined
    setActiveOf(of ?? null)
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveOf(null)
    const { active, over } = event
    if (!over) return

    const overData = over.data.current as { machineId: string; date?: string } | undefined
    const droppedOnMachineId = overData?.machineId
    if (!droppedOnMachineId) return

    const targetDate = overData?.date ? new Date(overData.date) : new Date(currentDate)
    targetDate.setHours(0, 0, 0, 0)

    const draggedSlot = active.data.current?.slot as PlanningSlot | undefined
    const draggedOfId = draggedSlot?.of_id ?? (active.id as string)
    const of_ = draggedSlot?.of ?? unscheduledOFs.find((o) => o.id === draggedOfId)
    if (!of_) return

    const startTime = new Date(targetDate)
    startTime.setHours(START_HOUR, 0, 0, 0)

    const machineSlots = getSlotsForMachineAndDate(droppedOnMachineId, targetDate).sort(
      (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    )
    if (machineSlots.length > 0) {
      const lastEnd = new Date(machineSlots[machineSlots.length - 1].end_time)
      startTime.setTime(lastEnd.getTime() + 15 * 60000)
    }

    const endTime = new Date(startTime.getTime() + of_.temps_estime_minutes * 60000)

    const optimisticSlot: PlanningSlot = {
      id: `optimistic-${Date.now()}`,
      of_id: of_.id,
      machine_id: droppedOnMachineId,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      locked: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      of: of_,
    }

    const previousSlots = usePlanningStore.getState().slots
    const previousUnscheduled = usePlanningStore.getState().unscheduledOFs

    moveSlot(optimisticSlot, draggedSlot?.of_id)

    try {
      const res = await fetch('/api/planning/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          of_id: of_.id,
          machine_id: droppedOnMachineId,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          previous_slot_id: draggedSlot?.id,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        rollback(previousSlots, previousUnscheduled)
        toast.error(data.error ?? 'Impossible de planifier cet OF.')
        return
      }

      const data = await res.json()
      if (data.conflicts?.length > 0) {
        setConflicts(data.conflicts)
        toast.warning(`Conflit détecté sur ${of_.reference_of}. Vérifiez le planning.`)
      } else {
        setConflicts([])
        toast.success(`OF ${of_.reference_of} planifié avec succès.`)
      }
    } catch {
      rollback(previousSlots, previousUnscheduled)
      toast.error("Erreur réseau. L'OF n'a pas été planifié.")
    }
  }

  return (
    <AppShell role={role} userName={userName}>
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex h-[calc(100vh-64px)]">
          <SidebarOF onOpenDetail={openDetail} />
          <div className="flex-1 overflow-hidden">
            <GanttBoard
              machines={machines}
              slots={slots}
              currentDate={currentDate}
              onDateChange={setCurrentDate}
              draggable={true}
              onOpenDetail={openDetail}
            />
          </div>
        </div>

        <DragOverlay dropAnimation={{ duration: 150, easing: 'ease' }}>
          {activeOf ? <SidebarOFCardOverlay of={activeOf} /> : null}
        </DragOverlay>
      </DndContext>

      <OFDetailModal
        of={detailOf}
        slot={detailSlot}
        open={detailOf !== null}
        onClose={() => { setDetailOf(null); setDetailSlot(null) }}
      />
    </AppShell>
  )
}
