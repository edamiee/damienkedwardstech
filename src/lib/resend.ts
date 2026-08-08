import "server-only";

type EmailPayload = { from: string; to: string; subject: string; html: string };

// Thin wrapper around Resend's batch send endpoint (up to 100 emails per
// call). Used only by the weekly newsletter cron — nothing else on the
// site sends email.
export async function sendBatchEmails(emails: EmailPayload[]): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured on the server.");
  }
  if (emails.length === 0) return;

  const BATCH = 100;
  for (let i = 0; i < emails.length; i += BATCH) {
    const batch = emails.slice(i, i + BATCH);
    const res = await fetch("https://api.resend.com/emails/batch", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(batch),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Resend API error ${res.status}: ${text}`);
    }
  }
}
