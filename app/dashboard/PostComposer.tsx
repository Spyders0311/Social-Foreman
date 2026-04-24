"use client";

import { useState } from "react";

type PostComposerProps = {
  pageId: string;
  onboardingId: string;
  pageName: string;
};

export function PostComposer({ pageId, onboardingId, pageName }: PostComposerProps) {
  const [message, setMessage] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const actionUrl = `/api/facebook/page/${encodeURIComponent(pageId)}/post`;

  async function handleGenerate() {
    setGenerating(true);
    setGenerateError(null);

    try {
      const res = await fetch(
        `/api/facebook/page/${encodeURIComponent(pageId)}/generate-post`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ onboardingId }),
        },
      );

      const data = (await res.json()) as { message?: string; error?: string };

      if (!res.ok) {
        setGenerateError(data.error ?? "Failed to generate post. Please try again.");
        return;
      }

      if (data.message) {
        setMessage(data.message);
      }
    } catch {
      setGenerateError("Network error. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <section className="rounded-3xl border border-[#d69f44]/40 bg-gradient-to-b from-[#fdfbf6] to-white p-6 sm:p-8 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#846b42]">Composer</p>
      <h2 className="mt-2 text-2xl font-bold text-[#132027]">Generate post for {pageName}</h2>
      <p className="mt-2 text-sm text-[#405058]">
        Social Foreman uses your business profile and real-world context to generate authentic posts. Review before you publish.
      </p>

      <form action={actionUrl} method="POST" className="mt-6 space-y-4">
        <input type="hidden" name="onboardingId" value={onboardingId} />
        <label className="block text-sm font-medium text-[#132027]">
          Post message
          <textarea
            name="message"
            required
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Click Generate to auto-draft a post, or type your own…"
            className="mt-2 w-full rounded-2xl border border-[#c9c1b3] bg-white px-4 py-3 text-sm leading-7 shadow-inner focus:border-[#132027] focus:outline-none"
          />
        </label>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#d69f44] bg-[#fffaf0] px-5 py-2.5 text-sm font-semibold text-[#8a611c] transition hover:bg-[#faeed7] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {generating ? "Generating…" : "✨ Generate Post"}
          </button>
          <button
            type="submit"
            className="inline-flex rounded-full bg-[#1877f2] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1669d8]"
          >
            Publish to Facebook
          </button>
        </div>

        {generateError ? (
          <p className="text-sm text-[#9a4a2f]">{generateError}</p>
        ) : null}
      </form>
    </section>
  );
}
