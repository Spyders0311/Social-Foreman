import { PLAN_CONFIG } from "../src/lib/plans";
import Nav from "./components/Nav";
import { AnimatedSection } from "./components/AnimatedSection";

const highlights = [
  "Custom Facebook posts for your local service area",
  "Choose Starter 3x/week or VIP 5x/week coverage",
  "Reviewed and refined before anything goes live",
];

const outcomes = [
  {
    title: "Stay visible locally",
    description:
      "Show up in your town consistently with Facebook posts written around your services, service area, and real customer concerns.",
  },
  {
    title: "Sound like your business",
    description:
      "We build personalized post drafts in your tone, then refine them before publishing so the final content feels human, local, and credible.",
  },
  {
    title: "Keep owners out of the content grind",
    description:
      "You do not need to invent what to post every week. Social Foreman handles the planning and batch prep while you stay focused on jobs.",
  },
];

const deliverables = [
  "Starter includes 3 custom Facebook posts per week on Monday, Wednesday, and Friday",
  "VIP includes 5 custom Facebook posts per week, Monday through Friday",
  "Posts tailored to your tone, services, and geographic service area",
  "Publishing workflow tied directly to your connected Facebook Business Page",
];

const steps = [
  {
    number: "01",
    title: "Connect your Facebook Page",
    description:
      "One-time setup. Takes about 2 minutes. We only request access to your business page.",
  },
  {
    number: "02",
    title: "We write your posts",
    description:
      "Custom content for your trade, service area, and tone — no templates, no generic copy.",
  },
  {
    number: "03",
    title: "Review and go live",
    description:
      "Approve the batch before anything publishes. You stay in control.",
  },
];

const plans = [PLAN_CONFIG.starter, PLAN_CONFIG.vip];

