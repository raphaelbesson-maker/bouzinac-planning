'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { AppShell } from '@/components/shared/AppShell'
import type { OrdreFabrication, OFStatut, UserRole } from '@/lib/types'

interface PortailClientProps {
  initialOrders: OrdreFabrication[]
  userName: string
  clientNom: string
  role: UserRole
}

// 3-step progress track for portal clients
const PROGRESS_STEPS: { statuts: OFStatut[]; label: string; icon: string }[] = [
  { statuts: ['A_planifier'],            label: 'Enregistrée',   icon: '📋' },
  { statuts: ['Planifie', 'En_cours'],   label: 'En fabrication', icon: '⚙️' },
  { statuts: ['Termine'],               label: 'Expédiée',       icon: '📦' },
]

function getStepIndex(statut: OFStatut): number {
  return PROGRESS_STEPS.findIndex((s) => s.statuts.includes(statut))
}

function ProgressGauge({ statut }: { statut: OFStatut }) {
  const current = getStepIndex(statut)
  return (
    <div className="flex items-center gap-0 mt-3">
      {PROGRESS_STEPS.map((step, idx) => {
        const done = idx <= current
        const active = idx === current
        return (
          <div key={step.label} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div
                className={[
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all',
                  done
                    ? active
                      ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-200'
                      : 'bg-blue-100 border-blue-300 text-blue-700'
                    : 'bg-white border-slate-200 text-slate-300',
                ].join(' ')}
              >
                {done ? (active ? step.icon : '✓') : idx + 1}
              </div>
              <span className={`text-xs mt-1 font-medium ${done ? 'text-blue-700' : 'text-slate-400'}`}>
                {step.label}
              </span>
            </div>
            {idx < PROGRESS_STEPS.length - 1 && (
              <div
                className={`h-0.5 flex-1 mb-5 transition-all ${idx < current ? 'bg-blue-400' : 'bg-slate-200'}`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - now.getTime()) / 86400000)
}

function SLABadge({ slaDate, statut }: { slaDate: string; statut: OFStatut }) {
  if (statut === 'Termine') return null
  const days = daysUntil(slaDate)
  if (days < 0) return <span className="text-xs font-semibold text-red-600">⚠ Délai dépassé</span>
  if (days <= 2) return <span className="text-xs font-semibold text-red-500">⚠ Livraison dans {days}j</span>
  if (days <= 5) return <span className="text-xs text-orange-500">Livraison dans {days}j</span>
  return <span className="text-xs text-slate-400">{new Date(slaDate).toLocaleDateString('fr-FR')}</span>
}

function OrderCard({ order }: { order: OrdreFabrication }) {
  const isTermine = order.statut === 'Termine'
  return (
    <Link href={`/portail/commandes/${order.id}`} className="block">
      <div
        className={[
          'bg-white rounded-2xl border p-4 shadow-sm hover:shadow-md transition-shadow active:scale-[0.99]',
          isTermine ? 'border-slate-200 opacity-70' : 'border-slate-200',
        ].join(' ')}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-bold text-slate-900 text-base">{order.reference_of}</p>
            {order.gamme && (
              <p className="text-sm text-slate-500 mt-0.5">{order.gamme}</p>
            )}
          </div>
          <div className="text-right shrink-0">
            <SLABadge slaDate={order.sla_date} statut={order.statut} />
          </div>
        </div>
        <ProgressGauge statut={order.statut} />
      </div>
    </Link>
  )
}

export function PortailClient({ initialOrders, userName, clientNom, role }: PortailClientProps) {
  const { active, done } = useMemo(() => ({
    active: initialOrders.filter((o) => o.statut !== 'Termine'),
    done: initialOrders.filter((o) => o.statut === 'Termine'),
  }), [initialOrders])

  return (
    <AppShell role={role} userName={userName}>
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Welcome */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-5 text-white">
          <p className="text-blue-100 text-sm">Bienvenue</p>
          <h1 className="text-xl font-bold mt-0.5">{clientNom || userName}</h1>
          <p className="text-blue-100 text-sm mt-1">
            {active.length} commande{active.length !== 1 ? 's' : ''} en cours
          </p>
        </div>

        {/* Active orders */}
        {active.length === 0 && done.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <p className="text-4xl mb-3">📭</p>
            <p className="font-medium">Aucune commande en cours</p>
            <p className="text-sm mt-1">Contactez votre commercial pour passer une commande</p>
          </div>
        )}

        {active.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Commandes en cours</h2>
            {active.map((o) => <OrderCard key={o.id} order={o} />)}
          </div>
        )}

        {/* Completed orders */}
        {done.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">Terminées</h2>
            {done.slice(0, 5).map((o) => <OrderCard key={o.id} order={o} />)}
            {done.length > 5 && (
              <p className="text-xs text-center text-slate-400">+{done.length - 5} commandes archivées</p>
            )}
          </div>
        )}
      </div>
    </AppShell>
  )
}
