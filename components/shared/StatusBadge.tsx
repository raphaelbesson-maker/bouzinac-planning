import type { OFStatut, OFPriorite } from '@/lib/types'

const STATUT_STYLES: Record<OFStatut, string> = {
  A_planifier: 'bg-slate-100 text-slate-700',
  Planifie: 'bg-blue-100 text-blue-700',
  En_cours: 'bg-yellow-100 text-yellow-800',
  Termine: 'bg-green-100 text-green-700',
}

const STATUT_LABELS: Record<OFStatut, string> = {
  A_planifier: 'À planifier',
  Planifie: 'Planifié',
  En_cours: 'En cours',
  Termine: 'Terminé',
}

const PRIORITE_STYLES: Record<OFPriorite, string> = {
  Standard: 'bg-slate-200 text-slate-700',
  Urgence: 'bg-orange-100 text-orange-700',
  Constructeur: 'bg-indigo-100 text-indigo-700',
}

export function StatutBadge({ statut }: { statut: OFStatut }) {
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUT_STYLES[statut]}`}>
      {STATUT_LABELS[statut]}
    </span>
  )
}

export function PrioriteBadge({ priorite }: { priorite: OFPriorite }) {
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${PRIORITE_STYLES[priorite]}`}>
      {priorite}
    </span>
  )
}
