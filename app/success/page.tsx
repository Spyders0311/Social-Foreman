import { fetchFacebookPages } from "../../src/lib/facebook";
import { resolveSuccessPageContext } from "../../src/lib/success-context";

type SuccessPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

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
  "When you are ready, hit the Connect Facebook button here so we can request the right permissions.",
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

const defaultTestPostMessage =
  "Social Foreman test post: Facebook page connection is live and server-side publishing is ready for verification.";

function buildFacebookConnectHref(input: {
  onboardingId?: string | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  customerEmail?: string | null;
}) {
  const params = new URLSearchParams();

  if (input.onboardingId) {
    params.set("onboardingId", input.onboardingId);
  }

  if (input.stripeCustomerId) {
    params.set("stripeCustomerId", input.stripeCustomerId);
  }

  if (input.stripeSubscriptionId) {
    params.set("stripeSubscriptionId", input.stripeSubscriptionId);
  }

  if (input.customerEmail) {
    params.set("email", input.customerEmail);
  }

  const query = params.toString();
  return query ? `/api/facebook/connect?${query}` : "/api/facebook/connect";
}

export default async function SuccessPage({ searchParams }: SuccessPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const context = await resolveSuccessPageContext(params);
  const pageReady = context.facebookStatus === "page_linked";
  const canRunTestPost = pageReady && context.customerEmail;
  const canChoosePage =
    Boolean(context.record?.facebook_long_lived_user_access_token) &&
    !pageReady &&
    (context.record?.facebook_page_count ?? 0) > 1;

  let availablePages: Array<{ id: string; name: string; accessToken: string | null }> = [];

  if (canChoosePage && context.record?.facebook_long_lived_user_access_token) {
    try {
      availablePages = await fetchFacebookPages(context.record.facebook_long_lived_user_access_token);
    } catch (error) {
      console.log("Unable to fetch Facebook pages for selection UI", {
        onboardingId: context.record.id,
        reason: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  const connectHref = buildFacebookConnectHref({
    onboardingId: context.onboardingId,
    stripeCustomerId: context.stripeCustomerId,
    stripeSubscriptionId: context.stripeSubscriptionId,
    customerEmail: context.customerEmail,
  });

  return (
    <div className="min-h-screen bg-[#f7f5ef] text-[#132027]">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 py-12 sm:px-10 lg:px-16">
        <section className="rounded-3xl bg-gradient-to-br from-[#132027] to-[#21414b] p-8 text-[#f8f2e8] sm:p-12">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#d7c6a1]">
                You’re in
              </p>
              <h1 className="mt-4 text-4xl font-bold leading-tight sm:text-5xl">
                Welcome to Social Foreman.
              </h1>
              <p className="mt-5 max-w-3xl text-lg text-[#e8dcc9]">
                Good move. You just took social posting off your plate and gave your business a cleaner path to staying visible online.
              </p>
            </div>
            <div className="flex flex-col gap-3 lg:items-end">
              <a
                href={connectHref}
                className="inline-flex items-center justify-center rounded-full bg-[#1877f2] px-6 py-3 text-center font-semibold text-white transition hover:bg-[#1669d8]"
              >
                Connect Facebook
              </a>
              <p className="max-w-xs text-sm leading-6 text-[#d8cec1] lg:text-right">
                Do this early so page permissions are already squared away when onboarding moves into publishing.
              </p>
            </div>
          </div>

          <div className="mt-8 rounded-2xl bg-white/8 p-5 text-sm leading-7 text-[#f6ead8]">
            We’ll guide you through onboarding, collect the details we need, connect Facebook, and get your first round of content moving fast.
          </div>

          {context.checkoutStatus === "success" ? (
            <div className="mt-6 rounded-2xl border border-white/15 bg-white/10 p-4 text-sm leading-7 text-[#f6ead8]">
              Your checkout went through successfully. Keep this page handy while you finish the next onboarding steps.
            </div>
          ) : null}
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
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#846b42]">
                Facebook connection
              </p>
              <h2 className="mt-3 text-3xl font-bold text-[#132027]">
                Get this ready before onboarding.
              </h2>
              <p className="mt-3 max-w-3xl text-lg text-[#405058]">
                We want the Facebook setup to take minutes, not turn into a scavenger hunt for passwords and page access.
              </p>
            </div>
            <a
              href={connectHref}
              className="inline-flex items-center justify-center rounded-full bg-[#1877f2] px-6 py-3 text-center font-semibold text-white transition hover:bg-[#1669d8]"
            >
              Connect Facebook Page
            </a>
          </div>

          {pageReady ? (
            <div className="mt-6 rounded-2xl border border-[#b7d5c2] bg-[#edf7f0] p-4 text-[#214b33]">
              Facebook is fully linked and ready for page-level publishing. Connected page: {context.selectedPageName ?? "your page"}
              {context.selectedPageId ? ` (${context.selectedPageId})` : ""}.
            </div>
          ) : context.facebookStatus === "select_page" ? (
            <div className="mt-6 rounded-2xl border border-[#b7d5c2] bg-[#edf7f0] p-4 text-[#214b33]">
              Facebook login worked. We found multiple Pages for this account, so choose the one Social Foreman should publish to.
            </div>
          ) : context.facebookStatus === "connected" ? (
            <div className="mt-6 rounded-2xl border border-[#b7d5c2] bg-[#edf7f0] p-4 text-[#214b33]">
              Facebook login worked, and we found {context.pagesCount ?? "some"} page connection option{context.pagesCount === "1" ? "" : "s"}. If there is exactly one page, we auto-link it. If there are multiple pages, choose one below.
            </div>
          ) : context.facebookStatus === "connected_no_pages" ? (
            <div className="mt-6 rounded-2xl border border-[#f0d9a6] bg-[#fff8e8] p-4 text-[#6a4c12]">
              Facebook login worked, but we could not fetch any Pages yet. That usually means the app still needs the correct page permissions or review setup.
            </div>
          ) : context.facebookStatus === "selection_invalid" ? (
            <div className="mt-6 rounded-2xl border border-[#e3c2b7] bg-[#fff4ef] p-4 text-[#7a3d2b]">
              That page choice was no longer valid. Pick a page again from the refreshed list.
            </div>
          ) : context.facebookStatus === "selection_expired" ? (
            <div className="mt-6 rounded-2xl border border-[#e3c2b7] bg-[#fff4ef] p-4 text-[#7a3d2b]">
              The Facebook session we saved is no longer available for page selection. Run Facebook connect again to refresh it.
            </div>
          ) : context.facebookStatus === "selection_error" ? (
            <div className="mt-6 rounded-2xl border border-[#e3c2b7] bg-[#fff4ef] p-4 text-[#7a3d2b]">
              We couldn’t save the page selection cleanly. Try again, and if it repeats, reconnect Facebook.
            </div>
          ) : context.facebookStatus === "token_error" ? (
            <div className="mt-6 rounded-2xl border border-[#e3c2b7] bg-[#fff4ef] p-4 text-[#7a3d2b]">
              Facebook login started, but the token handoff failed. Double-check the Meta app settings and try again.
            </div>
          ) : context.facebookStatus === "error" || context.facebookStatus === "missing_code" ? (
            <div className="mt-6 rounded-2xl border border-[#e3c2b7] bg-[#fff4ef] p-4 text-[#7a3d2b]">
              Facebook connection did not finish cleanly. No big deal, just try the button again.
            </div>
          ) : null}

          {availablePages.length > 1 ? (
            <div className="mt-6 rounded-2xl border border-[#d9d2c3] bg-[#f7f5ef] p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#846b42]">
                Choose the Facebook Page to link
              </p>
              <p className="mt-3 text-sm leading-6 text-[#405058]">
                We only store the selected Page token for publishing. Pick the business page you want us to use.
              </p>
              <form action="/api/facebook/select-page" method="POST" className="mt-4 space-y-4">
                <input type="hidden" name="onboardingId" value={context.onboardingId ?? ""} />
                <input type="hidden" name="stripeCustomerId" value={context.stripeCustomerId ?? ""} />
                <input type="hidden" name="stripeSubscriptionId" value={context.stripeSubscriptionId ?? ""} />
                <input type="hidden" name="customerEmail" value={context.customerEmail ?? ""} />
                <fieldset className="space-y-3">
                  {availablePages.map((page) => (
                    <label key={page.id} className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#d9d2c3] bg-white px-4 py-4 text-sm text-[#132027]">
                      <input
                        type="radio"
                        name="pageId"
                        value={page.id}
                        required
                        defaultChecked={page.id === context.selectedPageId}
                        className="mt-1"
                      />
                      <span>
                        <span className="block font-semibold">{page.name}</span>
                        <span className="block text-xs text-[#5c6a70]">Page ID: {page.id}</span>
                      </span>
                    </label>
                  ))}
                </fieldset>
                <button
                  type="submit"
                  className="inline-flex rounded-full bg-[#132027] px-5 py-3 font-semibold text-[#f8f2e8] transition hover:bg-[#21414b]"
                >
                  Save selected page
                </button>
              </form>
            </div>
          ) : null}

          {!context.customerEmail ? (
            <div className="mt-6 rounded-2xl border border-[#f0d9a6] bg-[#fff8e8] p-4 text-[#6a4c12]">
              We could not confirm the customer email on this success-page visit, so this page can still start Facebook auth but cannot unlock the internal test-post tool until the onboarding record is identified.
            </div>
          ) : null}

          {canRunTestPost ? (
            <div className="mt-6 rounded-2xl border border-[#d9d2c3] bg-[#f7f5ef] p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#846b42]">
                Internal Facebook test post
              </p>
              <p className="mt-3 text-sm leading-6 text-[#405058]">
                This hits the authenticated server-side test endpoint for the linked onboarding record and returns a clean in-app result page instead of raw JSON.
              </p>
              <form action="/api/facebook/test-post" method="POST" className="mt-4 space-y-4">
                <input type="hidden" name="onboardingId" value={context.onboardingId ?? ""} />
                <input type="hidden" name="stripeCustomerId" value={context.stripeCustomerId ?? ""} />
                <input type="hidden" name="stripeSubscriptionId" value={context.stripeSubscriptionId ?? ""} />
                <input type="hidden" name="customerEmail" value={context.customerEmail ?? ""} />
                <div>
                  <label htmlFor="message" className="text-sm font-medium text-[#132027]">
                    Test message
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    defaultValue={defaultTestPostMessage}
                    rows={4}
                    className="mt-2 w-full rounded-2xl border border-[#c9c1b3] bg-white px-4 py-3 text-sm text-[#132027]"
                  />
                </div>
                <div>
                  <label htmlFor="secret" className="text-sm font-medium text-[#132027]">
                    Test post secret
                  </label>
                  <input
                    id="secret"
                    name="secret"
                    type="password"
                    required
                    className="mt-2 w-full rounded-full border border-[#c9c1b3] bg-white px-4 py-3 text-sm text-[#132027]"
                  />
                </div>
                <button
                  type="submit"
                  className="inline-flex rounded-full bg-[#132027] px-5 py-3 font-semibold text-[#f8f2e8] transition hover:bg-[#21414b]"
                >
                  Send test post
                </button>
              </form>
            </div>
          ) : null}

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
