'use client'

import Link from 'next/link'
import { AppShell } from '@/components/shared/AppShell'
import { Button } from '@/components/ui/button'
import { StatutBadge, PrioriteBadge } from '@/components/shared/StatusBadge'
import type { OrdreFabrication, Document, OFStatut, UserRole } from '@/lib/types'

interface CommandeDetailProps {
  order: OrdreFabrication
  documents: Document[]
  userName: string
  role: UserRole
}

const PROGRESS_STEPS: { statuts: OFStatut[]; label: string; description: string; icon: string }[] = [
  { statuts: ['A_planifier'],          label: 'Enregistrée',   description: 'Votre commande a été reçue',        icon: '📋' },
  { statuts: ['Planifie'],             label: 'Planifiée',      description: 'Programmée sur notre planning',      icon: '📅' },
  { statuts: ['En_cours'],             label: 'En fabrication', description: 'Votre commande est en cours d\'usinage', icon: '⚙️' },
  { statuts: ['Termine'],             label: 'Expédiée',       description: 'Commande prête / expédiée',          icon: '📦' },
]

function getStepIndex(statut: OFStatut): number {
  return PROGRESS_STEPS.findIndex((s) => s.statuts.includes(statut))
}

function ProgressTimeline({ statut }: { statut: OFStatut }) {
  const current = getStepIndex(statut)
  return (
    <div className="relative">
      <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-slate-200" />
      <div className="space-y-0">
        {PROGRESS_STEPS.map((step, idx) => {
          const done = idx <= current
          const active = idx === current
          return (
            <div key={step.label} className="flex items-start gap-4 relative pb-4 last:pb-0">
              <div
                className={[
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm border-2 shrink-0 z-10',
                  done
                    ? active
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-blue-100 border-blue-200 text-blue-700'
                    : 'bg-white border-slate-200 text-slate-300',
                ].join(' ')}
              >
                {done ? (active ? step.icon : '✓') : String(idx + 1)}
              </div>
              <div className={`pt-1 ${done ? '' : 'opacity-40'}`}>
                <p className={`text-sm font-semibold ${active ? 'text-blue-700' : done ? 'text-slate-700' : 'text-slate-400'}`}>
                  {step.label}
                </p>
                <p className="text-xs text-slate-500">{step.description}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const DOC_ICONS: Record<string, string> = { BL: '📄', Facture: '🧾', Autre: '📎' }

export function CommandeDetail({ order, documents, userName, role }: CommandeDetailProps) {
  return (
    <AppShell role={role} userName={userName}>
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Back */}
        <Link href="/portail" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
          ← Retour à mes commandes
        </Link>

        {/* Header card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Référence</p>
              <h1 className="text-2xl font-bold text-slate-900">{order.reference_of}</h1>
              {order.gamme && <p className="text-slate-500 mt-0.5">{order.gamme}</p>}
            </div>
            <div className="flex flex-col items-end gap-2">
              <StatutBadge statut={order.statut} />
              <PrioriteBadge priorite={order.priorite} />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-slate-500">Date limite</p>
              <p className="font-medium text-slate-800">
                {new Date(order.sla_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
            {order.start_time && (
              <div>
                <p className="text-xs text-slate-500">Démarrage prévu</p>
                <p className="font-medium text-slate-800">
                  {new Date(order.start_time).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                </p>
              </div>
            )}
          </div>
          {order.notes && (
            <div className="mt-3 p-3 bg-slate-50 rounded-lg text-sm text-slate-600">
              {order.notes}
            </div>
          )}
        </div>

        {/* Progress timeline */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Avancement</h2>
          <ProgressTimeline statut={order.statut} />
        </div>

        {/* Documents */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Documents</h2>
          {documents.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">
              Aucun document disponible pour le moment
            </p>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{DOC_ICONS[doc.type] ?? '📎'}</span>
                    <div>
                      <p className="text-sm font-medium text-slate-800">{doc.nom_fichier}</p>
                      <p className="text-xs text-slate-500">{doc.type} · {new Date(doc.created_at).toLocaleDateString('fr-FR')}</p>
                    </div>
                  </div>
                  <a
                    href={`/api/portail/documents?id=${doc.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button size="sm" variant="outline">Télécharger</Button>
                  </a>
                </div>
              ))}
            </div>
          )}

          {/* Generate PDF button (for Admin/ADV) */}
          {(role === 'Admin' || role === 'ADV') && order.statut === 'Termine' && (
            <div className="mt-3 pt-3 border-t border-slate-100 flex gap-2">
              <a href={`/api/portail/documents?of_id=${order.id}&type=BL`} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="outline">📄 Générer BL</Button>
              </a>
              <a href={`/api/portail/documents?of_id=${order.id}&type=Facture`} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="outline">🧾 Générer Facture</Button>
              </a>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
