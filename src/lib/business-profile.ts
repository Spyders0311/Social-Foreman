export const BUSINESS_TYPES = [
  "Roofing",
  "Plumbing",
  "HVAC",
  "Electrical",
  "General contracting",
  "Landscaping",
  "Cleaning",
  "Other",
] as const;

export const BUSINESS_TONES = [
  "Professional and trustworthy",
  "Friendly and neighborly",
  "Bold and promotional",
  "Educational and helpful",
] as const;

export type BusinessProfileInput = {
  businessName: string;
  businessType: string;
  serviceArea: string;
  primaryServices: string[];
  phone: string;
  websiteUrl: string;
  facebookPageUrl: string;
  offerSummary: string;
  differentiators: string;
  tone: string;
  audienceNotes: string;
};

export type BusinessProfileDraft = {
  headline: string;
  body: string;
  callToAction: string;
  hashtags: string[];
};

function sanitizeLine(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function normalizeBusinessProfileInput(
  input: Partial<Omit<BusinessProfileInput, "primaryServices">> & { primaryServices?: string[] | string },
): BusinessProfileInput {
  const services = Array.isArray(input.primaryServices)
    ? input.primaryServices
    : String(input.primaryServices ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

  return {
    businessName: sanitizeLine(String(input.businessName ?? "")),
    businessType: sanitizeLine(String(input.businessType ?? "")),
    serviceArea: sanitizeLine(String(input.serviceArea ?? "")),
    primaryServices: services,
    phone: sanitizeLine(String(input.phone ?? "")),
    websiteUrl: sanitizeLine(String(input.websiteUrl ?? "")),
    facebookPageUrl: sanitizeLine(String(input.facebookPageUrl ?? "")),
    offerSummary: sanitizeLine(String(input.offerSummary ?? "")),
    differentiators: sanitizeLine(String(input.differentiators ?? "")),
    tone: sanitizeLine(String(input.tone ?? "")),
    audienceNotes: sanitizeLine(String(input.audienceNotes ?? "")),
  };
}

export function validateBusinessProfile(input: BusinessProfileInput) {
  const missing: string[] = [];

  if (!input.businessName) missing.push("business name");
  if (!input.businessType) missing.push("business type");
  if (!input.serviceArea) missing.push("service area");
  if (!input.primaryServices.length) missing.push("at least one primary service");
  if (!input.phone) missing.push("phone number");
  if (!input.tone) missing.push("brand tone");

  return {
    valid: missing.length === 0,
    missing,
  };
}

function buildServiceList(services: string[]) {
  if (services.length === 0) return "your core services";
  if (services.length === 1) return services[0];
  if (services.length === 2) return `${services[0]} and ${services[1]}`;
  return `${services.slice(0, -1).join(", ")}, and ${services[services.length - 1]}`;
}

function buildHashtag(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((segment, index) => (index === 0 ? segment : segment.charAt(0).toUpperCase() + segment.slice(1)))
    .join("");
}

export function generateFirstPostDraft(profile: BusinessProfileInput): BusinessProfileDraft {
  const servicesLine = buildServiceList(profile.primaryServices);
  const tonePrefix = profile.tone.toLowerCase().includes("friendly")
    ? "Hey neighbors"
    : profile.tone.toLowerCase().includes("bold")
      ? "Need it fixed fast?"
      : profile.tone.toLowerCase().includes("educational")
        ? "Quick homeowner tip"
        : "When you need a crew you can trust";

  const offerSentence = profile.offerSummary
    ? `Right now we're highlighting ${profile.offerSummary}.`
    : "We make it easier to get honest help without the runaround.";

  const differentiatorSentence = profile.differentiators
    ? `What sets us apart is ${profile.differentiators}.`
    : "We focus on clear communication, clean work, and showing up when we say we will.";

  const audienceSentence = profile.audienceNotes
    ? `We especially love helping ${profile.audienceNotes}.`
    : `We serve homeowners and property managers across ${profile.serviceArea}.`;

  return {
    headline: `${profile.businessName} is now serving ${profile.serviceArea}`,
    body: `${tonePrefix} in ${profile.serviceArea}, ${profile.businessName} is here for ${servicesLine}. ${offerSentence} ${differentiatorSentence} ${audienceSentence}`,
    callToAction: `Call ${profile.phone} to book service${profile.websiteUrl ? ` or visit ${profile.websiteUrl}` : ""}.`,
    hashtags: [profile.businessName, profile.serviceArea, profile.businessType, ...profile.primaryServices]
      .map(buildHashtag)
      .filter(Boolean)
      .slice(0, 5),
  };
}
