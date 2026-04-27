export function GanttLegend() {
  return (
    <div className="flex items-center gap-4 px-4 py-2 bg-white border-b border-slate-200 text-xs">
      <span className="font-semibold text-slate-600">Légende :</span>
      <div className="flex items-center gap-1.5">
        <span className="w-4 h-4 rounded border-2 bg-slate-200 border-slate-400 inline-block" />
        <span className="text-slate-600">Standard</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="w-4 h-4 rounded border-2 bg-orange-300 border-orange-500 inline-block" />
        <span className="text-slate-600">Urgence SAV</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="w-4 h-4 rounded border-2 bg-indigo-200 border-indigo-400 inline-block" />
        <span className="text-slate-600">Constructeur</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="w-4 h-4 rounded border-2 border-red-600 bg-red-100 inline-block animate-pulse" />
        <span className="text-slate-600">Conflit</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span>🔒</span>
        <span className="text-slate-600">En cours (verrouillé)</span>
      </div>
    </div>
  )
}