export default function Home() {
  return (
    <div className="min-h-screen bg-[#f7f5ef] text-[#132027]">
      <Nav />

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-20 px-6 py-12 sm:px-10 lg:px-16">

        {/* Hero */}
        <section className="animate-fade-slide-up rounded-3xl bg-gradient-to-br from-[#132027] to-[#21414b] p-8 text-[#f8f2e8] sm:p-14">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#8ba0a6]/40 bg-white/10 px-4 py-1.5 text-sm text-[#d7c6a1]">
            <span className="text-[#6ee59b]">✓</span>
            No contracts · Cancel anytime
          </div>
          <h1 className="mt-6 max-w-4xl text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
            Your Facebook page, <span className="text-[#d69f44] whitespace-nowrap">on autopilot.</span>
            <br />
            Built for the trades.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[#e8dcc9]">
            Stay visible in your local market without becoming your own marketing
            department. We write the posts, you approve them, they go live.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <a
              href="#pricing"
              className="inline-flex rounded-full bg-[#d69f44] px-8 py-3.5 text-base font-semibold text-[#17232a] transition hover:bg-[#efb356]"
            >
              Get Started
            </a>
            <a
              href="/login"
              className="inline-flex rounded-full border border-[#8ba0a6]/50 px-8 py-3.5 text-base font-semibold text-[#f8f2e8] transition hover:bg-white/10"
            >
              Log In
            </a>
          </div>
        </section>

        {/* How it works */}
        <section>
          <p className="text-center text-sm font-semibold uppercase tracking-[0.2em] text-[#846b42]">
            How it works
          </p>
          <h2 className="mt-3 text-center text-3xl font-bold text-[#132027] sm:text-4xl">
            Up and running in minutes
          </h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {steps.map((step) => (
              <div
                key={step.number}
                className="rounded-2xl bg-white p-7 shadow-sm"
              >
                <p className="text-4xl font-bold text-[#d69f44]">{step.number}</p>
                <h3 className="mt-4 text-lg font-semibold text-[#132027]">
                  {step.title}
                </h3>
                <p className="mt-2 leading-7 text-[#405058]">{step.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Outcomes — animated on scroll */}
        <AnimatedSection>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#846b42]">
            Why it works
          </p>
          <h2 className="mt-3 text-3xl font-bold text-[#132027] sm:text-4xl">
            Built for local service businesses
          </h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {outcomes.map((item) => (
              <article key={item.title} className="rounded-2xl bg-white p-6 shadow-sm">
                <h3 className="text-xl font-semibold text-[#132027]">{item.title}</h3>
                <p className="mt-3 leading-7 text-[#3f4c52]">{item.description}</p>
              </article>
            ))}
          </div>
        </AnimatedSection>

        {/* What you're buying */}
        <section className="rounded-3xl border border-[#d9d2c3] bg-white p-8 sm:p-12">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#846b42]">
            What you are actually buying
          </p>
          <h2 className="mt-4 text-3xl font-bold text-[#132027] sm:text-4xl">
            A consistent Facebook presence — not just software.
          </h2>
          <p className="mt-4 max-w-3xl text-lg text-[#405058]">
            The app helps generate the first round of ideas quickly, but the
            customer-facing promise is a reviewed stream of custom posts that fit
            your business before they go live.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {deliverables.map((item) => (
              <div
                key={item}
                className="flex gap-3 rounded-2xl bg-[#f7f5ef] px-5 py-4"
              >
                <span className="mt-0.5 shrink-0 text-[#d69f44]">✓</span>
                <span className="text-[#2f3f46]">{item}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section
          id="pricing"
          className="rounded-3xl border border-[#d9d2c3] bg-white p-8 sm:p-12"
        >
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#846b42]">
            Simple pricing
          </p>
          <div className="mt-4 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-3xl font-bold text-[#132027] sm:text-4xl">
                Two plans, depending on how aggressively you want to stay visible.
              </h2>
              <p className="mt-3 max-w-2xl text-lg text-[#405058]">
                Both plans include custom post planning, reviewed batch drafts, and
                Facebook publishing support. Starter keeps it lean at 3 posts per
                week. VIP steps up to 5 posts per week for near-daily visibility.
              </p>
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              {plans.map((plan) => (
                <div
                  key={plan.key}
                  className={`relative rounded-2xl p-7 ${
                    plan.key === "vip"
                      ? "bg-[#d69f44] text-[#17232a]"
                      : "bg-[#132027] text-[#f8f2e8]"
                  }`}
                >
                  {plan.key === "vip" && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                      <span className="whitespace-nowrap rounded-full bg-[#132027] px-4 py-1 text-xs font-bold uppercase tracking-[0.15em] text-[#d69f44]">
                        Most popular
                      </span>
                    </div>
                  )}
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p
                        className={`text-sm uppercase tracking-[0.2em] ${
                          plan.key === "vip" ? "text-[#5f4513]" : "text-[#d7c6a1]"
                        }`}
                      >
                        {plan.name}
                      </p>
                      <p className="mt-2 text-5xl font-bold">
                        ${plan.priceMonthlyCents / 100}
                        <span
                          className={`text-lg font-medium ${
                            plan.key === "vip" ? "text-[#5f4513]" : "text-[#d8cec1]"
                          }`}
                        >
                          /mo
                        </span>
                      </p>
                    </div>
                  </div>
                  <p
                    className={`mt-3 text-sm ${
                      plan.key === "vip" ? "text-[#5f4513]" : "text-[#d8cec1]"
                    }`}
                  >
                    {plan.description}
                  </p>
                  <ul
                    className={`mt-5 space-y-2 text-sm ${
                      plan.key === "vip" ? "text-[#2e2410]" : "text-[#f1e6d4]"
                    }`}
                  >
                    <li>✓ {plan.postsPerWeek} reviewed Facebook posts per week</li>
                    <li>✓ {plan.cadenceLabel} posting cadence</li>
                    <li>✓ Tailored to your services, tone, and service area</li>
                    <li>✓ Cancel anytime</li>
                  </ul>
                  <form action="/api/checkout" method="POST" className="mt-6">
                    <input type="hidden" name="planTier" value={plan.key} />
                    <button
                      type="submit"
                      className={`w-full rounded-full px-5 py-3 font-semibold transition ${
                        plan.key === "vip"
                          ? "bg-[#17232a] text-[#f8f2e8] hover:bg-[#25343d]"
                          : "bg-[#d69f44] text-[#17232a] hover:bg-[#efb356]"
                      }`}
                    >
                      Start {plan.name} for {plan.priceLabel}
                    </button>
                  </form>
                </div>
              ))}
            </div>
          </div>

          {/* Trust row */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 border-t border-[#e8e2d9] pt-6 text-sm text-[#405058]">
            <span>🔒 Secure checkout</span>
            <span>📅 Cancel anytime</span>
            <span>💬 Real support</span>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-[#d9d2c3] pb-8 pt-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-base font-bold text-[#132027]">Social Foreman</p>
              <p className="mt-1 max-w-xs text-sm text-[#405058]">
                Facebook content for local service businesses.
              </p>
            </div>
            <nav className="flex flex-col gap-2 text-sm">
              <a
                href="/privacy"
                className="text-[#405058] transition hover:text-[#132027]"
              >
                Privacy Policy
              </a>
              <a
                href="/terms"
                className="text-[#405058] transition hover:text-[#132027]"
              >
                Terms of Service
              </a>
              <a
                href="mailto:support@socialforeman.com"
                className="text-[#405058] transition hover:text-[#132027]"
              >
                support@socialforeman.com
              </a>
            </nav>
          </div>
          <p className="mt-8 text-xs text-[#8c9ba0]">
            © 2025 Social Foreman. All rights reserved.
          </p>
        </footer>

      </main>
    </div>
  );
}
