'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { usePlanningStore } from '@/stores/planningStore'
import type { OrdreFabrication, PlanningSlot } from '@/lib/types'

interface OFDetailModalProps {
  of: OrdreFabrication | null
  slot: PlanningSlot | null
  open: boolean
  onClose: () => void
}

const STATUT_LABELS: Record<string, string> = {
  A_planifier: 'À planifier',
  Planifie: 'Planifié',
  En_cours: 'En cours',
  Termine: 'Terminé',
}

const PRIORITE_COLORS: Record<string, string> = {
  Standard: 'bg-slate-100 text-slate-700',
  Urgence: 'bg-orange-100 text-orange-700',
  Constructeur: 'bg-indigo-100 text-indigo-700',
}

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - now.getTime()) / 86400000)
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

export function OFDetailModal({ of: of_, slot, open, onClose }: OFDetailModalProps) {
  const [loading, setLoading] = useState(false)
  const { removeSlot, setUnscheduledOFs, unscheduledOFs } = usePlanningStore()

  if (!of_) return null

  const days = daysUntil(of_.sla_date)
  const slaUrgent = days <= 2
  const durationH = Math.floor(of_.temps_estime_minutes / 60)
  const durationM = of_.temps_estime_minutes % 60

  async function handleUnschedule() {
    if (!slot) return
    setLoading(true)
    try {
      const res = await fetch('/api/planning/unschedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slot_id: slot.id, of_id: of_!.id }),
      })
      if (!res.ok) throw new Error()
      // Optimistic: remove slot, move OF back to sidebar
      removeSlot(slot.id)
      setUnscheduledOFs([
        { ...of_!, statut: 'A_planifier', machine_id: null, start_time: null, end_time: null },
        ...unscheduledOFs,
      ])
      toast.success(`${of_!.reference_of} retiré du planning`)
      onClose()
    } catch {
      toast.error('Impossible de retirer cet OF du planning')
    } finally {
      setLoading(false)
    }
  }

  async function updateStatut(newStatut: string) {
    setLoading(true)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const updates: Record<string, unknown> = { statut: newStatut }
      if (newStatut === 'En_cours' && slot) updates.locked = true

      // Update planning_slot locked if moving to En_cours
      if (newStatut === 'En_cours' && slot) {
        await supabase.from('planning_slots').update({ locked: true }).eq('id', slot.id)
      }
      await supabase.from('ordres_fabrication').update(updates).eq('id', of_!.id)
      toast.success(`Statut mis à jour : ${STATUT_LABELS[newStatut]}`)
      onClose()
    } catch {
      toast.error('Impossible de modifier le statut')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!confirm(`Supprimer définitivement l'OF ${of_!.reference_of} ?`)) return
    setLoading(true)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      if (slot) {
        await supabase.from('planning_slots').delete().eq('id', slot.id)
        removeSlot(slot.id)
      }
      await supabase.from('ordres_fabrication').delete().eq('id', of_!.id)
      setUnscheduledOFs(unscheduledOFs.filter((o) => o.id !== of_!.id))
      toast.success(`OF ${of_!.reference_of} supprimé`)
      onClose()
    } catch {
      toast.error('Impossible de supprimer cet OF')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-slate-900">
            {of_.reference_of}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-1">
          {/* Badges */}
          <div className="flex gap-2 flex-wrap">
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${PRIORITE_COLORS[of_.priorite]}`}>
              {of_.priorite}
            </span>
            <span className="text-xs font-medium px-2 py-1 rounded-full bg-slate-100 text-slate-700">
              {STATUT_LABELS[of_.statut]}
            </span>
            {of_.statut === 'En_cours' && (
              <span className="text-xs font-medium px-2 py-1 rounded-full bg-yellow-100 text-yellow-700">
                🔒 Verrouillé
              </span>
            )}
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm border rounded-lg p-3 bg-slate-50">
            <span className="text-slate-500">Client</span>
            <span className="font-medium text-slate-900">{of_.client_nom}</span>

            {of_.gamme && <>
              <span className="text-slate-500">Gamme</span>
              <span className="font-medium text-slate-900">{of_.gamme}</span>
            </>}

            <span className="text-slate-500">Durée estimée</span>
            <span className="font-medium text-slate-900">
              {durationH > 0 ? `${durationH}h` : ''}{durationM > 0 ? ` ${durationM}min` : ''}
            </span>

            <span className="text-slate-500">SLA</span>
            <span className={`font-medium ${slaUrgent ? 'text-red-600' : 'text-slate-900'}`}>
              {formatDate(of_.sla_date)}{' '}
              {days <= 0 ? '⚠ DÉPASSÉ' : days === 1 ? '(Demain)' : `(J-${days})`}
            </span>

            {slot && <>
              <span className="text-slate-500">Début</span>
              <span className="font-medium text-slate-900">{formatDateTime(slot.start_time)}</span>
              <span className="text-slate-500">Fin</span>
              <span className="font-medium text-slate-900">{formatDateTime(slot.end_time)}</span>
            </>}
          </div>

          {of_.notes && (
            <div className="text-sm text-slate-600 border rounded-lg p-3 bg-amber-50 border-amber-200">
              <span className="font-medium text-amber-800">Notes :</span> {of_.notes}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 pt-2 border-t">
          {/* Planifié → retirer ou marquer En cours */}
          {of_.statut === 'Planifie' && slot && (
            <>
              <Button
                variant="outline"
                className="w-full justify-start"
                disabled={loading}
                onClick={() => updateStatut('En_cours')}
              >
                ▶ Marquer En cours (verrouiller)
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start text-orange-700 border-orange-300 hover:bg-orange-50"
                disabled={loading}
                onClick={handleUnschedule}
              >
                ↩ Retirer du planning
              </Button>
            </>
          )}

          {/* En cours → Terminé */}
          {of_.statut === 'En_cours' && (
            <Button
              variant="outline"
              className="w-full justify-start text-green-700 border-green-300 hover:bg-green-50"
              disabled={loading}
              onClick={() => updateStatut('Termine')}
            >
              ✓ Marquer Terminé
            </Button>
          )}

          {/* Terminé → Réouvrir */}
          {of_.statut === 'Termine' && (
            <Button
              variant="outline"
              className="w-full justify-start"
              disabled={loading}
              onClick={() => updateStatut('A_planifier')}
            >
              ↩ Réouvrir (remettre À planifier)
            </Button>
          )}

          {/* Supprimer (toujours disponible) */}
          <Button
            variant="outline"
            className="w-full justify-start text-red-600 border-red-200 hover:bg-red-50"
            disabled={loading}
            onClick={handleDelete}
          >
            🗑 Supprimer définitivement
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
