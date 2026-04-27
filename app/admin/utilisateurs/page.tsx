import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { UtilisateursClient } from './UtilisateursClient'

export default async function UtilisateursPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const reqHeaders = await headers()
  const role = reqHeaders.get('x-user-role')
  if (role !== 'Admin') redirect('/planning')

  return <UtilisateursClient />
}
