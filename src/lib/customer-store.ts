import { getSupabaseAdmin } from "./supabase";
import type { OnboardingRecord } from "./onboarding";
import type { BusinessProfileDraft, BusinessProfileInput } from "./business-profile";

export type FacebookSelectionInput = {
  pageId?: string | null;
  pageName?: string | null;
  pageAccessToken?: string | null;
};

export type CustomerFacebookRecord = {
  id: string;
  stripe_event_id?: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  customer_email: string | null;
  customer_name: string | null;
  onboarding_status: string;
  business_name: string | null;
  business_type: string | null;
  service_area: string | null;
  primary_services: string[] | null;
  contact_phone: string | null;
  website_url: string | null;
  facebook_page_url: string | null;
  offer_summary: string | null;
  differentiators: string | null;
  brand_tone: string | null;
  audience_notes: string | null;
  business_profile_completed_at: string | null;
  first_post_draft_headline: string | null;
  first_post_draft_body: string | null;
  first_post_draft_call_to_action: string | null;
  first_post_draft_hashtags: string[] | null;
  first_post_draft_generated_at: string | null;
  draft_batch_json: string | null;
  draft_batch_generated_at: string | null;
  draft_generation_method: string | null;
  facebook_user_id: string | null;
  facebook_user_name: string | null;
  facebook_page_count: number | null;
  facebook_selected_page_id: string | null;
  facebook_selected_page_name: string | null;
  facebook_page_access_token: string | null;
  facebook_page_selected_at: string | null;
  facebook_connected_at: string | null;
  facebook_long_lived_user_access_token?: string | null;
  facebook_long_lived_user_token_expires_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type CustomerLookupInput = {
  onboardingId?: string | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  customerEmail?: string | null;
};

const customerSelectFields =
  "id, stripe_event_id, stripe_customer_id, stripe_subscription_id, customer_email, customer_name, onboarding_status, business_name, business_type, service_area, primary_services, contact_phone, website_url, facebook_page_url, offer_summary, differentiators, brand_tone, audience_notes, business_profile_completed_at, first_post_draft_headline, first_post_draft_body, first_post_draft_call_to_action, first_post_draft_hashtags, first_post_draft_generated_at, draft_batch_json, draft_batch_generated_at, draft_generation_method, facebook_user_id, facebook_user_name, facebook_page_count, facebook_selected_page_id, facebook_selected_page_name, facebook_page_access_token, facebook_page_selected_at, facebook_connected_at, facebook_long_lived_user_access_token, facebook_long_lived_user_token_expires_at, created_at, updated_at";

function normalizeLookupInput(input: CustomerLookupInput) {
  return {
    onboardingId: input.onboardingId?.trim() || null,
    stripeCustomerId: input.stripeCustomerId?.trim() || null,
    stripeSubscriptionId: input.stripeSubscriptionId?.trim() || null,
    customerEmail: input.customerEmail?.trim().toLowerCase() || null,
  };
}

async function findCustomerOnboardingRecord(input: CustomerLookupInput) {
  const supabase = getSupabaseAdmin();
  const normalized = normalizeLookupInput(input);

  if (normalized.onboardingId) {
    const { data, error } = await supabase
      .from("customer_onboarding")
      .select(customerSelectFields)
      .eq("id", normalized.onboardingId)
      .limit(1)
      .maybeSingle<CustomerFacebookRecord>();

    if (error) {
      throw new Error(`Supabase onboarding lookup failed: ${error.message}`);
    }

    if (data) {
      return data;
    }
  }

  let query = supabase
    .from("customer_onboarding")
    .select(customerSelectFields)
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(5);

  if (normalized.stripeSubscriptionId) {
    query = query.eq("stripe_subscription_id", normalized.stripeSubscriptionId);
  } else if (normalized.stripeCustomerId) {
    query = query.eq("stripe_customer_id", normalized.stripeCustomerId);
  } else if (normalized.customerEmail) {
    query = query.eq("customer_email", normalized.customerEmail);
  } else {
    return null;
  }

  const { data, error } = await query.returns<CustomerFacebookRecord[]>();

  if (error) {
    throw new Error(`Supabase onboarding lookup failed: ${error.message}`);
  }

  return data?.[0] ?? null;
}

export async function upsertStripeOnboarding(record: OnboardingRecord) {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("customer_onboarding")
    .upsert(
      {
        stripe_event_id: record.stripeEventId,
        stripe_customer_id: record.customerId,
        stripe_subscription_id: record.subscriptionId,
        customer_email: record.customerEmail,
        customer_name: record.customerName,
        onboarding_status: record.status,
      },
      { onConflict: "stripe_event_id" },
    )
    .select("id, stripe_customer_id, stripe_subscription_id, customer_email")
    .single<{
      id: string;
      stripe_customer_id: string | null;
      stripe_subscription_id: string | null;
      customer_email: string | null;
    }>();

  if (error) {
    throw new Error(`Supabase onboarding upsert failed: ${error.message}`);
  }

  return data;
}

export async function attachFacebookConnection(input: {
  onboardingId?: string | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  customerEmail?: string | null;
  facebookUserId?: string | null;
  facebookUserName?: string | null;
  facebookPageCount?: number;
  facebookLongLivedUserAccessToken?: string | null;
  facebookLongLivedUserTokenExpiresAt?: string | null;
  selectedPage?: FacebookSelectionInput | null;
}) {
  const supabase = getSupabaseAdmin();
  const hasSelectedPage = Boolean(input.selectedPage?.pageId);
  const timestamp = new Date().toISOString();
  const targetRecord = await findCustomerOnboardingRecord(input);

  if (!targetRecord?.id) {
    const safeLabel = input.onboardingId ?? input.stripeSubscriptionId ?? input.stripeCustomerId ?? input.customerEmail ?? "unknown customer";
    throw new Error(`No onboarding record found for ${safeLabel}`);
  }

  const { error } = await supabase
    .from("customer_onboarding")
    .update({
      facebook_user_id: input.facebookUserId ?? null,
      facebook_user_name: input.facebookUserName ?? null,
      facebook_page_count: input.facebookPageCount ?? 0,
      facebook_connected_at: timestamp,
      facebook_long_lived_user_access_token: input.facebookLongLivedUserAccessToken ?? null,
      facebook_long_lived_user_token_expires_at: input.facebookLongLivedUserTokenExpiresAt ?? null,
      facebook_selected_page_id: input.selectedPage?.pageId ?? null,
      facebook_selected_page_name: input.selectedPage?.pageName ?? null,
      facebook_page_access_token: input.selectedPage?.pageAccessToken ?? null,
      facebook_page_selected_at: hasSelectedPage ? timestamp : null,
      onboarding_status: hasSelectedPage
        ? "facebook-page-linked"
        : input.facebookPageCount && input.facebookPageCount > 0
          ? "facebook-connected"
          : "facebook-connected-no-pages",
    })
    .eq("id", targetRecord.id);

  if (error) {
    throw new Error(`Supabase Facebook update failed: ${error.message}`);
  }

  return targetRecord;
}

export async function fetchCustomerFacebookConnection(input: CustomerLookupInput) {
  return findCustomerOnboardingRecord(input);
}

export async function saveBusinessProfile(input: {
  onboardingId?: string | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  customerEmail?: string | null;
  profile: BusinessProfileInput;
  firstPostDraft: BusinessProfileDraft;
  draftBatch?: BusinessProfileDraft[];
  draftGenerationMethod?: string;
}) {
  const supabase = getSupabaseAdmin();
  const targetRecord = await findCustomerOnboardingRecord(input);

  if (!targetRecord?.id) {
    const safeLabel = input.onboardingId ?? input.stripeSubscriptionId ?? input.stripeCustomerId ?? input.customerEmail ?? "unknown customer";
    throw new Error(`No onboarding record found for ${safeLabel}`);
  }

  const timestamp = new Date().toISOString();
  const batch = input.draftBatch?.length ? input.draftBatch : [input.firstPostDraft];
  const { data, error } = await supabase
    .from("customer_onboarding")
    .update({
      business_name: input.profile.businessName,
      business_type: input.profile.businessType,
      service_area: input.profile.serviceArea,
      primary_services: input.profile.primaryServices,
      contact_phone: input.profile.phone,
      website_url: input.profile.websiteUrl || null,
      facebook_page_url: input.profile.facebookPageUrl || null,
      offer_summary: input.profile.offerSummary || null,
      differentiators: input.profile.differentiators || null,
      brand_tone: input.profile.tone,
      audience_notes: input.profile.audienceNotes || null,
      business_profile_completed_at: timestamp,
      first_post_draft_headline: input.firstPostDraft.headline,
      first_post_draft_body: input.firstPostDraft.body,
      first_post_draft_call_to_action: input.firstPostDraft.callToAction,
      first_post_draft_hashtags: input.firstPostDraft.hashtags,
      first_post_draft_generated_at: timestamp,
      draft_batch_json: JSON.stringify(batch),
      draft_batch_generated_at: timestamp,
      draft_generation_method: input.draftGenerationMethod ?? "rule-based-fallback",
      onboarding_status: targetRecord.facebook_selected_page_id ? "ready-for-first-post" : "business-profile-complete",
    })
    .eq("id", targetRecord.id)
    .select(customerSelectFields)
    .single<CustomerFacebookRecord>();

  if (error) {
    throw new Error(`Supabase business profile update failed: ${error.message}`);
  }

  return data;
}

export async function saveFacebookPageSelection(input: {
  onboardingId?: string | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  customerEmail?: string | null;
  selectedPage: {
    pageId: string;
    pageName: string;
    pageAccessToken: string;
  };
}) {
  const supabase = getSupabaseAdmin();
  const targetRecord = await findCustomerOnboardingRecord(input);

  if (!targetRecord?.id) {
    const safeLabel = input.onboardingId ?? input.stripeSubscriptionId ?? input.stripeCustomerId ?? input.customerEmail ?? "unknown customer";
    throw new Error(`No onboarding record found for ${safeLabel}`);
  }

  const timestamp = new Date().toISOString();
  const { data, error } = await supabase
    .from("customer_onboarding")
    .update({
      facebook_selected_page_id: input.selectedPage.pageId,
      facebook_selected_page_name: input.selectedPage.pageName,
      facebook_page_access_token: input.selectedPage.pageAccessToken,
      facebook_page_selected_at: timestamp,
      onboarding_status: "facebook-page-linked",
    })
    .eq("id", targetRecord.id)
    .select(customerSelectFields)
    .single<CustomerFacebookRecord>();

  if (error) {
    throw new Error(`Supabase Facebook page selection update failed: ${error.message}`);
  }

  return data;
}
