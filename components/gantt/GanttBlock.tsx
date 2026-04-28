'use client'

import { useRef, useState } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { toast } from 'sonner'
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
  const { upsertOperation } = usePlanningStore()
  const opConflicts = conflicts.filter((c) => c.of_id === operation.of_id)
  const hasConflict = opConflicts.length > 0
  const isLocked = operation.locked
  const of_ = operation.of
  const isLate =
    operation.statut !== 'Termine' &&
    operation.end_time != null &&
    new Date() > new Date(operation.end_time)

  // Resize state
  const resizing = useRef(false)
  const resizeStartX = useRef(0)
  const resizeStartWidth = useRef(0)
  const [resizeWidth, setResizeWidth] = useState<number | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const { setNodeRef, isDragging, attributes, listeners } = useDraggable({
    id: `gantt-${operation.id}`,
    data: { operation, of: of_, type: 'gantt-block' },
    disabled: isLocked || resizing.current,
  })

  if (!of_) return null

  const startDate = new Date(operation.start_time!)
  const endDate = new Date(operation.end_time!)
  const durationMinutes = (endDate.getTime() - startDate.getTime()) / 60000
  const baseWidth = Math.max(durationMinutes * pixelsPerMinute, 40)
  const displayWidth = resizeWidth ?? baseWidth
  const minutesFromStartHour = startDate.getHours() * 60 + startDate.getMinutes() - startHour * 60

  const style: React.CSSProperties = {
    width: displayWidth,
    left: Math.max(0, minutesFromStartHour * pixelsPerMinute),
    top: topOffset,
    position: 'absolute',
    zIndex: resizing.current ? 20 : 10,
  }

  const colorClass = BLOCK_COLORS[of_.priorite]

  function handleClick(e: React.MouseEvent) {
    if (resizing.current) return
    e.stopPropagation()
    if (of_) onOpenDetail?.(of_, operation)
  }

  function handleResizeMouseDown(e: React.MouseEvent) {
    if (isLocked) return
    e.stopPropagation()
    e.preventDefault()
    resizing.current = true
    resizeStartX.current = e.clientX
    resizeStartWidth.current = displayWidth

    function onMouseMove(ev: MouseEvent) {
      const delta = ev.clientX - resizeStartX.current
      const newWidth = Math.max(pixelsPerMinute * 15, resizeStartWidth.current + delta) // min 15 min
      setResizeWidth(newWidth)
    }

    async function onMouseUp(ev: MouseEvent) {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)

      const delta = ev.clientX - resizeStartX.current
      const newWidthPx = Math.max(pixelsPerMinute * 15, resizeStartWidth.current + delta)
      const newDurationMinutes = Math.round(newWidthPx / pixelsPerMinute / 15) * 15 // snap to 15 min
      const snappedWidth = newDurationMinutes * pixelsPerMinute

      setResizeWidth(snappedWidth)
      resizing.current = false

      if (newDurationMinutes === Math.round(durationMinutes / 15) * 15) {
        setResizeWidth(null)
        return
      }

      const newEnd = new Date(startDate.getTime() + newDurationMinutes * 60000)
      setIsSaving(true)
      try {
        const res = await fetch('/api/planning/move', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            operation_id: operation.id,
            machine_id: operation.machine_id,
            start_time: operation.start_time,
            end_time: newEnd.toISOString(),
          }),
        })
        if (!res.ok) {
          const data = await res.json()
          toast.error(data.error ?? 'Impossible de modifier la durée.')
          setResizeWidth(null)
        } else {
          const data = await res.json()
          upsertOperation(data.operation)
          setResizeWidth(null)
          toast.success(`Durée mise à jour : ${newDurationMinutes} min`)
        }
      } catch {
        toast.error('Erreur réseau.')
        setResizeWidth(null)
      }
      setIsSaving(false)
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={handleClick}
      {...(isLocked || resizing.current ? {} : { ...listeners, ...attributes })}
      className={[
        'rounded border-2 px-2 py-1 select-none overflow-hidden group',
        colorClass,
        hasConflict ? 'animate-pulse border-red-600 border-2' : '',
        isLate && !hasConflict ? 'border-orange-500 border-2' : '',
        isLocked ? 'opacity-80 cursor-pointer' : 'cursor-grab active:cursor-grabbing',
        isDragging ? 'opacity-30' : 'hover:opacity-90',
        isSaving ? 'opacity-60' : '',
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
      {displayWidth > 80 && (
        <span className="text-xs truncate block opacity-80">{operation.nom}</span>
      )}
      {displayWidth > 120 && (
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

      {/* Resize handle — right edge, only for non-locked Planifie blocks */}
      {!isLocked && (
        <div
          onMouseDown={handleResizeMouseDown}
          onClick={(e) => e.stopPropagation()}
          title="Étirer pour modifier la durée"
          className="absolute right-0 top-0 bottom-0 w-2.5 cursor-ew-resize flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/10 rounded-r"
        >
          <div className="w-0.5 h-4 bg-current opacity-40 rounded" />
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
