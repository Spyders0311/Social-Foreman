export const PLAN_CONFIG = {
  starter: {
    key: "starter",
    stripeMetadataValue: "starter_99_monthly",
    name: "Starter",
    priceMonthlyCents: 9900,
    priceLabel: "$99/mo",
    postsPerWeek: 3,
    cadenceLabel: "Monday, Wednesday, and Friday",
    description: "A solid weekly Facebook presence for local businesses that want consistent visibility without overcomplicating content.",
  },
  vip: {
    key: "vip",
    stripeMetadataValue: "vip_149_monthly",
    name: "VIP",
    priceMonthlyCents: 14900,
    priceLabel: "$149/mo",
    postsPerWeek: 5,
    cadenceLabel: "Monday through Friday",
    description: "Higher-frequency posting for businesses that want to stay in front of customers almost every weekday.",
  },
} as const;

export type PlanTier = keyof typeof PLAN_CONFIG;

export const DEFAULT_PLAN_TIER: PlanTier = "starter";

export function isPlanTier(value: string | null | undefined): value is PlanTier {
  return Boolean(value && value in PLAN_CONFIG);
}

export function resolvePlanTier(value: string | null | undefined): PlanTier {
  return isPlanTier(value) ? value : DEFAULT_PLAN_TIER;
}

export function getPlanConfig(value: string | null | undefined) {
  return PLAN_CONFIG[resolvePlanTier(value)];
}

export function cadenceForPostsPerWeek(postsPerWeek: number) {
  if (postsPerWeek >= 5) {
    return ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  }

  if (postsPerWeek === 4) {
    return ["Monday", "Tuesday", "Thursday", "Friday"];
  }

  if (postsPerWeek <= 2) {
    return ["Tuesday", "Thursday"].slice(0, Math.max(postsPerWeek, 1));
  }

  return ["Monday", "Wednesday", "Friday"];
}

export function formatCadenceLabel(postsPerWeek: number, cadenceDays?: string[] | null) {
  const days = cadenceDays?.length ? cadenceDays : cadenceForPostsPerWeek(postsPerWeek);

  if (days.length === 5 && days.join(",") === "Monday,Tuesday,Wednesday,Thursday,Friday") {
    return "Monday through Friday";
  }

  if (days.length === 3 && days.join(",") === "Monday,Wednesday,Friday") {
    return "Monday, Wednesday, and Friday";
  }

  if (days.length === 2) {
    return `${days[0]} and ${days[1]}`;
  }

  if (days.length <= 1) {
    return days[0] ?? "Weekly";
  }

  return `${days.slice(0, -1).join(", ")}, and ${days[days.length - 1]}`;
}
