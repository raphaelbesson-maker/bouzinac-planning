'use client'

import { useState } from 'react'
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import type { Client } from '@/lib/types'

function SortableClient({ client, onTogglePremium }: { client: Client; onTogglePremium: (id: string, val: boolean) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: client.id })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-4 bg-white border border-slate-200 rounded-lg px-4 py-3 ${isDragging ? 'shadow-lg opacity-70 z-50' : 'shadow-sm'}`}
    >
      <div
        {...listeners}
        {...attributes}
        className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 select-none text-lg"
        title="Glisser pour réordonner"
      >
        ⠿
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-slate-900">{client.nom}</p>
        {client.is_premium && (
          <span className="text-xs text-purple-700 font-medium">Client Premium</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500">Premium</span>
        <Switch
          checked={client.is_premium}
          onCheckedChange={(v) => onTogglePremium(client.id, v)}
        />
      </div>
    </div>
  )
}

interface ClientsClientProps {
  initialClients: Client[]
}

export function ClientsClient({ initialClients }: ClientsClientProps) {
  const [clients, setClients] = useState(initialClients)
  const [saving, setSaving] = useState(false)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIdx = clients.findIndex((c) => c.id === active.id)
    const newIdx = clients.findIndex((c) => c.id === over.id)
    setClients(arrayMove(clients, oldIdx, newIdx))
  }

  async function togglePremium(id: string, value: boolean) {
    const supabase = createClient()
    await supabase.from('clients').update({ is_premium: value }).eq('id', id)
    setClients((prev) => prev.map((c) => c.id === id ? { ...c, is_premium: value } : c))
  }

  async function saveOrder() {
    setSaving(true)
    const supabase = createClient()
    const updates = clients.map((c, i) =>
      supabase.from('clients').update({ priorite_rang: i + 1 }).eq('id', c.id)
    )
    await Promise.all(updates)
    toast.success('Ordre des priorités enregistré.')
    setSaving(false)
  }

  return (
    <div className="space-y-4 max-w-lg">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Clients & Priorités</h1>
          <p className="text-sm text-slate-500 mt-0.5">Glissez pour réordonner par priorité (le premier est le plus prioritaire)</p>
        </div>
        <Button onClick={saveOrder} disabled={saving} className="h-11 bg-slate-900 hover:bg-slate-700">
          {saving ? 'Sauvegarde...' : 'Sauvegarder l\'ordre'}
        </Button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={clients.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {clients.map((client) => (
              <SortableClient key={client.id} client={client} onTogglePremium={togglePremium} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
}
