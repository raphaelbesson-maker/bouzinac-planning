import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { SimulateurClient } from './SimulateurClient'
import type { UserRole } from '@/lib/types'

export default async function SimulateurPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const reqHeaders = await headers()
  const role = (reqHeaders.get('x-user-role') as UserRole) || 'ADV'

  const { data: machines } = await supabase
    .from('machines')
    .select('*')
    .eq('statut', 'Actif')
    .order('nom')

  const userName = session.user.user_metadata?.nom ?? session.user.email ?? ''

  return (
    <SimulateurClient
      machines={machines ?? []}
      userName={userName}
      role={role}
    />
  )
}
