import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AdminLayoutClient } from './AdminLayoutClient'
import type { UserRole } from '@/lib/types'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: operateur } = await supabase
    .from('operateurs')
    .select('nom, role')
    .eq('id', user.id)
    .single()

  return (
    <AdminLayoutClient
      userName={operateur?.nom ?? user.email ?? ''}
      role={(operateur?.role as UserRole) ?? 'Admin'}
    >
      {children}
    </AdminLayoutClient>
  )
}
