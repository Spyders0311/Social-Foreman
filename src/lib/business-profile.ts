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

export type BusinessProfileDraftBatch = {
  drafts: BusinessProfileDraft[];
  fallbackUsed: boolean;
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

function buildTonePrefix(tone: string) {
  if (tone.toLowerCase().includes("friendly")) return "Hey neighbors";
  if (tone.toLowerCase().includes("bold")) return "Need it fixed fast?";
  if (tone.toLowerCase().includes("educational")) return "Quick homeowner tip";
  return "When you need a crew you can trust";
}

export function generateFirstPostDraft(profile: BusinessProfileInput): BusinessProfileDraft {
  const servicesLine = buildServiceList(profile.primaryServices);
  const tonePrefix = buildTonePrefix(profile.tone);

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

export function generateDraftBatch(profile: BusinessProfileInput, count = 4): BusinessProfileDraftBatch {
  const safeCount = Math.max(1, Math.min(count, 6));
  const servicesLine = buildServiceList(profile.primaryServices);
  const primaryService = profile.primaryServices[0] ?? profile.businessType.toLowerCase();
  const secondaryService = profile.primaryServices[1] ?? profile.primaryServices[0] ?? "service work";
  const tonePrefix = buildTonePrefix(profile.tone);
  const differentiatorLine = profile.differentiators
    ? `What makes ${profile.businessName} different is ${profile.differentiators}.`
    : `${profile.businessName} focuses on showing up on time, communicating clearly, and doing clean work.`;
  const offerLine = profile.offerSummary
    ? `This week we're featuring ${profile.offerSummary}.`
    : `We keep ${profile.serviceArea} covered for ${servicesLine}.`;
  const audienceLine = profile.audienceNotes
    ? `Built for ${profile.audienceNotes} across ${profile.serviceArea}.`
    : `Built for homeowners and local property managers across ${profile.serviceArea}.`;

  const concepts: BusinessProfileDraft[] = [
    {
      headline: `${profile.businessName} helps ${profile.serviceArea} stay ahead of ${primaryService}`,
      body: `${tonePrefix} in ${profile.serviceArea}, ${profile.businessName} is your local team for ${servicesLine}. ${offerLine} ${differentiatorLine}`,
      callToAction: `Message us or call ${profile.phone} to get on the schedule${profile.websiteUrl ? `, or visit ${profile.websiteUrl}` : ""}.`,
      hashtags: [profile.businessName, profile.serviceArea, primaryService, profile.businessType].map(buildHashtag).filter(Boolean).slice(0, 5),
    },
    {
      headline: `Local ${profile.businessType.toLowerCase()} advice from ${profile.businessName}`,
      body: `Quick homeowner tip for ${profile.serviceArea}: small issues with ${primaryService} can turn into expensive repairs when ignored. ${profile.businessName} helps local customers fix problems early and keep things running right. ${audienceLine}`,
      callToAction: `Need someone to take a look? Call ${profile.phone}${profile.websiteUrl ? ` or book at ${profile.websiteUrl}` : ""}.`,
      hashtags: [profile.businessName, profile.serviceArea, "homeowner tips", primaryService].map(buildHashtag).filter(Boolean).slice(0, 5),
    },
    {
      headline: `Why ${profile.serviceArea} customers choose ${profile.businessName}`,
      body: `${profile.businessName} handles ${servicesLine} for customers across ${profile.serviceArea}. ${differentiatorLine} We build posts like this around the real reasons customers keep referring us.`,
      callToAction: `If you need help with ${secondaryService}, call ${profile.phone}${profile.websiteUrl ? ` or visit ${profile.websiteUrl}` : ""}.`,
      hashtags: [profile.businessName, profile.serviceArea, secondaryService, "local business"].map(buildHashtag).filter(Boolean).slice(0, 5),
    },
    {
      headline: `${profile.businessName} is booking jobs across ${profile.serviceArea}`,
      body: `If you need ${servicesLine} in ${profile.serviceArea}, ${profile.businessName} is ready to help. ${offerLine} ${audienceLine}`,
      callToAction: `Call ${profile.phone} today to get a quote${profile.websiteUrl ? ` or learn more at ${profile.websiteUrl}` : ""}.`,
      hashtags: [profile.businessName, profile.serviceArea, servicesLine, "book now"].map(buildHashtag).filter(Boolean).slice(0, 5),
    },
  ];

  return {
    drafts: concepts.slice(0, safeCount),
    fallbackUsed: true,
  };
}
