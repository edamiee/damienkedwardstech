import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendBatchEmails } from "@/lib/resend";

const BASE_URL = "https://damienkedwards.tech";

function buildEmailHtml(insight: string, email: string): string {
  const unsubscribeUrl = `${BASE_URL}/unsubscribe?email=${encodeURIComponent(email)}`;
  return `<!doctype html>
<html>
  <body style="background:#0e211e;color:#efe6d2;font-family:Georgia,serif;padding:32px;margin:0;">
    <div style="max-width:480px;margin:0 auto;">
      <p style="text-transform:uppercase;letter-spacing:0.1em;font-size:11px;color:#8fd4c4;font-family:system-ui,sans-serif;">Note of the week</p>
      <p style="font-size:18px;line-height:1.5;font-style:italic;">${insight}</p>
      <p style="margin-top:32px;"><a href="${BASE_URL}" style="color:#8fd4c4;">Read more on the site &rarr;</a></p>
      <p style="margin-top:48px;font-size:11px;color:#9cad9f;font-family:system-ui,sans-serif;">
        You're getting this because you signed up on damienkedwards.tech.
        <a href="${unsubscribeUrl}" style="color:#9cad9f;">Unsubscribe</a>
      </p>
    </div>
  </body>
</html>`;
}

// Emails every current subscriber the week's note via Resend, called from
// the weekly-insight cron right after the note is generated. Quietly
// no-ops (not an error) whenever sending isn't fully configured, so the
// cron can run safely before Resend is set up — only the returned
// `skipped` reason distinguishes "didn't send" from "sent to nobody".
export async function sendWeeklyNewsletter(
  supabase: SupabaseClient,
  insight: string
): Promise<{ sent: number; skipped: string | null }> {
  const [{ data: settingRows }, { data: subscribers }] = await Promise.all([
    supabase
      .from("site_content")
      .select("key, value")
      .in("key", ["newsletter_sending_enabled", "newsletter_from_email"]),
    supabase.from("subscribers").select("email"),
  ]);

  const settings = Object.fromEntries(
    (settingRows ?? []).map((row: { key: string; value: string }) => [row.key, row.value])
  );

  if (settings.newsletter_sending_enabled !== "true") {
    return { sent: 0, skipped: "newsletter_sending_enabled is off" };
  }
  const fromEmail = settings.newsletter_from_email as string | undefined;
  if (!fromEmail) {
    return { sent: 0, skipped: "newsletter_from_email is not set" };
  }
  if (!process.env.RESEND_API_KEY) {
    return { sent: 0, skipped: "RESEND_API_KEY is not set" };
  }
  if (!subscribers || subscribers.length === 0) {
    return { sent: 0, skipped: "no subscribers" };
  }

  const emails = subscribers.map((s: { email: string }) => ({
    from: fromEmail,
    to: s.email,
    subject: "This week's note from Damien",
    html: buildEmailHtml(insight, s.email),
  }));

  await sendBatchEmails(emails);
  return { sent: emails.length, skipped: null };
}
