import { Resend } from 'resend'
import type { OrdreFabrication } from '@/lib/types'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? 'commandes@bouzinac.fr'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

export type NotificationType = 'statut_change' | 'expedition'

interface SendNotificationParams {
  order: OrdreFabrication
  type: NotificationType
  recipientEmail: string
}

function getEmailContent(order: OrdreFabrication, type: NotificationType) {
  const portalUrl = `${APP_URL}/portail/commandes/${order.id}`
  const slaFormatted = new Date(order.sla_date).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  if (type === 'expedition') {
    return {
      subject: `✅ Votre commande ${order.reference_of} est prête`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">
          <div style="background: #1d4ed8; padding: 24px 32px; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 22px;">BOUZINAC</h1>
            <p style="color: #bfdbfe; margin: 4px 0 0;">Fabricant de jantes sur mesure</p>
          </div>
          <div style="background: white; padding: 32px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
            <h2 style="color: #16a34a; margin: 0 0 16px;">✅ Commande prête / expédiée</h2>
            <p style="color: #475569; margin: 0 0 8px;">Bonjour,</p>
            <p style="color: #475569; margin: 0 0 24px;">
              Votre commande <strong>${order.reference_of}</strong>${order.gamme ? ` (${order.gamme})` : ''} est maintenant prête.
            </p>
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="color: #64748b; font-size: 13px; padding: 4px 0;">Référence</td>
                  <td style="font-weight: bold; font-size: 13px;">${order.reference_of}</td>
                </tr>
                ${order.gamme ? `<tr><td style="color: #64748b; font-size: 13px; padding: 4px 0;">Désignation</td><td style="font-size: 13px;">${order.gamme}</td></tr>` : ''}
                <tr>
                  <td style="color: #64748b; font-size: 13px; padding: 4px 0;">Date prévue</td>
                  <td style="font-size: 13px;">${slaFormatted}</td>
                </tr>
              </table>
            </div>
            <a href="${portalUrl}" style="background: #1d4ed8; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
              Voir ma commande →
            </a>
            <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">
              Vous pouvez télécharger votre bon de livraison depuis votre espace client.
            </p>
          </div>
        </div>
      `,
    }
  }

  // Generic status change
  const statusLabels: Record<string, string> = {
    A_planifier: 'En attente de planification',
    Planifie: 'Planifiée',
    En_cours: 'En cours de fabrication',
    Termine: 'Terminée / Expédiée',
  }
  const statusLabel = statusLabels[order.statut] ?? order.statut

  return {
    subject: `📦 Mise à jour commande ${order.reference_of} — ${statusLabel}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">
        <div style="background: #1d4ed8; padding: 24px 32px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 22px;">BOUZINAC</h1>
          <p style="color: #bfdbfe; margin: 4px 0 0;">Fabricant de jantes sur mesure</p>
        </div>
        <div style="background: white; padding: 32px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
          <h2 style="color: #1d4ed8; margin: 0 0 16px;">Mise à jour de votre commande</h2>
          <p style="color: #475569; margin: 0 0 8px;">Bonjour,</p>
          <p style="color: #475569; margin: 0 0 24px;">
            Votre commande <strong>${order.reference_of}</strong> a été mise à jour.
          </p>
          <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="color: #64748b; font-size: 13px; padding: 4px 0;">Nouveau statut</td>
                <td style="font-weight: bold; font-size: 13px; color: #1d4ed8;">${statusLabel}</td>
              </tr>
              <tr>
                <td style="color: #64748b; font-size: 13px; padding: 4px 0;">Référence</td>
                <td style="font-size: 13px;">${order.reference_of}</td>
              </tr>
              ${order.gamme ? `<tr><td style="color: #64748b; font-size: 13px; padding: 4px 0;">Désignation</td><td style="font-size: 13px;">${order.gamme}</td></tr>` : ''}
            </table>
          </div>
          <a href="${portalUrl}" style="background: #1d4ed8; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
            Suivre ma commande →
          </a>
        </div>
      </div>
    `,
  }
}

export async function sendOrderNotification({
  order,
  type,
  recipientEmail,
}: SendNotificationParams): Promise<{ success: boolean; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY not configured — skipping notification')
    return { success: false, error: 'RESEND_API_KEY not configured' }
  }

  const { subject, html } = getEmailContent(order, type)

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: recipientEmail,
      subject,
      html,
    })
    return { success: true }
  } catch (err) {
    console.error('[email] Failed to send notification:', err)
    return { success: false, error: String(err) }
  }
}
