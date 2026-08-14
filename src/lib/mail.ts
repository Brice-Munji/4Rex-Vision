/**
 * Email delivery.
 *
 * In development (or when no SMTP provider is configured) emails are logged to
 * the server console so the verification / reset links are easy to copy. Swap
 * `sendEmail` for a real provider (Resend, Postmark, SES, nodemailer) in prod.
 */

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

interface SendEmailArgs {
  to: string;
  subject: string;
  text: string;
}

async function sendEmail({ to, subject, text }: SendEmailArgs) {
  // Placeholder transport — log to console in dev.
  // eslint-disable-next-line no-console
  console.log(
    `\n────────── 📧 EMAIL ──────────\nTo: ${to}\nSubject: ${subject}\n\n${text}\n──────────────────────────────\n`
  );
}

export async function sendVerificationEmail(to: string, token: string) {
  const link = `${APP_URL}/verify-email?token=${token}`;
  await sendEmail({
    to,
    subject: "Verify your 4RexVision email",
    text: `Welcome to 4RexVision!\n\nVerify your email to unlock everything:\n${link}\n\nThis link expires in 24 hours.`,
  });
  return link;
}

export async function sendPasswordResetEmail(to: string, token: string) {
  const link = `${APP_URL}/reset-password?token=${token}`;
  await sendEmail({
    to,
    subject: "Reset your 4RexVision password",
    text: `We received a request to reset your password.\n\nReset it here:\n${link}\n\nThis link expires in 1 hour. If you didn't request this, you can safely ignore this email.`,
  });
  return link;
}
