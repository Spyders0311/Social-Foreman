import { getSupabaseAdmin } from "./supabase";
import type { OnboardingRecord } from "./onboarding";

export type FacebookSelectionInput = {
  pageId?: string | null;
  pageName?: string | null;
  pageAccessToken?: string | null;
};

export type CustomerFacebookRecord = {
  customer_email: string | null;
  customer_name: string | null;
  onboarding_status: string;
  facebook_user_id: string | null;
  facebook_user_name: string | null;
  facebook_page_count: number | null;
  facebook_selected_page_id: string | null;
  facebook_selected_page_name: string | null;
  facebook_page_access_token: string | null;
  facebook_page_selected_at: string | null;
  facebook_connected_at: string | null;
};

export async function upsertStripeOnboarding(record: OnboardingRecord) {
  const supabase = getSupabaseAdmin();

  const { error } = await supabase.from("customer_onboarding").upsert(
    {
      stripe_event_id: record.stripeEventId,
      stripe_customer_id: record.customerId,
      stripe_subscription_id: record.subscriptionId,
      customer_email: record.customerEmail,
      customer_name: record.customerName,
      onboarding_status: record.status,
    },
    { onConflict: "stripe_event_id" },
  );

  if (error) {
    throw new Error(`Supabase onboarding upsert failed: ${error.message}`);
  }
}

export async function attachFacebookConnection(input: {
  customerEmail?: string | null;
  facebookUserId?: string | null;
  facebookUserName?: string | null;
  facebookPageCount?: number;
  selectedPage?: FacebookSelectionInput | null;
}) {
  const supabase = getSupabaseAdmin();

  if (!input.customerEmail) {
    return;
  }

  const hasSelectedPage = Boolean(input.selectedPage?.pageId);
  const timestamp = new Date().toISOString();

  const { data: latestRecord, error: lookupError } = await supabase
    .from("customer_onboarding")
    .select("id")
    .eq("customer_email", input.customerEmail)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string }>();

  if (lookupError) {
    throw new Error(`Supabase Facebook lookup failed: ${lookupError.message}`);
  }

  if (!latestRecord?.id) {
    throw new Error(`No onboarding record found for ${input.customerEmail}`);
  }

  const { error } = await supabase
    .from("customer_onboarding")
    .update({
      facebook_user_id: input.facebookUserId ?? null,
      facebook_user_name: input.facebookUserName ?? null,
      facebook_page_count: input.facebookPageCount ?? 0,
      facebook_connected_at: timestamp,
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
    .eq("id", latestRecord.id);

  if (error) {
    throw new Error(`Supabase Facebook update failed: ${error.message}`);
  }
}

export async function fetchCustomerFacebookConnection(customerEmail: string) {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("customer_onboarding")
    .select(
      "customer_email, customer_name, onboarding_status, facebook_user_id, facebook_user_name, facebook_page_count, facebook_selected_page_id, facebook_selected_page_name, facebook_page_access_token, facebook_page_selected_at, facebook_connected_at",
    )
    .eq("customer_email", customerEmail)
    .maybeSingle<CustomerFacebookRecord>();

  if (error) {
    throw new Error(`Supabase Facebook lookup failed: ${error.message}`);
  }

  return data ?? null;
}
