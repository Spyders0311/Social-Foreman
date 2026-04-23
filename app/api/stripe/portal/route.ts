import { NextResponse } from "next/server";
import { createServerClient } from "../../../../src/lib/supabase-server";
import { fetchCustomerFacebookConnection } from "../../../../src/lib/customer-store";
import { getStripeClient } from "../../../../src/lib/stripe";

export async function POST(request: Request) {
  const origin = new URL(request.url).origin;

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const record = await fetchCustomerFacebookConnection({
    customerEmail: user.email,
  }).catch(() => null);

  if (!record?.stripe_customer_id) {
    return NextResponse.json({ error: "No Stripe customer found" }, { status: 404 });
  }

  const stripe = getStripeClient();
  const session = await stripe.billingPortal.sessions.create({
    customer: record.stripe_customer_id,
    return_url: `${origin}/dashboard`,
  });

  return NextResponse.redirect(session.url, { status: 303 });
}
