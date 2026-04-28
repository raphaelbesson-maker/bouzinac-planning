'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { usePlanningStore } from '@/stores/planningStore'

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

interface ScheduleResult {
  scheduled: { operation_id: string; of_reference: string; nom: string; machine_nom: string; start_time: string }[]
  skipped: { operation_id: string; of_reference: string; nom: string; reason: string }[]
}

export function AutoScheduleButton() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ScheduleResult | null>(null)
  const { setUnscheduledOFs, unscheduledOFs } = usePlanningStore()

  async function handleAutoSchedule() {
    if (!confirm('Claude va analyser les OFs en attente et les planifier automatiquement. Continuer ?')) return
    setLoading(true)
    try {
      const res = await fetch('/api/planning/auto-schedule', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erreur serveur')
      setResult(data)
      // Refresh unscheduled list — remove OFs that are now fully scheduled
      if (data.scheduled.length > 0) {
        // Remove OFs that are fully scheduled from the sidebar (will reload via realtime)
        const scheduledOFRefs = new Set(data.scheduled.map((s: { of_reference: string }) => s.of_reference))
        setUnscheduledOFs(unscheduledOFs.filter((of) => !scheduledOFRefs.has(of.reference_of)))
        toast.success(`${data.scheduled.length} opération(s) planifiée(s) par l'IA`)
      } else {
        toast.info(data.message ?? 'Aucune opération à planifier.')
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur lors de la planification automatique')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={handleAutoSchedule}
        disabled={loading}
        title="Planifier automatiquement avec l'IA"
        className={[
          'flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md font-medium transition-colors border',
          loading
            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
            : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100',
        ].join(' ')}
      >
        {loading ? (
          <>
            <span className="animate-spin">⏳</span>
            <span>IA en cours…</span>
          </>
        ) : (
          <>
            <span>✨</span>
            <span>Planifier avec l&apos;IA</span>
          </>
        )}
      </button>

      {result && (
        <Dialog open={result !== null} onOpenChange={(o) => { if (!o) setResult(null) }}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-slate-900">
                ✨ Résultat de la planification IA
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-1 max-h-[60vh] overflow-y-auto">
              {result.scheduled.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    ✓ {result.scheduled.length} opération(s) planifiée(s)
                  </p>
                  <div className="space-y-1">
                    {result.scheduled.map((s) => (
                      <div key={s.operation_id} className="flex items-center justify-between text-sm bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                        <div>
                          <span className="font-semibold text-slate-900">{s.of_reference}</span>
                          <span className="text-slate-500 ml-1.5">— {s.nom}</span>
                        </div>
                        <div className="text-right text-xs text-slate-500">
                          <p>{s.machine_nom}</p>
                          <p>{formatDateTime(s.start_time)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.skipped.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    ⚠ {result.skipped.length} opération(s) ignorée(s)
                  </p>
                  <div className="space-y-1">
                    {result.skipped.map((s) => (
                      <div key={s.operation_id} className="text-sm bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
                        <span className="font-semibold text-slate-900">{s.of_reference}</span>
                        <span className="text-slate-500 ml-1.5">— {s.nom}</span>
                        <p className="text-xs text-yellow-700 mt-0.5">{s.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.scheduled.length === 0 && result.skipped.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-4">Aucune opération à planifier.</p>
              )}

              <p className="text-xs text-slate-400 text-center pt-1">
                Le planning a été mis à jour. Vous pouvez ajuster manuellement si besoin.
              </p>
            </div>

            <Button onClick={() => setResult(null)} className="w-full bg-slate-900 hover:bg-slate-700 text-white">
              Fermer et voir le planning
            </Button>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
