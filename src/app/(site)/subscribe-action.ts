"use server";

import { createClient } from "@/lib/supabase/server";

export type SubscribeState = {
  status: "idle" | "success" | "error";
  message: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Capture-only signup, tied to the homepage's weekly AI insight. Stores to
// public.subscribers via RLS's public-insert policy — no ESP integration
// yet, the admin exports the list from /admin/subscribers as needed.
export async function subscribeAction(
  _prevState: SubscribeState,
  formData: FormData
): Promise<SubscribeState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (!EMAIL_PATTERN.test(email)) {
    return { status: "error", message: "Enter a valid email address." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("subscribers")
    .insert({ email, source: "weekly_insight" });

  if (error && error.code !== "23505") {
    return { status: "error", message: "Something went wrong — try again." };
  }

  return { status: "success", message: "You're on the list." };
}
