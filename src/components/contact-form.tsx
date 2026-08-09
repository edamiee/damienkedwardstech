"use client";

import { useActionState } from "react";
import { sendContactMessage, type ContactState } from "@/app/(site)/contact/contact-action";

const initialState: ContactState = { status: "idle", message: "" };

export function ContactForm() {
  const [state, formAction, pending] = useActionState(sendContactMessage, initialState);

  return (
    <form action={formAction} className="mt-10 flex max-w-md flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm">
        Name
        <input
          name="name"
          required
          className="rounded-sm border border-line bg-surface px-3 py-2 text-fg focus:border-teal focus:outline-none"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        Email
        <input
          type="email"
          name="email"
          required
          className="rounded-sm border border-line bg-surface px-3 py-2 text-fg focus:border-teal focus:outline-none"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        Message
        <textarea
          name="message"
          required
          rows={5}
          className="rounded-sm border border-line bg-surface px-3 py-2 text-fg focus:border-teal focus:outline-none"
        />
      </label>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-sm bg-teal px-5 py-2.5 text-sm font-semibold text-bg disabled:opacity-60"
        >
          {pending ? "Sending…" : "Send message"}
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
