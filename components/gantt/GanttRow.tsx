'use client'

import { useDroppable } from '@dnd-kit/core'
import type { Machine, OrdreFabrication, PlanningSlot } from '@/lib/types'
import { GanttBlock } from './GanttBlock'

interface GanttRowProps {
  machine: Machine
  slots: PlanningSlot[]
  date?: Date
  pixelsPerMinute: number
  totalMinutes: number
  startHour: number
  draggable?: boolean
  onOpenDetail?: (of: OrdreFabrication, slot: PlanningSlot) => void
}

const HOUR_WIDTH = 80

export function GanttRow({
  machine,
  slots,
  pixelsPerMinute,
  totalMinutes,
  startHour,
  draggable = true,
  onOpenDetail,
}: GanttRowProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `machine-${machine.id}`,
    data: { machineId: machine.id },
    disabled: machine.statut === 'Maintenance',
  })

  const isMaintenance = machine.statut === 'Maintenance'

  return (
    <div className="flex border-b border-slate-200">
      <div className="w-40 flex-shrink-0 flex items-center px-3 py-2 border-r border-slate-200 bg-white">
        <div>
          <p className="text-sm font-semibold text-slate-800 leading-tight">{machine.nom}</p>
          <p className={`text-xs ${isMaintenance ? 'text-red-500' : 'text-slate-500'}`}>
            {isMaintenance ? 'Maintenance' : machine.heures_ouverture}
          </p>
        </div>
      </div>

      <div
        ref={setNodeRef}
        className={[
          'relative flex-1 h-16',
          isOver && !isMaintenance ? 'bg-blue-50' : '',
          isMaintenance ? 'bg-slate-100 bg-opacity-60' : 'bg-white',
        ].join(' ')}
        style={{ minWidth: totalMinutes * pixelsPerMinute }}
      >
        {Array.from({ length: Math.ceil(totalMinutes / 60) }, (_, i) => (
          <div
            key={i}
            className="absolute top-0 bottom-0 border-r border-slate-100"
            style={{ left: i * HOUR_WIDTH }}
          />
        ))}

        {slots.map((slot) => (
          <GanttBlock
            key={slot.id}
            slot={slot}
            pixelsPerMinute={pixelsPerMinute}
            topOffset={4}
            startHour={startHour}
            draggable={draggable}
            onOpenDetail={onOpenDetail}
          />
        ))}

        {isMaintenance && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs text-slate-400 italic">Machine en maintenance</span>
          </div>
        )}
      </div>
    </div>
  )
}
