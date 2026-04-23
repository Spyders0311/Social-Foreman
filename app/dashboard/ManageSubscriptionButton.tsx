"use client";

export function ManageSubscriptionButton({
  onboardingId,
  stripeCustomerId,
  stripeSubscriptionId,
  customerEmail,
}: {
  onboardingId?: string | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  customerEmail?: string | null;
}) {
  async function handleClick() {
    const res = await fetch("/api/stripe/portal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ onboardingId, stripeCustomerId, stripeSubscriptionId, customerEmail }),
    });
    if (res.redirected) { window.location.href = res.url; return; }
    const data = await res.json().catch(() => ({}));
    if (data.url) { window.location.href = data.url; }
  }
  return (
    <button
      onClick={handleClick}
      className="rounded-full border border-[#d9d2c3] bg-white px-5 py-2 text-sm font-semibold text-[#132027] transition hover:bg-[#f7f5ef]"
    >
      Manage subscription
    </button>
  );
}
