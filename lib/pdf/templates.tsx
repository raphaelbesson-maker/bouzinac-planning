import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { OrdreFabrication } from '@/lib/types'

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    padding: 40,
    color: '#1e293b',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottom: '1 solid #e2e8f0',
  },
  company: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
  },
  companyAddress: {
    fontSize: 8,
    color: '#64748b',
    marginTop: 4,
    lineHeight: 1.4,
  },
  docTitle: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: '#1d4ed8',
    textAlign: 'right',
  },
  docRef: {
    fontSize: 9,
    color: '#64748b',
    textAlign: 'right',
    marginTop: 4,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  infoBox: {
    backgroundColor: '#f8fafc',
    border: '1 solid #e2e8f0',
    borderRadius: 4,
    padding: 10,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  infoLabel: {
    width: 120,
    color: '#64748b',
    fontSize: 9,
  },
  infoValue: {
    flex: 1,
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
  },
  table: {
    border: '1 solid #e2e8f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    padding: '8 10',
  },
  tableRow: {
    flexDirection: 'row',
    padding: '8 10',
    borderTop: '1 solid #e2e8f0',
  },
  tableCell: { flex: 1, fontSize: 9 },
  tableCellBold: { flex: 1, fontSize: 9, fontFamily: 'Helvetica-Bold' },
  tableCellHeader: { flex: 1, fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#64748b', textTransform: 'uppercase' },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: '#94a3b8',
    borderTop: '1 solid #e2e8f0',
    paddingTop: 8,
  },
  badge: {
    backgroundColor: '#dbeafe',
    color: '#1d4ed8',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
  },
})

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function BonLivraisonPDF({ order }: { order: OrdreFabrication }) {
  const docNumber = `BL-${order.reference_of}-${new Date().getFullYear()}`
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.company}>BOUZINAC</Text>
            <Text style={styles.companyAddress}>
              Fabricant de jantes sur mesure{'\n'}
              Angers, France{'\n'}
              SIRET : 000 000 000 00000
            </Text>
          </View>
          <View>
            <Text style={styles.docTitle}>BON DE LIVRAISON</Text>
            <Text style={styles.docRef}>N° {docNumber}</Text>
            <Text style={styles.docRef}>Date : {formatDate(new Date().toISOString())}</Text>
          </View>
        </View>

        {/* Client info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Destinataire</Text>
          <View style={styles.infoBox}>
            <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold' }}>{order.client_nom}</Text>
          </View>
        </View>

        {/* Order details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Détails de la commande</Text>
          <View style={styles.infoBox}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Référence OF</Text>
              <Text style={styles.infoValue}>{order.reference_of}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Désignation</Text>
              <Text style={styles.infoValue}>{order.gamme ?? '—'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Date de livraison</Text>
              <Text style={styles.infoValue}>{formatDate(order.sla_date)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Priorité</Text>
              <Text style={styles.infoValue}>{order.priorite}</Text>
            </View>
          </View>
        </View>

        {/* Items table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Articles livrés</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCellHeader, { flex: 2 }]}>Désignation</Text>
              <Text style={styles.tableCellHeader}>Référence</Text>
              <Text style={styles.tableCellHeader}>Qté</Text>
              <Text style={styles.tableCellHeader}>Statut</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.tableCellBold, { flex: 2 }]}>{order.gamme ?? 'Jante sur mesure'}</Text>
              <Text style={styles.tableCell}>{order.reference_of}</Text>
              <Text style={styles.tableCell}>1</Text>
              <Text style={styles.tableCell}>Livré</Text>
            </View>
          </View>
        </View>

        {/* Signature zone */}
        <View style={{ flexDirection: 'row', gap: 20, marginTop: 24 }}>
          <View style={{ flex: 1, border: '1 solid #e2e8f0', borderRadius: 4, padding: 12, minHeight: 60 }}>
            <Text style={{ fontSize: 8, color: '#64748b', marginBottom: 4 }}>Signature expéditeur</Text>
            <Text style={{ fontSize: 8, color: '#94a3b8' }}>BOUZINAC</Text>
          </View>
          <View style={{ flex: 1, border: '1 solid #e2e8f0', borderRadius: 4, padding: 12, minHeight: 60 }}>
            <Text style={{ fontSize: 8, color: '#64748b', marginBottom: 4 }}>Signature destinataire</Text>
            <Text style={{ fontSize: 8, color: '#94a3b8' }}>Bon pour réception</Text>
          </View>
        </View>

        {order.notes && (
          <View style={{ marginTop: 16 }}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <View style={styles.infoBox}>
              <Text style={{ fontSize: 9, color: '#475569' }}>{order.notes}</Text>
            </View>
          </View>
        )}

        <Text style={styles.footer}>
          BOUZINAC — Fabricant de jantes sur mesure — Angers, France — Document généré le {formatDate(new Date().toISOString())}
        </Text>
      </Page>
    </Document>
  )
}

