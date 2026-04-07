import { getSupabaseAdmin } from "./supabase";
import type { OnboardingRecord } from "./onboarding";

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
}) {
  const supabase = getSupabaseAdmin();

  if (!input.customerEmail) {
    return;
  }

  const { error } = await supabase
    .from("customer_onboarding")
    .update({
      facebook_user_id: input.facebookUserId ?? null,
      facebook_user_name: input.facebookUserName ?? null,
      facebook_page_count: input.facebookPageCount ?? 0,
      facebook_connected_at: new Date().toISOString(),
      onboarding_status: input.facebookPageCount && input.facebookPageCount > 0
        ? "facebook-connected"
        : "facebook-connected-no-pages",
    })
    .eq("customer_email", input.customerEmail);

  if (error) {
    throw new Error(`Supabase Facebook update failed: ${error.message}`);
  }
}
