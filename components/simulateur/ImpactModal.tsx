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
  gamme: string
  machineId: string
  machineName: string
  dureeMinutes: number
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

export function ImpactModal({ open, onClose, impact, gamme, machineId, machineName, dureeMinutes }: ImpactModalProps) {
  const [confirming, setConfirming] = useState(false)

  async function handleConfirm() {
    setConfirming(true)
    const startTime = new Date()
    startTime.setHours(new Date().getHours(), 0, 0, 0)
    const endTime = new Date(startTime.getTime() + dureeMinutes * 60000)

    const res = await fetch('/api/simulateur/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        machine_id: machineId,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        gamme,
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
          <div className={`rounded-lg p-3 text-sm ${impact.any_sla_breach ? 'bg-red-50 border border-red-200' : 'bg-slate-50 border border-slate-200'}`}>
            <p className="font-semibold text-slate-800">
              Urgence sur <span className="text-orange-600">{machineName}</span> — {dureeMinutes} min
            </p>
            {gamme && <p className="text-slate-600 text-xs mt-0.5">{gamme}</p>}
          </div>

          {!hasAffected && (
            <p className="text-green-700 bg-green-50 rounded p-3 text-sm font-medium">
              ✓ Aucun OF impacté. L&apos;urgence peut être insérée sans décalage.
            </p>
          )}

          {hasAffected && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-700">OFs impactés :</p>
              <div className="max-h-48 overflow-y-auto space-y-2">
                {impact.affected_ofs.map((of) => (
                  <div
                    key={of.of_id}
                    className={`rounded p-2 text-sm border ${of.sla_breach ? 'bg-red-50 border-red-300' : 'bg-slate-50 border-slate-200'}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{of.reference_of}</span>
                      <span className="text-slate-500 text-xs">{of.client_nom}</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Op. <strong>{of.operation_nom}</strong> — décalé de <strong>{of.shift_minutes} min</strong> — nouvelle fin : {formatDateTime(of.new_end_time)}
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
            {confirming ? 'Insertion...' : impact.any_sla_breach ? 'Forcer malgré le SLA' : 'Confirmer l\'insertion'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
