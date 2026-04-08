import type Stripe from "stripe";
import {
  fetchCustomerFacebookConnection,
  type CustomerFacebookRecord,
  type CustomerLookupInput,
} from "./customer-store";
import { fetchCheckoutSession } from "./stripe";

export type SuccessPageContext = {
  checkoutStatus: string | null;
  facebookStatus: string | null;
  onboardingStatus: string | null;
  onboardingFlowStatus: string | null;
  pagesCount: string | null;
  selectedPageId: string | null;
  selectedPageName: string | null;
  onboardingId: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  customerEmail: string | null;
  customerName: string | null;
  planTier: string | null;
  planName: string | null;
  postsPerWeek: number | null;
  postingCadenceLabel: string | null;
  record: CustomerFacebookRecord | null;
  sessionId: string | null;
};

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function buildLookupInput(params?: Record<string, string | string[] | undefined>): CustomerLookupInput {
  return {
    onboardingId: getSingleParam(params?.onboardingId),
    stripeCustomerId: getSingleParam(params?.stripeCustomerId),
    stripeSubscriptionId: getSingleParam(params?.stripeSubscriptionId),
    customerEmail: getSingleParam(params?.email),
  };
}

function getCustomerId(session: Stripe.Checkout.Session) {
  if (typeof session.customer === "string") {
    return session.customer;
  }

  return session.customer?.id ?? null;
}

function getSubscriptionId(session: Stripe.Checkout.Session) {
  if (typeof session.subscription === "string") {
    return session.subscription;
  }

  return session.subscription?.id ?? null;
}

function getCustomerName(session: Stripe.Checkout.Session) {
  if (session.customer_details?.name) {
    return session.customer_details.name;
  }

  if (typeof session.customer !== "string" && session.customer && !session.customer.deleted) {
    return session.customer.name ?? null;
  }

  return null;
}

async function hydrateFromStripeSession(sessionId: string, current: CustomerLookupInput) {
  const session = await fetchCheckoutSession(sessionId);

  return {
    onboardingId: current.onboardingId ?? null,
    stripeCustomerId: current.stripeCustomerId ?? getCustomerId(session),
    stripeSubscriptionId: current.stripeSubscriptionId ?? getSubscriptionId(session),
    customerEmail:
      current.customerEmail ?? session.customer_details?.email ?? session.customer_email ?? null,
    customerName: getCustomerName(session),
  };
}

function getSessionMetadata(session: Stripe.Checkout.Session, key: string) {
  return session.metadata?.[key] ?? null;
}

export async function resolveSuccessPageContext(
  params?: Record<string, string | string[] | undefined>,
): Promise<SuccessPageContext> {
  const sessionId = getSingleParam(params?.session_id) ?? null;
  const initialLookup = buildLookupInput(params);

  let hydrated = {
    onboardingId: initialLookup.onboardingId ?? null,
    stripeCustomerId: initialLookup.stripeCustomerId ?? null,
    stripeSubscriptionId: initialLookup.stripeSubscriptionId ?? null,
    customerEmail: initialLookup.customerEmail?.trim().toLowerCase() ?? null,
    customerName: null as string | null,
  };

  let sessionPlanTier: string | null = null;
  let sessionPlanName: string | null = null;
  let sessionPostsPerWeek: number | null = null;
  let sessionPostingCadenceLabel: string | null = null;

  if (sessionId) {
    try {
      hydrated = await hydrateFromStripeSession(sessionId, initialLookup);
      hydrated.customerEmail = hydrated.customerEmail?.trim().toLowerCase() ?? null;
      const session = await fetchCheckoutSession(sessionId);
      sessionPlanTier = getSessionMetadata(session, "plan_tier");
      sessionPlanName = getSessionMetadata(session, "plan_name");
      sessionPostsPerWeek = Number(getSessionMetadata(session, "posts_per_week") ?? "") || null;
      sessionPostingCadenceLabel = getSessionMetadata(session, "posting_cadence_label");
    } catch (error) {
      console.log("Unable to hydrate success page from Stripe session", {
        sessionId,
        reason: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  const record = await fetchCustomerFacebookConnection({
    onboardingId: hydrated.onboardingId,
    stripeCustomerId: hydrated.stripeCustomerId,
    stripeSubscriptionId: hydrated.stripeSubscriptionId,
    customerEmail: hydrated.customerEmail,
  });

  const selectedPageId = record?.facebook_selected_page_id ?? getSingleParam(params?.selectedPageId) ?? null;
  const selectedPageName =
    record?.facebook_selected_page_name ?? getSingleParam(params?.selectedPageName) ?? null;
  const pagesCount =
    record?.facebook_page_count != null
      ? String(record.facebook_page_count)
      : getSingleParam(params?.pages) ?? null;

  let facebookStatus = getSingleParam(params?.facebook) ?? null;

  if (!facebookStatus && record) {
    if (record.facebook_selected_page_id) {
      facebookStatus = "page_linked";
    } else if ((record.facebook_page_count ?? 0) > 0) {
      facebookStatus = "connected";
    } else if (record.facebook_user_id) {
      facebookStatus = "connected_no_pages";
    }
  }

  return {
    checkoutStatus: getSingleParam(params?.checkout) ?? null,
    facebookStatus,
    onboardingStatus: record?.onboarding_status ?? null,
    onboardingFlowStatus: getSingleParam(params?.onboarding) ?? null,
    pagesCount,
    selectedPageId,
    selectedPageName,
    onboardingId: record?.id ?? hydrated.onboardingId,
    stripeCustomerId: record?.stripe_customer_id ?? hydrated.stripeCustomerId,
    stripeSubscriptionId: record?.stripe_subscription_id ?? hydrated.stripeSubscriptionId,
    customerEmail: record?.customer_email ?? hydrated.customerEmail,
    customerName: record?.customer_name ?? hydrated.customerName,
    planTier: record?.plan_tier ?? sessionPlanTier,
    planName: record?.plan_name ?? sessionPlanName,
    postsPerWeek: record?.posts_per_week ?? sessionPostsPerWeek,
    postingCadenceLabel: record?.posting_cadence_label ?? sessionPostingCadenceLabel,
    record,
    sessionId,
  };
}
