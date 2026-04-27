'use client'

import { CSS } from '@dnd-kit/utilities'
import { useDraggable } from '@dnd-kit/core'
import type { OFOperation, OFPriorite, OrdreFabrication } from '@/lib/types'
import { usePlanningStore } from '@/stores/planningStore'

const BLOCK_COLORS: Record<OFPriorite, string> = {
  Standard:     'bg-slate-200 border-slate-400 text-slate-800',
  Urgence:      'bg-orange-300 border-orange-500 text-orange-900',
  Constructeur: 'bg-indigo-200 border-indigo-400 text-indigo-900',
}

interface GanttBlockProps {
  operation: OFOperation
  pixelsPerMinute: number
  topOffset: number
  startHour: number
  onOpenDetail?: (of: OrdreFabrication, op: OFOperation) => void
}

export function GanttBlock({
  operation,
  pixelsPerMinute,
  topOffset,
  startHour,
  onOpenDetail,
}: GanttBlockProps) {
  const conflicts = usePlanningStore((s) => s.conflicts)
  const hasConflict = conflicts.some((c) => c.of_id === operation.of_id)
  const isLocked = operation.locked
  const of_ = operation.of

  // Operations on the Gantt are not re-draggable — unschedule via modal
  const { setNodeRef } = useDraggable({
    id: operation.id,
    data: { operation },
    disabled: true,
  })

  if (!of_) return null

  const startDate = new Date(operation.start_time!)
  const endDate = new Date(operation.end_time!)
  const durationMinutes = (endDate.getTime() - startDate.getTime()) / 60000
  const width = Math.max(durationMinutes * pixelsPerMinute, 40)
  const minutesFromStartHour = startDate.getHours() * 60 + startDate.getMinutes() - startHour * 60

  const style: React.CSSProperties = {
    width,
    left: Math.max(0, minutesFromStartHour * pixelsPerMinute),
    top: topOffset,
    position: 'absolute',
    zIndex: 10,
  }

  const colorClass = BLOCK_COLORS[of_.priorite]

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation()
    if (of_) onOpenDetail?.(of_, operation)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={handleClick}
      className={[
        'rounded border-2 px-2 py-1 select-none overflow-hidden group cursor-pointer hover:opacity-90',
        colorClass,
        hasConflict ? 'animate-pulse border-red-600 border-2' : '',
        isLocked ? 'opacity-80' : '',
      ].join(' ')}
    >
      <div className="flex items-center gap-1">
        {isLocked && <span title="En cours — verrouillé">🔒</span>}
        <span className="font-semibold text-xs truncate">{of_.reference_of}</span>
        {onOpenDetail && (
          <span className="ml-auto opacity-0 group-hover:opacity-60 text-xs transition-opacity">ℹ</span>
        )}
      </div>
      {width > 80 && (
        <span className="text-xs truncate block opacity-80">{operation.nom}</span>
      )}
      {width > 120 && (
        <span className="text-xs truncate block opacity-60">{of_.client_nom}</span>
      )}
      {hasConflict && (
        <span className="text-red-600 text-xs font-bold">⚠ Conflit</span>
      )}
    </div>
  )
}
