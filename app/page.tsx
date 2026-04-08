const highlights = [
  "Custom Facebook posts for your local service area",
  "Posted 3x per week on Monday, Wednesday, and Friday",
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
  "3 custom Facebook posts per week, scheduled for Monday, Wednesday, and Friday",
  "Posts tailored to your tone, services, and geographic service area",
  "A starter batch generated inside the app for fast review and refinement",
  "Publishing workflow tied directly to your connected Facebook Business Page",
];

export default function Home() {
  return (
    <div className="min-h-screen bg-[#f7f5ef] text-[#132027]">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-20 px-6 py-12 sm:px-10 lg:px-16">
        <section className="rounded-3xl bg-gradient-to-br from-[#132027] to-[#21414b] p-8 text-[#f8f2e8] sm:p-12">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#d7c6a1]">
            Social Foreman
          </p>
          <h1 className="mt-4 max-w-4xl text-4xl font-bold leading-tight sm:text-5xl">
            Custom Facebook posts for local businesses, delivered and posted three times a week
          </h1>
          <p className="mt-6 max-w-3xl text-lg text-[#e8dcc9]">
            We create personalized Facebook content for local service businesses and keep your page active every Monday, Wednesday, and Friday, without asking you to become the marketing department.
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

        <section className="rounded-3xl border border-[#d9d2c3] bg-white p-8 sm:p-12">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#846b42]">
            What you are actually buying
          </p>
          <h2 className="mt-4 text-3xl font-bold text-[#132027] sm:text-4xl">
            A consistent Facebook presence for your business, not just software.
          </h2>
          <p className="mt-4 max-w-3xl text-lg text-[#405058]">
            The app helps generate the first round of ideas quickly, but the customer-facing promise is a reviewed stream of custom posts that fit your business before they are published.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {deliverables.map((item) => (
              <div key={item} className="rounded-2xl bg-[#f7f5ef] px-5 py-4 text-[#2f3f46]">
                {item}
              </div>
            ))}
          </div>
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
                One plan for local businesses that need to stay top-of-mind.
              </h2>
              <p className="mt-3 max-w-2xl text-lg text-[#405058]">
                Includes custom post planning, reviewed batch drafts, and recurring Facebook publishing three times per week.
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
