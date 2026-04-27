'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'

type UserRole = 'Admin' | 'ADV' | 'Atelier'

interface AppUser {
  id: string
  email: string
  nom: string
  role: string
  created_at: string
}

const ROLES: UserRole[] = ['Atelier', 'ADV', 'Admin']

const ROLE_COLORS: Record<string, string> = {
  Admin: 'bg-indigo-100 text-indigo-700',
  ADV: 'bg-orange-100 text-orange-700',
  Atelier: 'bg-slate-100 text-slate-700',
  'Sans rôle': 'bg-red-100 text-red-600',
}

const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  Atelier: 'Accès au module Planning — peut planifier et déplacer les OFs',
  ADV: 'Accès au simulateur d\'impact — peut insérer des urgences SAV',
  Admin: 'Accès complet — planning, simulateur, console admin et gestion des utilisateurs',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function UtilisateursClient() {
  const [users, setUsers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  // Form state
  const [nom, setNom] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<UserRole>('Atelier')
  const [saving, setSaving] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const loadUsers = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/users')
    if (res.ok) {
      const data = await res.json()
      setUsers(data.users)
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadUsers() }, [loadUsers])

  function resetForm() {
    setNom('')
    setEmail('')
    setPassword('')
    setRole('Atelier')
    setShowPassword(false)
  }

  async function handleCreate() {
    if (!nom.trim() || !email.trim() || !password.trim()) {
      toast.error('Nom, email et mot de passe sont obligatoires')
      return
    }
    if (password.length < 8) {
      toast.error('Le mot de passe doit faire au moins 8 caractères')
      return
    }
    setSaving(true)
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nom: nom.trim(), email: email.trim(), password, role }),
    })
    const data = await res.json()
    if (!res.ok) {
      toast.error(data.error ?? 'Impossible de créer l\'utilisateur')
    } else {
      toast.success(`${nom} créé avec succès`)
      setShowForm(false)
      resetForm()
      loadUsers()
    }
    setSaving(false)
  }

  async function handleDelete(user: AppUser) {
    if (!confirm(`Supprimer ${user.nom} (${user.email}) ? Cette action est irréversible.`)) return
    setDeleting(user.id)
    const res = await fetch('/api/admin/users', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id }),
    })
    const data = await res.json()
    if (!res.ok) {
      toast.error(data.error ?? 'Impossible de supprimer cet utilisateur')
    } else {
      toast.success(`${user.nom} supprimé`)
      setUsers((prev) => prev.filter((u) => u.id !== user.id))
    }
    setDeleting(null)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Gestion des utilisateurs</h1>
          <p className="text-sm text-slate-500 mt-0.5">{users.length} compte{users.length > 1 ? 's' : ''} — seuls les Admins peuvent créer ou supprimer des accès</p>
        </div>
        <Button className="h-11" onClick={() => { resetForm(); setShowForm(true) }}>
          + Nouvel utilisateur
        </Button>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-slate-700">Nom</th>
              <th className="text-left px-4 py-3 font-medium text-slate-700">Email</th>
              <th className="text-left px-4 py-3 font-medium text-slate-700">Rôle</th>
              <th className="text-left px-4 py-3 font-medium text-slate-700">Créé le</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr><td colSpan={5} className="text-center py-10 text-slate-400">Chargement…</td></tr>
            )}
            {!loading && users.length === 0 && (
              <tr><td colSpan={5} className="text-center py-10 text-slate-400">Aucun utilisateur</td></tr>
            )}
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-semibold text-slate-900">{user.nom}</td>
                <td className="px-4 py-3 text-slate-600">{user.email}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[user.role]}`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs">{formatDate(user.created_at)}</td>
                <td className="px-4 py-3 text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 border-red-200 hover:bg-red-50"
                    disabled={deleting === user.id}
                    onClick={() => handleDelete(user)}
                  >
                    Supprimer
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create user modal */}
      <Dialog open={showForm} onOpenChange={(o) => { if (!o) { setShowForm(false); resetForm() } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nouvel utilisateur</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-1">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Nom complet *</label>
              <Input
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder="Marie Dupont"
                className="h-11"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Adresse email *</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="marie@bouzinac.fr"
                className="h-11"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Mot de passe provisoire * (min. 8 caractères)</label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-11 pr-16"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-slate-700"
                >
                  {showPassword ? 'Masquer' : 'Afficher'}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-700">Rôle *</label>
              <div className="grid grid-cols-3 gap-2">
                {ROLES.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={[
                      'rounded-lg border-2 px-3 py-2.5 text-sm font-medium transition-colors text-left',
                      role === r
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400',
                    ].join(' ')}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-500 bg-slate-50 rounded p-2 leading-relaxed">
                {ROLE_DESCRIPTIONS[role]}
              </p>
            </div>
          </div>

          <div className="flex gap-2 pt-2 border-t">
            <Button
              onClick={handleCreate}
              disabled={saving}
              className="flex-1 h-11"
            >
              {saving ? 'Création…' : 'Créer le compte'}
            </Button>
            <Button variant="outline" onClick={() => { setShowForm(false); resetForm() }} className="h-11">
              Annuler
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
