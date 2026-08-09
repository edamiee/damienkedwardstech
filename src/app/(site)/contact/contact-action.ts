"use server";

import { createClient } from "@/lib/supabase/server";
import { saveContactMessage } from "@/lib/contact-notify";

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
  const { error } = await saveContactMessage(supabase, { name, email, message });

  if (error) {
    return { status: "error", message: "Something went wrong — try again." };
  }

  return { status: "success", message: "Message sent — I'll get back to you soon." };
}
