import { Resend } from 'resend';

let resendClient: Resend | null = null;

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  if (!resendClient) {
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

export interface EnquiryEmailData {
  reference: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  preferredChannel: string;
  itemsCount: number;
}

/**
 * Sends transactional email notifications when an enquiry is placed.
 */
export async function sendEnquiryNotification(data: EnquiryEmailData) {
  const resend = getResend();
  const notifyEmail = process.env.ENQUIRY_NOTIFY_EMAIL;
  const fromEmail = process.env.EMAIL_FROM || 'SÉRA BY SIMRAN <hello@serabysimran.in>';

  if (!resend || !notifyEmail) {
    console.log(`[Email] Resend API key or ENQUIRY_NOTIFY_EMAIL not configured. Skipping email for ${data.reference}.`);
    return { ok: false, reason: 'unconfigured' };
  }

  try {
    // 1. Staff notification
    await resend.emails.send({
      from: fromEmail,
      to: notifyEmail,
      subject: `[VIP Enquiry] New Concierge Lead #${data.reference}`,
      html: `
        <div style="font-family: serif; color: #3B2A22; padding: 24px; background: #F8F4EC;">
          <h2 style="margin-bottom: 8px;">SÉRA BY SIMRAN — New VIP Lead</h2>
          <p style="font-family: sans-serif; font-size: 13px; color: #666;">Reference: <strong>${data.reference}</strong></p>
          <hr style="border: 0; border-top: 1px solid #D9C3A6; margin: 16px 0;" />
          <table style="font-family: sans-serif; font-size: 13px; width: 100%;">
            <tr><td><strong>Client:</strong></td><td>${data.customerName}</td></tr>
            <tr><td><strong>Phone / WhatsApp:</strong></td><td>${data.customerPhone}</td></tr>
            <tr><td><strong>Email:</strong></td><td>${data.customerEmail || 'Not provided'}</td></tr>
            <tr><td><strong>Channel:</strong></td><td>${data.preferredChannel}</td></tr>
            <tr><td><strong>Pieces Enquired:</strong></td><td>${data.itemsCount}</td></tr>
          </table>
          <p style="margin-top: 20px; font-family: sans-serif; font-size: 11px; color: #888;">
            Access SÉRA Operations Admin to review and transition state.
          </p>
        </div>
      `,
    });

    // 2. Client confirmation (if email provided)
    if (data.customerEmail) {
      await resend.emails.send({
        from: fromEmail,
        to: data.customerEmail,
        subject: `Your SÉRA Jewellery Consultation Request [Ref: ${data.reference}]`,
        html: `
          <div style="font-family: serif; color: #3B2A22; padding: 28px; background: #F8F4EC;">
            <h1 style="font-weight: normal; margin-bottom: 8px;">SÉRA BY SIMRAN</h1>
            <p style="font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #A89D8E;">Haute Joaillerie</p>
            <hr style="border: 0; border-top: 1px solid #D9C3A6; margin: 20px 0;" />
            <p style="font-size: 15px; line-height: 1.6;">Dear ${data.customerName},</p>
            <p style="font-family: sans-serif; font-size: 13px; line-height: 1.6; color: #3B2A22;">
              Thank you for entrusting SÉRA with your jewellery styling enquiry. Your request has been logged under reference <strong>${data.reference}</strong>.
            </p>
            <p style="font-family: sans-serif; font-size: 13px; line-height: 1.6; color: #3B2A22;">
              Our senior concierge will reach out to you via ${data.preferredChannel} shortly to guide you on sizing, custom details, and insured doorstep delivery.
            </p>
            <p style="margin-top: 24px; font-size: 13px; font-style: italic;">With warm regards,<br />The SÉRA Atelier</p>
          </div>
        `,
      });
    }

    return { ok: true };
  } catch (err: any) {
    console.error('[Email Notification Error]:', err);
    return { ok: false, error: err?.message };
  }
}
