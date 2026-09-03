"use client";

import { Mail } from "lucide-react";
import { useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type SignInStatus = "idle" | "sending" | "sent" | "error";

export function SignInForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<SignInStatus>("idle");

  async function continueWithGoogle() {
    setStatus("idle");

    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  async function continueWithEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setStatus(error ? "error" : "sent");
  }

  return (
    <div className="mt-8 space-y-5">
      <button
        type="button"
        onClick={continueWithGoogle}
        className="flex min-h-12 w-full items-center justify-center gap-3 rounded-[var(--radius-md)] bg-[var(--color-forest-900)] px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--color-evergreen)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-antique-gold)]"
      >
        <GoogleMark />
        Continue with Google
      </button>

      <div className="flex items-center gap-3" aria-hidden="true">
        <div className="h-px flex-1 bg-[var(--color-border)]" />
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-stone)]">
          Or
        </span>
        <div className="h-px flex-1 bg-[var(--color-border)]" />
      </div>

      <form onSubmit={continueWithEmail} className="space-y-3">
        <label
          htmlFor="counsellor-email"
          className="block text-sm font-semibold text-[var(--color-forest-900)]"
        >
          Email address
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Mail
              className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-stone)]"
              aria-hidden="true"
            />
            <input
              id="counsellor-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="min-h-12 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white px-4 py-3 pl-11 text-base text-[var(--color-ink)] shadow-sm outline-none transition-colors placeholder:text-[var(--color-stone)]/70 focus:border-[var(--color-antique-gold)] focus:ring-2 focus:ring-[var(--color-champagne)]"
              placeholder="you@example.com"
            />
          </div>
          <button
            type="submit"
            disabled={status === "sending"}
            className="min-h-12 rounded-[var(--radius-md)] border border-[var(--color-forest-900)] bg-white px-5 py-3 text-sm font-semibold text-[var(--color-forest-900)] shadow-sm transition-colors hover:bg-[var(--color-mist)] disabled:cursor-wait disabled:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-antique-gold)]"
          >
            {status === "sending" ? "Sending" : "Continue with email"}
          </button>
        </div>
      </form>

      {status === "sent" ? (
        <p className="rounded-[var(--radius-sm)] bg-[var(--color-mist)] px-4 py-3 text-sm leading-6 text-[var(--color-forest-900)]">
          Check your email for a secure sign-in link.
        </p>
      ) : null}

      {status === "error" ? (
        <p className="rounded-[var(--radius-sm)] bg-[#fff4ef] px-4 py-3 text-sm leading-6 text-[#7d3320]">
          We could not send a sign-in link right now. Please try again.
        </p>
      ) : null}
    </div>
  );
}

function GoogleMark() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.6 12.2c0-.8-.1-1.6-.2-2.3H12v4.4h5.9a5 5 0 0 1-2.2 3.3v2.8h3.6c2.1-1.9 3.3-4.8 3.3-8.2Z"
      />
      <path
        fill="#34A853"
        d="M12 23c3 0 5.5-1 7.3-2.6l-3.6-2.8c-1 .7-2.2 1-3.7 1-2.8 0-5.2-1.9-6.1-4.5H2.2V17A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.9 14.1a6.6 6.6 0 0 1 0-4.2V7H2.2a11 11 0 0 0 0 10l3.7-2.9Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A10.8 10.8 0 0 0 12 1 11 11 0 0 0 2.2 7l3.7 2.9c.9-2.6 3.3-4.5 6.1-4.5Z"
      />
    </svg>
  );
}
