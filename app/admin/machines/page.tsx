import { createClient } from '@/lib/supabase/server'
import { MachinesClient } from './MachinesClient'

export default async function MachinesPage() {
  const supabase = await createClient()
  const { data: machines } = await supabase.from('machines').select('*').order('nom')

  return <MachinesClient initialMachines={machines ?? []} />
}
