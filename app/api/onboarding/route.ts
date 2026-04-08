import { NextResponse } from "next/server";
import {
  generateFirstPostDraft,
  normalizeBusinessProfileInput,
  validateBusinessProfile,
} from "../../../src/lib/business-profile";
import { fetchCustomerFacebookConnection, saveBusinessProfile } from "../../../src/lib/customer-store";

function buildSuccessUrl(requestUrl: URL, params: Record<string, string>) {
  const successUrl = new URL("/success", requestUrl.origin);

  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      successUrl.searchParams.set(key, value);
    }
  });

  return successUrl;
}

function getFormString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "");
}

export async function POST(request: Request) {
  const requestUrl = new URL(request.url);
  const formData = await request.formData();

  const onboardingId = String(formData.get("onboardingId") ?? "").trim() || null;
  const stripeCustomerId = String(formData.get("stripeCustomerId") ?? "").trim() || null;
  const stripeSubscriptionId = String(formData.get("stripeSubscriptionId") ?? "").trim() || null;
  const customerEmail = String(formData.get("customerEmail") ?? "").trim().toLowerCase() || null;

  const record = await fetchCustomerFacebookConnection({
    onboardingId,
    stripeCustomerId,
    stripeSubscriptionId,
    customerEmail,
  });

  if (!record) {
    return NextResponse.redirect(
      buildSuccessUrl(requestUrl, {
        onboarding: "missing_record",
      }),
      { status: 303 },
    );
  }

  const profile = normalizeBusinessProfileInput({
    businessName: getFormString(formData, "businessName"),
    businessType: getFormString(formData, "businessType"),
    serviceArea: getFormString(formData, "serviceArea"),
    primaryServices: getFormString(formData, "primaryServices"),
    phone: getFormString(formData, "phone"),
    websiteUrl: getFormString(formData, "websiteUrl"),
    facebookPageUrl: getFormString(formData, "facebookPageUrl"),
    offerSummary: getFormString(formData, "offerSummary"),
    differentiators: getFormString(formData, "differentiators"),
    tone: getFormString(formData, "tone"),
    audienceNotes: getFormString(formData, "audienceNotes"),
  });

  const validation = validateBusinessProfile(profile);

  if (!validation.valid) {
    return NextResponse.redirect(
      buildSuccessUrl(requestUrl, {
        onboarding: "invalid",
        missing: validation.missing.join(", "),
        onboardingId: record.id,
        stripeCustomerId: record.stripe_customer_id ?? "",
        stripeSubscriptionId: record.stripe_subscription_id ?? "",
        email: record.customer_email ?? "",
      }),
      { status: 303 },
    );
  }

  const draft = generateFirstPostDraft(profile);

  await saveBusinessProfile({
    onboardingId: record.id,
    profile,
    firstPostDraft: draft,
  });

  return NextResponse.redirect(
    buildSuccessUrl(requestUrl, {
      onboarding: "saved",
      onboardingId: record.id,
      stripeCustomerId: record.stripe_customer_id ?? "",
      stripeSubscriptionId: record.stripe_subscription_id ?? "",
      email: record.customer_email ?? "",
    }),
    { status: 303 },
  );
}
