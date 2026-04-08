import type { BusinessProfileDraft, BusinessProfileInput } from "./business-profile";

const OPENAI_API_URL = "https://api.openai.com/v1/responses";
const OPENAI_MODEL = process.env.OPENAI_WEEKLY_DRAFT_MODEL?.trim() || "gpt-5-mini";

type ReviewedDraftBatch = {
  drafts: BusinessProfileDraft[];
  reviewSummary: string | null;
  model: string;
};

type DraftGenerationOptions = {
  postCount?: number;
  cadenceDays?: string[];
  cadenceLabel?: string;
};

type DraftResponse = {
  drafts: BusinessProfileDraft[];
  summary?: string;
};

function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing ${name}`);
  }

  return value;
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeDraft(draft: Partial<BusinessProfileDraft>): BusinessProfileDraft {
  const hashtags = Array.isArray(draft.hashtags)
    ? draft.hashtags
        .map((tag) => normalizeWhitespace(String(tag ?? "")).replace(/^#/, ""))
        .filter(Boolean)
        .slice(0, 5)
    : [];

  return {
    headline: normalizeWhitespace(String(draft.headline ?? "")),
    body: String(draft.body ?? "").trim(),
    callToAction: normalizeWhitespace(String(draft.callToAction ?? "")),
    hashtags,
  };
}

function extractTextFromResponse(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    throw new Error("OpenAI response payload was empty.");
  }

  const outputText = (payload as { output_text?: unknown }).output_text;
  if (typeof outputText === "string" && outputText.trim()) {
    return outputText;
  }

  const output = (payload as { output?: unknown }).output;
  if (!Array.isArray(output)) {
    throw new Error("OpenAI response did not include output text.");
  }

  const text = output
    .flatMap((item) => {
      if (!item || typeof item !== "object") {
        return [] as string[];
      }

      const content = (item as { content?: unknown }).content;
      if (!Array.isArray(content)) {
        return [] as string[];
      }

      return content.flatMap((entry) => {
        if (!entry || typeof entry !== "object") {
          return [] as string[];
        }

        const maybeText = (entry as { text?: unknown }).text;
        return typeof maybeText === "string" ? [maybeText] : [];
      });
    })
    .join("\n")
    .trim();

  if (!text) {
    throw new Error("OpenAI response text was empty.");
  }

  return text;
}

async function callOpenAiJson<T>(instructions: string, input: string): Promise<T> {
  const apiKey = getRequiredEnv("OPENAI_API_KEY");

  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      input,
      instructions,
      text: {
        format: {
          type: "json_object",
        },
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI request failed (${response.status}): ${errorText}`);
  }

  const payload = (await response.json()) as unknown;
  const text = extractTextFromResponse(payload);

  try {
    return JSON.parse(text) as T;
  } catch (error) {
    throw new Error(
      `OpenAI JSON parsing failed: ${error instanceof Error ? error.message : "Unknown parse error"}`,
    );
  }
}

function validateDraft(draft: BusinessProfileDraft, profile: BusinessProfileInput) {
  const issues: string[] = [];
  const combined = `${draft.headline} ${draft.body} ${draft.callToAction}`.toLowerCase();

  if (!draft.headline || draft.headline.length < 12 || draft.headline.length > 90) {
    issues.push("headline length");
  }

  if (!draft.body || draft.body.length < 80 || draft.body.length > 420) {
    issues.push("body length");
  }

  if (!draft.callToAction || draft.callToAction.length < 12 || draft.callToAction.length > 140) {
    issues.push("call-to-action length");
  }

  if (!draft.hashtags.length || draft.hashtags.length > 5) {
    issues.push("hashtag count");
  }

  if (!combined.includes(profile.businessName.toLowerCase())) {
    issues.push("missing business name");
  }

  if (!combined.includes(profile.serviceArea.toLowerCase())) {
    issues.push("missing service area");
  }

  if (!combined.includes(profile.phone.toLowerCase()) && (!profile.websiteUrl || !combined.includes(profile.websiteUrl.toLowerCase()))) {
    issues.push("missing contact method");
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

export async function generateReviewedWeeklyDraftBatch(
  profile: BusinessProfileInput,
  options: DraftGenerationOptions = {},
): Promise<ReviewedDraftBatch> {
  const postCount = Math.max(1, Math.min(options.postCount ?? 3, 5));
  const cadenceContext = options.cadenceDays?.length
    ? `${options.cadenceLabel ?? options.cadenceDays.join(", ")} cadence with posts planned for ${options.cadenceDays.join(", ")}`
    : options.cadenceLabel
      ? `${options.cadenceLabel} cadence`
      : "weekly cadence";

  const instructions = `You create high-quality Facebook post drafts for local service businesses. Return JSON with a top-level {"drafts": [...], "summary": "..."} object. Create exactly ${postCount} final approved weekly post drafts. Each draft must include headline, body, callToAction, and hashtags. Keep each post grounded in the supplied business profile, sound natural for Facebook, avoid hypey spam language, vary the angle across the set, and make the drafts ready to publish without another approval pass. Mention the business name and service area naturally. Include a clear contact CTA that uses the phone number and website when appropriate. Hashtags should be short, clean, and omit the # symbol. Build the set for a ${cadenceContext}.`;

  const payload = await callOpenAiJson<DraftResponse>(
    instructions,
    JSON.stringify({
      profile,
      postCount,
      cadenceDays: options.cadenceDays ?? [],
      cadenceLabel: options.cadenceLabel ?? null,
      goal: `Generate ${postCount} ready-to-publish weekly Facebook posts.`,
    }),
  );

  const drafts = Array.isArray(payload.drafts)
    ? payload.drafts.map(normalizeDraft).filter((draft) => draft.headline && draft.body && draft.callToAction)
    : [];

  if (drafts.length !== postCount) {
    throw new Error(`OpenAI returned ${drafts.length} drafts instead of ${postCount}.`);
  }

  drafts.forEach((draft, index) => {
    const validation = validateDraft(draft, profile);
    if (!validation.valid) {
      throw new Error(`Draft ${index + 1} failed validation: ${validation.issues.join(", ")}`);
    }
  });

  return {
    drafts,
    reviewSummary: payload.summary?.trim() || null,
    model: OPENAI_MODEL,
  };
}