export function FacturePDF({ order }: { order: OrdreFabrication }) {
  const docNumber = `FAC-${order.reference_of}-${new Date().getFullYear()}`
  const prixUnitaire = 0 // À renseigner selon configuration
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.company}>BOUZINAC</Text>
            <Text style={styles.companyAddress}>
              Fabricant de jantes sur mesure{'\n'}
              Angers, France{'\n'}
              SIRET : 000 000 000 00000{'\n'}
              N° TVA : FR00 000 000 000
            </Text>
          </View>
          <View>
            <Text style={styles.docTitle}>FACTURE</Text>
            <Text style={styles.docRef}>N° {docNumber}</Text>
            <Text style={styles.docRef}>Date : {formatDate(new Date().toISOString())}</Text>
            <Text style={styles.docRef}>OF : {order.reference_of}</Text>
          </View>
        </View>

        {/* Bill to */}
        <View style={{ flexDirection: 'row', gap: 16, marginBottom: 20 }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>Facturé à</Text>
            <View style={styles.infoBox}>
              <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold' }}>{order.client_nom}</Text>
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>Informations</Text>
            <View style={styles.infoBox}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Date d&apos;échéance</Text>
                <Text style={styles.infoValue}>{formatDate(order.sla_date)}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Conditions</Text>
                <Text style={styles.infoValue}>30 jours net</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Prestations</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCellHeader, { flex: 3 }]}>Désignation</Text>
              <Text style={styles.tableCellHeader}>Qté</Text>
              <Text style={styles.tableCellHeader}>P.U. HT</Text>
              <Text style={styles.tableCellHeader}>Total HT</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.tableCellBold, { flex: 3 }]}>{order.gamme ?? 'Fabrication jante sur mesure'}{'\n'}
                <Text style={{ fontSize: 8, color: '#64748b', fontFamily: 'Helvetica' }}>Réf. {order.reference_of}</Text>
              </Text>
              <Text style={styles.tableCell}>1</Text>
              <Text style={styles.tableCell}>{prixUnitaire > 0 ? `${prixUnitaire.toFixed(2)} €` : 'Sur devis'}</Text>
              <Text style={styles.tableCellBold}>{prixUnitaire > 0 ? `${prixUnitaire.toFixed(2)} €` : 'Sur devis'}</Text>
            </View>
          </View>
        </View>

        {/* Totals */}
        {prixUnitaire > 0 && (
          <View style={{ alignItems: 'flex-end', marginTop: 8 }}>
            <View style={{ width: 200 }}>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { flex: 1 }]}>Sous-total HT</Text>
                <Text style={styles.infoValue}>{prixUnitaire.toFixed(2)} €</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { flex: 1 }]}>TVA 20%</Text>
                <Text style={styles.infoValue}>{(prixUnitaire * 0.2).toFixed(2)} €</Text>
              </View>
              <View style={[styles.infoRow, { borderTop: '1 solid #e2e8f0', paddingTop: 4, marginTop: 4 }]}>
                <Text style={[styles.infoLabel, { flex: 1, fontFamily: 'Helvetica-Bold', fontSize: 11 }]}>TOTAL TTC</Text>
                <Text style={[styles.infoValue, { fontSize: 11 }]}>{(prixUnitaire * 1.2).toFixed(2)} €</Text>
              </View>
            </View>
          </View>
        )}

        {/* Payment info */}
        <View style={{ marginTop: 20 }}>
          <Text style={styles.sectionTitle}>Modalités de paiement</Text>
          <View style={styles.infoBox}>
            <Text style={{ fontSize: 9, color: '#475569' }}>
              Virement bancaire — IBAN : FR00 0000 0000 0000 0000 0000 000{'\n'}
              En cas de retard de paiement, des pénalités de 3× le taux légal seront appliquées.
            </Text>
          </View>
        </View>

        <Text style={styles.footer}>
          BOUZINAC — Fabricant de jantes sur mesure — Angers, France — Document généré le {formatDate(new Date().toISOString())}
        </Text>
      </Page>
    </Document>
  )
}
