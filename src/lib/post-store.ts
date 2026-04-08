import { getSupabaseAdmin } from "./supabase";
import type { BusinessProfileDraft } from "./business-profile";
import { buildPostMessage, computeWeeklyScheduleSlots, type PostLifecycleState, type WeeklyGenerationPlan } from "./post-pipeline";

export type GeneratedPostRecord = {
  id: string;
  onboarding_id: string;
  weekly_plan_id: string | null;
  source_batch_id: string | null;
  lifecycle_state: PostLifecycleState;
  generation_method: string | null;
  generation_model: string | null;
  week_key: string | null;
  cadence_day: string | null;
  scheduled_for: string | null;
  selected_for_week: boolean;
  approved_for_publishing: boolean;
  published_post_id: string | null;
  published_at: string | null;
  publish_attempted_at: string | null;
  publish_error: string | null;
  rating: number | null;
  headline: string;
  body: string;
  call_to_action: string;
  hashtags: string[] | null;
  post_message: string | null;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
};

export type WeeklyPlanRecord = {
  id: string;
  onboarding_id: string;
  week_key: string;
  week_start_date: string;
  week_end_date: string;
  plan_tier: string | null;
  posts_per_week: number;
  cadence_days: string[];
  cadence_label: string;
  status: string;
  generation_method: string | null;
  generation_model: string | null;
  review_summary: string | null;
  candidate_count: number;
  approved_count: number;
  selected_count: number;
  scheduled_count: number;
  published_count: number;
  last_generated_at: string | null;
  last_scheduled_at: string | null;
  last_published_at: string | null;
  created_at: string;
  updated_at: string;
};

const weeklyPlanSelect =
  "id, onboarding_id, week_key, week_start_date, week_end_date, plan_tier, posts_per_week, cadence_days, cadence_label, status, generation_method, generation_model, review_summary, candidate_count, approved_count, selected_count, scheduled_count, published_count, last_generated_at, last_scheduled_at, last_published_at, created_at, updated_at";

const generatedPostSelect =
  "id, onboarding_id, weekly_plan_id, source_batch_id, lifecycle_state, generation_method, generation_model, week_key, cadence_day, scheduled_for, selected_for_week, approved_for_publishing, published_post_id, published_at, publish_attempted_at, publish_error, rating, headline, body, call_to_action, hashtags, post_message, review_notes, created_at, updated_at";

export async function upsertWeeklyPlan(input: WeeklyGenerationPlan & {
  generationMethod: string;
  generationModel?: string | null;
  reviewSummary?: string | null;
  candidateCount: number;
  approvedCount: number;
}) {
  const supabase = getSupabaseAdmin();
  const timestamp = new Date().toISOString();

  const { data, error } = await supabase
    .from("weekly_generation_plans")
    .upsert(
      {
        onboarding_id: input.onboardingId,
        week_key: input.weekKey,
        week_start_date: input.weekStartDate,
        week_end_date: input.weekEndDate,
        plan_tier: input.planTier,
        posts_per_week: input.postsPerWeek,
        cadence_days: input.cadenceDays,
        cadence_label: input.cadenceLabel,
        status: "generated",
        generation_method: input.generationMethod,
        generation_model: input.generationModel ?? null,
        review_summary: input.reviewSummary ?? null,
        candidate_count: input.candidateCount,
        approved_count: input.approvedCount,
        last_generated_at: timestamp,
      },
      { onConflict: "onboarding_id,week_key" },
    )
    .select(weeklyPlanSelect)
    .single<WeeklyPlanRecord>();

  if (error) {
    throw new Error(`Supabase weekly plan upsert failed: ${error.message}`);
  }

  return data;
}

