import { getSupabaseAdmin } from "./supabase";
import type { BusinessProfileDraft } from "./business-profile";
import {
  assignWeeklyScheduleToDrafts,
  buildPostMessage,
  type WeeklyGenerationPlan,
  type WeeklyPostStatus,
} from "./post-pipeline";

export type GeneratedPostRecord = {
  id: string;
  onboarding_id: string;
  weekly_plan_id: string | null;
  source_batch_id: string | null;
  status: WeeklyPostStatus;
  generation_method: string | null;
  generation_model: string | null;
  week_key: string | null;
  cadence_day: string | null;
  scheduled_for: string | null;
  published_post_id: string | null;
  published_at: string | null;
  publish_attempted_at: string | null;
  publish_error: string | null;
  headline: string;
  body: string;
  call_to_action: string;
  hashtags: string[] | null;
  post_message: string | null;
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
  post_count: number;
  queued_count: number;
  published_count: number;
  failed_count: number;
  last_generated_at: string | null;
  last_published_at: string | null;
  created_at: string;
  updated_at: string;
};

const weeklyPlanSelect =
  "id, onboarding_id, week_key, week_start_date, week_end_date, plan_tier, posts_per_week, cadence_days, cadence_label, status, generation_method, generation_model, review_summary, post_count, queued_count, published_count, failed_count, last_generated_at, last_published_at, created_at, updated_at";

const generatedPostSelect =
  "id, onboarding_id, weekly_plan_id, source_batch_id, status, generation_method, generation_model, week_key, cadence_day, scheduled_for, published_post_id, published_at, publish_attempted_at, publish_error, headline, body, call_to_action, hashtags, post_message, created_at, updated_at";

export async function upsertWeeklyPlan(
  input: WeeklyGenerationPlan & {
    generationMethod: string;
    generationModel?: string | null;
    reviewSummary?: string | null;
    postCount: number;
  },
) {
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
        status: "queued",
        generation_method: input.generationMethod,
        generation_model: input.generationModel ?? null,
        review_summary: input.reviewSummary ?? null,
        post_count: input.postCount,
        queued_count: input.postCount,
        failed_count: 0,
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
  weekStartDate: string;
  cadenceDays: string[];
  generationMethod: string;
  generationModel?: string | null;
  drafts: BusinessProfileDraft[];
}) {
  const supabase = getSupabaseAdmin();

  const { error: deleteError } = await supabase.from("generated_posts").delete().eq("weekly_plan_id", input.weeklyPlanId);

  if (deleteError) {
    throw new Error(`Supabase generated post cleanup failed: ${deleteError.message}`);
  }

  const scheduledDrafts = assignWeeklyScheduleToDrafts({
    drafts: input.drafts,
    weekStartDate: input.weekStartDate,
    cadenceDays: input.cadenceDays,
  });

  const rows = scheduledDrafts.map(({ draft, cadenceDay, scheduledFor }, index) => ({
    onboarding_id: input.onboardingId,
    weekly_plan_id: input.weeklyPlanId,
    source_batch_id: `${input.weekKey}-${index + 1}`,
    status: "queued" as const,
    generation_method: input.generationMethod,
    generation_model: input.generationModel ?? null,
    week_key: input.weekKey,
    cadence_day: cadenceDay,
    scheduled_for: scheduledFor,
    headline: draft.headline,
    body: draft.body,
    call_to_action: draft.callToAction,
    hashtags: draft.hashtags,
    post_message: buildPostMessage(draft),
  }));

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
    .order("scheduled_for", { ascending: true })
    .order("created_at", { ascending: true })
    .returns<GeneratedPostRecord[]>();

  if (error) {
    throw new Error(`Supabase generated posts lookup failed: ${error.message}`);
  }

  return data ?? [];
}

export async function fetchDueQueuedPosts(nowIso: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("generated_posts")
    .select(`${generatedPostSelect}, customer_onboarding!inner(id, facebook_selected_page_id, facebook_selected_page_name, facebook_page_access_token, business_name)`)
    .eq("status", "queued")
    .lte("scheduled_for", nowIso)
    .returns<
      Array<
        GeneratedPostRecord & {
          customer_onboarding: {
            id: string;
            facebook_selected_page_id: string | null;
            facebook_selected_page_name: string | null;
            facebook_page_access_token: string | null;
            business_name: string | null;
          };
        }
      >
    >();

  if (error) {
    throw new Error(`Supabase due queued post lookup failed: ${error.message}`);
  }

  return data ?? [];
}

export async function markPostPublishing(postId: string) {
  const supabase = getSupabaseAdmin();
  const timestamp = new Date().toISOString();
  const { error } = await supabase
    .from("generated_posts")
    .update({
      status: "publishing",
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
      status: "published",
      published_post_id: input.facebookPostId,
      published_at: timestamp,
      publish_error: null,
    })
    .eq("id", input.postId);

  if (error) {
    throw new Error(`Supabase published mark failed: ${error.message}`);
  }

  if (input.weeklyPlanId) {
    const { error: weeklyPlanError } = await supabase.rpc("refresh_weekly_plan_counts", {
      target_weekly_plan_id: input.weeklyPlanId,
      published_at_input: timestamp,
    });

    if (weeklyPlanError) {
      throw new Error(`Supabase weekly plan count refresh failed: ${weeklyPlanError.message}`);
    }
  }
}

export async function markPostPublishFailed(input: {
  postId: string;
  weeklyPlanId: string | null;
  errorMessage: string;
}) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("generated_posts")
    .update({
      status: "failed",
      publish_error: input.errorMessage,
    })
    .eq("id", input.postId);

  if (error) {
    throw new Error(`Supabase failed mark failed: ${error.message}`);
  }

  if (input.weeklyPlanId) {
    const { error: weeklyPlanError } = await supabase.rpc("refresh_weekly_plan_counts", {
      target_weekly_plan_id: input.weeklyPlanId,
      published_at_input: null,
    });

    if (weeklyPlanError) {
      throw new Error(`Supabase weekly plan count refresh failed: ${weeklyPlanError.message}`);
    }
  }
}
