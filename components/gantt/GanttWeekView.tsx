'use client'

import { useDroppable } from '@dnd-kit/core'
import type { Machine, OrdreFabrication, PlanningSlot } from '@/lib/types'

interface GanttWeekViewProps {
  machines: Machine[]
  slots: PlanningSlot[]
  weekStart: Date
  draggable?: boolean
  onDayClick: (date: Date) => void
  onOpenDetail?: (of: OrdreFabrication, slot: PlanningSlot) => void
}

function getWeekDays(monday: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

function getMondayOf(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  return d
}

function formatDay(date: Date): string {
  return date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
}

function minutesToLabel(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`
}

const PRIORITY_COLORS = {
  Standard: 'bg-slate-200 border-slate-400 text-slate-800',
  Urgence: 'bg-orange-200 border-orange-400 text-orange-900',
  Constructeur: 'bg-indigo-200 border-indigo-400 text-indigo-900',
}

function WeekCell({
  machineId,
  date,
  slots,
  draggable,
  onOpenDetail,
}: {
  machineId: string
  date: Date
  slots: PlanningSlot[]
  draggable: boolean
  onOpenDetail?: (of: OrdreFabrication, slot: PlanningSlot) => void
}) {
  const droppableId = `week-${machineId}-${date.toISOString().split('T')[0]}`
  const { setNodeRef, isOver } = useDroppable({
    id: droppableId,
    data: { machineId, date: date.toISOString() },
    disabled: !draggable,
  })

  const isToday = new Date().toDateString() === date.toDateString()

  return (
    <div
      ref={setNodeRef}
      className={[
        'border-r border-slate-200 p-1 min-h-[72px] flex flex-col gap-1 transition-colors',
        isOver ? 'bg-blue-50' : isToday ? 'bg-amber-50' : 'bg-white',
        draggable ? '' : 'cursor-default',
      ].join(' ')}
      style={{ minWidth: 140 }}
    >
      {slots.map((slot) => {
        const of_ = slot.of
        if (!of_) return null
        const colorClass = PRIORITY_COLORS[of_.priorite]
        return (
          <div
            key={slot.id}
            className={`rounded border px-1.5 py-0.5 text-xs truncate cursor-pointer hover:opacity-80 transition-opacity ${colorClass}`}
            title={`${of_.reference_of} — ${of_.client_nom} (${minutesToLabel(of_.temps_estime_minutes)})`}
            onClick={() => onOpenDetail?.(of_, slot)}
          >
            <span className="font-semibold">{of_.reference_of}</span>
            <span className="opacity-70 ml-1">{minutesToLabel(of_.temps_estime_minutes)}</span>
          </div>
        )
      })}
    </div>
  )
}

export function GanttWeekView({
  machines,
  slots,
  weekStart,
  draggable = true,
  onDayClick,
  onOpenDetail,
}: GanttWeekViewProps) {
  const monday = getMondayOf(weekStart)
  const days = getWeekDays(monday)

  function getSlotsForMachineAndDate(machineId: string, date: Date): PlanningSlot[] {
    return slots.filter((s) => {
      if (s.machine_id !== machineId) return false
      return new Date(s.start_time).toDateString() === date.toDateString()
    })
  }

  const today = new Date()

  return (
    <div className="overflow-auto flex-1">
      <table className="border-collapse w-full min-w-max">
        <thead className="sticky top-0 z-20 bg-slate-50">
          <tr>
            {/* Machine column header */}
            <th className="w-40 min-w-[160px] border-b-2 border-r border-slate-300 px-3 py-2 text-left">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Machine</span>
            </th>
            {days.map((day) => {
              const isToday = day.toDateString() === today.toDateString()
              return (
                <th
                  key={day.toISOString()}
                  className={[
                    'border-b-2 border-r border-slate-300 px-2 py-2 text-left cursor-pointer hover:bg-slate-100 transition-colors',
                    isToday ? 'bg-amber-100' : '',
                  ].join(' ')}
                  style={{ minWidth: 140 }}
                  onClick={() => onDayClick(day)}
                  title="Cliquer pour voir le détail du jour"
                >
                  <span className={`text-xs font-semibold capitalize ${isToday ? 'text-amber-700' : 'text-slate-700'}`}>
                    {formatDay(day)}
                  </span>
                  {isToday && (
                    <span className="ml-1.5 text-xs bg-amber-500 text-white rounded px-1 py-0.5">Aujourd&apos;hui</span>
                  )}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {machines.map((machine) => {
            const isMaintenance = machine.statut === 'Maintenance'
            return (
              <tr key={machine.id} className="border-b border-slate-200">
                {/* Machine label */}
                <td className="w-40 border-r border-slate-200 px-3 py-2 bg-white align-top">
                  <p className="text-sm font-semibold text-slate-800">{machine.nom}</p>
                  <p className={`text-xs ${isMaintenance ? 'text-red-500' : 'text-slate-500'}`}>
                    {isMaintenance ? 'Maintenance' : machine.heures_ouverture}
                  </p>
                </td>
                {days.map((day) => {
                  const daySlots = getSlotsForMachineAndDate(machine.id, day)
                  if (isMaintenance) {
                    return (
                      <td
                        key={day.toISOString()}
                        className="border-r border-slate-200 bg-slate-100 min-h-[72px] px-1 py-1 align-top text-center"
                        style={{ minWidth: 140 }}
                      >
                        <span className="text-xs text-slate-400 italic">Maintenance</span>
                      </td>
                    )
                  }
                  return (
                    <td key={day.toISOString()} className="p-0 align-top">
                      <WeekCell
                        machineId={machine.id}
                        date={day}
                        slots={daySlots}
                        draggable={draggable}
                        onOpenDetail={onOpenDetail}
                      />
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
