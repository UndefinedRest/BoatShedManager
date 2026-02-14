/**
 * Email Service
 *
 * Thin wrapper around Resend for sending transactional emails.
 * Currently used for damage report notifications.
 */

import { Resend } from 'resend';
import { logger } from '../middleware/logging.js';

let resendClient: Resend | null = null;

/**
 * Initialize the email service with a Resend API key.
 * Call once at startup. If no key is provided, email sending is disabled.
 */
export function initEmailService(apiKey: string | undefined): void {
  if (apiKey) {
    resendClient = new Resend(apiKey);
    logger.info('Email service initialized (Resend)');
  } else {
    logger.warn('RESEND_API_KEY not set — damage report emails will not be sent');
  }
}

/**
 * Check whether the email service is available for sending.
 */
export function isEmailServiceAvailable(): boolean {
  return resendClient !== null;
}

/**
 * Structured data for a damage report email.
 */
export interface DamageReportEmailData {
  to: string;
  clubName: string;
  boatId: string;
  boatName: string;
  responsibility: string;
  damageTypes: string[];
  comment: string;
  reportedAt: string;
  reporterIp: string;
}

const RESPONSIBILITY_LABELS: Record<string, string> = {
  caused_by_me: 'Caused by me',
  found_like_this: 'Found like this',
  witnessed_by_others: 'Witnessed by others',
};

/**
 * Send a damage report email via Resend.
 * Throws if the email service is not initialized or sending fails.
 */
export async function sendDamageReportEmail(data: DamageReportEmailData): Promise<void> {
  if (!resendClient) {
    throw new Error('Email service not initialized');
  }

  const responsibilityLabel = RESPONSIBILITY_LABELS[data.responsibility] || data.responsibility;
  const damageTypesList = data.damageTypes
    .map((t) => t.charAt(0).toUpperCase() + t.slice(1))
    .join(', ');
  const commentText = data.comment?.trim() || 'None provided';

  const reportedDate = new Date(data.reportedAt);
  const formattedDate = reportedDate.toLocaleDateString('en-AU', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const formattedTime = reportedDate.toLocaleTimeString('en-AU', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const html = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #991b1b; margin-bottom: 4px;">Damage Report</h2>
  <p style="color: #64748b; font-size: 14px; margin-bottom: 20px;">
    Submitted ${formattedDate} at ${formattedTime} via Booking Board
  </p>

  <table style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-weight: 600; width: 140px; vertical-align: top; color: #0f172a;">Boat</td>
      <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #0f172a;">${escapeHtml(data.boatName)} (ID: ${escapeHtml(data.boatId)})</td>
    </tr>
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-weight: 600; vertical-align: top; color: #0f172a;">Responsibility</td>
      <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #0f172a;">${escapeHtml(responsibilityLabel)}</td>
    </tr>
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-weight: 600; vertical-align: top; color: #0f172a;">Damage Type(s)</td>
      <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #0f172a;">${escapeHtml(damageTypesList)}</td>
    </tr>
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-weight: 600; vertical-align: top; color: #0f172a;">Comments</td>
      <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #0f172a;">${escapeHtml(commentText)}</td>
    </tr>
  </table>

  <p style="color: #94a3b8; font-size: 12px; margin-top: 20px;">
    Reported from IP: ${escapeHtml(data.reporterIp)}<br>
    This is an automated notification from ${escapeHtml(data.clubName)} Booking Board.
  </p>
</div>`;

  const { error } = await resendClient.emails.send({
    from: `${data.clubName} Booking Board <onboarding@resend.dev>`,
    to: data.to,
    subject: `Damage Report: ${data.boatName}`,
    html,
  });

  if (error) {
    throw new Error(`Resend error: ${error.message}`);
  }
}

/**
 * Escape HTML special characters to prevent XSS in email templates.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
