// ─── Email Service ─────────────────────────────────────────────────────────────
//
// MVP fallback: logs to stderr so development is not blocked by missing SMTP
// credentials. A real provider (Resend, AWS SES, Postmark, etc.) replaces the
// body of sendEmail without changing callers.

export type EmailPayload = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

/**
 * Send an email. Falls back to console logging when no provider is configured.
 * Failures are logged, not thrown, so membership creation still succeeds.
 */
export async function sendEmail(payload: EmailPayload): Promise<void> {
  const provider = process.env.EMAIL_PROVIDER;

  if (provider === "console" || !provider) {
    console.log("[EMAIL]", JSON.stringify(payload));
    return;
  }

  // Provider wiring goes here. Until then, treat unknown providers the same as
  // the console fallback so the app stays functional.
  console.warn(`[EMAIL] Unknown provider "${provider}" — falling back to console`);
  console.log("[EMAIL]", JSON.stringify(payload));
}
