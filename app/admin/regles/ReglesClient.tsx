'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

interface ReglesClientProps {
  initialRules: Record<string, unknown>
}

export function ReglesClient({ initialRules }: ReglesClientProps) {
  const [bufferMinutes, setBufferMinutes] = useState(Number(initialRules.buffer_minutes ?? 15))
  const [neverDelayPremium, setNeverDelayPremium] = useState(
    String(initialRules.never_delay_premium) === 'true'
  )
  const [maxUrgencePerDay, setMaxUrgencePerDay] = useState(Number(initialRules.max_urgence_per_day ?? 2))
  const [alertSlaDaysAhead, setAlertSlaDaysAhead] = useState(Number(initialRules.alert_sla_days_ahead ?? 2))
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    const supabase = createClient()

    const updates = [
      { key: 'buffer_minutes', value: bufferMinutes },
      { key: 'never_delay_premium', value: neverDelayPremium },
      { key: 'max_urgence_per_day', value: maxUrgencePerDay },
      { key: 'alert_sla_days_ahead', value: alertSlaDaysAhead },
    ]

    const errors = await Promise.all(
      updates.map(({ key, value }) =>
        supabase.from('reglements').update({ value: JSON.stringify(value) }).eq('key', key)
      )
    )

    const hasError = errors.some((r) => r.error)
    if (hasError) {
      toast.error('Erreur lors de la sauvegarde des règles.')
    } else {
      toast.success('Règles enregistrées.')
    }
    setSaving(false)
  }

  return (
    <div className="space-y-6 max-w-xl">
      <h1 className="text-xl font-bold text-slate-900">Règles de planification</h1>

      <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-6">
        {/* Buffer */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-slate-800">Temps tampon entre deux OFs</label>
            <span className="text-slate-700 font-bold text-lg">{bufferMinutes} min</span>
          </div>
          <Slider
            value={[bufferMinutes]}
            onValueChange={(vals) => setBufferMinutes(Array.isArray(vals) ? vals[0] : vals)}
            min={0}
            max={60}
            step={5}
            className="w-full"
          />
          <p className="text-xs text-slate-500">Délai minimal entre la fin d&apos;un OF et le début du suivant sur la même machine.</p>
        </div>

        {/* Never delay premium */}
        <div className="flex items-center justify-between py-3 border-t border-slate-100">
          <div>
            <p className="text-sm font-semibold text-slate-800">Ne jamais décaler un client Premium</p>
            <p className="text-xs text-slate-500 mt-0.5">Bloque l&apos;insertion d&apos;urgences qui dépassent le SLA d&apos;un client Premium</p>
          </div>
          <Switch checked={neverDelayPremium} onCheckedChange={setNeverDelayPremium} />
        </div>

        {/* Max urgence per day */}
        <div className="space-y-2 border-t border-slate-100 pt-3">
          <label className="text-sm font-semibold text-slate-800">Nombre max d&apos;urgences SAV par jour</label>
          <Input
            type="number"
            min={0}
            max={10}
            value={maxUrgencePerDay}
            onChange={(e) => setMaxUrgencePerDay(Number(e.target.value))}
            className="h-12 w-32"
          />
        </div>

        {/* Alert SLA days ahead */}
        <div className="space-y-2 border-t border-slate-100 pt-3">
          <label className="text-sm font-semibold text-slate-800">Alerter X jours avant dépassement SLA</label>
          <Input
            type="number"
            min={0}
            max={14}
            value={alertSlaDaysAhead}
            onChange={(e) => setAlertSlaDaysAhead(Number(e.target.value))}
            className="h-12 w-32"
          />
          <p className="text-xs text-slate-500">Un badge d&apos;alerte apparaît sur les OFs dont le SLA est à moins de X jours.</p>
        </div>
      </div>

      <Button
        onClick={handleSave}
        disabled={saving}
        className="h-12 px-8 bg-slate-900 hover:bg-slate-700 font-semibold"
      >
        {saving ? 'Enregistrement...' : 'Enregistrer les règles'}
      </Button>
    </div>
  )
}
