'use client'

import { useState, useMemo, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { usePlanningStore } from '@/stores/planningStore'
import { SidebarOFCard } from './SidebarOFCard'
import type { OrdreFabrication } from '@/lib/types'

interface SidebarOFProps {
  onOpenDetail: (of: OrdreFabrication) => void
}

type QuickFilter = 'all' | 'urgence' | 'sla_critique' | 'constructeur'

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - now.getTime()) / 86400000)
}

export function SidebarOF({ onOpenDetail }: SidebarOFProps) {
  const unscheduledOFs = usePlanningStore((s) => s.unscheduledOFs)
  const isLoading = usePlanningStore((s) => s.isLoading)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<QuickFilter>('all')
  const [alertDays, setAlertDays] = useState(2)

  useEffect(() => {
    const supabase = createClient()
    supabase.from('reglements').select('value').eq('key', 'alert_sla_days_ahead').single()
      .then(({ data }) => { if (data) setAlertDays(Number(data.value)) })
  }, [])

  const filtered = useMemo(() => {
    let ofs = unscheduledOFs

    if (search.trim()) {
      const q = search.trim().toLowerCase()
      ofs = ofs.filter(
        (of) =>
          of.reference_of.toLowerCase().includes(q) ||
          of.client_nom.toLowerCase().includes(q)
      )
    }

    if (filter === 'urgence') ofs = ofs.filter((of) => of.priorite === 'Urgence')
    else if (filter === 'constructeur') ofs = ofs.filter((of) => of.priorite === 'Constructeur')
    else if (filter === 'sla_critique') ofs = ofs.filter((of) => daysUntil(of.sla_date) <= alertDays)

    return ofs
  }, [unscheduledOFs, search, filter])

  const FILTERS: { key: QuickFilter; label: string; activeClass: string }[] = [
    { key: 'all', label: 'Tous', activeClass: 'bg-slate-900 text-white' },
    { key: 'urgence', label: 'Urgence', activeClass: 'bg-orange-500 text-white' },
    { key: 'sla_critique', label: `SLA ≤ ${alertDays}j`, activeClass: 'bg-red-500 text-white' },
    { key: 'constructeur', label: 'Constructeur', activeClass: 'bg-indigo-500 text-white' },
  ]

  return (
    <aside className="w-64 flex-shrink-0 flex flex-col border-r border-slate-200 bg-slate-50">
      <div className="px-3 py-3 border-b border-slate-200 bg-white space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-slate-900 text-base">À planifier</h2>
          <span className="text-xs text-slate-500">
            {filtered.length}{filtered.length !== unscheduledOFs.length ? `/${unscheduledOFs.length}` : ''} OF{unscheduledOFs.length !== 1 ? 's' : ''}
          </span>
        </div>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Chercher un OF ou client…"
          className="w-full h-9 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white"
        />

        <div className="flex flex-wrap gap-1">
          {FILTERS.map(({ key, label, activeClass }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={[
                'text-xs px-2 py-1 rounded-md font-medium transition-colors',
                filter === key ? activeClass : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {isLoading && (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-slate-200 rounded-lg animate-pulse" />
            ))}
          </div>
        )}
        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            {unscheduledOFs.length === 0 ? (
              <>
                <p className="text-4xl mb-2">✓</p>
                <p className="text-sm">Aucun OF à planifier</p>
              </>
            ) : (
              <>
                <p className="text-2xl mb-2">🔍</p>
                <p className="text-sm">Aucun résultat</p>
                <button
                  onClick={() => { setSearch(''); setFilter('all') }}
                  className="text-xs text-slate-500 underline mt-1"
                >
                  Réinitialiser les filtres
                </button>
              </>
            )}
          </div>
        )}
        {!isLoading &&
          filtered.map((of) => (
            <SidebarOFCard key={of.id} of={of} onOpenDetail={onOpenDetail} alertDays={alertDays} />
          ))}
      </div>
    </aside>
  )
}
