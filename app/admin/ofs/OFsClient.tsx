'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import type { OrdreFabrication, OFPriorite, OFStatut } from '@/lib/types'

interface Client { id: string; nom: string }
interface OFsClientProps {
  initialOFs: OrdreFabrication[]
  clients: Client[]
}

const PRIORITES: OFPriorite[] = ['Standard', 'Urgence', 'Constructeur']
const STATUTS: OFStatut[] = ['A_planifier', 'Planifie', 'En_cours', 'Termine']
const STATUT_LABELS: Record<OFStatut, string> = {
  A_planifier: 'À planifier',
  Planifie: 'Planifié',
  En_cours: 'En cours',
  Termine: 'Terminé',
}

const PRIORITE_COLORS: Record<OFPriorite, string> = {
  Standard: 'bg-slate-100 text-slate-700',
  Urgence: 'bg-orange-100 text-orange-700',
  Constructeur: 'bg-indigo-100 text-indigo-700',
}

function OFForm({
  of,
  clients,
  onSave,
  onClose,
}: {
  of?: OrdreFabrication
  clients: Client[]
  onSave: () => void
  onClose: () => void
}) {
  const [reference, setReference] = useState(of?.reference_of ?? '')
  const [clientNom, setClientNom] = useState(of?.client_nom ?? '')
  const [gamme, setGamme] = useState(of?.gamme ?? '')
  const [slaDate, setSlaDate] = useState(of?.sla_date?.slice(0, 10) ?? '')
  const [priorite, setPriorite] = useState<OFPriorite>(of?.priorite ?? 'Standard')
  const [temps, setTemps] = useState(String(of?.temps_estime_minutes ?? 60))
  const [notes, setNotes] = useState(of?.notes ?? '')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!reference.trim() || !clientNom.trim() || !slaDate) {
      toast.error('Référence, client et SLA sont obligatoires')
      return
    }
    setSaving(true)
    const supabase = createClient()
    const payload = {
      reference_of: reference.trim(),
      client_nom: clientNom.trim(),
      gamme: gamme.trim() || null,
      sla_date: slaDate,
      priorite,
      temps_estime_minutes: Math.max(1, parseInt(temps) || 60),
      notes: notes.trim() || null,
      statut: (of?.statut ?? 'A_planifier') as OFStatut,
    }

    const { error } = of
      ? await supabase.from('ordres_fabrication').update(payload).eq('id', of.id)
      : await supabase.from('ordres_fabrication').insert({ ...payload, statut: 'A_planifier' })

    setSaving(false)
    if (error) { toast.error(error.message); return }
    toast.success(of ? 'OF mis à jour' : 'OF créé')
    onSave()
    onClose()
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-700">Référence OF *</label>
          <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="OF-2024-006" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-700">Client *</label>
          <Input value={clientNom} onChange={(e) => setClientNom(e.target.value)} list="clients-list" placeholder="Constructeur A" />
          <datalist id="clients-list">
            {clients.map((c) => <option key={c.id} value={c.nom} />)}
          </datalist>
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-slate-700">Gamme / Description</label>
        <Input value={gamme} onChange={(e) => setGamme(e.target.value)} placeholder="Jante Sport 18p" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-700">SLA (date limite) *</label>
          <Input type="date" value={slaDate} onChange={(e) => setSlaDate(e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-700">Durée estimée (min)</label>
          <Input type="number" min="1" value={temps} onChange={(e) => setTemps(e.target.value)} />
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-slate-700">Priorité</label>
        <select
          value={priorite}
          onChange={(e) => setPriorite(e.target.value as OFPriorite)}
          className="w-full border rounded-md px-3 py-2 text-sm bg-white"
        >
          {PRIORITES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-slate-700">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full border rounded-md px-3 py-2 text-sm resize-none"
          placeholder="Informations complémentaires..."
        />
      </div>
      <div className="flex gap-2 pt-2">
        <Button onClick={handleSave} disabled={saving} className="flex-1">
          {saving ? 'Enregistrement...' : of ? 'Mettre à jour' : 'Créer l\'OF'}
        </Button>
        <Button variant="outline" onClick={onClose} disabled={saving}>Annuler</Button>
      </div>
    </div>
  )
}

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - now.getTime()) / 86400000)
}

