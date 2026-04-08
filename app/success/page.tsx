import {
  BUSINESS_TONES,
  BUSINESS_TYPES,
  generateDraftBatch,
} from "../../src/lib/business-profile";
import { cadenceForPostsPerWeek, formatCadenceLabel, getPlanConfig } from "../../src/lib/plans";
import { fetchFacebookPages } from "../../src/lib/facebook";
import { previewCurrentWeeklyPosts } from "../../src/lib/scheduler";
import { resolveSuccessPageContext } from "../../src/lib/success-context";

type SuccessPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const nextStepTemplates = [
  {
    title: "Fill out your business profile",
    description:
      "Tell us who you serve, what you sell, and how you want to sound so the content starts from real business context instead of guesses.",
  },
  {
    title: "Connect Facebook",
    description:
      "Link the exact Facebook Business Page we should publish to so each customer record knows where approved content belongs.",
  },
  {
    title: "Generate your reviewed batch",
    description:
      "We create a broader candidate pool from your profile, run a second review pass, then keep only the approved posts that match your plan cadence.",
  },
  {
    title: "Publish on your weekly cadence",
    description:
      "Once your profile and page are in place, Social Foreman can keep your posting rhythm moving with reviewed content based on your selected plan.",
  },
];

const facebookSteps = [
  "Log into the Facebook account that manages your business page.",
  "Open your Facebook Business Page and confirm you have full admin access.",
  "Make sure the page is published and not restricted unless you intentionally want that.",
  "Keep your page URL handy so it matches the onboarding profile below.",
  "When you are ready, hit the Connect Facebook button here so we can request the right permissions.",
];

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

function getStatusMessage(flowStatus: string | null, missing: string | null) {
  if (flowStatus === "saved") {
    return {
      tone: "success",
      title: "Business profile saved",
      body: "We stored the onboarding details and generated a reviewed weekly batch with the top 3 approved drafts for this customer record.",
    } as const;
  }

  if (flowStatus === "invalid") {
    return {
      tone: "warning",
      title: "A few fields still need attention",
      body: missing
        ? `Please complete: ${missing}.`
        : "Please finish the required business profile fields.",
    } as const;
  }

  if (flowStatus === "missing_record") {
    return {
      tone: "error",
      title: "We couldn’t match this onboarding form to a customer",
      body: "Reload the success page from your checkout confirmation so the form carries the right record IDs.",
    } as const;
  }

  return null;
}

