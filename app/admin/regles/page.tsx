import { createClient } from '@/lib/supabase/server'
import { ReglesClient } from './ReglesClient'

export default async function ReglesPage() {
  const supabase = await createClient()
  const { data: reglements } = await supabase.from('reglements').select('*')

  const rules = Object.fromEntries(
    (reglements ?? []).map((r) => [r.key, r.value])
  )

  return <ReglesClient initialRules={rules} />
}
