import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: op } = await supabase.from('operateurs').select('role').eq('id', user.id).single()
  if (op?.role !== 'Admin') return null
  return user
}

// GET — liste tous les utilisateurs
export async function GET() {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

  const admin = createAdminClient()
  const { data: { users }, error } = await admin.auth.admin.listUsers()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: operateurs } = await admin.from('operateurs').select('id, nom, role')
  const opMap = new Map((operateurs ?? []).map((o) => [o.id, o]))

  const result = users.map((u) => {
    const op = opMap.get(u.id)
    return {
      id: u.id,
      email: u.email ?? '',
      nom: op?.nom ?? '—',
      role: op?.role ?? 'Sans rôle',
      created_at: u.created_at,
    }
  })

  return NextResponse.json({ users: result })
}

// POST — créer un utilisateur
export async function POST(req: NextRequest) {
  const caller = await requireAdmin()
  if (!caller) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

  const { email, password, nom, role } = await req.json()
  if (!email || !password || !nom || !role) {
    return NextResponse.json({ error: 'Tous les champs sont obligatoires' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: { user }, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // pas besoin de confirmer par email
  })

  if (authError) return NextResponse.json({ error: authError.message }, { status: 400 })
  if (!user) return NextResponse.json({ error: 'Erreur création utilisateur' }, { status: 500 })

  const { error: opError } = await admin.from('operateurs').insert({ id: user.id, nom, role })
  if (opError) {
    await admin.auth.admin.deleteUser(user.id)
    return NextResponse.json({ error: opError.message }, { status: 500 })
  }

  return NextResponse.json({ user: { id: user.id, email, nom, role } })
}

// DELETE — supprimer un utilisateur
export async function DELETE(req: NextRequest) {
  const caller = await requireAdmin()
  if (!caller) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

  const { user_id } = await req.json()
  if (!user_id) return NextResponse.json({ error: 'user_id manquant' }, { status: 400 })

  // Empêcher l'admin de se supprimer lui-même
  if (user_id === caller.id) {
    return NextResponse.json({ error: 'Impossible de supprimer son propre compte' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.deleteUser(user_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
