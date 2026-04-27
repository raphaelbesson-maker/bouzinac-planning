'use client'

import { useState, useEffect, useMemo } from 'react'
import { AppShell } from '@/components/shared/AppShell'
import { StatutBadge, PrioriteBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import type { OrdreFabrication, OFPriorite, OFStatut, UserRole } from '@/lib/types'

type Tab = 'dashboard' | 'list'
type ClientItem = { id: string; nom: string }

interface ADVClientProps {
  initialOrders: OrdreFabrication[]
  clients: ClientItem[]
  userName: string
  role: UserRole
}

const STATUTS: OFStatut[] = ['A_planifier', 'Planifie', 'En_cours', 'Termine']
const PRIORITES: OFPriorite[] = ['Standard', 'Urgence', 'Constructeur']
const STATUT_LABELS: Record<OFStatut, string> = {
  A_planifier: 'À planifier',
  Planifie: 'Planifié',
  En_cours: 'En cours',
  Termine: 'Terminé',
}

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - now.getTime()) / 86400000)
}

function getSLAStyle(dateStr: string, statut: OFStatut): string {
  if (statut === 'Termine') return 'text-slate-400'
  const days = daysUntil(dateStr)
  if (days < 0) return 'text-red-700 font-bold'
  if (days <= 2) return 'text-red-600 font-semibold'
  if (days <= 5) return 'text-orange-600'
  return 'text-slate-700'
}

function SLACell({ slaDate, statut }: { slaDate: string; statut: OFStatut }) {
  const days = daysUntil(slaDate)
  const style = getSLAStyle(slaDate, statut)
  const label = statut === 'Termine' ? '' : days < 0 ? ' ⚠ DÉPASSÉ' : ` J-${days}`
  return (
    <span className={style}>
      {new Date(slaDate).toLocaleDateString('fr-FR')}
      {label}
    </span>
  )
}

interface OFFormProps {
  clients: ClientItem[]
  defaultPriorite?: OFPriorite
  defaultSla?: string
  onSave: (order: OrdreFabrication) => void
  onClose: () => void
}

function OFForm({ clients, defaultPriorite = 'Standard', defaultSla = '', onSave, onClose }: OFFormProps) {
  const [reference, setReference] = useState('')
  const [clientNom, setClientNom] = useState('')
  const [gamme, setGamme] = useState('')
  const [slaDate, setSlaDate] = useState(defaultSla)
  const [priorite, setPriorite] = useState<OFPriorite>(defaultPriorite)
  const [temps, setTemps] = useState('60')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const today = new Date().toISOString().split('T')[0]

  async function handleSave() {
    if (!reference.trim() || !clientNom.trim() || !slaDate) {
      toast.error('Référence, client et SLA sont obligatoires')
      return
    }
    if (slaDate < today) {
      toast.error('La date SLA ne peut pas être dans le passé')
      return
    }
    setSaving(true)
    const res = await fetch('/api/adv/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_nom: clientNom, reference_of: reference, gamme, sla_date: slaDate, priorite, temps_estime_minutes: temps, notes }),
    })
    const json = await res.json()
    setSaving(false)
    if (!res.ok) { toast.error(json.error); return }
    toast.success('OF créé avec succès')
    onSave(json.order)
    onClose()
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-700">Référence OF *</label>
          <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="OF-2026-042" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-700">Client *</label>
          <Input value={clientNom} onChange={(e) => setClientNom(e.target.value)} list="adv-clients-list" placeholder="Constructeur A" />
          <datalist id="adv-clients-list">
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
          <Input type="date" value={slaDate} min={today} onChange={(e) => setSlaDate(e.target.value)} />
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
          {saving ? 'Enregistrement...' : "Créer l'OF"}
        </Button>
        <Button variant="outline" onClick={onClose} disabled={saving}>Annuler</Button>
      </div>
    </div>
  )
}

