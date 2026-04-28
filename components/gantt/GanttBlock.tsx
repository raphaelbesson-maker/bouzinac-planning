'use client'

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
  const opConflicts = conflicts.filter((c) => c.of_id === operation.of_id)
  const hasConflict = opConflicts.length > 0
  const isLocked = operation.locked
  const of_ = operation.of
  const isLate =
    operation.statut !== 'Termine' &&
    operation.end_time != null &&
    new Date() > new Date(operation.end_time)

  const { setNodeRef, isDragging, attributes, listeners } = useDraggable({
    id: `gantt-${operation.id}`,
    data: { operation, of: of_, type: 'gantt-block' },
    disabled: isLocked,
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
      {...(isLocked ? {} : { ...listeners, ...attributes })}
      className={[
        'rounded border-2 px-2 py-1 select-none overflow-hidden group',
        colorClass,
        hasConflict ? 'animate-pulse border-red-600 border-2' : '',
        isLate && !hasConflict ? 'border-orange-500 border-2' : '',
        isLocked ? 'opacity-80 cursor-pointer' : 'cursor-grab active:cursor-grabbing',
        isDragging ? 'opacity-30' : 'hover:opacity-90',
      ].join(' ')}
    >
      <div className="flex items-center gap-1">
        {isLocked && <span title="En cours — verrouillé">🔒</span>}
        {isLate && <span title="En retard sur le planning">⏱</span>}
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
      {isLate && !hasConflict && (
        <span className="text-orange-700 text-xs font-semibold">⏱ En retard</span>
      )}
      {hasConflict && (
        <div className="relative group/conflict">
          <span className="text-red-600 text-xs font-bold cursor-help">⚠ Conflit</span>
          <div className="absolute bottom-full left-0 mb-1 hidden group-hover/conflict:block bg-slate-900 text-white text-xs rounded-md p-2 w-56 z-50 shadow-xl pointer-events-none">
            {opConflicts.map((c, i) => (
              <p key={i} className={i > 0 ? 'mt-1 pt-1 border-t border-slate-700' : ''}>
                {c.message}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function GanttBlockOverlay({ operation }: { operation: OFOperation }) {
  const of_ = operation.of
  if (!of_) return null
  return (
    <div className={[
      'rounded border-2 px-2 py-1 select-none w-48 shadow-2xl ring-2 ring-slate-400 cursor-grabbing',
      BLOCK_COLORS[of_.priorite],
    ].join(' ')}>
      <div className="flex items-center gap-1">
        <span className="font-semibold text-xs truncate">{of_.reference_of}</span>
      </div>
      <span className="text-xs truncate block opacity-80">{operation.nom}</span>
      <span className="text-xs truncate block opacity-60">{of_.client_nom}</span>
    </div>
  )
}
