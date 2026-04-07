import { attachFacebookConnection } from "../../../../src/lib/customer-store";
import {
  exchangeFacebookCodeForToken,
  exchangeForLongLivedFacebookToken,
  fetchFacebookPages,
  fetchFacebookProfile,
} from "../../../../src/lib/facebook";

export const runtime = "nodejs";

function getOrigin(request: Request) {
  const requestUrl = new URL(request.url);
  return `${requestUrl.protocol}//${requestUrl.host}`;
}

function buildSuccessRedirect(origin: string, params: Record<string, string | null | undefined>) {
  const redirectParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      redirectParams.set(key, value);
    }
  }

  return `${origin}/success?${redirectParams.toString()}`;
}

function buildExpiresAt(expiresIn: number | null) {
  if (!expiresIn) {
    return null;
  }

  return new Date(Date.now() + expiresIn * 1000).toISOString();
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const error = requestUrl.searchParams.get("error");
  const origin = getOrigin(request);
  const encodedState = requestUrl.searchParams.get("state");

  let linkTarget: {
    onboardingId?: string | null;
    stripeCustomerId?: string | null;
    stripeSubscriptionId?: string | null;
    customerEmail?: string | null;
  } = {};

  if (encodedState) {
    try {
      const parsed = JSON.parse(Buffer.from(encodedState, "base64url").toString("utf8")) as {
        onboardingId?: string | null;
        stripeCustomerId?: string | null;
        stripeSubscriptionId?: string | null;
        email?: string | null;
      };
      linkTarget = {
        onboardingId: parsed.onboardingId ?? null,
        stripeCustomerId: parsed.stripeCustomerId ?? null,
        stripeSubscriptionId: parsed.stripeSubscriptionId ?? null,
        customerEmail: parsed.email ?? null,
      };
    } catch {
      linkTarget = {};
    }
  }

  const baseRedirectParams = {
    checkout: requestUrl.searchParams.get("checkout") ?? "success",
    session_id: requestUrl.searchParams.get("session_id"),
    onboardingId: linkTarget.onboardingId ?? null,
    stripeCustomerId: linkTarget.stripeCustomerId ?? null,
    stripeSubscriptionId: linkTarget.stripeSubscriptionId ?? null,
    email: linkTarget.customerEmail ?? null,
  };

  if (error) {
    return Response.redirect(buildSuccessRedirect(origin, { ...baseRedirectParams, facebook: "error" }), 302);
  }

  if (!code) {
    return Response.redirect(
      buildSuccessRedirect(origin, { ...baseRedirectParams, facebook: "missing_code" }),
      302,
    );
  }

  try {
    const shortLivedToken = await exchangeFacebookCodeForToken(origin, code);
    const longLivedToken = await exchangeForLongLivedFacebookToken(shortLivedToken.accessToken);
    const profile = await fetchFacebookProfile(longLivedToken.accessToken);

    try {
      const pages = await fetchFacebookPages(longLivedToken.accessToken);
      const pageCount = String(pages.length);
      const selectedPage = pages.length === 1
        ? {
            pageId: pages[0].id,
            pageName: pages[0].name,
            pageAccessToken: pages[0].accessToken,
          }
        : null;

      const targetRecord = await attachFacebookConnection({
        ...linkTarget,
        facebookUserId: profile.id,
        facebookUserName: profile.name,
        facebookPageCount: pages.length,
        facebookLongLivedUserAccessToken: longLivedToken.accessToken,
        facebookLongLivedUserTokenExpiresAt: buildExpiresAt(longLivedToken.expiresIn),
        selectedPage,
      });

      console.log("Facebook token exchange succeeded", {
        onboardingId: targetRecord.id,
        facebookUserId: profile.id,
        facebookUserName: profile.name,
        pageCount: pages.length,
        selectedPageId: selectedPage?.pageId ?? null,
      });

      return Response.redirect(
        buildSuccessRedirect(origin, {
          ...baseRedirectParams,
          onboardingId: targetRecord.id,
          stripeCustomerId: targetRecord.stripe_customer_id,
          stripeSubscriptionId: targetRecord.stripe_subscription_id,
          email: targetRecord.customer_email,
          facebook: selectedPage ? "page_linked" : pages.length > 1 ? "select_page" : "connected",
          pages: pageCount,
          selectedPageId: selectedPage?.pageId ?? null,
          selectedPageName: selectedPage?.pageName ?? null,
        }),
        302,
      );
    } catch (pageError) {
      console.log("Facebook login succeeded but page fetch failed", {
        facebookUserId: profile.id,
        reason: pageError instanceof Error ? pageError.message : "Unknown error",
      });

      const targetRecord = await attachFacebookConnection({
        ...linkTarget,
        facebookUserId: profile.id,
        facebookUserName: profile.name,
        facebookPageCount: 0,
        facebookLongLivedUserAccessToken: longLivedToken.accessToken,
        facebookLongLivedUserTokenExpiresAt: buildExpiresAt(longLivedToken.expiresIn),
      });

      return Response.redirect(
        buildSuccessRedirect(origin, {
          ...baseRedirectParams,
          onboardingId: targetRecord.id,
          stripeCustomerId: targetRecord.stripe_customer_id,
          stripeSubscriptionId: targetRecord.stripe_subscription_id,
          email: targetRecord.customer_email,
          facebook: "connected_no_pages",
        }),
        302,
      );
    }
  } catch (exchangeError) {
    console.log("Facebook token exchange failed", {
      reason: exchangeError instanceof Error ? exchangeError.message : "Unknown error",
    });

    return Response.redirect(
      buildSuccessRedirect(origin, { ...baseRedirectParams, facebook: "token_error" }),
      302,
    );
  }
}
