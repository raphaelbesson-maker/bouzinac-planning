import { createClient } from '@/lib/supabase/server'
import { OFsClient } from './OFsClient'

export default async function OFsPage() {
  const supabase = await createClient()
  const [{ data: ofs }, { data: clients }] = await Promise.all([
    supabase.from('ordres_fabrication').select('*').order('sla_date', { ascending: true }),
    supabase.from('clients').select('id, nom').order('priorite_rang'),
  ])

  return <OFsClient initialOFs={ofs ?? []} clients={clients ?? []} />
}
