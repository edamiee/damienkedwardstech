"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ProjectsLoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/projects`,
      },
    });

    setLoading(false);
    if (otpError) {
      setError(otpError.message);
      return;
    }
    setSent(true);
  }

  return (
    <div className="theme-terminal scanlines min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
        <p className="text-term-fg-dim text-xs">$ ./projects --list</p>
        <p className="text-term-fg-dim mt-1 text-sm">→ authentication required</p>
        <h1 className="mt-6 text-xl">
          sign in to continue<span className="cursor" />
        </h1>
        <p className="mt-2 text-sm opacity-80">
          Enter the email you were invited with — you&apos;ll get a sign-in
          link.
        </p>

        {sent ? (
          <p className="mt-6 text-sm">
            Check your inbox for a sign-in link addressed to{" "}
            <span className="font-semibold">{email}</span>.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border-term-fg-dim bg-term-bg text-term-fg rounded-sm border px-3 py-2 text-sm"
            />
            {error && <p className="text-term-alert text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="rounded-sm border border-current px-4 py-2 text-sm font-semibold disabled:opacity-60"
            >
              {loading ? "sending…" : "send link"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
