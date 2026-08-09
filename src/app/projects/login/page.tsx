"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ProjectsLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();

    // Anyone with a password already set (i.e. the admin account) can sign
    // straight in instead of waiting on a magic-link email. Invited viewers
    // never have a password, so they leave it blank and fall through to
    // the OTP link — same behavior as before.
    if (password) {
      const { error: passwordError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      setLoading(false);
      if (passwordError) {
        setError(passwordError.message);
        return;
      }
      router.push("/projects");
      router.refresh();
      return;
    }

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
          Have a password? Enter it below to sign in directly. Otherwise
          leave it blank and you&apos;ll get a sign-in link by email.
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
            <input
              type="password"
              placeholder="password (optional)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border-term-fg-dim bg-term-bg text-term-fg rounded-sm border px-3 py-2 text-sm"
            />
            {error && <p className="text-term-alert text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="rounded-sm border border-current px-4 py-2 text-sm font-semibold disabled:opacity-60"
            >
              {loading ? "signing in…" : password ? "sign in" : "send link"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
