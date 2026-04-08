import type { BusinessProfileDraft, BusinessProfileInput } from "./business-profile";
import type { PlanTier } from "./plans";

export const WEEKDAY_ORDER = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export type PostLifecycleState =
  | "candidate"
  | "approved"
  | "selected"
  | "scheduled"
  | "publishing"
  | "published"
  | "failed"
  | "rejected";

export type WeeklyGenerationResult = {
  candidates: BusinessProfileDraft[];
  approved: BusinessProfileDraft[];
  reviewSummary: string | null;
  model: string;
};

export type WeeklyGenerationPlan = {
  onboardingId: string;
  planTier: string | null;
  postsPerWeek: number;
  cadenceDays: string[];
  cadenceLabel: string;
  weekStartDate: string;
  weekEndDate: string;
  weekKey: string;
};

export type WeeklyScheduleSlot = {
  dayName: string;
  scheduledFor: string;
};

export function toWeekdayIndex(dayName: string) {
  const normalized = dayName.trim().toLowerCase();
  return WEEKDAY_ORDER.findIndex((day) => day.toLowerCase() === normalized);
}

export function startOfWeekUtc(input: Date) {
  const utcDay = input.getUTCDay();
  const diffToMonday = utcDay === 0 ? -6 : 1 - utcDay;
  const weekStart = new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate()));
  weekStart.setUTCDate(weekStart.getUTCDate() + diffToMonday);
  weekStart.setUTCHours(0, 0, 0, 0);
  return weekStart;
}

export function buildWeekWindow(referenceDate = new Date()) {
  const weekStart = startOfWeekUtc(referenceDate);
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
  weekEnd.setUTCHours(23, 59, 59, 999);

  const weekKey = weekStart.toISOString().slice(0, 10);

  return {
    weekStart,
    weekEnd,
    weekKey,
  };
}

export function buildWeeklyGenerationPlan(input: {
  onboardingId: string;
  planTier: string | null;
  postsPerWeek: number;
  cadenceDays: string[];
  cadenceLabel: string;
  referenceDate?: Date;
}): WeeklyGenerationPlan {
  const window = buildWeekWindow(input.referenceDate ?? new Date());

  return {
    onboardingId: input.onboardingId,
    planTier: input.planTier,
    postsPerWeek: input.postsPerWeek,
    cadenceDays: input.cadenceDays,
    cadenceLabel: input.cadenceLabel,
    weekStartDate: window.weekStart.toISOString(),
    weekEndDate: window.weekEnd.toISOString(),
    weekKey: window.weekKey,
  };
}

export function computeWeeklyScheduleSlots(input: {
  weekStartDate: string;
  cadenceDays: string[];
  postingHourUtc?: number;
}): WeeklyScheduleSlot[] {
  const weekStart = new Date(input.weekStartDate);
  const postingHourUtc = Number.isFinite(input.postingHourUtc) ? Number(input.postingHourUtc) : 15;

  return input.cadenceDays.map((dayName) => {
    const weekdayIndex = toWeekdayIndex(dayName);
    if (weekdayIndex < 0) {
      throw new Error(`Unsupported cadence day: ${dayName}`);
    }

    const scheduled = new Date(weekStart);
    const offset = weekdayIndex === 0 ? 6 : weekdayIndex - 1;
    scheduled.setUTCDate(weekStart.getUTCDate() + offset);
    scheduled.setUTCHours(postingHourUtc, 0, 0, 0);

    return {
      dayName,
      scheduledFor: scheduled.toISOString(),
    };
  });
}

export function buildPostMessage(draft: BusinessProfileDraft) {
  const pieces = [draft.body.trim(), draft.callToAction.trim()];
  const hashtags = draft.hashtags.length ? draft.hashtags.map((tag) => `#${tag}`).join(" ") : "";

  if (hashtags) {
    pieces.push(hashtags);
  }

  return pieces.filter(Boolean).join("\n\n").trim();
}

export function parseDraftBatchJson(value: string | null | undefined): BusinessProfileDraft[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? (parsed as BusinessProfileDraft[]) : [];
  } catch {
    return [];
  }
}

export function buildGenerationSnapshot(input: {
  profile: BusinessProfileInput;
  planTier: PlanTier | string;
  postsPerWeek: number;
  cadenceDays: string[];
  cadenceLabel: string;
}) {
  return {
    businessProfile: input.profile,
    planTier: input.planTier,
    postsPerWeek: input.postsPerWeek,
    cadenceDays: input.cadenceDays,
    cadenceLabel: input.cadenceLabel,
  };
}
