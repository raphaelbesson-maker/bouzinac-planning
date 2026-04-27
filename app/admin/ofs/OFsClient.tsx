'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import type { OrdreFabrication, OFPriorite, OFStatut } from '@/lib/types'

interface Client { id: string; nom: string }
interface GammeOption {
  id: string
  nom: string
  gamme_operations: { id: string; ordre: number; duree_minutes: number }[]
}
interface OFsClientProps {
  initialOFs: OrdreFabrication[]
  clients: Client[]
  gammes: GammeOption[]
}

const PRIORITES: OFPriorite[] = ['Standard', 'Urgence', 'Constructeur']
const STATUTS: OFStatut[] = ['A_planifier', 'Planifie', 'En_cours', 'Termine']
const STATUT_LABELS: Record<OFStatut, string> = {
  A_planifier: 'À planifier',
  Planifie:    'Planifié',
  En_cours:    'En cours',
  Termine:     'Terminé',
}
const PRIORITE_COLORS: Record<OFPriorite, string> = {
  Standard:     'bg-slate-100 text-slate-700',
  Urgence:      'bg-orange-100 text-orange-700',
  Constructeur: 'bg-indigo-100 text-indigo-700',
}

function totalDuration(gamme: GammeOption): number {
  return gamme.gamme_operations.reduce((sum, op) => sum + op.duree_minutes, 0)
}

function OFForm({
  of,
  clients,
  gammes,
  onSave,
  onClose,
}: {
  of?: OrdreFabrication
  clients: Client[]
  gammes: GammeOption[]
  onSave: () => void
  onClose: () => void
}) {
  const [reference, setReference] = useState(of?.reference_of ?? '')
  const [clientNom, setClientNom] = useState(of?.client_nom ?? '')
  const [gammeId, setGammeId] = useState(of?.gamme_id ?? '')
  const [slaDate, setSlaDate] = useState(of?.sla_date?.slice(0, 10) ?? '')
  const [priorite, setPriorite] = useState<OFPriorite>(of?.priorite ?? 'Standard')
  const [notes, setNotes] = useState(of?.notes ?? '')
  const [saving, setSaving] = useState(false)

  const selectedGamme = gammes.find((g) => g.id === gammeId)

  async function handleSave() {
    if (!reference.trim() || !clientNom.trim() || !slaDate) {
      toast.error('Référence, client et SLA sont obligatoires')
      return
    }
    if (!gammeId) {
      toast.error('Sélectionnez une gamme de fabrication')
      return
    }
    setSaving(true)
    const supabase = createClient()

    const payload = {
      reference_of: reference.trim(),
      client_nom: clientNom.trim(),
      gamme_id: gammeId,
      gamme: selectedGamme?.nom ?? null,
      sla_date: slaDate,
      priorite,
      temps_estime_minutes: selectedGamme ? totalDuration(selectedGamme) : 60,
      notes: notes.trim() || null,
    }

    if (of) {
      const { error } = await supabase.from('ordres_fabrication').update(payload).eq('id', of.id)
      if (error) { toast.error(error.message); setSaving(false); return }
      toast.success('OF mis à jour')
    } else {
      // Create OF
      const { data: newOf, error } = await supabase
        .from('ordres_fabrication')
        .insert({ ...payload, statut: 'A_planifier' })
        .select('id')
        .single()
      if (error) { toast.error(error.message); setSaving(false); return }

      // Create of_operations from gamme template
      if (selectedGamme) {
        const { data: gammeOps } = await supabase
          .from('gamme_operations')
          .select('*')
          .eq('gamme_id', gammeId)
          .order('ordre')

        if (gammeOps && gammeOps.length > 0) {
          await supabase.from('of_operations').insert(
            gammeOps.map((op) => ({
              of_id: newOf.id,
              gamme_operation_id: op.id,
              ordre: op.ordre,
              nom: op.nom,
              categorie_machine: op.categorie_machine,
              duree_minutes: op.duree_minutes,
              statut: 'A_planifier',
            }))
          )
        }
      }
      toast.success('OF créé')
    }

    setSaving(false)
    onSave()
    onClose()
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-700">Référence OF *</label>
          <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="OF-2024-006" disabled={!!of} />
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
        <label className="text-xs font-medium text-slate-700">Gamme de fabrication *</label>
        <select
          value={gammeId}
          onChange={(e) => setGammeId(e.target.value)}
          className="w-full border rounded-md px-3 py-2 text-sm bg-white"
        >
          <option value="">— Sélectionner une gamme —</option>
          {gammes.map((g) => (
            <option key={g.id} value={g.id}>
              {g.nom} ({totalDuration(g)} min total)
            </option>
          ))}
        </select>
        {selectedGamme && (
          <p className="text-xs text-slate-500">
            {selectedGamme.gamme_operations.length} opération(s) · {totalDuration(selectedGamme)} min au total
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-700">SLA (date limite) *</label>
          <Input type="date" value={slaDate} onChange={(e) => setSlaDate(e.target.value)} />
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

export function OFsClient({ initialOFs, clients, gammes }: OFsClientProps) {
  const [ofs, setOFs] = useState(initialOFs)
  const [editingOF, setEditingOF] = useState<OrdreFabrication | null | 'new'>(null)
  const [filterStatut, setFilterStatut] = useState<string>('all')

  async function reload() {
    const supabase = createClient()
    const { data } = await supabase.from('ordres_fabrication').select('*').order('sla_date', { ascending: true })
    setOFs(data ?? [])
  }

  async function handleDelete(of: OrdreFabrication) {
    if (!confirm(`Supprimer ${of.reference_of} et toutes ses opérations ?`)) return
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

      <div className="border rounded-lg overflow-hidden bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-slate-700">Référence</th>
              <th className="text-left px-4 py-3 font-medium text-slate-700">Client</th>
              <th className="text-left px-4 py-3 font-medium text-slate-700">Gamme</th>
              <th className="text-left px-4 py-3 font-medium text-slate-700">SLA</th>
              <th className="text-left px-4 py-3 font-medium text-slate-700">Priorité</th>
              <th className="text-left px-4 py-3 font-medium text-slate-700">Statut</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-8 text-slate-400">Aucun OF</td>
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
            gammes={gammes}
            onSave={reload}
            onClose={() => setEditingOF(null)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