function parseDraftBatch(value: string | null) {
  if (!value) {
    return [] as Array<{
      headline: string;
      body: string;
      callToAction: string;
      hashtags: string[];
    }>;
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default async function SuccessPage({ searchParams }: SuccessPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const context = await resolveSuccessPageContext(params);
  const pageReady = context.facebookStatus === "page_linked";
  const businessProfileReady = Boolean(context.record?.business_profile_completed_at);
  const batchReady = Boolean(context.record?.draft_batch_generated_at);
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

  const plan = getPlanConfig(context.planTier);
  const postsPerWeek = context.postsPerWeek ?? plan.postsPerWeek;
  const cadenceDays = context.record?.posting_cadence_days?.length
    ? context.record.posting_cadence_days
    : cadenceForPostsPerWeek(postsPerWeek);
  const cadenceLabel = context.postingCadenceLabel ?? formatCadenceLabel(postsPerWeek, cadenceDays);
  const nextSteps = [
    nextStepTemplates[0],
    nextStepTemplates[1],
    {
      ...nextStepTemplates[2],
      description: `We create ${Math.max(5, postsPerWeek + 2)} candidate Facebook posts from your profile, run a second review pass, then keep the best ${postsPerWeek} approved drafts on your record.`,
    },
    {
      ...nextStepTemplates[3],
      description: `Once your profile and page are in place, Social Foreman can keep your ${cadenceLabel} posting rhythm moving with reviewed content.`,
    },
  ];

  const connectHref = buildFacebookConnectHref({
    onboardingId: context.onboardingId,
    stripeCustomerId: context.stripeCustomerId,
    stripeSubscriptionId: context.stripeSubscriptionId,
    customerEmail: context.customerEmail,
  });

  const pipelinePreview = context.record
    ? await previewCurrentWeeklyPosts({ onboardingId: context.record.id })
    : null;

  const generatedBatch = parseDraftBatch(context.record?.draft_batch_json ?? null);

  const previewBatch =
    !generatedBatch.length &&
    context.record?.business_name &&
    context.record?.business_type &&
    context.record?.service_area &&
    context.record?.brand_tone &&
    context.record?.contact_phone
      ? generateDraftBatch({
          businessName: context.record.business_name,
          businessType: context.record.business_type,
          serviceArea: context.record.service_area,
          primaryServices: context.record.primary_services ?? [],
          phone: context.record.contact_phone,
          websiteUrl: context.record.website_url ?? "",
          facebookPageUrl: context.record.facebook_page_url ?? "",
          offerSummary: context.record.offer_summary ?? "",
          differentiators: context.record.differentiators ?? "",
          tone: context.record.brand_tone,
          audienceNotes: context.record.audience_notes ?? "",
        }, postsPerWeek).drafts
      : [];

  const scheduledPosts = pipelinePreview?.posts && Array.isArray(pipelinePreview.posts)
    ? pipelinePreview.posts
    : [];

  const draftsToRender = scheduledPosts.length
    ? scheduledPosts.map((post: { headline: string; body: string; call_to_action?: string; callToAction?: string; hashtags?: string[] | null }) => ({
        headline: post.headline,
        body: post.body,
        callToAction: post.call_to_action ?? post.callToAction ?? "",
        hashtags: post.hashtags ?? [],
      }))
    : generatedBatch.length
      ? generatedBatch
      : previewBatch;

  const statusMessage = getStatusMessage(
    context.onboardingFlowStatus,
    Array.isArray(params?.missing) ? params?.missing[0] : params?.missing ?? null,
  );

  return (
    <div className="min-h-screen bg-[#f7f5ef] text-[#132027]">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-12 sm:px-10 lg:px-16">
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
                {`Your checkout is done. Now let’s turn that into a usable business profile, connect the right Facebook page, and generate a reviewed batch that matches your ${context.planName ?? plan.name} cadence before anything gets published.`}
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
                The selected page is stored on this onboarding record so approved content can be routed to the right publishing destination.
              </p>
            </div>
          </div>

          <div className="mt-8 rounded-2xl bg-white/8 p-5 text-sm leading-7 text-[#f6ead8]">
            {`Fill out the business profile below, then link Facebook. Social Foreman now attempts a two-pass GPT workflow that creates a larger candidate pool, reviews it down to the best ${postsPerWeek}, and stores only that approved batch for your ${cadenceLabel} plan. The older rule-based generator stays in place as fallback.`}
          </div>

          {statusMessage ? (
            <div
              className={`mt-6 rounded-2xl p-4 text-sm leading-7 ${
                statusMessage.tone === "success"
                  ? "border border-[#b7d5c2] bg-[#edf7f0] text-[#214b33]"
                  : statusMessage.tone === "warning"
                    ? "border border-[#f0d9a6] bg-[#fff8e8] text-[#6a4c12]"
                    : "border border-[#e3c2b7] bg-[#fff4ef] text-[#7a3d2b]"
              }`}
            >
              <strong>{statusMessage.title}</strong>
              <div>{statusMessage.body}</div>
            </div>
          ) : null}
        </section>

        <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
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

        <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-3xl border border-[#d9d2c3] bg-white p-8 sm:p-10">
            <div className="flex flex-col gap-3">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#846b42]">
                Customer onboarding form
              </p>
              <h2 className="text-3xl font-bold text-[#132027]">Capture the business context once.</h2>
              <p className="text-lg text-[#405058]">
                {`This saves directly to the onboarding record tied to checkout so Social Foreman can generate a relevant reviewed batch for your ${context.planName ?? plan.name} plan and map publishing to the right connected page.`}
              </p>
            </div>

            <form action="/api/onboarding" method="POST" className="mt-8 space-y-6">
              <input type="hidden" name="onboardingId" value={context.onboardingId ?? ""} />
              <input type="hidden" name="stripeCustomerId" value={context.stripeCustomerId ?? ""} />
              <input type="hidden" name="stripeSubscriptionId" value={context.stripeSubscriptionId ?? ""} />
              <input type="hidden" name="customerEmail" value={context.customerEmail ?? ""} />

              <div className="grid gap-5 md:grid-cols-2">
                <label className="text-sm font-medium text-[#132027]">
                  Business name
                  <input
                    name="businessName"
                    required
                    defaultValue={context.record?.business_name ?? context.customerName ?? ""}
                    className="mt-2 w-full rounded-2xl border border-[#c9c1b3] bg-white px-4 py-3 text-sm"
                  />
                </label>
                <label className="text-sm font-medium text-[#132027]">
                  Business type
                  <select
                    name="businessType"
                    required
                    defaultValue={context.record?.business_type ?? ""}
                    className="mt-2 w-full rounded-2xl border border-[#c9c1b3] bg-white px-4 py-3 text-sm"
                  >
                    <option value="">Select one</option>
                    {BUSINESS_TYPES.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <label className="text-sm font-medium text-[#132027]">
                  Service area
                  <input
                    name="serviceArea"
                    required
                    placeholder="Dallas-Fort Worth, TX"
                    defaultValue={context.record?.service_area ?? ""}
                    className="mt-2 w-full rounded-2xl border border-[#c9c1b3] bg-white px-4 py-3 text-sm"
                  />
                </label>
                <label className="text-sm font-medium text-[#132027]">
                  Primary services
                  <input
                    name="primaryServices"
                    required
                    placeholder="roof repair, roof replacement, storm damage"
                    defaultValue={(context.record?.primary_services ?? []).join(", ")}
                    className="mt-2 w-full rounded-2xl border border-[#c9c1b3] bg-white px-4 py-3 text-sm"
                  />
                </label>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <label className="text-sm font-medium text-[#132027]">
                  Best phone number
                  <input
                    name="phone"
                    required
                    defaultValue={context.record?.contact_phone ?? ""}
                    className="mt-2 w-full rounded-2xl border border-[#c9c1b3] bg-white px-4 py-3 text-sm"
                  />
                </label>
                <label className="text-sm font-medium text-[#132027]">
                  Website URL
                  <input
                    name="websiteUrl"
                    type="url"
                    defaultValue={context.record?.website_url ?? ""}
                    className="mt-2 w-full rounded-2xl border border-[#c9c1b3] bg-white px-4 py-3 text-sm"
                  />
                </label>
              </div>

              <label className="block text-sm font-medium text-[#132027]">
                Facebook Page URL
                <input
                  name="facebookPageUrl"
                  type="url"
                  defaultValue={context.record?.facebook_page_url ?? ""}
                  className="mt-2 w-full rounded-2xl border border-[#c9c1b3] bg-white px-4 py-3 text-sm"
                />
              </label>

              <div className="grid gap-5 md:grid-cols-2">
                <label className="text-sm font-medium text-[#132027]">
                  Main offer or promo
                  <textarea
                    name="offerSummary"
                    rows={4}
                    defaultValue={context.record?.offer_summary ?? ""}
                    className="mt-2 w-full rounded-2xl border border-[#c9c1b3] bg-white px-4 py-3 text-sm"
                  />
                </label>
                <label className="text-sm font-medium text-[#132027]">
                  What makes you different
                  <textarea
                    name="differentiators"
                    rows={4}
                    defaultValue={context.record?.differentiators ?? ""}
                    className="mt-2 w-full rounded-2xl border border-[#c9c1b3] bg-white px-4 py-3 text-sm"
                  />
                </label>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <label className="text-sm font-medium text-[#132027]">
                  Brand tone
                  <select
                    name="tone"
                    required
                    defaultValue={context.record?.brand_tone ?? ""}
                    className="mt-2 w-full rounded-2xl border border-[#c9c1b3] bg-white px-4 py-3 text-sm"
                  >
                    <option value="">Select one</option>
                    {BUSINESS_TONES.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm font-medium text-[#132027]">
                  Audience notes
                  <textarea
                    name="audienceNotes"
                    rows={4}
                    placeholder="Homeowners in older neighborhoods, commercial property managers, etc."
                    defaultValue={context.record?.audience_notes ?? ""}
                    className="mt-2 w-full rounded-2xl border border-[#c9c1b3] bg-white px-4 py-3 text-sm"
                  />
                </label>
              </div>

              <button
                type="submit"
                className="inline-flex rounded-full bg-[#132027] px-6 py-3 font-semibold text-[#f8f2e8] transition hover:bg-[#21414b]"
              >
                Save profile and generate reviewed batch
              </button>
            </form>
          </section>

          <div className="space-y-8">
            <section className="rounded-3xl border border-[#d9d2c3] bg-white p-8 sm:p-10">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#846b42]">
                    Facebook connection
                  </p>
                  <h2 className="mt-3 text-3xl font-bold text-[#132027]">
                    Link the publishing destination.
                  </h2>
                  <p className="mt-3 text-lg text-[#405058]">
                    The selected page is saved on the same customer onboarding record as the business profile and reviewed plan-aware batch so approved posts can be routed correctly.
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
                  Facebook is fully linked and ready for publishing. Connected page: {context.selectedPageName ?? "your page"}
                  {context.selectedPageId ? ` (${context.selectedPageId})` : ""}.
                </div>
              ) : context.facebookStatus === "select_page" ? (
                <div className="mt-6 rounded-2xl border border-[#b7d5c2] bg-[#edf7f0] p-4 text-[#214b33]">
                  Facebook login worked. We found multiple Pages for this account, so choose the one Social Foreman should use.
                </div>
              ) : context.facebookStatus === "connected" ? (
                <div className="mt-6 rounded-2xl border border-[#b7d5c2] bg-[#edf7f0] p-4 text-[#214b33]">
                  Facebook login worked, and we found {context.pagesCount ?? "some"} page option{context.pagesCount === "1" ? "" : "s"}.
                </div>
              ) : context.facebookStatus === "connected_no_pages" ? (
                <div className="mt-6 rounded-2xl border border-[#f0d9a6] bg-[#fff8e8] p-4 text-[#6a4c12]">
                  Facebook login worked, but no publishable Pages came back yet. That usually means permissions still need work in Meta.
                </div>
              ) : null}

              {availablePages.length > 1 ? (
                <div className="mt-6 rounded-2xl border border-[#d9d2c3] bg-[#f7f5ef] p-5">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#846b42]">
                    Choose the Facebook Page to link
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
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#d7c6a1]">
                Reviewed weekly batch
              </p>
              <h2 className="mt-3 text-3xl font-bold">
                {batchReady ? `Your ${postsPerWeek} approved drafts are ready.` : "Your reviewed weekly batch unlocks as onboarding fills in."}
              </h2>
              <p className="mt-4 text-[#d8cec1]">
                {`Social Foreman aims to generate ${Math.max(5, postsPerWeek + 2)} candidate posts, review and refine them with a second pass, then store only the final ${postsPerWeek} approved drafts for the week. If the AI path fails, the app falls back to the internal rule-based generator.`}
              </p>

              {draftsToRender.length ? (
                <div className="mt-6 space-y-4">
                  {draftsToRender.slice(0, postsPerWeek).map((draft, index) => (
                    <div key={`${draft.headline}-${index}`} className="rounded-2xl bg-white/8 p-5">
                      <p className="text-xs uppercase tracking-[0.15em] text-[#d7c6a1]">Approved Draft {index + 1} of {postsPerWeek}</p>
                      <p className="mt-2 text-xl font-semibold">{draft.headline}</p>
                      <p className="mt-3 whitespace-pre-wrap text-[#f6ead8]">{draft.body}</p>
                      <p className="mt-3 text-sm text-[#f6ead8]"><span className="font-semibold">CTA:</span> {draft.callToAction}</p>
                      {draft.hashtags.length ? (
                        <p className="mt-3 text-sm text-[#f6ead8]">{draft.hashtags.map((tag: string) => `#${tag}`).join(" ")}</p>
                      ) : null}
                    </div>
                  ))}

                  {context.record?.weekly_review_summary ? (
                    <div className="rounded-2xl border border-white/15 bg-white/8 p-5 text-sm text-[#f6ead8]">
                      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#d7c6a1]">Review notes</p>
                      <p className="mt-2">{context.record.weekly_review_summary}</p>
                    </div>
                  ) : null}
                </div>
              ) : businessProfileReady ? (
                <div className="mt-6 rounded-2xl border border-white/15 bg-white/8 p-5 text-sm text-[#f6ead8]">
                  Your saved business info is enough to create a preview batch, but it has not been stored yet. Save the onboarding form again to lock the reviewed plan batch onto the customer record.
                </div>
              ) : (
                <div className="mt-6 rounded-2xl border border-white/15 bg-white/8 p-5 text-sm text-[#f6ead8]">
                  Complete the business profile form to generate your first reviewed plan-aware batch. Link Facebook too if you want the record fully ready for publishing.
                </div>
              )}

              <div className="mt-6 grid gap-3 text-sm text-[#d8cec1]">
                <div className="rounded-2xl bg-white/8 px-4 py-3">Business profile: {businessProfileReady ? "saved" : "not saved yet"}</div>
                <div className="rounded-2xl bg-white/8 px-4 py-3">Plan: {context.planName ?? plan.name}</div>
                <div className="rounded-2xl bg-white/8 px-4 py-3">Posts per week: {postsPerWeek}</div>
                <div className="rounded-2xl bg-white/8 px-4 py-3">Posting cadence: {cadenceLabel}</div>
                <div className="rounded-2xl bg-white/8 px-4 py-3">Weekly draft batch: {batchReady ? `reviewed ${postsPerWeek} saved` : "not generated yet"}</div>
                <div className="rounded-2xl bg-white/8 px-4 py-3">Generation method: {context.record?.draft_generation_method ?? "not run yet"}</div>
                <div className="rounded-2xl bg-white/8 px-4 py-3">Candidate pool reviewed: {context.record?.weekly_candidate_count ?? 0}</div>
                <div className="rounded-2xl bg-white/8 px-4 py-3">Facebook page: {pageReady ? context.selectedPageName ?? "linked" : "not linked yet"}</div>
                <div className="rounded-2xl bg-white/8 px-4 py-3">Onboarding status: {context.onboardingStatus ?? "unknown"}</div>
                <div className="rounded-2xl bg-white/8 px-4 py-3">Weekly plan: {pipelinePreview?.weeklyPlan ? `${pipelinePreview.weeklyPlan.week_key} (${pipelinePreview.weeklyPlan.status})` : "not generated yet"}</div>
                <div className="rounded-2xl bg-white/8 px-4 py-3">Selected/scheduled posts: {pipelinePreview?.weeklyPlan?.scheduled_count ?? 0}</div>
                <div className="rounded-2xl bg-white/8 px-4 py-3">Published this week: {pipelinePreview?.weeklyPlan?.published_count ?? 0}</div>
              </div>
            </section>
          </div>
        </section>
      </main>
    </div>
  );
}
