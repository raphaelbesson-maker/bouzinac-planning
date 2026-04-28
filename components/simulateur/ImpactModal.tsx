'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import type { ImpactResult } from '@/lib/types'

interface ImpactModalProps {
  open: boolean
  onClose: () => void
  impact: ImpactResult
  gammeId: string
  gammeName: string
  machineId: string
  machineName: string
  dureeMinutes: number
  startTime: string
  endTime: string
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

export function ImpactModal({
  open, onClose, impact,
  gammeId, gammeName, machineId, machineName,
  dureeMinutes, startTime, endTime,
}: ImpactModalProps) {
  const [confirming, setConfirming] = useState(false)

  async function handleConfirm() {
    setConfirming(true)
    const res = await fetch('/api/simulateur/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        machine_id: machineId,
        start_time: startTime,
        end_time: endTime,
        gamme_id: gammeId || null,
        duree_minutes: dureeMinutes,
      }),
    })

    if (res.ok) {
      toast.success('Urgence SAV insérée dans le planning.')
      onClose()
    } else {
      const data = await res.json().catch(() => ({}))
      toast.error(data.error ?? 'Impossible d\'insérer l\'urgence.')
    }
    setConfirming(false)
  }

  const hasAffected = impact.affected_ofs.length > 0

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {impact.any_sla_breach ? '⚠ Alerte : SLA dépassé' : 'Impact de l\'urgence SAV'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary card */}
          <div className={`rounded-lg p-3 text-sm ${impact.any_sla_breach ? 'bg-red-50 border border-red-200' : 'bg-orange-50 border border-orange-200'}`}>
            <p className="font-semibold text-slate-800">
              {gammeName || 'SAV'} sur <span className="text-orange-600">{machineName}</span>
            </p>
            <p className="text-slate-600 text-xs mt-0.5">
              {formatDateTime(startTime)} → {formatDateTime(endTime)} ({dureeMinutes} min)
            </p>
          </div>

          {!hasAffected && (
            <p className="text-green-700 bg-green-50 rounded-lg border border-green-200 p-3 text-sm font-medium">
              ✓ Aucun OF impacté. L&apos;urgence peut être insérée sans décalage.
            </p>
          )}

          {hasAffected && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-700">
                {impact.affected_ofs.length} OF{impact.affected_ofs.length > 1 ? 's' : ''} impacté{impact.affected_ofs.length > 1 ? 's' : ''} :
              </p>
              <div className="max-h-52 overflow-y-auto space-y-2">
                {impact.affected_ofs.map((of) => (
                  <div
                    key={of.of_id}
                    className={`rounded-lg p-2.5 text-sm border ${of.sla_breach ? 'bg-red-50 border-red-300' : 'bg-slate-50 border-slate-200'}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{of.reference_of}</span>
                      <span className="text-slate-500 text-xs">{of.client_nom}</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">
                      <strong>{of.operation_nom}</strong> — décalé de <strong>+{of.shift_minutes} min</strong> — nouvelle fin : {formatDateTime(of.new_end_time)}
                    </p>
                    {of.sla_breach && (
                      <p className="text-red-600 text-xs font-semibold mt-0.5">
                        ⚠ SLA dépassé (limite : {of.sla_date})
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {impact.any_sla_breach && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">
              En confirmant, vous acceptez le dépassement de SLA pour les OFs indiqués ci-dessus.
            </p>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={onClose} className="flex-1 h-12">
            Annuler
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={confirming}
            className={`flex-1 h-12 font-semibold ${impact.any_sla_breach ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-orange-500 hover:bg-orange-600 text-white'}`}
          >
            {confirming ? 'Insertion...' : impact.any_sla_breach ? '⚠ Forcer malgré le SLA' : '✓ Confirmer l\'insertion'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
