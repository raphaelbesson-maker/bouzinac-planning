import { createClient } from '@/lib/supabase/server'
import { OperateursClient } from './OperateursClient'

export default async function OperateursPage() {
  const supabase = await createClient()
  const [{ data: operateurs }, { data: machines }] = await Promise.all([
    supabase.from('operateurs').select('*').order('nom'),
    supabase.from('machines').select('id, nom').order('nom'),
  ])

  return <OperateursClient initialOperateurs={operateurs ?? []} machines={machines ?? []} />
}
