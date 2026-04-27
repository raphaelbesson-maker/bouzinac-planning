import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { ADVClient } from './ADVClient'
import type { UserRole } from '@/lib/types'

export default async function ADVPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const reqHeaders = await headers()
  const role = (reqHeaders.get('x-user-role') as UserRole) || 'ADV'

  const [{ data: orders }, { data: clients }] = await Promise.all([
    supabase
      .from('ordres_fabrication')
      .select('*')
      .order('sla_date', { ascending: true }),
    supabase
      .from('clients')
      .select('id, nom')
      .order('priorite_rang'),
  ])

  const userName = session.user.user_metadata?.nom ?? session.user.email ?? ''

  return (
    <ADVClient
      initialOrders={orders ?? []}
      clients={clients ?? []}
      userName={userName}
      role={role}
    />
  )
}
