'use client'

import { useMemo, useState } from 'react'
import { AppShell } from '@/components/shared/AppShell'
import { GanttBoard } from '@/components/gantt/GanttBoard'
import { UrgencePanel } from '@/components/simulateur/UrgencePanel'
import { usePlanning } from '@/hooks/usePlanning'
import { useRealtimePlanning } from '@/lib/realtime/useRealtimePlanning'
import { usePlanningStore } from '@/stores/planningStore'
import type { Machine, UserRole } from '@/lib/types'

interface SimulateurClientProps {
  machines: Machine[]
  userName: string
  role: UserRole
}

export function SimulateurClient({ machines, userName, role }: SimulateurClientProps) {
  const [currentDate, setCurrentDate] = useState(new Date())

  const dateRange = useMemo(() => {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setDate(end.getDate() + 30)
    return { start: start.toISOString(), end: end.toISOString() }
  }, [])

  usePlanning(dateRange)
  useRealtimePlanning(dateRange)

  const slots = usePlanningStore((s) => s.slots)

  return (
    <AppShell role={role} userName={userName}>
      <div className="flex h-[calc(100vh-64px)]">
        <div className="flex-1 overflow-hidden">
          <GanttBoard
            machines={machines}
            slots={slots}
            currentDate={currentDate}
            onDateChange={setCurrentDate}
            draggable={false}
          />
        </div>
        <UrgencePanel machines={machines} />
      </div>
    </AppShell>
  )
}
