import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { PortailClient } from './PortailClient'
import type { UserRole } from '@/lib/types'

export default async function PortailPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const reqHeaders = await headers()
  const role = (reqHeaders.get('x-user-role') as UserRole) || 'Client'

  // RLS scopes orders to the client's own data automatically
  const { data: orders } = await supabase
    .from('ordres_fabrication')
    .select('*')
    .order('sla_date', { ascending: false })

  // Get client nom from operateur record
  const { data: operateur } = await supabase
    .from('operateurs')
    .select('nom, client_id, clients(nom)')
    .eq('id', session.user.id)
    .single()

  const userName = operateur?.nom ?? session.user.email ?? ''
  const clientNom = (operateur?.clients as unknown as { nom: string } | null)?.nom ?? ''

  return (
    <PortailClient
      initialOrders={orders ?? []}
      userName={userName}
      clientNom={clientNom}
      role={role}
    />
  )
}
