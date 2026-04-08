import type { BusinessProfileDraft, BusinessProfileInput } from "./business-profile";

const OPENAI_API_URL = "https://api.openai.com/v1/responses";
const OPENAI_MODEL = process.env.OPENAI_WEEKLY_DRAFT_MODEL?.trim() || "gpt-5-mini";

type ReviewedDraftBatch = {
  candidates: BusinessProfileDraft[];
  approved: BusinessProfileDraft[];
  reviewSummary: string | null;
  model: string;
};

type DraftGenerationOptions = {
  approvedCount?: number;
  candidateCount?: number;
  cadenceDays?: string[];
  cadenceLabel?: string;
};

type CandidateResponse = {
  drafts: BusinessProfileDraft[];
};

type ReviewResponse = {
  approvedDrafts: BusinessProfileDraft[];
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
  const approvedCount = Math.max(1, Math.min(options.approvedCount ?? 3, 5));
  const candidateCount = Math.max(approvedCount + 1, Math.min(options.candidateCount ?? Math.max(5, approvedCount + 2), 8));
  const cadenceContext = options.cadenceDays?.length
    ? `${options.cadenceLabel ?? options.cadenceDays.join(", ")} cadence with posts planned for ${options.cadenceDays.join(", ")}`
    : options.cadenceLabel
      ? `${options.cadenceLabel} cadence`
      : "weekly cadence";

  const generationInstructions = `You create high-quality Facebook post drafts for local service businesses. Return exactly ${candidateCount} draft candidates as JSON with a top-level {"drafts": [...]} object. Each draft must include headline, body, callToAction, and hashtags. Keep each post grounded in the supplied business profile, sound natural for Facebook, avoid hypey spam language, and vary the angle across educational, trust-building, promotional, local/community, and practical problem-solving themes. Mention the business name and service area naturally. Include a clear contact CTA that uses the phone number and website when appropriate. Hashtags should be short, clean, and omit the # symbol. Build the set for a ${cadenceContext}.`;

  const candidatePayload = await callOpenAiJson<CandidateResponse>(
    generationInstructions,
    JSON.stringify({ profile, approvedCount, candidateCount, cadenceDays: options.cadenceDays ?? [], cadenceLabel: options.cadenceLabel ?? null, goal: `Generate ${candidateCount} candidate weekly Facebook posts for a plan that keeps ${approvedCount} approved posts.` }),
  );

  const candidates = Array.isArray(candidatePayload.drafts)
    ? candidatePayload.drafts.map(normalizeDraft).filter((draft) => draft.headline && draft.body && draft.callToAction)
    : [];

  if (candidates.length < candidateCount) {
    throw new Error(`OpenAI returned ${candidates.length} candidate drafts instead of ${candidateCount}.`);
  }

  const reviewInstructions = `You are the second-pass reviewer for weekly Facebook post drafts. Review the supplied ${candidateCount} candidate drafts and select the best ${approvedCount} for final approval. Improve clarity, local relevance, specificity, and polish while keeping them realistic and non-spammy. Return JSON with {"approvedDrafts": [...], "summary": "..."}. The approvedDrafts array must contain exactly ${approvedCount} finalized drafts with headline, body, callToAction, and hashtags. Prefer variety across the approved set, and make sure the final set fits a ${cadenceContext}.`;

  const reviewPayload = await callOpenAiJson<ReviewResponse>(
    reviewInstructions,
    JSON.stringify({ profile, candidates }),
  );

  const approved = Array.isArray(reviewPayload.approvedDrafts)
    ? reviewPayload.approvedDrafts.map(normalizeDraft)
    : [];

  if (approved.length !== approvedCount) {
    throw new Error(`OpenAI review returned ${approved.length} approved drafts instead of ${approvedCount}.`);
  }

  approved.forEach((draft, index) => {
    const validation = validateDraft(draft, profile);
    if (!validation.valid) {
      throw new Error(`Approved draft ${index + 1} failed validation: ${validation.issues.join(", ")}`);
    }
  });

  return {
    candidates: candidates.slice(0, candidateCount),
    approved,
    reviewSummary: reviewPayload.summary?.trim() || null,
    model: OPENAI_MODEL,
  };
}
