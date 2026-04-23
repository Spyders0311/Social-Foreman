import { NextResponse } from "next/server";
import { createServerClient } from "../../../../src/lib/supabase-server";
import { fetchCustomerFacebookConnection } from "../../../../src/lib/customer-store";
import { getStripeClient } from "../../../../src/lib/stripe";

export async function POST(request: Request) {
  const origin = new URL(request.url).origin;

  // Accept lookup params from request body (legacy onboarding-link flow)
  let body: Record<string, string> = {};
  try { body = await request.json(); } catch { /* no body */ }

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Require either a logged-in session OR a legacy lookup param
  const hasLegacyParam = body.onboardingId || body.stripeCustomerId || body.stripeSubscriptionId || body.customerEmail;
  if (!user?.email && !hasLegacyParam) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const record = await fetchCustomerFacebookConnection(
    user?.email
      ? { customerEmail: user.email }
      : body.onboardingId
        ? { onboardingId: body.onboardingId }
        : body.stripeCustomerId
          ? { stripeCustomerId: body.stripeCustomerId }
          : body.stripeSubscriptionId
            ? { stripeSubscriptionId: body.stripeSubscriptionId }
            : { customerEmail: body.customerEmail }
  ).catch(() => null);

  if (!record?.stripe_customer_id) {
    return NextResponse.json({ error: "No Stripe customer found" }, { status: 404 });
  }

  const stripe = getStripeClient();
  const session = await stripe.billingPortal.sessions.create({
    customer: record.stripe_customer_id,
    return_url: `${origin}/dashboard`,
  });

  return NextResponse.json({ url: session.url });
}
