import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSiteContent } from "@/lib/site-content";
import { sendBatchEmails } from "@/lib/resend";
import { sendTelegramMessage } from "@/lib/telegram";

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Stores the message (the reliable part), then best-effort notifies via
// Resend email and — for business inquiries specifically — a Telegram ping
// to TELEGRAM_ADMIN_CHAT_ID. Each notification is independently optional:
// a missing RESEND_API_KEY or TELEGRAM_BOT_TOKEN just skips that channel
// rather than blocking the message from being saved. Shared by the contact
// form and the chat widget's notify_damien tool.
export async function saveContactMessage(
  supabase: SupabaseClient,
  {
    name,
    email,
    message,
    source = "form",
    projectType,
    budgetRange,
    timeline,
  }: {
    name: string;
    email: string;
    message: string;
    source?: string;
    projectType?: string;
    budgetRange?: string;
    timeline?: string;
  }
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("contact_messages").insert({
    name,
    email,
    message,
    source,
    project_type: projectType || null,
    budget_range: budgetRange || null,
    timeline: timeline || null,
  });
  if (error) return { error: error.message };

  const details = [
    projectType && `Project: ${projectType}`,
    budgetRange && `Budget: ${budgetRange}`,
    timeline && `Timeline: ${timeline}`,
  ]
    .filter(Boolean)
    .join(" · ");

  try {
    const content = await getSiteContent();
    if (process.env.RESEND_API_KEY && content.newsletter_from_email) {
      await sendBatchEmails([
        {
          from: content.newsletter_from_email,
          to: content.contact_email,
          subject: `New ${source === "business_inquiry" ? "business inquiry" : "contact message"} from ${name}`,
          html: `<p><strong>${escapeHtml(name)}</strong> (${escapeHtml(email)}) wrote${
            source !== "form" && source !== "business_inquiry" ? ` via ${escapeHtml(source)}` : ""
          }:</p>${details ? `<p>${escapeHtml(details)}</p>` : ""}<p>${escapeHtml(message).replace(/\n/g, "<br>")}</p>`,
        },
      ]);
    }
  } catch (err) {
    console.error("contact notification email failed", err);
  }

  if (source === "business_inquiry" && process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_ADMIN_CHAT_ID) {
    try {
      const text = [
        `New business inquiry from ${name} (${email})`,
        details,
        message,
      ]
        .filter(Boolean)
        .join("\n\n");
      await sendTelegramMessage(process.env.TELEGRAM_ADMIN_CHAT_ID, text);
    } catch (err) {
      console.error("contact notification telegram ping failed", err);
    }
  }

  return { error: null };
}