export async function replaceWeeklyPosts(input: {
  onboardingId: string;
  weeklyPlanId: string;
  weekKey: string;
  generationMethod: string;
  generationModel?: string | null;
  candidates: BusinessProfileDraft[];
  approved: BusinessProfileDraft[];
}) {
  const supabase = getSupabaseAdmin();

  const { error: deleteError } = await supabase
    .from("generated_posts")
    .delete()
    .eq("weekly_plan_id", input.weeklyPlanId)
    .in("lifecycle_state", ["candidate", "approved", "selected", "scheduled", "failed", "rejected"]);

  if (deleteError) {
    throw new Error(`Supabase generated post cleanup failed: ${deleteError.message}`);
  }

  const approvedSet = new Set(input.approved.map((draft) => JSON.stringify(draft)));
  const rows = input.candidates.map((draft, index) => {
    const serialized = JSON.stringify(draft);
    const isApproved = approvedSet.has(serialized);

    return {
      onboarding_id: input.onboardingId,
      weekly_plan_id: input.weeklyPlanId,
      source_batch_id: `${input.weekKey}-${index + 1}`,
      lifecycle_state: isApproved ? "approved" : "candidate",
      generation_method: input.generationMethod,
      generation_model: input.generationModel ?? null,
      week_key: input.weekKey,
      selected_for_week: false,
      approved_for_publishing: isApproved,
      headline: draft.headline,
      body: draft.body,
      call_to_action: draft.callToAction,
      hashtags: draft.hashtags,
      post_message: buildPostMessage(draft),
    };
  });

  const { data, error } = await supabase
    .from("generated_posts")
    .insert(rows)
    .select(generatedPostSelect)
    .returns<GeneratedPostRecord[]>();

  if (error) {
    throw new Error(`Supabase generated post insert failed: ${error.message}`);
  }

  return data ?? [];
}

export async function fetchWeeklyPlan(input: { onboardingId: string; weekKey: string }) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("weekly_generation_plans")
    .select(weeklyPlanSelect)
    .eq("onboarding_id", input.onboardingId)
    .eq("week_key", input.weekKey)
    .limit(1)
    .maybeSingle<WeeklyPlanRecord>();

  if (error) {
    throw new Error(`Supabase weekly plan lookup failed: ${error.message}`);
  }

  return data;
}

export async function fetchWeeklyPosts(input: { weeklyPlanId: string }) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("generated_posts")
    .select(generatedPostSelect)
    .eq("weekly_plan_id", input.weeklyPlanId)
    .order("created_at", { ascending: true })
    .returns<GeneratedPostRecord[]>();

  if (error) {
    throw new Error(`Supabase generated posts lookup failed: ${error.message}`);
  }

  return data ?? [];
}

export async function selectWeeklyApprovedPosts(input: {
  weeklyPlan: WeeklyPlanRecord;
  posts: GeneratedPostRecord[];
  postingHourUtc?: number;
}) {
  const supabase = getSupabaseAdmin();
  const approved = input.posts
    .filter((post) => post.lifecycle_state === "approved" || post.lifecycle_state === "selected" || post.lifecycle_state === "scheduled")
    .sort((a, b) => {
      const left = a.rating ?? 0;
      const right = b.rating ?? 0;
      if (left !== right) {
        return right - left;
      }
      return a.created_at.localeCompare(b.created_at);
    })
    .slice(0, input.weeklyPlan.posts_per_week);

  const slots = computeWeeklyScheduleSlots({
    weekStartDate: input.weeklyPlan.week_start_date,
    cadenceDays: input.weeklyPlan.cadence_days,
    postingHourUtc: input.postingHourUtc,
  });

  if (approved.length !== slots.length) {
    throw new Error(`Expected ${slots.length} approved posts but found ${approved.length}.`);
  }

  const updates = approved.map((post, index) => ({
    id: post.id,
    lifecycle_state: "scheduled" as const,
    selected_for_week: true,
    approved_for_publishing: true,
    cadence_day: slots[index]?.dayName ?? null,
    scheduled_for: slots[index]?.scheduledFor ?? null,
    post_message: post.post_message ?? buildPostMessage({
      headline: post.headline,
      body: post.body,
      callToAction: post.call_to_action,
      hashtags: post.hashtags ?? [],
    }),
    publish_error: null,
  }));

  const unselectedIds = input.posts
    .filter((post) => !approved.some((approvedPost) => approvedPost.id === post.id))
    .map((post) => post.id);

  if (unselectedIds.length) {
    const { error: resetError } = await supabase
      .from("generated_posts")
      .update({
        selected_for_week: false,
        cadence_day: null,
        scheduled_for: null,
        lifecycle_state: "approved",
      })
      .in("id", unselectedIds)
      .eq("weekly_plan_id", input.weeklyPlan.id);

    if (resetError) {
      throw new Error(`Supabase unselected post reset failed: ${resetError.message}`);
    }
  }

  const { error } = await supabase.from("generated_posts").upsert(updates, { onConflict: "id" });

  if (error) {
    throw new Error(`Supabase weekly post selection failed: ${error.message}`);
  }

  const timestamp = new Date().toISOString();
  const { data: weeklyPlan, error: weeklyPlanError } = await supabase
    .from("weekly_generation_plans")
    .update({
      status: "scheduled",
      selected_count: updates.length,
      scheduled_count: updates.length,
      last_scheduled_at: timestamp,
    })
    .eq("id", input.weeklyPlan.id)
    .select(weeklyPlanSelect)
    .single<WeeklyPlanRecord>();

  if (weeklyPlanError) {
    throw new Error(`Supabase weekly plan schedule update failed: ${weeklyPlanError.message}`);
  }

  return {
    weeklyPlan,
    selectedPostIds: updates.map((post) => post.id),
  };
}