export function OFsClient({ initialOFs, clients }: OFsClientProps) {
  const [ofs, setOFs] = useState(initialOFs)
  const [editingOF, setEditingOF] = useState<OrdreFabrication | null | 'new'>(null)
  const [filterStatut, setFilterStatut] = useState<string>('all')

  async function reload() {
    const supabase = createClient()
    const { data } = await supabase.from('ordres_fabrication').select('*').order('sla_date', { ascending: true })
    setOFs(data ?? [])
  }

  async function handleDelete(of: OrdreFabrication) {
    if (!confirm(`Supprimer ${of.reference_of} ?`)) return
    const supabase = createClient()
    const { error } = await supabase.from('ordres_fabrication').delete().eq('id', of.id)
    if (error) { toast.error(error.message); return }
    toast.success(`${of.reference_of} supprimé`)
    setOFs((prev) => prev.filter((o) => o.id !== of.id))
  }

  const filtered = filterStatut === 'all' ? ofs : ofs.filter((o) => o.statut === filterStatut)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Ordres de Fabrication</h1>
          <p className="text-sm text-slate-500">{ofs.length} OFs au total</p>
        </div>
        <Button onClick={() => setEditingOF('new')}>+ Nouvel OF</Button>
      </div>

      {/* Filtre statut */}
      <div className="flex gap-2 flex-wrap">
        {['all', ...STATUTS].map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatut(s)}
            className={[
              'px-3 py-1 rounded-full text-xs font-medium border transition-colors',
              filterStatut === s
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400',
            ].join(' ')}
          >
            {s === 'all' ? 'Tous' : STATUT_LABELS[s as OFStatut]}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-slate-700">Référence</th>
              <th className="text-left px-4 py-3 font-medium text-slate-700">Client</th>
              <th className="text-left px-4 py-3 font-medium text-slate-700">Gamme</th>
              <th className="text-left px-4 py-3 font-medium text-slate-700">SLA</th>
              <th className="text-left px-4 py-3 font-medium text-slate-700">Durée</th>
              <th className="text-left px-4 py-3 font-medium text-slate-700">Priorité</th>
              <th className="text-left px-4 py-3 font-medium text-slate-700">Statut</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-8 text-slate-400">Aucun OF</td>
              </tr>
            )}
            {filtered.map((of) => {
              const days = daysUntil(of.sla_date)
              const slaUrgent = days <= 2
              return (
                <tr key={of.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold">{of.reference_of}</td>
                  <td className="px-4 py-3 text-slate-700">{of.client_nom}</td>
                  <td className="px-4 py-3 text-slate-500 italic">{of.gamme ?? '—'}</td>
                  <td className={`px-4 py-3 font-medium ${slaUrgent ? 'text-red-600' : 'text-slate-700'}`}>
                    {new Date(of.sla_date).toLocaleDateString('fr-FR')}
                    {' '}
                    {days <= 0 ? '⚠ DÉPASSÉ' : `J-${days}`}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{of.temps_estime_minutes} min</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITE_COLORS[of.priorite]}`}>
                      {of.priorite}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-slate-600">{STATUT_LABELS[of.statut]}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 justify-end">
                      <Button size="sm" variant="outline" onClick={() => setEditingOF(of)}>
                        Modifier
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => handleDelete(of)}
                      >
                        Suppr.
                      </Button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <Dialog
        open={editingOF !== null}
        onOpenChange={(open) => { if (!open) setEditingOF(null) }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingOF === 'new' ? 'Nouvel OF' : `Modifier ${(editingOF as OrdreFabrication)?.reference_of}`}
            </DialogTitle>
          </DialogHeader>
          <OFForm
            of={editingOF === 'new' ? undefined : (editingOF as OrdreFabrication)}
            clients={clients}
            onSave={reload}
            onClose={() => setEditingOF(null)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
