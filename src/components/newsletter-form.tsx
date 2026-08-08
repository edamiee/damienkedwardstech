"use client";

import { useActionState } from "react";
import { subscribeAction, type SubscribeState } from "@/app/(site)/subscribe-action";

const initialState: SubscribeState = { status: "idle", message: "" };

export function NewsletterForm() {
  const [state, formAction, pending] = useActionState(subscribeAction, initialState);

  return (
    <form action={formAction} className="mt-4 flex flex-wrap items-center gap-2">
      <input
        type="email"
        name="email"
        required
        placeholder="your@email.com"
        className="w-56 max-w-full rounded-sm border border-line bg-surface px-3 py-2 text-sm text-fg placeholder:text-muted focus:border-teal focus:outline-none"
      />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-sm bg-teal px-4 py-2 text-sm font-semibold text-bg disabled:opacity-60"
      >
        {pending ? "Adding…" : "Get the weekly note"}
      </button>
      {state.status !== "idle" && (
        <span
          className={`text-xs ${state.status === "success" ? "text-teal" : "text-rust"}`}
          role="status"
        >
          {state.message}
        </span>
      )}
    </form>
  );
}
