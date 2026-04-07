const nextSteps = [
  {
    title: "Watch for your welcome email",
    description:
      "We’ll send a quick onboarding email so you know exactly what we need from you and what happens next.",
  },
  {
    title: "Send your business details",
    description:
      "Reply with your business name, service area, main services, best phone number, and the tone you want your posts to have.",
  },
  {
    title: "Connect Facebook",
    description:
      "Link your Facebook Business Page so we can prepare your publishing workflow and get your content pointed at the right page.",
  },
  {
    title: "Approve your first batch",
    description:
      "We’ll shape the first month of content around trust, proof, and local visibility, then tighten it up with your feedback.",
  },
];

const facebookSteps = [
  "Log into the Facebook account that manages your business page.",
  "Open your Facebook Business Page and confirm you have full admin access.",
  "Make sure the page is published and not restricted unless you intentionally want that.",
  "Keep your page URL handy so you can send it during onboarding.",
  "When our onboarding email arrives, follow the Facebook connection instructions there so we can request the right permissions.",
];

const detailChecklist = [
  "Business name",
  "City or service area",
  "Main services",
  "Best customer-facing phone number",
  "Website URL",
  "Facebook Page URL",
  "Any promos or offers you want us to highlight",
];

export default function SuccessPage() {
  return (
    <div className="min-h-screen bg-[#f7f5ef] text-[#132027]">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 py-12 sm:px-10 lg:px-16">
        <section className="rounded-3xl bg-gradient-to-br from-[#132027] to-[#21414b] p-8 text-[#f8f2e8] sm:p-12">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#d7c6a1]">
            You’re in
          </p>
          <h1 className="mt-4 text-4xl font-bold leading-tight sm:text-5xl">
            Welcome to Social Foreman.
          </h1>
          <p className="mt-5 max-w-3xl text-lg text-[#e8dcc9]">
            Good move. You just took social posting off your plate and gave your business a cleaner path to staying visible online.
          </p>
          <div className="mt-8 rounded-2xl bg-white/8 p-5 text-sm leading-7 text-[#f6ead8]">
            We’ll guide you through onboarding, collect the details we need, connect Facebook, and get your first round of content moving fast.
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          {nextSteps.map((step, index) => (
            <article key={step.title} className="rounded-2xl bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-[0.15em] text-[#846b42]">
                Step {index + 1}
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-[#132027]">{step.title}</h2>
              <p className="mt-3 leading-7 text-[#405058]">{step.description}</p>
            </article>
          ))}
        </section>

        <section className="rounded-3xl border border-[#d9d2c3] bg-white p-8 sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#846b42]">
            What to send us
          </p>
          <h2 className="mt-3 text-3xl font-bold text-[#132027]">
            The faster we get this, the faster we can build.
          </h2>
          <ul className="mt-6 grid gap-3 text-[#2e3c42] sm:grid-cols-2">
            {detailChecklist.map((item) => (
              <li key={item} className="rounded-2xl bg-[#f7f5ef] px-4 py-4 leading-7">
                - {item}
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-3xl border border-[#d9d2c3] bg-white p-8 sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#846b42]">
            Facebook connection prep
          </p>
          <h2 className="mt-3 text-3xl font-bold text-[#132027]">
            Get this ready before onboarding.
          </h2>
          <p className="mt-3 max-w-3xl text-lg text-[#405058]">
            We want the Facebook setup to take minutes, not turn into a scavenger hunt for passwords and page access.
          </p>
          <ol className="mt-6 space-y-4 text-[#2e3c42]">
            {facebookSteps.map((step, index) => (
              <li key={step} className="flex gap-4 rounded-2xl bg-[#f7f5ef] p-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#132027] text-sm font-semibold text-[#f8f2e8]">
                  {index + 1}
                </span>
                <span className="leading-7">{step}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="rounded-3xl bg-[#132027] p-8 text-[#f8f2e8] sm:p-10">
          <h2 className="text-3xl font-bold">What we’ll do on our side</h2>
          <ul className="mt-5 space-y-3 text-[#d8cec1]">
            <li>- review your business info, offers, and service area</li>
            <li>- shape your content around trust, local proof, and homeowner confidence</li>
            <li>- prep your Facebook publishing workflow</li>
            <li>- build your first monthly content batch</li>
          </ul>
          <p className="mt-6 text-sm text-[#d7c6a1]">
            Questions before the onboarding email lands? Just reply and we’ll help you get unstuck.
          </p>
        </section>
      </main>
    </div>
  );
}
