'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import type { Gamme, GammeOperation } from '@/lib/types'

const CATEGORIES_MACHINE = ['Formage', 'Tournage', 'Fraisage', 'Rectification', 'Polissage', 'Soudage', 'Peinture', 'General']

interface GammesClientProps {
  initialGammes: Gamme[]
}

function GammeForm({
  gamme,
  onSave,
  onClose,
}: {
  gamme?: Gamme
  onSave: () => void
  onClose: () => void
}) {
  const [nom, setNom] = useState(gamme?.nom ?? '')
  const [description, setDescription] = useState(gamme?.description ?? '')
  const [ops, setOps] = useState<Omit<GammeOperation, 'id' | 'gamme_id'>[]>(
    gamme?.gamme_operations
      ? [...gamme.gamme_operations].sort((a, b) => a.ordre - b.ordre).map((o) => ({
          ordre: o.ordre,
          nom: o.nom,
          categorie_machine: o.categorie_machine,
          duree_minutes: o.duree_minutes,
        }))
      : [{ ordre: 1, nom: '', categorie_machine: 'Tournage', duree_minutes: 60 }]
  )
  const [saving, setSaving] = useState(false)

  function addOp() {
    setOps((prev) => [
      ...prev,
      { ordre: prev.length + 1, nom: '', categorie_machine: 'Tournage', duree_minutes: 60 },
    ])
  }

  function removeOp(index: number) {
    setOps((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((op, i) => ({ ...op, ordre: i + 1 }))
    )
  }

  function updateOp(index: number, field: string, value: string | number) {
    setOps((prev) => prev.map((op, i) => (i === index ? { ...op, [field]: value } : op)))
  }

  async function handleSave() {
    if (!nom.trim()) { toast.error('Le nom de la gamme est obligatoire'); return }
    if (ops.length === 0) { toast.error('La gamme doit avoir au moins une opération'); return }
    if (ops.some((op) => !op.nom.trim())) { toast.error('Toutes les opérations doivent avoir un nom'); return }

    setSaving(true)
    const supabase = createClient()

    try {
      if (gamme) {
        // Update gamme
        const { error } = await supabase
          .from('gammes')
          .update({ nom: nom.trim(), description: description.trim() || null })
          .eq('id', gamme.id)
        if (error) throw error

        // Replace operations
        await supabase.from('gamme_operations').delete().eq('gamme_id', gamme.id)
        const { error: opsError } = await supabase.from('gamme_operations').insert(
          ops.map((op) => ({ ...op, nom: op.nom.trim(), gamme_id: gamme.id }))
        )
        if (opsError) throw opsError
      } else {
        // Create gamme
        const { data: newGamme, error } = await supabase
          .from('gammes')
          .insert({ nom: nom.trim(), description: description.trim() || null })
          .select('id')
          .single()
        if (error) throw error

        const { error: opsError } = await supabase.from('gamme_operations').insert(
          ops.map((op) => ({ ...op, nom: op.nom.trim(), gamme_id: newGamme.id }))
        )
        if (opsError) throw opsError
      }

      toast.success(gamme ? 'Gamme mise à jour' : 'Gamme créée')
      onSave()
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-700">Nom de la gamme *</label>
          <Input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Jante Sport" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-700">Description</label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Gamme jante sport haute performance" />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-slate-700">Opérations (dans l&apos;ordre)</label>
          <Button size="sm" variant="outline" onClick={addOp} type="button">+ Ajouter</Button>
        </div>

        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {ops.map((op, i) => (
            <div key={i} className="flex items-center gap-2 bg-slate-50 rounded-lg p-2 border">
              <span className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 flex-shrink-0">
                {op.ordre}
              </span>
              <Input
                className="flex-1"
                value={op.nom}
                onChange={(e) => updateOp(i, 'nom', e.target.value)}
                placeholder="Ex: Tournage"
              />
              <select
                value={op.categorie_machine}
                onChange={(e) => updateOp(i, 'categorie_machine', e.target.value)}
                className="border rounded-md px-2 py-1.5 text-sm bg-white w-36"
              >
                {CATEGORIES_MACHINE.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <Input
                type="number"
                min="1"
                className="w-20"
                value={op.duree_minutes}
                onChange={(e) => updateOp(i, 'duree_minutes', parseInt(e.target.value) || 60)}
                placeholder="min"
              />
              <span className="text-xs text-slate-400 w-6">min</span>
              {ops.length > 1 && (
                <button
                  onClick={() => removeOp(i)}
                  className="text-slate-400 hover:text-red-500 transition-colors text-sm px-1"
                  title="Supprimer cette étape"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <Button onClick={handleSave} disabled={saving} className="flex-1">
          {saving ? 'Enregistrement...' : gamme ? 'Mettre à jour' : 'Créer la gamme'}
        </Button>
        <Button variant="outline" onClick={onClose} disabled={saving}>Annuler</Button>
      </div>
    </div>
  )
}

export function GammesClient({ initialGammes }: GammesClientProps) {
  const [gammes, setGammes] = useState(initialGammes)
  const [editing, setEditing] = useState<Gamme | null | 'new'>(null)

  async function reload() {
    const supabase = createClient()
    const { data } = await supabase
      .from('gammes')
      .select('*, gamme_operations(id, ordre, nom, categorie_machine, duree_minutes)')
      .order('nom')
    setGammes((data as Gamme[]) ?? [])
  }

  async function handleDelete(gamme: Gamme) {
    if (!confirm(`Supprimer la gamme "${gamme.nom}" ? Les OFs liés perdront leur gamme.`)) return
    const supabase = createClient()
    const { error } = await supabase.from('gammes').delete().eq('id', gamme.id)
    if (error) { toast.error(error.message); return }
    toast.success(`Gamme "${gamme.nom}" supprimée`)
    setGammes((prev) => prev.filter((g) => g.id !== gamme.id))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Gammes de fabrication</h1>
          <p className="text-sm text-slate-500">
            Définissez les séquences d&apos;opérations pour chaque type de jante.
          </p>
        </div>
        <Button onClick={() => setEditing('new')}>+ Nouvelle gamme</Button>
      </div>

      <div className="space-y-3">
        {gammes.length === 0 && (
          <div className="border rounded-lg p-8 text-center text-slate-400">
            Aucune gamme définie. Créez votre première gamme.
          </div>
        )}
        {gammes.map((gamme) => {
          const ops = [...(gamme.gamme_operations ?? [])].sort((a, b) => a.ordre - b.ordre)
          return (
            <div key={gamme.id} className="border rounded-lg bg-white p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900">{gamme.nom}</h3>
                  {gamme.description && (
                    <p className="text-sm text-slate-500 mt-0.5">{gamme.description}</p>
                  )}
                  <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                    {ops.map((op, i) => (
                      <span key={op.id} className="flex items-center gap-1">
                        {i > 0 && <span className="text-slate-300 text-sm">→</span>}
                        <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 text-xs px-2 py-1 rounded-full">
                          <span className="font-medium">{op.nom}</span>
                          <span className="text-slate-400">({op.duree_minutes} min)</span>
                        </span>
                      </span>
                    ))}
                    {ops.length === 0 && (
                      <span className="text-xs text-slate-400 italic">Aucune opération</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button size="sm" variant="outline" onClick={() => setEditing(gamme)}>
                    Modifier
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => handleDelete(gamme)}
                  >
                    Suppr.
                  </Button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <Dialog open={editing !== null} onOpenChange={(open) => { if (!open) setEditing(null) }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editing === 'new' ? 'Nouvelle gamme' : `Modifier "${(editing as Gamme)?.nom}"`}
            </DialogTitle>
          </DialogHeader>
          <GammeForm
            gamme={editing === 'new' ? undefined : (editing as Gamme)}
            onSave={reload}
            onClose={() => setEditing(null)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
