import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { BonLivraisonPDF, FacturePDF } from '@/lib/pdf/templates'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const docId = searchParams.get('id')
  const ofId = searchParams.get('of_id')
  const type = searchParams.get('type') as 'BL' | 'Facture' | null

  // Download existing document from storage
  if (docId) {
    const { data: doc, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', docId)
      .single()

    if (error || !doc) {
      return NextResponse.json({ error: 'Document introuvable' }, { status: 404 })
    }

    if (doc.storage_path) {
      const { data: file } = await supabase.storage
        .from('documents')
        .download(doc.storage_path)

      if (file) {
        const buffer = await file.arrayBuffer()
        return new NextResponse(buffer, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${doc.nom_fichier}"`,
          },
        })
      }
    }
    return NextResponse.json({ error: 'Fichier non disponible' }, { status: 404 })
  }

  // Generate PDF on the fly (Admin/ADV only)
  if (ofId && type) {
    const { data: operateur } = await supabase
      .from('operateurs')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = operateur?.role ?? ''
    if (!['Admin', 'ADV'].includes(role)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { data: order, error: ofError } = await supabase
      .from('ordres_fabrication')
      .select('*')
      .eq('id', ofId)
      .single()

    if (ofError || !order) {
      return NextResponse.json({ error: 'OF introuvable' }, { status: 404 })
    }

    const element = type === 'BL'
      ? React.createElement(BonLivraisonPDF, { order })
      : React.createElement(FacturePDF, { order })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buffer = await renderToBuffer(element as any)
    const filename = `${type}-${order.reference_of}.pdf`

    // Save document record
    await supabase.from('documents').insert({
      of_id: ofId,
      type,
      nom_fichier: filename,
      storage_path: null, // generated on-the-fly, not stored
    })

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  }

  return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
}
