'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import type { Operateur, UserRole } from '@/lib/types'

const ROLE_LABELS: Record<UserRole, string> = {
  Admin: 'Direction',
  ADV: 'Commerce',
  Atelier: 'Atelier',
  Client: 'Client',
}

interface OperateursClientProps {
  initialOperateurs: Operateur[]
  machines: { id: string; nom: string }[]
}

export function OperateursClient({ initialOperateurs, machines }: OperateursClientProps) {
  const [operateurs, setOperateurs] = useState(initialOperateurs)
  const [editing, setEditing] = useState<Operateur | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editNom, setEditNom] = useState('')
  const [editRole, setEditRole] = useState<UserRole>('Atelier')
  const [editCompetences, setEditCompetences] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  function openEdit(op: Operateur) {
    setEditing(op)
    setEditNom(op.nom)
    setEditRole(op.role)
    setEditCompetences(op.competences)
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!editing) return
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('operateurs')
      .update({ nom: editNom, role: editRole, competences: editCompetences })
      .eq('id', editing.id)

    if (error) {
      toast.error('Erreur lors de la modification.')
    } else {
      toast.success('Opérateur modifié.')
      const { data } = await supabase.from('operateurs').select('*').order('nom')
      setOperateurs(data ?? [])
      setDialogOpen(false)
    }
    setSaving(false)
  }

  function toggleCompetence(machineId: string) {
    setEditCompetences((prev) =>
      prev.includes(machineId) ? prev.filter((c) => c !== machineId) : [...prev, machineId]
    )
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-900">Opérateurs</h1>

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-slate-700">Nom</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-700">Rôle</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-700">Machines maîtrisées</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {operateurs.map((op) => (
              <tr key={op.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium">{op.nom}</td>
                <td className="px-4 py-3">
                  <span className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded-full font-medium">
                    {ROLE_LABELS[op.role]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {op.competences.length === 0 && <span className="text-slate-400 text-xs">Aucune</span>}
                    {op.competences.map((cid) => {
                      const m = machines.find((ma) => ma.id === cid)
                      return m ? (
                        <span key={cid} className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                          {m.nom}
                        </span>
                      ) : null
                    })}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Button variant="outline" size="sm" className="h-9" onClick={() => openEdit(op)}>
                    Modifier
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(o) => !o && setDialogOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier l&apos;opérateur</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Nom</label>
              <Input value={editNom} onChange={(e) => setEditNom(e.target.value)} className="h-12" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Rôle</label>
              <Select value={editRole} onValueChange={(v) => setEditRole(v as UserRole)}>
                <SelectTrigger className="h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Atelier">Atelier</SelectItem>
                  <SelectItem value="ADV">Commerce</SelectItem>
                  <SelectItem value="Admin">Direction</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Machines maîtrisées</label>
              <div className="grid grid-cols-2 gap-2">
                {machines.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => toggleCompetence(m.id)}
                    className={`text-left text-sm px-3 py-2 rounded border-2 transition-colors ${
                      editCompetences.includes(m.id)
                        ? 'border-green-500 bg-green-50 text-green-800'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400'
                    }`}
                  >
                    {m.nom}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1 h-12">Annuler</Button>
              <Button onClick={handleSave} disabled={saving} className="flex-1 h-12 bg-slate-900 hover:bg-slate-700">
                {saving ? 'Sauvegarde...' : 'Enregistrer'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
