"use server";

import { createClient } from "@/lib/supabase/server";
import { getSiteContent } from "@/lib/site-content";
import { sendBatchEmails } from "@/lib/resend";

export type ContactState = {
  status: "idle" | "success" | "error";
  message: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Stores every submission (the reliable part) and best-effort emails a
// notification to the site owner via Resend — mirroring the newsletter's
// "quietly no-op if not configured" behavior, since a missing/invalid
// RESEND_API_KEY shouldn't stop a visitor's message from being saved.
export async function sendContactMessage(
  _prevState: ContactState,
  formData: FormData
): Promise<ContactState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const message = String(formData.get("message") ?? "").trim();

  if (!name || !message) {
    return { status: "error", message: "Name and message are required." };
  }
  if (!EMAIL_PATTERN.test(email)) {
    return { status: "error", message: "Enter a valid email address." };
  }
  if (message.length > 5000) {
    return { status: "error", message: "Message is too long (5000 char max)." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("contact_messages")
    .insert({ name, email, message });

  if (error) {
    return { status: "error", message: "Something went wrong — try again." };
  }

  try {
    const content = await getSiteContent();
    if (process.env.RESEND_API_KEY && content.newsletter_from_email) {
      await sendBatchEmails([
        {
          from: content.newsletter_from_email,
          to: content.contact_email,
          subject: `New contact message from ${name}`,
          html: `<p><strong>${escapeHtml(name)}</strong> (${escapeHtml(email)}) wrote:</p><p>${escapeHtml(message).replace(/\n/g, "<br>")}</p>`,
        },
      ]);
    }
  } catch (err) {
    console.error("contact notification email failed", err);
  }

  return { status: "success", message: "Message sent — I'll get back to you soon." };
}
