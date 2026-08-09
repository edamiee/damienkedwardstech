"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { saveContactMessage } from "@/lib/contact-notify";
import { getSiteContent } from "@/lib/site-content";

export type ContactState = {
  status: "idle" | "success" | "error";
  message: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SUCCESS_MESSAGE = "Message sent — I'll get back to you soon.";

// Naive in-memory per-IP rate limit, same approach as /api/chat — resets on
// cold start and isn't shared across serverless instances, but it's enough
// to stop a script from spamming a form that's now soliciting real leads.
const RATE_LIMIT = 5; // requests
const RATE_WINDOW_MS = 10 * 60_000;
const requestLog = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = (requestLog.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  timestamps.push(now);
  requestLog.set(ip, timestamps);
  return timestamps.length > RATE_LIMIT;
}

export async function sendContactMessage(
  _prevState: ContactState,
  formData: FormData
): Promise<ContactState> {
  // Honeypot: a field real visitors never see or fill in (hidden off-screen
  // in ContactForm). A bot that fills every field trips it — pretend success
  // without saving anything, so the bot has no signal it was caught.
  if (String(formData.get("website") ?? "").trim()) {
    return { status: "success", message: SUCCESS_MESSAGE };
  }

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (isRateLimited(ip)) {
    return { status: "error", message: "Too many messages — try again in a few minutes." };
  }

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

  return { status: "success", message: SUCCESS_MESSAGE };
}
