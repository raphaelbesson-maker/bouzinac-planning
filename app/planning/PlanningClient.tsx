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
import { getNextOperation } from '@/components/sidebar/SidebarOFCard'
import type { Machine, OFOperation, OrdreFabrication, UserRole } from '@/lib/types'

const START_HOUR = 6
const BUFFER_MINUTES = 15

interface PlanningClientProps {
  machines: Machine[]
  userName: string
  role: UserRole
}

export function PlanningClient({ machines, userName, role }: PlanningClientProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [activeOf, setActiveOf] = useState<OrdreFabrication | null>(null)
  const [detailOf, setDetailOf] = useState<OrdreFabrication | null>(null)
  const [detailOp, setDetailOp] = useState<OFOperation | null>(null)

  const dateRange = useMemo(() => {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setDate(end.getDate() + 60)
    return { start: start.toISOString(), end: end.toISOString() }
  }, [])

  usePlanning(dateRange)
  useRealtimePlanning(dateRange)

  const { operations, scheduleOperation, rollback, setConflicts } = usePlanningStore()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  )

  function openDetail(of_: OrdreFabrication, op?: OFOperation) {
    setDetailOf(of_)
    setDetailOp(op ?? null)
  }

  function handleDragStart(event: DragStartEvent) {
    const of = event.active.data.current?.of as OrdreFabrication | undefined
    setActiveOf(of ?? null)
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveOf(null)
    const { active, over } = event
    if (!over) return

    const overData = over.data.current as { machineId: string; machineCategorie?: string; date?: string } | undefined
    const droppedOnMachineId = overData?.machineId
    if (!droppedOnMachineId) return

    const of_ = active.data.current?.of as OrdreFabrication | undefined
    if (!of_) return

    // Find the next unscheduled operation
    const nextOp = getNextOperation(of_)
    if (!nextOp) {
      toast.error('Toutes les opérations de cet OF sont déjà planifiées.')
      return
    }

    // Check machine categorie compatibility
    const targetMachine = machines.find((m) => m.id === droppedOnMachineId)
    if (targetMachine?.categorie && targetMachine.categorie !== nextOp.categorie_machine) {
      toast.error(
        `Cette machine (${targetMachine.nom}) fait du "${targetMachine.categorie}", mais la prochaine opération requiert "${nextOp.categorie_machine}".`
      )
      return
    }

    // Compute start time
    const targetDate = overData?.date ? new Date(overData.date) : new Date(currentDate)
    targetDate.setHours(0, 0, 0, 0)

    const startTime = new Date(targetDate)
    startTime.setHours(START_HOUR, 0, 0, 0)

    // Push after last op on this machine that day
    const machineOpsToday = operations
      .filter((op) => {
        if (op.machine_id !== droppedOnMachineId) return false
        if (!op.start_time) return false
        return new Date(op.start_time).toDateString() === targetDate.toDateString()
      })
      .sort((a, b) => new Date(a.start_time!).getTime() - new Date(b.start_time!).getTime())

    if (machineOpsToday.length > 0) {
      const lastEnd = new Date(machineOpsToday[machineOpsToday.length - 1].end_time!)
      const candidateStart = new Date(lastEnd.getTime() + BUFFER_MINUTES * 60000)
      if (candidateStart > startTime) startTime.setTime(candidateStart.getTime())
    }

    // Sequential constraint: start must be >= previous operation's end_time
    const prevOp = (of_.of_operations ?? [])
      .filter((op) => op.ordre < nextOp.ordre && op.statut !== 'A_planifier')
      .sort((a, b) => b.ordre - a.ordre)[0]

    if (prevOp?.end_time) {
      const prevEnd = new Date(new Date(prevOp.end_time).getTime() + BUFFER_MINUTES * 60000)
      if (prevEnd > startTime) startTime.setTime(prevEnd.getTime())
    }

    const endTime = new Date(startTime.getTime() + nextOp.duree_minutes * 60000)

    // Optimistic update
    const optimisticOp: OFOperation = {
      ...nextOp,
      machine_id: droppedOnMachineId,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      statut: 'Planifie',
      of: of_,
      machine: targetMachine,
    }

    const previousOps = usePlanningStore.getState().operations
    const previousUnscheduled = usePlanningStore.getState().unscheduledOFs

    scheduleOperation(optimisticOp)

    try {
      const res = await fetch('/api/planning/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation_id: nextOp.id,
          machine_id: droppedOnMachineId,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        rollback(previousOps, previousUnscheduled)
        toast.error(data.error ?? 'Impossible de planifier cette opération.')
        return
      }

      const data = await res.json()
      if (data.conflicts?.length > 0) {
        setConflicts(data.conflicts)
        toast.warning(`Conflit détecté sur ${of_.reference_of}. Vérifiez le planning.`)
      } else {
        setConflicts([])
        toast.success(`${of_.reference_of} — ${nextOp.nom} planifié sur ${targetMachine?.nom ?? 'la machine'}.`)
      }
    } catch {
      rollback(previousOps, previousUnscheduled)
      toast.error("Erreur réseau. L'opération n'a pas été planifiée.")
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
              operations={operations}
              currentDate={currentDate}
              onDateChange={setCurrentDate}
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
        operation={detailOp}
        open={detailOf !== null}
        onClose={() => { setDetailOf(null); setDetailOp(null) }}
      />
    </AppShell>
  )
}
