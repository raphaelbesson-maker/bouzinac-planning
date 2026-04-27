'use client'

import { useState } from 'react'
import type { Machine, OFOperation, OrdreFabrication } from '@/lib/types'
import { GanttRow } from './GanttRow'
import { GanttHeader } from './GanttHeader'
import { GanttLegend } from './GanttLegend'
import { GanttTimelineNav, type ViewType } from './GanttTimelineNav'
import { GanttWeekView } from './GanttWeekView'
import { GanttMonthView } from './GanttMonthView'

const START_HOUR = 6
const END_HOUR = 22
const PIXELS_PER_MINUTE = 80 / 60

interface GanttBoardProps {
  machines: Machine[]
  operations: OFOperation[]
  currentDate: Date
  onDateChange: (date: Date) => void
  onOpenDetail?: (of: OrdreFabrication, op: OFOperation) => void
}

export function GanttBoard({
  machines,
  operations,
  currentDate,
  onDateChange,
  onOpenDetail,
}: GanttBoardProps) {
  const [viewType, setViewType] = useState<ViewType>('day')

  const totalMinutes = (END_HOUR - START_HOUR) * 60

  function getOpsForMachine(machineId: string): OFOperation[] {
    return operations.filter((op) => {
      if (op.machine_id !== machineId) return false
      return new Date(op.start_time!).toDateString() === currentDate.toDateString()
    })
  }

  function handleDayClick(date: Date) {
    onDateChange(date)
    setViewType('day')
  }

  return (
    <div className="flex flex-col h-full">
      <GanttTimelineNav
        currentDate={currentDate}
        onDateChange={onDateChange}
        viewType={viewType}
        onViewChange={setViewType}
      />
      <GanttLegend />

      {viewType === 'day' && (
        <div className="flex-1 overflow-auto">
          <div className="min-w-max">
            <GanttHeader
              date={currentDate}
              startHour={START_HOUR}
              endHour={END_HOUR}
              pixelsPerMinute={PIXELS_PER_MINUTE}
            />
            {machines.map((machine) => (
              <GanttRow
                key={machine.id}
                machine={machine}
                operations={getOpsForMachine(machine.id)}
                pixelsPerMinute={PIXELS_PER_MINUTE}
                totalMinutes={totalMinutes}
                startHour={START_HOUR}
                onOpenDetail={onOpenDetail}
              />
            ))}
          </div>
        </div>
      )}

      {viewType === 'week' && (
        <GanttWeekView
          machines={machines}
          operations={operations}
          weekStart={currentDate}
          onDayClick={handleDayClick}
          onOpenDetail={onOpenDetail}
        />
      )}

      {viewType === 'month' && (
        <GanttMonthView
          machines={machines}
          operations={operations}
          currentDate={currentDate}
          onDayClick={handleDayClick}
        />
      )}
    </div>
  )
}
