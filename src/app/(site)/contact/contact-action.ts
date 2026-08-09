"use server";

import { createClient } from "@/lib/supabase/server";
import { saveContactMessage } from "@/lib/contact-notify";
import { getSiteContent } from "@/lib/site-content";

export type ContactState = {
  status: "idle" | "success" | "error";
  message: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function sendContactMessage(
  _prevState: ContactState,
  formData: FormData
): Promise<ContactState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const message = String(formData.get("message") ?? "").trim();
  const projectType = String(formData.get("project_type") ?? "").trim();
  const budgetRange = String(formData.get("budget_range") ?? "").trim();
  const timeline = String(formData.get("timeline") ?? "").trim();

  if (!name || !message) {
    return { status: "error", message: "Name and message are required." };
  }
  if (!EMAIL_PATTERN.test(email)) {
    return { status: "error", message: "Enter a valid email address." };
  }
  if (message.length > 5000) {
    return { status: "error", message: "Message is too long (5000 char max)." };
  }

  const content = await getSiteContent();
  const supabase = await createClient();
  const { error } = await saveContactMessage(supabase, {
    name,
    email,
    message,
    source: content.business_inquiry_enabled === "true" ? "business_inquiry" : "form",
    projectType,
    budgetRange,
    timeline,
  });

  if (error) {
    return { status: "error", message: "Something went wrong — try again." };
  }

  return { status: "success", message: "Message sent — I'll get back to you soon." };
}
