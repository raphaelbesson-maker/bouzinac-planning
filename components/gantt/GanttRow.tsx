'use client'

import { useDroppable, useDndContext } from '@dnd-kit/core'
import type { Machine, OFOperation, OrdreFabrication } from '@/lib/types'
import { getNextOperation } from '@/lib/planning/of-utils'
import { GanttBlock } from './GanttBlock'

interface GanttRowProps {
  machine: Machine
  operations: OFOperation[]
  pixelsPerMinute: number
  totalMinutes: number
  startHour: number
  nowLeft?: number | null
  onOpenDetail?: (of: OrdreFabrication, op: OFOperation) => void
}

const HOUR_WIDTH = 80

export function GanttRow({
  machine,
  operations,
  pixelsPerMinute,
  totalMinutes,
  startHour,
  nowLeft,
  onOpenDetail,
}: GanttRowProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `machine-${machine.id}`,
    data: { machineId: machine.id, machineCategorie: machine.categorie },
  })

  const { active } = useDndContext()
  const draggedOf = active?.data.current?.of as OrdreFabrication | undefined
  const isDragging = !!active

  const isMaintenance = machine.statut === 'Maintenance'
  const draggingCategorie = draggedOf ? (getNextOperation(draggedOf)?.categorie_machine ?? null) : null
  const categoryMatch = !draggingCategorie || draggingCategorie === machine.categorie
  const canReceive = !isMaintenance && categoryMatch

  let dropZoneBg = isMaintenance ? 'bg-slate-100 bg-opacity-60' : 'bg-white'
  if (isDragging && !isMaintenance) {
    dropZoneBg = canReceive ? 'bg-green-50' : 'bg-red-50 opacity-60'
  }
  if (isOver) {
    dropZoneBg = canReceive ? 'bg-blue-100' : 'bg-red-100'
  }

  return (
    <div className="flex border-b border-slate-200">
      <div className="w-40 flex-shrink-0 flex items-center px-3 py-2 border-r border-slate-200 bg-white">
        <div>
          <p className="text-sm font-semibold text-slate-800 leading-tight">{machine.nom}</p>
          <p className={`text-xs ${isMaintenance ? 'text-red-500' : 'text-slate-500'}`}>
            {isMaintenance ? '🔧 Maintenance' : machine.heures_ouverture}
          </p>
          {machine.categorie && !isMaintenance && (
            <p className="text-xs text-slate-400 italic">{machine.categorie}</p>
          )}
        </div>
      </div>

      <div
        ref={setNodeRef}
        className={['relative flex-1 h-16 transition-colors duration-150', dropZoneBg].join(' ')}
        style={{ minWidth: totalMinutes * pixelsPerMinute }}
      >
        {Array.from({ length: Math.ceil(totalMinutes / 60) }, (_, i) => (
          <div
            key={i}
            className="absolute top-0 bottom-0 border-r border-slate-100"
            style={{ left: i * HOUR_WIDTH }}
          />
        ))}

        {operations.map((op) => (
          <GanttBlock
            key={op.id}
            operation={op}
            pixelsPerMinute={pixelsPerMinute}
            topOffset={4}
            startHour={startHour}
            onOpenDetail={onOpenDetail}
          />
        ))}

        {isMaintenance && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs text-slate-400 italic">Machine en maintenance</span>
          </div>
        )}

        {nowLeft !== null && nowLeft !== undefined && (
          <div
            className="absolute top-0 bottom-0 z-20 pointer-events-none"
            style={{ left: nowLeft }}
          >
            <div className="w-0.5 h-full bg-red-500 opacity-80" />
            <div className="absolute -top-1 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-red-500" />
          </div>
        )}

        {isDragging && isOver && !canReceive && !isMaintenance && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-1 rounded border border-red-200">
              Catégorie incompatible ({draggingCategorie} ≠ {machine.categorie})
            </span>
          </div>
        )}

        {isDragging && isOver && isMaintenance && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-1 rounded border border-red-200">
              Machine en maintenance
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
