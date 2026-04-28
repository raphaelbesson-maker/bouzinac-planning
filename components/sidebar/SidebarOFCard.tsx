'use client'

import { useDraggable } from '@dnd-kit/core'
import type { OrdreFabrication } from '@/lib/types'
import { PrioriteBadge } from '@/components/shared/StatusBadge'
import { getNextOperation } from '@/lib/planning/of-utils'

export { getNextOperation }

interface SidebarOFCardProps {
  of: OrdreFabrication
  onOpenDetail: (of: OrdreFabrication) => void
  alertDays?: number
}

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - now.getTime()) / 86400000)
}


export function OFCardContent({ of, alertDays = 2 }: { of: OrdreFabrication; alertDays?: number }) {
  const days = daysUntil(of.sla_date)
  const slaUrgent = days <= alertDays
  const nextOp = getNextOperation(of)

  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-slate-900 truncate">{of.reference_of}</p>
          <p className="text-xs text-slate-600 truncate">{of.client_nom}</p>
        </div>
        <PrioriteBadge priorite={of.priorite} />
      </div>
      {nextOp && (
        <div className="mt-1.5 flex items-center gap-1 text-xs text-slate-500">
          <span className="font-medium text-slate-700">→ {nextOp.nom}</span>
          <span className="text-slate-400">({nextOp.duree_minutes} min)</span>
        </div>
      )}
      <div className="mt-1.5 flex items-center justify-between text-xs">
        <span className="text-slate-400">
          {(of.of_operations ?? []).filter((o) => o.statut !== 'A_planifier').length}
          /{(of.of_operations ?? []).length} étapes
        </span>
        <span className={`font-medium ${slaUrgent ? 'text-red-600' : 'text-slate-600'}`}>
          SLA : {slaUrgent && '⚠ '}
          {days <= 0 ? 'DÉPASSÉ' : days === 1 ? 'Demain' : `J-${days}`}
        </span>
      </div>
    </>
  )
}

function cardClass(of: OrdreFabrication) {
  return [
    'rounded-lg border-2 p-3 select-none',
    of.priorite === 'Urgence'
      ? 'bg-orange-50 border-orange-300'
      : of.priorite === 'Constructeur'
      ? 'bg-indigo-50 border-indigo-300'
      : 'bg-white border-slate-200',
  ].join(' ')
}

export function SidebarOFCard({ of, onOpenDetail, alertDays = 2 }: SidebarOFCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: of.id,
    data: { of },
  })

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => onOpenDetail(of)}
      className={[
        cardClass(of),
        'cursor-grab active:cursor-grabbing transition-shadow group',
        isDragging ? 'opacity-30' : 'shadow-sm hover:shadow-md',
      ].join(' ')}
    >
      <OFCardContent of={of} alertDays={alertDays} />
      <p className="text-xs text-slate-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
        Glisser sur une machine pour planifier
      </p>
    </div>
  )
}

export function SidebarOFCardOverlay({ of }: { of: OrdreFabrication }) {
  return (
    <div className={[cardClass(of), 'shadow-2xl cursor-grabbing ring-2 ring-slate-400 w-60'].join(' ')}>
      <OFCardContent of={of} />
    </div>
  )
}
