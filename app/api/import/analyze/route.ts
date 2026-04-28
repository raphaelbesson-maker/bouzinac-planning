import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { anthropic, AI_MODEL } from '@/lib/ai/anthropic'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const body = await req.json()
  const { imported_of_ids } = body as { imported_of_ids: string[] }

  if (!imported_of_ids?.length) {
    return NextResponse.json({ recommendations: [], summary: '' })
  }

  const today = new Date().toISOString().split('T')[0]
  const in7days = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]

  const [{ data: newOFs }, { data: plannedOps }] = await Promise.all([
    supabase
      .from('ordres_fabrication')
      .select('reference_of, client_nom, priorite, sla_date, statut, of_operations(nom, categorie_machine, duree_minutes, ordre)')
      .in('id', imported_of_ids),
    supabase
      .from('of_operations')
      .select('nom, categorie_machine, start_time, end_time, statut, locked, of:ordres_fabrication(reference_of, client_nom, priorite, sla_date)')
      .not('start_time', 'is', null)
      .gte('start_time', today + 'T00:00:00Z')
      .lte('start_time', in7days + 'T23:59:59Z')
      .order('start_time'),
  ])

  const prompt = `Tu es un expert en ordonnancement de production pour un atelier de fabrication de jantes sur mesure.

Voici les OFs qui viennent d'être importés :
${JSON.stringify(newOFs, null, 2)}

Voici le planning en cours (7 prochains jours) :
${JSON.stringify(plannedOps?.slice(0, 40), null, 2)}

Date du jour : ${today}

Analyse et retourne UNIQUEMENT un JSON valide (sans markdown) avec cette structure :
{
  "summary": "Phrase de synthèse courte (1-2 phrases)",
  "recommendations": [
    {
      "level": "urgent" | "attention" | "info",
      "title": "Titre court",
      "detail": "Explication actionnable (max 2 phrases)"
    }
  ]
}

Identifie : OFs urgents (SLA < 3 jours ou priorité Urgence/Constructeur), conflits potentiels avec le planning existant sur les mêmes catégories de machines, charge globale. Limite à 5 recommandations maximum.`

  try {
    const message = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })
    const text = (message.content[0] as { type: string; text: string }).text.trim()
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('No JSON')
    const parsed = JSON.parse(match[0])
    return NextResponse.json(parsed)
  } catch {
    return NextResponse.json({
      summary: `${imported_of_ids.length} OF(s) importé(s). Analyse IA indisponible.`,
      recommendations: [],
    })
  }
}
