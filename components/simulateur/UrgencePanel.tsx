'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ImpactModal } from './ImpactModal'
import type { Gamme, ImpactResult, Machine } from '@/lib/types'

interface UrgencePanelProps {
  machines: Machine[]
  gammes: Gamme[]
}

function defaultStartValue(): string {
  const d = new Date()
  d.setSeconds(0, 0)
  // Round up to next 30min
  const minutes = d.getMinutes()
  if (minutes > 0 && minutes < 30) d.setMinutes(30)
  else if (minutes > 30) { d.setHours(d.getHours() + 1); d.setMinutes(0) }
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const selectClass = 'w-full h-12 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:opacity-50 disabled:bg-slate-50'

export function UrgencePanel({ machines, gammes }: UrgencePanelProps) {
  const [gammeId, setGammeId] = useState('')
  const [duree, setDuree] = useState('')
  const [machineId, setMachineId] = useState('')
  const [startValue, setStartValue] = useState(defaultStartValue)
  const [loading, setLoading] = useState(false)
  const [impact, setImpact] = useState<ImpactResult | null>(null)
  const [showModal, setShowModal] = useState(false)

  const selectedGamme = gammes.find((g) => g.id === gammeId)

  function handleGammeChange(id: string) {
    setGammeId(id)
    if (!id) return
    const g = gammes.find((g) => g.id === id)
    if (g?.gamme_operations) {
      const total = g.gamme_operations.reduce((sum, op) => sum + op.duree_minutes, 0)
      if (total > 0) setDuree(String(total))
    }
  }

  const canCalculer = !!machineId && !!duree && Number(duree) > 0

  async function handleCalculer() {
    if (!canCalculer) return
    setLoading(true)

    const startTime = new Date(startValue)
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

  const machineName = machines.find((m) => m.id === machineId)?.nom ?? ''
  const startTime = new Date(startValue)
  const endTime = new Date(startTime.getTime() + Number(duree) * 60000)

  return (
    <aside className="w-80 flex-shrink-0 border-l border-slate-200 bg-white flex flex-col">
      {/* Header */}
      <div className="px-4 py-4 border-b border-slate-200 bg-orange-50">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-orange-500 text-xl">⚡</span>
          <h2 className="font-bold text-slate-900 text-base">Simulateur SAV</h2>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          Renseignez les informations de l&apos;urgence ci-dessous, puis simulez son impact sur le planning avant de confirmer.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">

        {/* Step 1: Gamme */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-800 text-white text-xs flex items-center justify-center font-bold">1</span>
            <label className="text-sm font-semibold text-slate-700">Type d&apos;intervention</label>
          </div>
          <select
            value={gammeId}
            onChange={(e) => handleGammeChange(e.target.value)}
            className={selectClass}
          >
            <option value="">— SAV sans gamme —</option>
            {gammes.map((g) => (
              <option key={g.id} value={g.id}>{g.nom}</option>
            ))}
          </select>
          {selectedGamme?.description && (
            <p className="text-xs text-slate-500 pl-1">{selectedGamme.description}</p>
          )}
          {selectedGamme?.gamme_operations && selectedGamme.gamme_operations.length > 0 && (
            <div className="text-xs text-slate-500 pl-1 space-y-0.5">
              {selectedGamme.gamme_operations
                .slice()
                .sort((a, b) => a.ordre - b.ordre)
                .map((op) => (
                  <p key={op.id}>· {op.nom} ({op.duree_minutes} min)</p>
                ))}
            </div>
          )}
        </div>

        {/* Step 2: Duration */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-800 text-white text-xs flex items-center justify-center font-bold">2</span>
            <label className="text-sm font-semibold text-slate-700">Durée estimée (minutes)</label>
          </div>
          <input
            type="number"
            min="15"
            step="15"
            placeholder="ex : 120"
            value={duree}
            onChange={(e) => setDuree(e.target.value)}
            className={selectClass}
          />
          <p className="text-xs text-slate-400 pl-1">
            {gammeId ? 'Durée pré-remplie depuis la gamme — modifiable' : 'Estimez la durée totale de l\'intervention'}
          </p>
        </div>

        {/* Step 3: Machine */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-800 text-white text-xs flex items-center justify-center font-bold">3</span>
            <label className="text-sm font-semibold text-slate-700">Machine cible</label>
          </div>
          <select
            value={machineId}
            onChange={(e) => setMachineId(e.target.value)}
            className={selectClass}
          >
            <option value="">Choisir une machine...</option>
            {machines.map((m) => (
              <option key={m.id} value={m.id}>{m.nom}</option>
            ))}
          </select>
        </div>

        {/* Step 4: Start time */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-800 text-white text-xs flex items-center justify-center font-bold">4</span>
            <label className="text-sm font-semibold text-slate-700">Début de l&apos;intervention</label>
          </div>
          <input
            type="datetime-local"
            value={startValue}
            onChange={(e) => setStartValue(e.target.value)}
            className={selectClass}
          />
          <p className="text-xs text-slate-400 pl-1">Par défaut : maintenant (arrondi à 30 min)</p>
        </div>

        {/* CTA */}
        <div className="pt-1 space-y-2">
          <Button
            onClick={handleCalculer}
            disabled={!canCalculer || loading}
            className="w-full h-12 text-base font-semibold bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-50"
          >
            {loading ? '⏳ Calcul en cours...' : '⚡ Simuler l\'impact'}
          </Button>
          <p className="text-xs text-slate-400 text-center">
            Le planning n&apos;est pas modifié avant confirmation
          </p>
        </div>

        {/* Help */}
        <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 space-y-1.5">
          <p className="text-xs font-semibold text-slate-600">Comment ça fonctionne ?</p>
          <p className="text-xs text-slate-500">
            1. Renseignez l&apos;intervention et cliquez <strong>Simuler</strong>.
          </p>
          <p className="text-xs text-slate-500">
            2. Le système calcule les OFs décalés et les éventuels dépassements de SLA.
          </p>
          <p className="text-xs text-slate-500">
            3. Vous confirmez (ou annulez) après avoir vu l&apos;impact.
          </p>
        </div>
      </div>

      {impact && (
        <ImpactModal
          open={showModal}
          onClose={() => setShowModal(false)}
          impact={impact}
          gammeId={gammeId}
          gammeName={selectedGamme?.nom ?? ''}
          machineId={machineId}
          machineName={machineName}
          dureeMinutes={Number(duree)}
          startTime={startTime.toISOString()}
          endTime={endTime.toISOString()}
        />
      )}
    </aside>
  )
}
