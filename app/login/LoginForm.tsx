"use client";

import { useState } from "react";
import { createBrowserClient } from "../../src/lib/supabase-browser";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createBrowserClient();
    const origin = window.location.origin;

    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${origin}/auth/callback`,
      },
    });

    setLoading(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="w-full rounded-3xl border border-[#b7d5c2] bg-[#edf7f0] p-10 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white text-2xl shadow-sm">
          ✉️
        </div>
        <h2 className="mt-5 text-2xl font-bold text-[#132027]">
          Check your inbox
        </h2>
        <p className="mt-3 text-[#214b33]">
          We sent a sign-in link to{" "}
          <strong className="font-semibold">{email}</strong>.
        </p>
        <p className="mt-2 text-sm text-[#3a6649]">
          Click the link in that email to access your dashboard. It expires in
          10 minutes.
        </p>
        <button
          onClick={() => {
            setSubmitted(false);
            setEmail("");
          }}
          className="mt-6 text-sm font-semibold text-[#846b42] underline underline-offset-2 hover:text-[#132027]"
        >
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <div className="w-full rounded-3xl border border-[#d9d2c3] bg-white p-10 shadow-sm">
      <form onSubmit={handleSubmit} className="space-y-5">
        <label className="block text-sm font-medium text-[#132027]">
          Email address
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            placeholder="you@example.com"
            className="mt-2 w-full rounded-2xl border border-[#c9c1b3] bg-[#faf8f4] px-4 py-3 text-sm transition focus:border-[#132027] focus:bg-white focus:outline-none"
          />
        </label>

        {error ? (
          <p className="rounded-xl border border-[#e3c2b7] bg-[#fff4ef] px-4 py-3 text-sm text-[#7a3d2b]">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-[#132027] px-6 py-3.5 font-semibold text-[#f8f2e8] transition hover:bg-[#21414b] disabled:opacity-60"
        >
          {loading ? "Sending…" : "Send magic link"}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-[#8c9ba0]">
        No password required — we&apos;ll email you a sign-in link.
      </p>
    </div>
  );
}