function DashboardTab({ orders }: { orders: OrdreFabrication[] }) {
  const kpis = useMemo(() => {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const in2Days = new Date(now)
    in2Days.setDate(now.getDate() + 2)
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7))
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)

    return {
      aPlanifier: orders.filter((o) => o.statut === 'A_planifier').length,
      urgencesActives: orders.filter((o) => o.priorite === 'Urgence' && o.statut !== 'Termine').length,
      aRisqueSLA: orders.filter((o) => {
        if (o.statut === 'Termine') return false
        return new Date(o.sla_date) <= in2Days
      }).length,
      terminesSemaine: orders.filter((o) => {
        if (o.statut !== 'Termine') return false
        const updated = new Date(o.updated_at)
        return updated >= weekStart && updated <= weekEnd
      }).length,
    }
  }, [orders])

  const cards = [
    { label: 'À planifier', value: kpis.aPlanifier, sub: 'En attente de scheduling', bg: 'bg-slate-50', text: 'text-slate-900' },
    { label: 'Urgences actives', value: kpis.urgencesActives, sub: 'Priorité urgence non terminée', bg: 'bg-orange-50', text: 'text-orange-700' },
    { label: 'À risque SLA', value: kpis.aRisqueSLA, sub: 'Délai ≤ 2 jours', bg: 'bg-red-50', text: 'text-red-700' },
    { label: 'Terminés cette semaine', value: kpis.terminesSemaine, sub: 'Depuis lundi', bg: 'bg-green-50', text: 'text-green-700' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Vue d&apos;ensemble</h2>
        <p className="text-sm text-slate-500">{orders.length} ordres de fabrication au total</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Card key={c.label} className={`${c.bg} border-0 shadow-sm`}>
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-slate-600 uppercase tracking-wide">{c.label}</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className={`text-4xl font-bold ${c.text}`}>{c.value}</p>
              <p className="text-xs text-slate-500 mt-1">{c.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick list: urgent + at-risk */}
      {(kpis.urgencesActives > 0 || kpis.aRisqueSLA > 0) && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-3">À traiter en priorité</h3>
          <div className="border rounded-lg overflow-hidden bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-slate-600 text-xs">Référence</th>
                  <th className="text-left px-4 py-2 font-medium text-slate-600 text-xs">Client</th>
                  <th className="text-left px-4 py-2 font-medium text-slate-600 text-xs">SLA</th>
                  <th className="text-left px-4 py-2 font-medium text-slate-600 text-xs">Priorité</th>
                  <th className="text-left px-4 py-2 font-medium text-slate-600 text-xs">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders
                  .filter((o) => {
                    if (o.statut === 'Termine') return false
                    return o.priorite === 'Urgence' || daysUntil(o.sla_date) <= 2
                  })
                  .slice(0, 8)
                  .map((o) => (
                    <tr key={o.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2 font-semibold text-slate-800">{o.reference_of}</td>
                      <td className="px-4 py-2 text-slate-600">{o.client_nom}</td>
                      <td className="px-4 py-2"><SLACell slaDate={o.sla_date} statut={o.statut} /></td>
                      <td className="px-4 py-2"><PrioriteBadge priorite={o.priorite} /></td>
                      <td className="px-4 py-2"><StatutBadge statut={o.statut} /></td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function PillFilter<T extends string>({
  options,
  labels,
  value,
  onChange,
}: {
  options: Array<'all' | T>
  labels: Record<string, string>
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex gap-2 flex-wrap">
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={[
            'px-3 py-1 rounded-full text-xs font-medium border transition-colors',
            value === o
              ? 'bg-slate-900 text-white border-slate-900'
              : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400',
          ].join(' ')}
        >
          {labels[o] ?? o}
        </button>
      ))}
    </div>
  )
}

function OFListTab({
  orders,
  onOpenCreate,
}: {
  orders: OrdreFabrication[]
  onOpenCreate: (urgence?: boolean) => void
}) {
  const [filterStatut, setFilterStatut] = useState('all')
  const [filterPriorite, setFilterPriorite] = useState('all')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (filterStatut !== 'all' && o.statut !== filterStatut) return false
      if (filterPriorite !== 'all' && o.priorite !== filterPriorite) return false
      if (debouncedSearch && !o.client_nom.toLowerCase().includes(debouncedSearch.toLowerCase())) return false
      return true
    })
  }, [orders, filterStatut, filterPriorite, debouncedSearch])

  const statutLabels: Record<string, string> = { all: 'Tous', ...STATUT_LABELS }
  const prioriteLabels: Record<string, string> = { all: 'Tous', Standard: 'Standard', Urgence: 'Urgence', Constructeur: 'Constructeur' }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-slate-500">{filtered.length} OF{filtered.length !== 1 ? 's' : ''}</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenCreate(true)} className="text-orange-600 border-orange-200 hover:bg-orange-50">
            ⚡ Urgence rapide
          </Button>
          <Button size="sm" onClick={() => onOpenCreate(false)}>+ Nouvel OF</Button>
        </div>
      </div>

      <div className="space-y-2">
        <PillFilter
          options={['all', ...STATUTS]}
          labels={statutLabels}
          value={filterStatut}
          onChange={setFilterStatut}
        />
        <div className="flex items-center gap-3">
          <PillFilter
            options={['all', ...PRIORITES]}
            labels={prioriteLabels}
            value={filterPriorite}
            onChange={setFilterPriorite}
          />
          <Input
            placeholder="Rechercher un client..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-[220px] h-7 text-xs"
          />
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-slate-700">Référence</th>
              <th className="text-left px-4 py-3 font-medium text-slate-700">Client</th>
              <th className="text-left px-4 py-3 font-medium text-slate-700 hidden md:table-cell">Gamme</th>
              <th className="text-left px-4 py-3 font-medium text-slate-700">SLA</th>
              <th className="text-left px-4 py-3 font-medium text-slate-700 hidden sm:table-cell">Priorité</th>
              <th className="text-left px-4 py-3 font-medium text-slate-700">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-10 text-slate-400">
                  <p className="font-medium">Aucun OF trouvé</p>
                  <button
                    onClick={() => { setFilterStatut('all'); setFilterPriorite('all'); setSearch('') }}
                    className="text-xs text-blue-600 hover:underline mt-1"
                  >
                    Réinitialiser les filtres
                  </button>
                </td>
              </tr>
            )}
            {filtered.map((o) => (
              <tr key={o.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-semibold text-slate-800">{o.reference_of}</td>
                <td className="px-4 py-3 text-slate-700">{o.client_nom}</td>
                <td className="px-4 py-3 text-slate-500 italic hidden md:table-cell">{o.gamme ?? '—'}</td>
                <td className="px-4 py-3">
                  <SLACell slaDate={o.sla_date} statut={o.statut} />
                </td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  <PrioriteBadge priorite={o.priorite} />
                </td>
                <td className="px-4 py-3">
                  <StatutBadge statut={o.statut} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function ADVClient({ initialOrders, clients, userName, role }: ADVClientProps) {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')
  const [orders, setOrders] = useState<OrdreFabrication[]>(initialOrders)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [urgenceMode, setUrgenceMode] = useState(false)

  function openCreate(urgence = false) {
    setUrgenceMode(urgence)
    setDialogOpen(true)
  }

  function handleCreated(order: OrdreFabrication) {
    setOrders((prev) => [order, ...prev].sort(
      (a, b) => new Date(a.sla_date).getTime() - new Date(b.sla_date).getTime()
    ))
    setActiveTab('list')
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'dashboard', label: 'Tableau de bord' },
    { id: 'list', label: `Mes OFs (${orders.length})` },
  ]

  const tomorrowStr = (() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d.toISOString().split('T')[0]
  })()

  return (
    <AppShell role={role} userName={userName}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Espace ADV</h1>
            <p className="text-sm text-slate-500">Gestion des ordres de fabrication</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => openCreate(true)} className="text-orange-600 border-orange-200 hover:bg-orange-50">
              ⚡ Urgence rapide
            </Button>
            <Button onClick={() => openCreate(false)}>+ Nouvel OF</Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-200 flex gap-0">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={[
                'px-5 py-2.5 text-sm font-medium border-b-2 transition-colors',
                activeTab === t.id
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300',
              ].join(' ')}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === 'dashboard' && <DashboardTab orders={orders} />}
        {activeTab === 'list' && (
          <OFListTab orders={orders} onOpenCreate={openCreate} />
        )}
      </div>

      {/* Create dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) setDialogOpen(false) }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {urgenceMode ? '⚡ Urgence rapide' : 'Nouvel OF'}
            </DialogTitle>
          </DialogHeader>
          {dialogOpen && (
            <OFForm
              clients={clients}
              defaultPriorite={urgenceMode ? 'Urgence' : 'Standard'}
              defaultSla={urgenceMode ? tomorrowStr : ''}
              onSave={handleCreated}
              onClose={() => setDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  )
}
