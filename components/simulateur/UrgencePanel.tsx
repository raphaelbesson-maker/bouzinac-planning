'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ImpactModal } from './ImpactModal'
import type { Machine, ImpactResult } from '@/lib/types'

interface UrgencePanelProps {
  machines: Machine[]
}

export function UrgencePanel({ machines }: UrgencePanelProps) {
  const [gamme, setGamme] = useState('')
  const [duree, setDuree] = useState('')
  const [machineId, setMachineId] = useState('')
  const [loading, setLoading] = useState(false)
  const [impact, setImpact] = useState<ImpactResult | null>(null)
  const [showModal, setShowModal] = useState(false)

  async function handleCalculer() {
    if (!machineId || !duree) return
    setLoading(true)
    const startTime = new Date()
    startTime.setHours(new Date().getHours(), 0, 0, 0)

    const res = await fetch('/api/simulateur/impact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        machine_id: machineId,
        start_time: startTime.toISOString(),
        temps_estime_minutes: Number(duree),
      }),
    })
    const data = await res.json()
    setImpact(data)
    setShowModal(true)
    setLoading(false)
  }

  return (
    <aside className="w-72 flex-shrink-0 border-l border-slate-200 bg-white flex flex-col">
      <div className="px-4 py-3 border-b border-slate-200">
        <h2 className="font-bold text-slate-900 text-base">Insérer une urgence SAV</h2>
        <p className="text-xs text-slate-500 mt-0.5">Simulez l&apos;impact avant de confirmer</p>
      </div>
      <div className="flex-1 p-4 space-y-4">
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">Pièce / Gamme</label>
          <Input
            placeholder="ex : Jante sport 18p fissurée"
            value={gamme}
            onChange={(e) => setGamme(e.target.value)}
            className="h-12"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">Durée estimée (minutes)</label>
          <Input
            type="number"
            min="15"
            step="15"
            placeholder="ex : 120"
            value={duree}
            onChange={(e) => setDuree(e.target.value)}
            className="h-12"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">Machine</label>
          <Select value={machineId} onValueChange={(v) => setMachineId(v ?? '')}>
            <SelectTrigger className="h-12">
              <SelectValue placeholder="Choisir une machine..." />
            </SelectTrigger>
            <SelectContent>
              {machines.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.nom}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={handleCalculer}
          disabled={!machineId || !duree || loading}
          className="w-full h-12 text-base font-semibold bg-orange-500 hover:bg-orange-600 text-white"
        >
          {loading ? 'Calcul en cours...' : 'Calculer l\'impact'}
        </Button>
        <p className="text-xs text-slate-400 text-center">
          Aucune modification ne sera effectuée avant confirmation
        </p>
      </div>

      {impact && (
        <ImpactModal
          open={showModal}
          onClose={() => setShowModal(false)}
          impact={impact}
          gamme={gamme}
          machineId={machineId}
          machineName={machines.find((m) => m.id === machineId)?.nom ?? ''}
          dureeMinutes={Number(duree)}
        />
      )}
    </aside>
  )
}
