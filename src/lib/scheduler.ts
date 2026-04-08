import { generateDraftBatch, type BusinessProfileInput } from "./business-profile";
import { fetchCustomerFacebookConnection, saveBusinessProfile, updateCustomerOnboardingStatus } from "./customer-store";
import { publishFacebookPagePost } from "./facebook";
import { generateReviewedWeeklyDraftBatch } from "./openai-drafts";
import { buildGenerationSnapshot, buildPostMessage, buildWeeklyGenerationPlan, parseDraftBatchJson } from "./post-pipeline";
import {
  fetchDueScheduledPosts,
  fetchWeeklyPlan,
  fetchWeeklyPosts,
  markPostPublishFailed,
  markPostPublished,
  markPostPublishing,
  replaceWeeklyPosts,
  selectWeeklyApprovedPosts,
  upsertWeeklyPlan,
} from "./post-store";
import { cadenceForPostsPerWeek, formatCadenceLabel, getPlanConfig } from "./plans";

function toBusinessProfile(record: NonNullable<Awaited<ReturnType<typeof fetchCustomerFacebookConnection>>>) {
  if (!record.business_name || !record.business_type || !record.service_area || !record.contact_phone || !record.brand_tone) {
    throw new Error("Business profile is incomplete for this onboarding record.");
  }

  return {
    businessName: record.business_name,
    businessType: record.business_type,
    serviceArea: record.service_area,
    primaryServices: record.primary_services ?? [],
    phone: record.contact_phone,
    websiteUrl: record.website_url ?? "",
    facebookPageUrl: record.facebook_page_url ?? "",
    offerSummary: record.offer_summary ?? "",
    differentiators: record.differentiators ?? "",
    tone: record.brand_tone,
    audienceNotes: record.audience_notes ?? "",
  } satisfies BusinessProfileInput;
}

export async function generateWeeklyPlanPipeline(input: {
  onboardingId?: string | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  customerEmail?: string | null;
  referenceDate?: Date;
}) {
  const record = await fetchCustomerFacebookConnection(input);

  if (!record) {
    throw new Error("No onboarding record found.");
  }

  const profile = toBusinessProfile(record);
  const plan = getPlanConfig(record.plan_tier);
  const postsPerWeek = record.posts_per_week ?? plan.postsPerWeek;
  const cadenceDays = record.posting_cadence_days?.length ? record.posting_cadence_days : cadenceForPostsPerWeek(postsPerWeek);
  const cadenceLabel = record.posting_cadence_label ?? formatCadenceLabel(postsPerWeek, cadenceDays);
  const weeklyPlanSeed = buildWeeklyGenerationPlan({
    onboardingId: record.id,
    planTier: record.plan_tier,
    postsPerWeek,
    cadenceDays,
    cadenceLabel,
    referenceDate: input.referenceDate,
  });

  let candidates = generateDraftBatch(profile, Math.max(5, postsPerWeek + 2)).drafts;
  let approved = candidates.slice(0, postsPerWeek);
  let reviewSummary: string | null = null;
  let generationMethod = "rule-based-fallback";
  let generationModel: string | null = null;

  try {
    const reviewed = await generateReviewedWeeklyDraftBatch(profile, {
      approvedCount: postsPerWeek,
      candidateCount: Math.max(5, postsPerWeek + 2),
      cadenceDays,
      cadenceLabel,
    });
    candidates = reviewed.candidates;
    approved = reviewed.approved;
    reviewSummary = reviewed.reviewSummary;
    generationMethod = `openai-${reviewed.model}`;
    generationModel = reviewed.model;
  } catch (error) {
    console.error("Weekly plan generation fell back to rules", {
      onboardingId: record.id,
      reason: error instanceof Error ? error.message : "Unknown error",
    });
  }

  const weeklyPlan = await upsertWeeklyPlan({
    ...weeklyPlanSeed,
    generationMethod,
    generationModel,
    reviewSummary,
    candidateCount: candidates.length,
    approvedCount: approved.length,
  });

  const insertedPosts = await replaceWeeklyPosts({
    onboardingId: record.id,
    weeklyPlanId: weeklyPlan.id,
    weekKey: weeklyPlan.week_key,
    generationMethod,
    generationModel,
    candidates,
    approved,
  });

  await saveBusinessProfile({
    onboardingId: record.id,
    profile,
    firstPostDraft: approved[0] ?? candidates[0],
    draftBatch: approved,
    draftGenerationMethod: generationMethod,
    weeklyReviewSummary: reviewSummary,
    weeklyCandidateCount: candidates.length,
    postsPerWeek,
    postingCadenceDays: cadenceDays,
    postingCadenceLabel: cadenceLabel,
  });

  const refreshedWeeklyPlan = await fetchWeeklyPlan({ onboardingId: record.id, weekKey: weeklyPlan.week_key });
  if (!refreshedWeeklyPlan) {
    throw new Error("Weekly plan could not be reloaded after generation.");
  }

  const selected = await selectWeeklyApprovedPosts({
    weeklyPlan: refreshedWeeklyPlan,
    posts: insertedPosts,
  });

  await updateCustomerOnboardingStatus({
    onboardingId: record.id,
    onboardingStatus: record.facebook_selected_page_id ? "scheduled" : "awaiting-facebook-page",
    currentWeeklyPlanId: refreshedWeeklyPlan.id,
    currentWeekKey: refreshedWeeklyPlan.week_key,
    generationSnapshot: buildGenerationSnapshot({
      profile,
      planTier: record.plan_tier ?? plan.key,
      postsPerWeek,
      cadenceDays,
      cadenceLabel,
    }),
  });

  return {
    recordId: record.id,
    weeklyPlanId: refreshedWeeklyPlan.id,
    weekKey: refreshedWeeklyPlan.week_key,
    postsPerWeek,
    cadenceDays,
    cadenceLabel,
    generatedCount: candidates.length,
    approvedCount: approved.length,
    selectedCount: selected.selectedPostIds.length,
    generationMethod,
  };
}

