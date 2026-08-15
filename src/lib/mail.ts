/**
 * Email delivery.
 *
 * Transport is chosen from the environment, in order:
 *   1. Resend         — set RESEND_API_KEY (HTTPS API, works behind most sandboxes)
 *   2. SMTP           — set SMTP_HOST (+ SMTP_PORT / SMTP_USER / SMTP_PASS)
 *   3. Console (dev)  — nothing configured: the link is logged to the server console
 *
 * `EMAIL_FROM` sets the From header (e.g. "4RexVision <no-reply@yourdomain>").
 * With Resend the From domain must be verified in your Resend account; for quick
 * testing use "onboarding@resend.dev".
 */
import "server-only";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const FROM = process.env.EMAIL_FROM ?? "4RexVision <onboarding@resend.dev>";

interface SendEmailArgs {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/** Which transport is active (for logging / diagnostics). */
export function mailTransport(): "resend" | "smtp" | "console" {
  if (process.env.RESEND_API_KEY) return "resend";
  if (process.env.SMTP_HOST) return "smtp";
  return "console";
}

async function sendViaResend({ to, subject, text, html }: SendEmailArgs) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM, to: [to], subject, text, html }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Resend ${res.status}: ${body.slice(0, 300)}`);
  }
}

async function sendViaSmtp({ to, subject, text, html }: SendEmailArgs) {
  const nodemailer = (await import("nodemailer")).default;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465, // implicit TLS on 465, STARTTLS otherwise
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
  await transporter.sendMail({ from: FROM, to, subject, text, html });
}

async function sendEmail(args: SendEmailArgs) {
  const transport = mailTransport();
  try {
    if (transport === "resend") return await sendViaResend(args);
    if (transport === "smtp") return await sendViaSmtp(args);
  } catch (err) {
    // Never crash the auth flow on a delivery failure — log and fall through.
    // eslint-disable-next-line no-console
    console.error(`[mail] ${transport} delivery failed:`, err);
    return;
  }
  // Console fallback (dev / unconfigured).
  // eslint-disable-next-line no-console
  console.log(
    `\n────────── 📧 EMAIL (${transport}) ──────────\nTo: ${args.to}\nSubject: ${args.subject}\n\n${args.text}\n──────────────────────────────\n`
  );
}

/* ── Branded HTML shell ────────────────────────────────────────────────────── */

function emailHtml(opts: {
  heading: string;
  body: string;
  cta: { label: string; href: string };
  note?: string;
}): string {
  return `<!doctype html>
<html>
  <body style="margin:0;background:#050505;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#050505;padding:32px 0;">
      <tr><td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:#111111;border:1px solid #1F1F1F;border-radius:20px;overflow:hidden;">
          <tr><td style="padding:32px 32px 8px;">
            <div style="font-size:18px;font-weight:700;color:#F5F5F5;letter-spacing:-0.02em;">4RexVision</div>
          </td></tr>
          <tr><td style="padding:8px 32px 0;">
            <h1 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#F5F5F5;">${opts.heading}</h1>
            <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#A3A3A3;">${opts.body}</p>
            <a href="${opts.cta.href}" style="display:inline-block;background:#3B82F6;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 22px;border-radius:12px;">${opts.cta.label}</a>
            ${opts.note ? `<p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#7a7a7a;">${opts.note}</p>` : ""}
            <p style="margin:20px 0 0;font-size:12px;line-height:1.6;color:#7a7a7a;">If the button doesn't work, paste this link into your browser:<br/><a href="${opts.cta.href}" style="color:#3B82F6;word-break:break-all;">${opts.cta.href}</a></p>
          </td></tr>
          <tr><td style="padding:28px 32px;">
            <div style="border-top:1px solid #1F1F1F;padding-top:16px;font-size:11px;color:#5a5a5a;">© 4RexVision — See beyond the charts.</div>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

export async function sendVerificationEmail(to: string, token: string) {
  const link = `${APP_URL}/verify-email?token=${token}`;
  await sendEmail({
    to,
    subject: "Verify your 4RexVision email",
    text: `Welcome to 4RexVision!\n\nVerify your email to unlock everything:\n${link}\n\nThis link expires in 24 hours.`,
    html: emailHtml({
      heading: "Verify your email",
      body: "Welcome to 4RexVision! Confirm your email address to unlock everything.",
      cta: { label: "Verify email", href: link },
      note: "This link expires in 24 hours.",
    }),
  });
  return link;
}

export async function sendPasswordResetEmail(to: string, token: string) {
  const link = `${APP_URL}/reset-password?token=${token}`;
  await sendEmail({
    to,
    subject: "Reset your 4RexVision password",
    text: `We received a request to reset your password.\n\nReset it here:\n${link}\n\nThis link expires in 5 minutes and can be used only once. If you didn't request this, you can safely ignore this email.`,
    html: emailHtml({
      heading: "Reset your password",
      body: "We received a request to reset your 4RexVision password. Click the button below to choose a new one.",
      cta: { label: "Reset password", href: link },
      note: "This link expires in 5 minutes and can be used only once. If you didn't request this, you can safely ignore this email.",
    }),
  });
  return link;
}
