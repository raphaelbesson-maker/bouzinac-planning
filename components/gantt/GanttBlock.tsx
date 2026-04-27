'use client'

import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import type { PlanningSlot, OFPriorite, OrdreFabrication } from '@/lib/types'
import { usePlanningStore } from '@/stores/planningStore'

const BLOCK_COLORS: Record<OFPriorite, string> = {
  Standard: 'bg-slate-200 border-slate-400 text-slate-800',
  Urgence: 'bg-orange-300 border-orange-500 text-orange-900',
  Constructeur: 'bg-indigo-200 border-indigo-400 text-indigo-900',
}

interface GanttBlockProps {
  slot: PlanningSlot
  pixelsPerMinute: number
  topOffset: number
  startHour: number
  draggable?: boolean
  onOpenDetail?: (of: OrdreFabrication, slot: PlanningSlot) => void
}

export function GanttBlock({
  slot,
  pixelsPerMinute,
  topOffset,
  startHour,
  draggable = true,
  onOpenDetail,
}: GanttBlockProps) {
  const conflicts = usePlanningStore((s) => s.conflicts)
  const hasConflict = conflicts.some((c) => c.of_id === slot.of_id)
  const isLocked = slot.locked

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: slot.id,
    data: { slot },
    disabled: !draggable || isLocked,
  })

  const of_ = slot.of
  if (!of_) return null

  const startDate = new Date(slot.start_time)
  const endDate = new Date(slot.end_time)
  const durationMinutes = (endDate.getTime() - startDate.getTime()) / 60000
  const width = Math.max(durationMinutes * pixelsPerMinute, 40)
  const minutesFromStartHour = startDate.getHours() * 60 + startDate.getMinutes() - startHour * 60

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    width,
    left: Math.max(0, minutesFromStartHour * pixelsPerMinute),
    top: topOffset,
    position: 'absolute',
    zIndex: isDragging ? 50 : 10,
    opacity: isDragging ? 0.5 : 1,
  }

  const colorClass = BLOCK_COLORS[of_.priorite]

  function handleClick(e: React.MouseEvent) {
    // Don't open detail if user was dragging (dnd-kit sets isDragging=true)
    if (isDragging) return
    e.stopPropagation()
    if (of_) onOpenDetail?.(of_, slot)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(draggable && !isLocked ? { ...listeners, ...attributes } : {})}
      onClick={handleClick}
      className={[
        'rounded border-2 px-2 py-1 select-none overflow-hidden group',
        colorClass,
        hasConflict ? 'animate-pulse border-red-600 border-2' : '',
        isLocked
          ? 'cursor-pointer opacity-80'
          : draggable
          ? 'cursor-grab active:cursor-grabbing'
          : 'cursor-pointer',
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
        <span className="text-xs truncate block opacity-80">{of_.client_nom}</span>
      )}
      {hasConflict && (
        <span className="text-red-600 text-xs font-bold">⚠ Conflit</span>
      )}
    </div>
  )
}
