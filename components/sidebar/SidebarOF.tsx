'use client'

import { usePlanningStore } from '@/stores/planningStore'
import { SidebarOFCard } from './SidebarOFCard'
import type { OrdreFabrication } from '@/lib/types'

interface SidebarOFProps {
  onOpenDetail: (of: OrdreFabrication) => void
}

export function SidebarOF({ onOpenDetail }: SidebarOFProps) {
  const unscheduledOFs = usePlanningStore((s) => s.unscheduledOFs)
  const isLoading = usePlanningStore((s) => s.isLoading)

  return (
    <aside className="w-64 flex-shrink-0 flex flex-col border-r border-slate-200 bg-slate-50">
      <div className="px-4 py-3 border-b border-slate-200 bg-white">
        <h2 className="font-bold text-slate-900 text-base">À planifier</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          {unscheduledOFs.length} OF{unscheduledOFs.length !== 1 ? 's' : ''} en attente
        </p>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {isLoading && (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-slate-200 rounded-lg animate-pulse" />
            ))}
          </div>
        )}
        {!isLoading && unscheduledOFs.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <p className="text-4xl mb-2">✓</p>
            <p className="text-sm">Aucun OF à planifier</p>
          </div>
        )}
        {!isLoading &&
          unscheduledOFs.map((of) => (
            <SidebarOFCard key={of.id} of={of} onOpenDetail={onOpenDetail} />
          ))}
      </div>
    </aside>
  )
}
