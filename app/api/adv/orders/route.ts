import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const statut = searchParams.get('statut')
  const priorite = searchParams.get('priorite')
  const q = searchParams.get('q')

  let query = supabase
    .from('ordres_fabrication')
    .select('*')
    .order('sla_date', { ascending: true })

  if (statut && statut !== 'all') query = query.eq('statut', statut)
  if (priorite && priorite !== 'all') query = query.eq('priorite', priorite)
  if (q) query = query.ilike('client_nom', `%${q}%`)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ orders: data })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const body = await req.json()
  const { client_nom, reference_of, gamme, sla_date, priorite, temps_estime_minutes, notes } = body

  if (!client_nom?.trim() || !reference_of?.trim() || !sla_date) {
    return NextResponse.json({ error: 'Client, référence et SLA sont obligatoires' }, { status: 400 })
  }

  const VALID_PRIORITES = ['Standard', 'Urgence', 'Constructeur']
  if (priorite && !VALID_PRIORITES.includes(priorite)) {
    return NextResponse.json({ error: 'Priorité invalide' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('ordres_fabrication')
    .insert({
      client_nom: client_nom.trim(),
      reference_of: reference_of.trim(),
      gamme: gamme?.trim() || null,
      sla_date,
      priorite: priorite ?? 'Standard',
      temps_estime_minutes: Math.max(1, parseInt(temps_estime_minutes) || 60),
      notes: notes?.trim() || null,
      statut: 'A_planifier',
    })
    .select('*')
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: `La référence "${reference_of}" existe déjà` },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ order: data }, { status: 201 })
}
