'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { usePlanningStore } from '@/stores/planningStore'
import type { OFOperation, OrdreFabrication } from '@/lib/types'

interface OFDetailModalProps {
  of: OrdreFabrication | null
  operation: OFOperation | null
  open: boolean
  onClose: () => void
}

const STATUT_LABELS: Record<string, string> = {
  A_planifier: 'À planifier',
  Planifie:    'Planifié',
  En_cours:    'En cours',
  Termine:     'Terminé',
}

const STATUT_COLORS: Record<string, string> = {
  A_planifier: 'bg-slate-100 text-slate-600',
  Planifie:    'bg-blue-100 text-blue-700',
  En_cours:    'bg-yellow-100 text-yellow-700',
  Termine:     'bg-green-100 text-green-700',
}

const PRIORITE_COLORS: Record<string, string> = {
  Standard:     'bg-slate-100 text-slate-700',
  Urgence:      'bg-orange-100 text-orange-700',
  Constructeur: 'bg-indigo-100 text-indigo-700',
}

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - now.getTime()) / 86400000)
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export function OFDetailModal({ of: of_, operation, open, onClose }: OFDetailModalProps) {
  const [loading, setLoading] = useState(false)
  const { removeOperation, setUnscheduledOFs, unscheduledOFs } = usePlanningStore()

  if (!of_) return null

  const days = daysUntil(of_.sla_date)
  const slaUrgent = days <= 2
  const allOps = of_.of_operations ?? []

  async function handleUnschedule() {
    if (!operation) return
    setLoading(true)
    try {
      const res = await fetch('/api/planning/unschedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operation_id: operation.id, of_id: of_!.id }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      removeOperation(operation.id)
      // Re-add OF to sidebar if not already there
      if (!unscheduledOFs.find((o) => o.id === of_!.id)) {
        setUnscheduledOFs([{ ...of_!, statut: 'A_planifier' }, ...unscheduledOFs])
      }
      toast.success(`Opération "${operation.nom}" retirée du planning`)
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Impossible de retirer cette opération')
    } finally {
      setLoading(false)
    }
  }

  async function handleStatusChange(newStatut: string) {
    if (!operation) return
    setLoading(true)
    try {
      const res = await fetch('/api/planning/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operation_id: operation.id, statut: newStatut }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      toast.success(`Statut mis à jour : ${STATUT_LABELS[newStatut]}`)
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Impossible de modifier le statut')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!confirm(`Supprimer définitivement l'OF ${of_!.reference_of} et toutes ses opérations ?`)) return
    setLoading(true)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-slate-900">
            {of_.reference_of}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Badges */}
          <div className="flex gap-2 flex-wrap">
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${PRIORITE_COLORS[of_.priorite]}`}>
              {of_.priorite}
            </span>
            <span className="text-xs font-medium px-2 py-1 rounded-full bg-slate-100 text-slate-700">
              {STATUT_LABELS[of_.statut]}
            </span>
          </div>

          {/* OF info */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm border rounded-lg p-3 bg-slate-50">
            <span className="text-slate-500">Client</span>
            <span className="font-medium text-slate-900">{of_.client_nom}</span>

            <span className="text-slate-500">SLA</span>
            <span className={`font-medium ${slaUrgent ? 'text-red-600' : 'text-slate-900'}`}>
              {formatDate(of_.sla_date)}{' '}
              {days <= 0 ? '⚠ DÉPASSÉ' : days === 1 ? '(Demain)' : `(J-${days})`}
            </span>
          </div>

          {/* Operations list */}
          {allOps.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Gamme de fabrication ({allOps.length} étapes)
              </p>
              <div className="space-y-1">
                {allOps
                  .slice()
                  .sort((a, b) => a.ordre - b.ordre)
                  .map((op) => {
                    const isSelected = op.id === operation?.id
                    return (
                      <div
                        key={op.id}
                        className={[
                          'flex items-start gap-3 rounded-lg p-2.5 border text-sm',
                          isSelected ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white',
                        ].join(' ')}
                      >
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                          {op.ordre}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-slate-900">{op.nom}</span>
                            <span className="text-xs text-slate-500">— {op.categorie_machine}</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded-full ${STATUT_COLORS[op.statut]}`}>
                              {STATUT_LABELS[op.statut]}
                            </span>
                            {op.locked && <span title="En cours">🔒</span>}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {op.duree_minutes} min
                            {op.start_time && op.end_time && (
                              <span className="ml-2">
                                · {formatDateTime(op.start_time)} → {formatDateTime(op.end_time)}
                              </span>
                            )}
                            {op.machine && <span className="ml-2 text-slate-400">· {op.machine.nom}</span>}
                          </div>
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>
          )}

          {of_.notes && (
            <div className="text-sm text-slate-600 border rounded-lg p-3 bg-amber-50 border-amber-200">
              <span className="font-medium text-amber-800">Notes :</span> {of_.notes}
            </div>
          )}
        </div>

        {/* Actions for the selected operation */}
        {operation && (
          <div className="flex flex-col gap-2 pt-2 border-t">
            <p className="text-xs text-slate-400">Actions sur : {operation.nom}</p>

            {operation.statut === 'Planifie' && (
              <>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  disabled={loading}
                  onClick={() => handleStatusChange('En_cours')}
                >
                  ▶ Démarrer (verrouiller)
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

            {operation.statut === 'En_cours' && (
              <Button
                variant="outline"
                className="w-full justify-start text-green-700 border-green-300 hover:bg-green-50"
                disabled={loading}
                onClick={() => handleStatusChange('Termine')}
              >
                ✓ Marquer Terminé
              </Button>
            )}
          </div>
        )}

        <div className="pt-1 border-t">
          <Button
            variant="outline"
            className="w-full justify-start text-red-600 border-red-200 hover:bg-red-50"
            disabled={loading}
            onClick={handleDelete}
          >
            🗑 Supprimer l&apos;OF définitivement
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
