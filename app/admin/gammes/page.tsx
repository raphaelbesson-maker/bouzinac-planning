import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { GammesClient } from './GammesClient'
import type { Gamme } from '@/lib/types'

export default async function GammesPage() {
  const h = await headers()
  const role = h.get('x-user-role')
  if (role !== 'Admin') redirect('/planning')

  const supabase = await createClient()
  const { data: gammes } = await supabase
    .from('gammes')
    .select('*, gamme_operations(id, ordre, nom, categorie_machine, duree_minutes)')
    .order('nom')

  return <GammesClient initialGammes={(gammes as Gamme[]) ?? []} />
}
