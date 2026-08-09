"use client";

import { useActionState } from "react";
import { sendContactMessage, type ContactState } from "@/app/(site)/contact/contact-action";

const initialState: ContactState = { status: "idle", message: "" };

const SELECT_CLASS =
  "rounded-sm border border-line bg-surface px-3 py-2 text-fg focus:border-teal focus:outline-none";

export function ContactForm({
  businessInquiryEnabled = false,
  businessInquiryIntro,
}: {
  businessInquiryEnabled?: boolean;
  businessInquiryIntro?: string;
}) {
  const [state, formAction, pending] = useActionState(sendContactMessage, initialState);

  return (
    <form action={formAction} className="mt-10 flex max-w-md flex-col gap-4">
      {/* Honeypot — off-screen, never visible or reachable by a real
          visitor. A bot that fills it out gets a fake success below. */}
      <label
        className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden"
        aria-hidden="true"
      >
        Leave this field blank
        <input name="website" tabIndex={-1} autoComplete="off" />
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        Name
        <input name="name" required className={SELECT_CLASS} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        Email
        <input type="email" name="email" required className={SELECT_CLASS} />
      </label>
      {businessInquiryEnabled && (
        <>
          {businessInquiryIntro && (
            <p className="text-xs text-muted">{businessInquiryIntro}</p>
          )}
          <label className="flex flex-col gap-1.5 text-sm">
            Project type
            <select name="project_type" defaultValue="" className={SELECT_CLASS}>
              <option value="" disabled>
                Select one
              </option>
              <option value="New project">New project</option>
              <option value="Ongoing / retainer">Ongoing / retainer</option>
              <option value="Consulting / advice">Consulting / advice</option>
              <option value="Other">Other</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            Budget range
            <select name="budget_range" defaultValue="" className={SELECT_CLASS}>
              <option value="" disabled>
                Select one
              </option>
              <option value="Under $5k">Under $5k</option>
              <option value="$5k – $15k">$5k – $15k</option>
              <option value="$15k – $50k">$15k – $50k</option>
              <option value="$50k+">$50k+</option>
              <option value="Not sure yet">Not sure yet</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            Timeline
            <select name="timeline" defaultValue="" className={SELECT_CLASS}>
              <option value="" disabled>
                Select one
              </option>
              <option value="ASAP">ASAP</option>
              <option value="Within a month">Within a month</option>
              <option value="1–3 months">1–3 months</option>
              <option value="Flexible">Flexible</option>
            </select>
          </label>
        </>
      )}
      <label className="flex flex-col gap-1.5 text-sm">
        Message
        <textarea name="message" required rows={5} className={SELECT_CLASS} />
      </label>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-sm bg-teal px-5 py-2.5 text-sm font-semibold text-ground disabled:opacity-60"
        >
          {pending ? "Sending…" : businessInquiryEnabled ? "Send inquiry" : "Send message"}
        </button>
        {state.status !== "idle" && (
          <span
            className={`text-xs ${state.status === "success" ? "text-teal" : "text-rust"}`}
            role="status"
          >
            {state.message}
          </span>
        )}
      </div>
    </form>
  );
}