export async function publishDuePostsPipeline(now = new Date()) {
  const duePosts = await fetchDueScheduledPosts(now.toISOString());
  const results: Array<{ postId: string; status: "published" | "failed"; facebookPostId?: string; error?: string }> = [];

  for (const post of duePosts) {
    try {
      if (!post.customer_onboarding.facebook_selected_page_id || !post.customer_onboarding.facebook_page_access_token) {
        throw new Error("Facebook page token is missing for this scheduled post.");
      }

      await markPostPublishing(post.id);
      const message = post.post_message ?? buildPostMessage({
        headline: post.headline,
        body: post.body,
        callToAction: post.call_to_action,
        hashtags: post.hashtags ?? [],
      });
      const facebookPostId = await publishFacebookPagePost({
        pageId: post.customer_onboarding.facebook_selected_page_id,
        pageAccessToken: post.customer_onboarding.facebook_page_access_token,
        message,
      });

      await markPostPublished({
        postId: post.id,
        weeklyPlanId: post.weekly_plan_id,
        facebookPostId,
      });

      results.push({
        postId: post.id,
        status: "published",
        facebookPostId,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown publish failure";
      await markPostPublishFailed({
        postId: post.id,
        errorMessage: message,
      });
      results.push({
        postId: post.id,
        status: "failed",
        error: message,
      });
    }
  }

  return {
    checkedAt: now.toISOString(),
    dueCount: duePosts.length,
    publishedCount: results.filter((item) => item.status === "published").length,
    failedCount: results.filter((item) => item.status === "failed").length,
    results,
  };
}

export async function previewCurrentWeeklyPosts(input: {
  onboardingId?: string | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  customerEmail?: string | null;
}) {
  const record = await fetchCustomerFacebookConnection(input);
  if (!record) {
    return null;
  }

  const weekKey = record.current_week_key;
  if (!weekKey) {
    return {
      record,
      weeklyPlan: null,
      posts: parseDraftBatchJson(record.draft_batch_json),
    };
  }

  const weeklyPlan = await fetchWeeklyPlan({ onboardingId: record.id, weekKey });
  if (!weeklyPlan) {
    return {
      record,
      weeklyPlan: null,
      posts: parseDraftBatchJson(record.draft_batch_json),
    };
  }

  const posts = await fetchWeeklyPosts({ weeklyPlanId: weeklyPlan.id });

  return {
    record,
    weeklyPlan,
    posts,
  };
}
