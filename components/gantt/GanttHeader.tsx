interface GanttHeaderProps {
  date: Date
  startHour: number
  endHour: number
  pixelsPerMinute: number
}

export function GanttHeader({ startHour, endHour, pixelsPerMinute }: GanttHeaderProps) {
  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i)
  const hourWidth = 60 * pixelsPerMinute

  return (
    <div className="flex border-b-2 border-slate-300 bg-slate-50 sticky top-0 z-20">
      {/* Machine column spacer */}
      <div className="w-40 flex-shrink-0 border-r border-slate-200 flex items-center px-3 py-2">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Machine</span>
      </div>

      {/* Hour columns */}
      <div className="flex">
        {hours.map((hour) => (
          <div
            key={hour}
            className="flex-shrink-0 border-r border-slate-200 flex items-center justify-start px-2 py-2"
            style={{ width: hourWidth }}
          >
            <span className="text-xs font-medium text-slate-600">
              {String(hour).padStart(2, '0')}h00
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
