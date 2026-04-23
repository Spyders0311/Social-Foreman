import { fetchCustomerFacebookConnection } from "../../../../../../src/lib/customer-store";
import { fetchFacebookPagePosts, fetchFacebookPages } from "../../../../../../src/lib/facebook";

export const runtime = "nodejs";

async function resolvePageAccessToken(
  userToken: string,
  storedPageId: string | null,
  storedPageToken: string | null,
  requestedPageId: string,
): Promise<string | null> {
  if (storedPageId === requestedPageId && storedPageToken) {
    return storedPageToken;
  }

  const pages = await fetchFacebookPages(userToken);
  const match = pages.find((p) => p.id === requestedPageId);
  return match?.accessToken ?? null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ pageId: string }> },
) {
  const { pageId } = await params;
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

    const pageAccessToken = await resolvePageAccessToken(
      record.facebook_long_lived_user_access_token,
      record.facebook_selected_page_id,
      record.facebook_page_access_token,
      pageId,
    );

    if (!pageAccessToken) {
      return Response.json({ error: "Page not found or no access token." }, { status: 404 });
    }

    const posts = await fetchFacebookPagePosts(pageId, pageAccessToken);

    return Response.json({ posts });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error.";
    return Response.json({ error: message }, { status: 500 });
  }
}
