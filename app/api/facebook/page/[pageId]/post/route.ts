import { fetchCustomerFacebookConnection } from "../../../../../../src/lib/customer-store";
import { fetchFacebookPages, publishFacebookPagePost } from "../../../../../../src/lib/facebook";

export const runtime = "nodejs";

function getOrigin(request: Request) {
  const requestUrl = new URL(request.url);
  return `${requestUrl.protocol}//${requestUrl.host}`;
}

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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ pageId: string }> },
) {
  const { pageId } = await params;
  const origin = getOrigin(request);

  try {
    const contentType = request.headers.get("content-type") ?? "";
    let onboardingId = "";
    let stripeCustomerId = "";
    let stripeSubscriptionId = "";
    let customerEmail = "";
    let message = "";

    if (contentType.includes("application/json")) {
      const body = (await request.json()) as {
        onboardingId?: string;
        stripeCustomerId?: string;
        stripeSubscriptionId?: string;
        customerEmail?: string;
        message?: string;
      };
      onboardingId = body.onboardingId ?? "";
      stripeCustomerId = body.stripeCustomerId ?? "";
      stripeSubscriptionId = body.stripeSubscriptionId ?? "";
      customerEmail = body.customerEmail ?? "";
      message = body.message?.trim() ?? "";
    } else {
      const formData = await request.formData();
      onboardingId = String(formData.get("onboardingId") ?? "").trim();
      stripeCustomerId = String(formData.get("stripeCustomerId") ?? "").trim();
      stripeSubscriptionId = String(formData.get("stripeSubscriptionId") ?? "").trim();
      customerEmail = String(formData.get("customerEmail") ?? "").trim();
      message = String(formData.get("message") ?? "").trim();
    }

    if (!message) {
      if (contentType.includes("application/json")) {
        return Response.json({ error: "Post message is required." }, { status: 400 });
      }
      const params = new URLSearchParams({ onboardingId, pageId, error: "empty_message" });
      return Response.redirect(`${origin}/dashboard?${params}`, 303);
    }

    const record = await fetchCustomerFacebookConnection({
      onboardingId: onboardingId || undefined,
      stripeCustomerId: stripeCustomerId || undefined,
      stripeSubscriptionId: stripeSubscriptionId || undefined,
      customerEmail: customerEmail || undefined,
    });

    if (!record) {
      if (contentType.includes("application/json")) {
        return Response.json({ error: "No onboarding record found." }, { status: 404 });
      }
      const redirectParams = new URLSearchParams({ onboardingId, pageId, error: "no_record" });
      return Response.redirect(`${origin}/dashboard?${redirectParams}`, 303);
    }

    if (!record.facebook_long_lived_user_access_token) {
      if (contentType.includes("application/json")) {
        return Response.json({ error: "Facebook not connected or token expired." }, { status: 409 });
      }
      const redirectParams = new URLSearchParams({ onboardingId: record.id, pageId, error: "token_expired" });
      return Response.redirect(`${origin}/dashboard?${redirectParams}`, 303);
    }

    const pageAccessToken = await resolvePageAccessToken(
      record.facebook_long_lived_user_access_token,
      record.facebook_selected_page_id,
      record.facebook_page_access_token,
      pageId,
    );

    if (!pageAccessToken) {
      if (contentType.includes("application/json")) {
        return Response.json({ error: "Page not found or no access token." }, { status: 404 });
      }
      const redirectParams = new URLSearchParams({ onboardingId: record.id, pageId, error: "no_page_token" });
      return Response.redirect(`${origin}/dashboard?${redirectParams}`, 303);
    }

    const postId = await publishFacebookPagePost({ pageId, pageAccessToken, message });

    if (contentType.includes("application/json")) {
      return Response.json({ ok: true, postId, pageId });
    }

    const redirectParams = new URLSearchParams({ onboardingId: record.id, pageId, posted: "success" });
    return Response.redirect(`${origin}/dashboard?${redirectParams}`, 303);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error.";
    if (request.headers.get("content-type")?.includes("application/json")) {
      return Response.json({ error: message }, { status: 500 });
    }
    const url = new URL(request.url);
    const onboardingId = url.searchParams.get("onboardingId") ?? "";
    const redirectParams = new URLSearchParams({ onboardingId, pageId, error: "publish_failed" });
    return Response.redirect(`${origin}/dashboard?${redirectParams}`, 303);
  }
}