export async function fetchDueScheduledPosts(nowIso: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("generated_posts")
    .select(`${generatedPostSelect}, customer_onboarding!inner(id, facebook_selected_page_id, facebook_selected_page_name, facebook_page_access_token, business_name)`)
    .eq("lifecycle_state", "scheduled")
    .eq("approved_for_publishing", true)
    .lte("scheduled_for", nowIso)
    .returns<Array<GeneratedPostRecord & {
      customer_onboarding: {
        id: string;
        facebook_selected_page_id: string | null;
        facebook_selected_page_name: string | null;
        facebook_page_access_token: string | null;
        business_name: string | null;
      };
    }>>();

  if (error) {
    throw new Error(`Supabase due scheduled post lookup failed: ${error.message}`);
  }

  return data ?? [];
}

export async function markPostPublishing(postId: string) {
  const supabase = getSupabaseAdmin();
  const timestamp = new Date().toISOString();
  const { error } = await supabase
    .from("generated_posts")
    .update({
      lifecycle_state: "publishing",
      publish_attempted_at: timestamp,
      publish_error: null,
    })
    .eq("id", postId);

  if (error) {
    throw new Error(`Supabase publishing mark failed: ${error.message}`);
  }
}

export async function markPostPublished(input: {
  postId: string;
  weeklyPlanId: string | null;
  facebookPostId: string;
}) {
  const supabase = getSupabaseAdmin();
  const timestamp = new Date().toISOString();

  const { error } = await supabase
    .from("generated_posts")
    .update({
      lifecycle_state: "published",
      published_post_id: input.facebookPostId,
      published_at: timestamp,
      publish_error: null,
    })
    .eq("id", input.postId);

  if (error) {
    throw new Error(`Supabase published mark failed: ${error.message}`);
  }

  if (input.weeklyPlanId) {
    const { error: weeklyPlanError } = await supabase.rpc("increment_weekly_plan_published_count", {
      target_weekly_plan_id: input.weeklyPlanId,
      published_at_input: timestamp,
    });

    if (weeklyPlanError) {
      throw new Error(`Supabase weekly plan published counter failed: ${weeklyPlanError.message}`);
    }
  }
}

export async function markPostPublishFailed(input: {
  postId: string;
  errorMessage: string;
}) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("generated_posts")
    .update({
      lifecycle_state: "failed",
      publish_error: input.errorMessage,
    })
    .eq("id", input.postId);

  if (error) {
    throw new Error(`Supabase failed mark failed: ${error.message}`);
  }
}
