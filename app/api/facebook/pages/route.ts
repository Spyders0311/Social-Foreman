import { fetchCustomerFacebookConnection } from "../../../../src/lib/customer-store";
import { fetchFacebookPages } from "../../../../src/lib/facebook";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const onboardingId = url.searchParams.get("onboardingId") ?? undefined;
  const stripeCustomerId = url.searchParams.get("stripeCustomerId") ?? undefined;
  const stripeSubscriptionId = url.searchParams.get("stripeSubscriptionId") ?? undefined;
  const customerEmail = url.searchParams.get("email") ?? undefined;

  if (!onboardingId && !stripeCustomerId && !stripeSubscriptionId && !customerEmail) {
    return Response.json({ error: "Missing customer identifier." }, { status: 400 });
  }

  try {
    const record = await fetchCustomerFacebookConnection({
      onboardingId,
      stripeCustomerId,
      stripeSubscriptionId,
      customerEmail,
    });

    if (!record) {
      return Response.json({ error: "No onboarding record found." }, { status: 404 });
    }

    if (!record.facebook_long_lived_user_access_token) {
      return Response.json({ error: "Facebook not connected or token expired." }, { status: 409 });
    }

    const pages = await fetchFacebookPages(record.facebook_long_lived_user_access_token);

    return Response.json({ pages });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error.";
    return Response.json({ error: message }, { status: 500 });
  }
}
