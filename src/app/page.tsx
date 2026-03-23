const highlights = [
  "30 days of on-brand social posts",
  "Built for roofing and plumbing service areas",
  "Set-and-forget publishing workflow",
];

const outcomes = [
  {
    title: "Stay visible",
    description:
      "Show up consistently on Facebook and Instagram so your company stays top-of-mind when jobs break loose.",
  },
  {
    title: "Win trust faster",
    description:
      "Professional before/after style content helps homeowners trust your crew before they ever call.",
  },
  {
    title: "Save owner time",
    description:
      "No more late-night posting. Social Foreman drafts and schedules the work while you run jobs.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-[#f7f5ef] text-[#132027]">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-20 px-6 py-12 sm:px-10 lg:px-16">
        <section className="rounded-3xl bg-gradient-to-br from-[#132027] to-[#21414b] p-8 text-[#f8f2e8] sm:p-12">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#d7c6a1]">
            Social Foreman
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">
            Social media that books more roofing and plumbing calls
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-[#e8dcc9]">
            We build and schedule local-trust content for trade businesses so
            your crew can stay in the field while your pipeline stays active.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 text-sm text-[#f8f2e8]">
            {highlights.map((item) => (
              <span
                key={item}
                className="rounded-full border border-[#8ba0a6] px-4 py-2"
              >
                {item}
              </span>
            ))}
          </div>
          <a
            href="#pricing"
            className="mt-10 inline-flex rounded-full bg-[#d69f44] px-7 py-3 text-base font-semibold text-[#17232a] transition hover:bg-[#efb356]"
          >
            View $99/mo plan
          </a>
        </section>

        <section className="grid gap-6 md:grid-cols-3">
          {outcomes.map((item) => (
            <article key={item.title} className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold">{item.title}</h2>
              <p className="mt-3 leading-7 text-[#3f4c52]">{item.description}</p>
            </article>
          ))}
        </section>

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
                One plan. Built for local trades.
              </h2>
              <p className="mt-3 text-lg text-[#405058]">
                Includes monthly post generation, scheduling workflow, and
                support.
              </p>
            </div>
            <div className="rounded-2xl bg-[#132027] p-7 text-[#f8f2e8]">
              <p className="text-sm uppercase tracking-[0.2em] text-[#d7c6a1]">
                Starter
              </p>
              <p className="mt-2 text-5xl font-bold">
                $99
                <span className="text-lg font-medium text-[#d8cec1]">/mo</span>
              </p>
              <p className="mt-3 text-sm text-[#d8cec1]">Cancel anytime</p>
              <form action="/api/checkout" method="POST" className="mt-6">
                <button
                  type="submit"
                  className="w-full rounded-full bg-[#d69f44] px-5 py-3 font-semibold text-[#17232a] transition hover:bg-[#efb356]"
                >
                  Start for $99/month
                </button>
              </form>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
