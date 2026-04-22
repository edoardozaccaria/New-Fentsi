import { Resend } from 'resend';
import { env } from '../config/env';

const resend = new Resend(env.RESEND_API_KEY);

const FROM_EMAIL = 'Fentsi <noreply@fentsi.com>';

// ─── Verification Email ────────────────────────────────────────────────────────

export async function sendVerificationEmail(params: {
  to: string;
  fullName: string;
  verificationUrl: string;
}) {
  const { to: email, fullName: name, verificationUrl: verifyUrl } = params;

  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: 'Verify your Fentsi account',
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f7f7f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f7f8;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="background:#111111;padding:32px 40px;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">Fentsi</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 16px;color:#111;font-size:20px;">Welcome, ${escapeHtml(name)}!</h2>
              <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.6;">
                Thanks for signing up for Fentsi. Please verify your email address to get started planning amazing events.
              </p>
              <a href="${verifyUrl}" style="display:inline-block;background:#111;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-size:15px;font-weight:600;">
                Verify Email
              </a>
              <p style="margin:24px 0 0;color:#999;font-size:13px;line-height:1.5;">
                This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px;border-top:1px solid #eee;">
              <p style="margin:0;color:#999;font-size:12px;">&copy; Fentsi. AI-powered event planning.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  });
}

// ─── Password Reset Email ──────────────────────────────────────────────────────

export async function sendPasswordResetEmail(params: {
  to: string;
  fullName: string;
  resetUrl: string;
}) {
  const { to: email, fullName: name, resetUrl } = params;

  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: 'Reset your Fentsi password',
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f7f7f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f7f8;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="background:#111111;padding:32px 40px;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">Fentsi</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 16px;color:#111;font-size:20px;">Password Reset</h2>
              <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.6;">
                Hi ${escapeHtml(name)}, we received a request to reset your password. Click the button below to choose a new one.
              </p>
              <a href="${resetUrl}" style="display:inline-block;background:#111;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-size:15px;font-weight:600;">
                Reset Password
              </a>
              <p style="margin:24px 0 0;color:#999;font-size:13px;line-height:1.5;">
                This link expires in 1 hour. If you didn't request this, no action is needed — your password remains unchanged.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px;border-top:1px solid #eee;">
              <p style="margin:0;color:#999;font-size:12px;">&copy; Fentsi. AI-powered event planning.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  });
}

// ─── Quote Request Email ───────────────────────────────────────────────────────

export interface QuoteDetails {
  vendorName: string;
  clientName: string;
  clientEmail: string;
  eventType: string;
  eventDate: string;
  guestCount: number;
  locationCity: string;
  message: string;
}

export async function sendQuoteRequestEmail(params: {
  to: string;
  vendorName: string;
  planTitle: string;
  userName: string;
  userMessage: string;
  eventDate: string;
  guestCount: number;
}) {
  const details: QuoteDetails = {
    vendorName: params.vendorName,
    clientName: params.userName,
    clientEmail: params.to,
    eventType: 'Event',
    eventDate: params.eventDate,
    guestCount: params.guestCount,
    locationCity: '',
    message: params.userMessage,
  };
  await resend.emails.send({
    from: FROM_EMAIL,
    to: params.to,
    subject: `New event quote request from ${details.clientName}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f7f7f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f7f8;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="background:#111111;padding:32px 40px;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">Fentsi</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 16px;color:#111;font-size:20px;">New Quote Request</h2>
              <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.6;">
                Hi ${escapeHtml(details.vendorName)}, you have received a quote request through Fentsi.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="padding:12px 16px;background:#f9f9f9;border-radius:8px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      ${detailRow('Client', escapeHtml(details.clientName))}
                      ${detailRow('Email', escapeHtml(details.clientEmail))}
                      ${detailRow('Event Type', escapeHtml(details.eventType))}
                      ${detailRow('Date', escapeHtml(details.eventDate))}
                      ${detailRow('Guests', String(details.guestCount))}
                      ${detailRow('Location', escapeHtml(details.locationCity))}
                    </table>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;color:#333;font-size:14px;font-weight:600;">Message:</p>
              <p style="margin:0 0 24px;color:#555;font-size:14px;line-height:1.6;padding:16px;background:#f9f9f9;border-radius:8px;">
                ${escapeHtml(details.message)}
              </p>
              <a href="mailto:${escapeHtml(details.clientEmail)}" style="display:inline-block;background:#111;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-size:15px;font-weight:600;">
                Reply to Client
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px;border-top:1px solid #eee;">
              <p style="margin:0;color:#999;font-size:12px;">&copy; Fentsi. AI-powered event planning.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  });
}

// ─── Coordination Confirmation ─────────────────────────────────────────────────

export interface OrderDetails {
  clientName: string;
  eventTitle: string;
  eventDate: string;
  locationCity: string;
  packagePrice: string;
  orderId: string;
}

export async function sendCoordinationEmail(params: {
  to: string;
  planTitle: string;
  orderId: string;
  userName: string;
}) {
  const details: OrderDetails = {
    clientName: params.userName,
    eventTitle: params.planTitle,
    eventDate: '',
    locationCity: '',
    packagePrice: '',
    orderId: params.orderId,
  };
  const email = params.to;
  return sendCoordinationConfirmation(email, details);
}

export async function sendCoordinationConfirmation(
  email: string,
  details: OrderDetails,
) {
  const dashboardUrl = `${env.FRONTEND_URL}/dashboard/coordination/${details.orderId}`;

  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: 'Your Fentsi coordination order is confirmed!',
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f7f7f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f7f8;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="background:#111111;padding:32px 40px;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">Fentsi</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 16px;color:#111;font-size:20px;">Coordination Confirmed</h2>
              <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.6;">
                Hi ${escapeHtml(details.clientName)}, your event coordination order has been confirmed. Our team will be in touch within 24 hours.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="padding:12px 16px;background:#f9f9f9;border-radius:8px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      ${detailRow('Event', escapeHtml(details.eventTitle))}
                      ${detailRow('Date', escapeHtml(details.eventDate))}
                      ${detailRow('Location', escapeHtml(details.locationCity))}
                      ${detailRow('Package', details.packagePrice)}
                      ${detailRow('Order ID', details.orderId.slice(0, 8).toUpperCase())}
                    </table>
                  </td>
                </tr>
              </table>
              <a href="${dashboardUrl}" style="display:inline-block;background:#111;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-size:15px;font-weight:600;">
                View in Dashboard
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px;border-top:1px solid #eee;">
              <p style="margin:0;color:#999;font-size:12px;">&copy; Fentsi. AI-powered event planning.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  });
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function detailRow(label: string, value: string): string {
  return `
    <tr>
      <td style="padding:6px 0;color:#999;font-size:13px;width:100px;">${label}</td>
      <td style="padding:6px 0;color:#333;font-size:13px;font-weight:500;">${value}</td>
    </tr>`;
}
