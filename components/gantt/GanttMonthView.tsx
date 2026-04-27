'use client'

import type { Machine, PlanningSlot } from '@/lib/types'

interface GanttMonthViewProps {
  machines: Machine[]
  slots: PlanningSlot[]
  currentDate: Date
  onDayClick: (date: Date) => void
}

function getMonthGrid(date: Date): (Date | null)[] {
  const year = date.getFullYear()
  const month = date.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)

  // Monday-first: getDay() returns 0=Sun → pad 6, 1=Mon → pad 0, etc.
  const startPad = (firstDay.getDay() + 6) % 7
  const totalDays = lastDay.getDate()

  const days: (Date | null)[] = []
  for (let i = 0; i < startPad; i++) days.push(null)
  for (let i = 1; i <= totalDays; i++) {
    days.push(new Date(year, month, i))
  }
  while (days.length % 7 !== 0) days.push(null)

  return days
}

const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

const PRIORITY_DOT: Record<string, string> = {
  Standard: 'bg-slate-400',
  Urgence: 'bg-orange-400',
  Constructeur: 'bg-indigo-500',
}

export function GanttMonthView({
  machines,
  slots,
  currentDate,
  onDayClick,
}: GanttMonthViewProps) {
  const grid = getMonthGrid(currentDate)
  const today = new Date()

  // Build a map: date string → slots
  const slotsByDay: Record<string, PlanningSlot[]> = {}
  for (const slot of slots) {
    const key = new Date(slot.start_time).toDateString()
    if (!slotsByDay[key]) slotsByDay[key] = []
    slotsByDay[key].push(slot)
  }

  // Count of machines in maintenance
  const maintenanceCount = machines.filter((m) => m.statut === 'Maintenance').length

  function getDaySummary(date: Date) {
    const key = date.toDateString()
    const daySlots = slotsByDay[key] ?? []
    const urgences = daySlots.filter((s) => s.of?.priorite === 'Urgence').length
    const constructeurs = daySlots.filter((s) => s.of?.priorite === 'Constructeur').length
    const standards = daySlots.filter((s) => s.of?.priorite === 'Standard').length
    return { total: daySlots.length, urgences, constructeurs, standards }
  }

  const weeks = []
  for (let i = 0; i < grid.length; i += 7) {
    weeks.push(grid.slice(i, i + 7))
  }

  return (
    <div className="flex-1 overflow-auto p-4">
      {maintenanceCount > 0 && (
        <p className="text-xs text-slate-500 mb-3">
          {maintenanceCount} machine{maintenanceCount > 1 ? 's' : ''} en maintenance non affichée{maintenanceCount > 1 ? 's' : ''}.
        </p>
      )}

      {/* Day header */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAY_LABELS.map((d) => (
          <div key={d} className="text-center text-xs font-semibold text-slate-500 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="space-y-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-1">
            {week.map((day, di) => {
              if (!day) {
                return <div key={di} className="rounded-lg bg-slate-50 min-h-[80px]" />
              }
              const isToday = day.toDateString() === today.toDateString()
              const isCurrentMonth = day.getMonth() === currentDate.getMonth()
              const { total, urgences, constructeurs, standards } = getDaySummary(day)

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => onDayClick(day)}
                  className={[
                    'rounded-lg border text-left p-2 min-h-[80px] flex flex-col transition-colors hover:border-slate-400',
                    isToday
                      ? 'border-amber-400 bg-amber-50'
                      : isCurrentMonth
                      ? 'border-slate-200 bg-white'
                      : 'border-slate-100 bg-slate-50',
                  ].join(' ')}
                  title={`Voir le planning du ${day.toLocaleDateString('fr-FR')}`}
                >
                  <span
                    className={[
                      'text-sm font-semibold',
                      isToday ? 'text-amber-700' : isCurrentMonth ? 'text-slate-800' : 'text-slate-400',
                    ].join(' ')}
                  >
                    {day.getDate()}
                  </span>
                  {total > 0 && (
                    <div className="mt-1 flex-1 flex flex-col gap-0.5">
                      <span className="text-xs text-slate-600 font-medium">
                        {total} OF{total > 1 ? 's' : ''}
                      </span>
                      <div className="flex gap-1 flex-wrap">
                        {urgences > 0 && (
                          <span className="flex items-center gap-0.5 text-xs text-orange-700">
                            <span className={`inline-block w-2 h-2 rounded-full ${PRIORITY_DOT.Urgence}`} />
                            {urgences}
                          </span>
                        )}
                        {constructeurs > 0 && (
                          <span className="flex items-center gap-0.5 text-xs text-indigo-700">
                            <span className={`inline-block w-2 h-2 rounded-full ${PRIORITY_DOT.Constructeur}`} />
                            {constructeurs}
                          </span>
                        )}
                        {standards > 0 && (
                          <span className="flex items-center gap-0.5 text-xs text-slate-600">
                            <span className={`inline-block w-2 h-2 rounded-full ${PRIORITY_DOT.Standard}`} />
                            {standards}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  {total === 0 && (
                    <span className="text-xs text-slate-300 mt-1">—</span>
                  )}
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
