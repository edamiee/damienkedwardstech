import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSiteContent } from "@/lib/site-content";
import { sendBatchEmails } from "@/lib/resend";

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Stores the message (the reliable part) and best-effort emails a
// notification via Resend — quietly no-ops if it's not configured, so a
// missing RESEND_API_KEY never blocks the message actually being saved.
// Shared by the contact form and the chat widget's notify_damien tool.
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

  try {
    const content = await getSiteContent();
    if (process.env.RESEND_API_KEY && content.newsletter_from_email) {
      const details = [
        projectType && `Project: ${projectType}`,
        budgetRange && `Budget: ${budgetRange}`,
        timeline && `Timeline: ${timeline}`,
      ]
        .filter(Boolean)
        .join(" · ");
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

  return { error: null };
}
