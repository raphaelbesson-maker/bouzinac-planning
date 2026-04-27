import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { PlanningClient } from './PlanningClient'
import { PlanningLoading } from './PlanningLoading'
import type { UserRole } from '@/lib/types'

export default async function PlanningPage() {
  const supabase = await createClient()

  // getSession() reads the cookie locally — no network call.
  // The middleware already ran getUser() (the secure auth check), so this is safe.
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  // Role is set by middleware in the x-user-role header — no DB query needed.
  const reqHeaders = await headers()
  const role = (reqHeaders.get('x-user-role') as UserRole) || 'Atelier'

  // Only fetch machines — the only data we truly need server-side.
  // OFs and slots load client-side in usePlanning() in parallel.
  const { data: machines } = await supabase
    .from('machines')
    .select('*')
    .order('nom')

  const userName = session.user.user_metadata?.nom
    ?? session.user.email
    ?? ''

  return (
    <Suspense fallback={<PlanningLoading />}>
      <PlanningClient
        machines={machines ?? []}
        userName={userName}
        role={role}
      />
    </Suspense>
  )
}
