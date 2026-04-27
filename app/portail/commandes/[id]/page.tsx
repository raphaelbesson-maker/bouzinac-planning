import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import { CommandeDetail } from './CommandeDetail'
import type { UserRole } from '@/lib/types'

interface Props {
  params: Promise<{ id: string }>
}

export default async function CommandePage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const reqHeaders = await headers()
  const role = (reqHeaders.get('x-user-role') as UserRole) || 'Client'

  const [{ data: order }, { data: documents }, { data: operateur }] = await Promise.all([
    supabase.from('ordres_fabrication').select('*').eq('id', id).single(),
    supabase.from('documents').select('*').eq('of_id', id).order('created_at'),
    supabase.from('operateurs').select('nom, clients(nom)').eq('id', session.user.id).single(),
  ])

  if (!order) notFound()

  const userName = operateur?.nom ?? session.user.email ?? ''

  return (
    <CommandeDetail
      order={order}
      documents={documents ?? []}
      userName={userName}
      role={role}
    />
  )
}
