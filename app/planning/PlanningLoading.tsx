export function PlanningLoading() {
  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar skeleton */}
      <div className="w-72 border-r bg-white p-4 flex flex-col gap-3">
        <div className="h-6 w-32 bg-slate-200 rounded animate-pulse" />
        <div className="h-4 w-24 bg-slate-100 rounded animate-pulse" />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="border rounded-lg p-3 flex flex-col gap-2">
            <div className="h-4 w-28 bg-slate-200 rounded animate-pulse" />
            <div className="h-3 w-20 bg-slate-100 rounded animate-pulse" />
            <div className="h-3 w-16 bg-slate-100 rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Gantt skeleton */}
      <div className="flex-1 flex flex-col">
        {/* Navigation bar */}
        <div className="h-14 border-b bg-white px-4 flex items-center gap-3">
          <div className="h-8 w-28 bg-slate-200 rounded animate-pulse" />
          <div className="h-8 w-24 bg-slate-200 rounded animate-pulse" />
          <div className="h-8 w-28 bg-slate-200 rounded animate-pulse" />
          <div className="ml-auto flex gap-2">
            <div className="h-8 w-16 bg-slate-900 rounded animate-pulse" />
            <div className="h-8 w-20 bg-slate-200 rounded animate-pulse" />
            <div className="h-8 w-14 bg-slate-200 rounded animate-pulse" />
          </div>
        </div>
        {/* Rows */}
        <div className="flex-1 overflow-hidden p-4 flex flex-col gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex gap-3 items-center">
              <div className="w-32 h-10 bg-slate-200 rounded animate-pulse" />
              <div className="flex-1 h-10 bg-slate-100 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
