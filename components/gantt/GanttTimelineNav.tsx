'use client'

import { Button } from '@/components/ui/button'

export type ViewType = 'day' | 'week' | 'month'

interface GanttTimelineNavProps {
  currentDate: Date
  onDateChange: (date: Date) => void
  viewType: ViewType
  onViewChange: (view: ViewType) => void
}

function getMondayOf(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  return d
}

function formatLabel(date: Date, view: ViewType): string {
  if (view === 'day') {
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }
  if (view === 'week') {
    const monday = getMondayOf(date)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    const sameMonth = monday.getMonth() === sunday.getMonth()
    if (sameMonth) {
      return `${monday.getDate()} – ${sunday.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })}`
    }
    return `${monday.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} – ${sunday.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`
  }
  // month
  return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
}

function isCurrentPeriod(date: Date, view: ViewType): boolean {
  const now = new Date()
  if (view === 'day') return now.toDateString() === date.toDateString()
  if (view === 'week') {
    return getMondayOf(now).toDateString() === getMondayOf(date).toDateString()
  }
  return now.getFullYear() === date.getFullYear() && now.getMonth() === date.getMonth()
}

function shiftDate(date: Date, view: ViewType, direction: -1 | 1): Date {
  const d = new Date(date)
  if (view === 'day') {
    d.setDate(d.getDate() + direction)
  } else if (view === 'week') {
    d.setDate(d.getDate() + direction * 7)
  } else {
    d.setMonth(d.getMonth() + direction)
  }
  return d
}

const VIEW_LABELS: Record<ViewType, string> = {
  day: 'Jour',
  week: 'Semaine',
  month: 'Mois',
}

const PERIOD_LABELS: Record<ViewType, string> = {
  day: "Aujourd'hui",
  week: 'Cette semaine',
  month: 'Ce mois',
}

const PREV_LABELS: Record<ViewType, string> = {
  day: '← Jour préc.',
  week: '← Semaine préc.',
  month: '← Mois préc.',
}

const NEXT_LABELS: Record<ViewType, string> = {
  day: 'Jour suiv. →',
  week: 'Semaine suiv. →',
  month: 'Mois suiv. →',
}

export function GanttTimelineNav({
  currentDate,
  onDateChange,
  viewType,
  onViewChange,
}: GanttTimelineNavProps) {
  const isCurrent = isCurrentPeriod(currentDate, viewType)

  function goToCurrent() {
    onDateChange(new Date())
  }

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-white border-b border-slate-200 flex-wrap">
      {/* Navigation */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onDateChange(shiftDate(currentDate, viewType, -1))}
        className="h-9 px-3 text-sm"
      >
        {PREV_LABELS[viewType]}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={goToCurrent}
        className={`h-9 px-3 text-sm ${isCurrent ? 'bg-slate-900 text-white hover:bg-slate-700' : ''}`}
      >
        {PERIOD_LABELS[viewType]}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onDateChange(shiftDate(currentDate, viewType, 1))}
        className="h-9 px-3 text-sm"
      >
        {NEXT_LABELS[viewType]}
      </Button>

      {/* Date label */}
      <span className="ml-2 text-sm font-semibold text-slate-800 capitalize flex-1 min-w-0 truncate">
        {formatLabel(currentDate, viewType)}
      </span>

      {/* View selector */}
      <div className="flex rounded-lg border border-slate-200 overflow-hidden ml-auto">
        {(['day', 'week', 'month'] as ViewType[]).map((view) => (
          <button
            key={view}
            onClick={() => onViewChange(view)}
            className={[
              'px-3 h-9 text-sm font-medium transition-colors border-r last:border-r-0 border-slate-200',
              viewType === view
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-50',
            ].join(' ')}
          >
            {VIEW_LABELS[view]}
          </button>
        ))}
      </div>
    </div>
  )
}
