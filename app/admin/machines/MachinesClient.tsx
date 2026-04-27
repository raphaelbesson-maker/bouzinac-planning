'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import type { Machine, MachineStatut } from '@/lib/types'

interface MachinesClientProps {
  initialMachines: Machine[]
}

function MachineForm({
  machine,
  onSave,
  onClose,
}: {
  machine?: Machine
  onSave: () => void
  onClose: () => void
}) {
  const [nom, setNom] = useState(machine?.nom ?? '')
  const [heures, setHeures] = useState(machine?.heures_ouverture ?? '2x8')
  const [competences, setCompetences] = useState(machine?.competences_requises.join(', ') ?? '')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!nom) return
    setSaving(true)
    const supabase = createClient()
    const payload = {
      nom,
      heures_ouverture: heures,
      competences_requises: competences.split(',').map((c) => c.trim()).filter(Boolean),
    }

    const { error } = machine
      ? await supabase.from('machines').update(payload).eq('id', machine.id)
      : await supabase.from('machines').insert(payload)

    if (error) {
      toast.error('Erreur lors de la sauvegarde.')
    } else {
      toast.success(`Machine ${machine ? 'modifiée' : 'ajoutée'}.`)
      onSave()
    }
    setSaving(false)
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <label className="text-sm font-medium">Nom de la machine</label>
        <Input value={nom} onChange={(e) => setNom(e.target.value)} className="h-12" placeholder="ex : Tour CNC 01" />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium">Heures d&apos;ouverture</label>
        <Input value={heures} onChange={(e) => setHeures(e.target.value)} className="h-12" placeholder="ex : 2x8, Journée" />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium">Compétences requises (séparées par virgule)</label>
        <Input value={competences} onChange={(e) => setCompetences(e.target.value)} className="h-12" placeholder="ex : tournage, cnc" />
      </div>
      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={onClose} className="flex-1 h-12">Annuler</Button>
        <Button onClick={handleSave} disabled={saving || !nom} className="flex-1 h-12 bg-slate-900 hover:bg-slate-700">
          {saving ? 'Sauvegarde...' : 'Enregistrer'}
        </Button>
      </div>
    </div>
  )
}

export function MachinesClient({ initialMachines }: MachinesClientProps) {
  const [machines, setMachines] = useState(initialMachines)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Machine | undefined>()

  async function reload() {
    const supabase = createClient()
    const { data } = await supabase.from('machines').select('*').order('nom')
    setMachines(data ?? [])
    setDialogOpen(false)
    setEditing(undefined)
  }

  async function toggleStatut(machine: Machine) {
    const supabase = createClient()
    const newStatut: MachineStatut = machine.statut === 'Actif' ? 'Maintenance' : 'Actif'
    const { error } = await supabase.from('machines').update({ statut: newStatut }).eq('id', machine.id)
    if (error) {
      toast.error('Erreur lors de la mise à jour.')
    } else {
      setMachines((prev) => prev.map((m) => m.id === machine.id ? { ...m, statut: newStatut } : m))
      toast.success(`Machine ${newStatut === 'Actif' ? 'activée' : 'mise en maintenance'}.`)
    }
  }

  async function deleteMachine(id: string) {
    if (!confirm('Supprimer cette machine ?')) return
    const supabase = createClient()
    await supabase.from('machines').delete().eq('id', id)
    setMachines((prev) => prev.filter((m) => m.id !== id))
    toast.success('Machine supprimée.')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Machines</h1>
        <Button onClick={() => { setEditing(undefined); setDialogOpen(true) }} className="h-11 bg-slate-900 hover:bg-slate-700">
          + Ajouter une machine
        </Button>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-slate-700">Nom</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-700">Horaires</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-700">Compétences requises</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-700">Statut</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {machines.map((m) => (
              <tr key={m.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium">{m.nom}</td>
                <td className="px-4 py-3 text-slate-600">{m.heures_ouverture}</td>
                <td className="px-4 py-3 text-slate-600">{m.competences_requises.join(', ') || '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={m.statut === 'Actif'}
                      onCheckedChange={() => toggleStatut(m)}
                    />
                    <span className={m.statut === 'Actif' ? 'text-green-700' : 'text-red-600'}>
                      {m.statut}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" size="sm" className="h-9" onClick={() => { setEditing(m); setDialogOpen(true) }}>
                      Modifier
                    </Button>
                    <Button variant="outline" size="sm" className="h-9 text-red-600 hover:text-red-700" onClick={() => deleteMachine(m.id)}>
                      Supprimer
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {machines.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">Aucune machine configurée.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) { setDialogOpen(false); setEditing(undefined) } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Modifier la machine' : 'Ajouter une machine'}</DialogTitle>
          </DialogHeader>
          <MachineForm machine={editing} onSave={reload} onClose={() => { setDialogOpen(false); setEditing(undefined) }} />
        </DialogContent>
      </Dialog>
    </div>
  )
}
