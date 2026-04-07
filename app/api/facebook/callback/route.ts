import { attachFacebookConnection } from "../../../../src/lib/customer-store";
import {
  exchangeFacebookCodeForToken,
  fetchFacebookPages,
  fetchFacebookProfile,
} from "../../../../src/lib/facebook";

export const runtime = "nodejs";

function getOrigin(request: Request) {
  const requestUrl = new URL(request.url);
  return `${requestUrl.protocol}//${requestUrl.host}`;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const error = requestUrl.searchParams.get("error");
  const origin = getOrigin(request);
  const customerEmail = requestUrl.searchParams.get("email");

  if (error) {
    return Response.redirect(`${origin}/success?facebook=error`, 302);
  }

  if (!code) {
    return Response.redirect(`${origin}/success?facebook=missing_code`, 302);
  }

  try {
    const accessToken = await exchangeFacebookCodeForToken(origin, code);
    const profile = await fetchFacebookProfile(accessToken);

    try {
      const pages = await fetchFacebookPages(accessToken);
      const pageCount = String(pages.length);

      await attachFacebookConnection({
        customerEmail,
        facebookUserId: profile.id,
        facebookUserName: profile.name,
        facebookPageCount: pages.length,
      });

      console.log("Facebook token exchange succeeded", {
        facebookUserId: profile.id,
        facebookUserName: profile.name,
        pageCount: pages.length,
      });

      return Response.redirect(`${origin}/success?facebook=connected&pages=${pageCount}`, 302);
    } catch (pageError) {
      console.log("Facebook login succeeded but page fetch failed", {
        facebookUserId: profile.id,
        reason: pageError instanceof Error ? pageError.message : "Unknown error",
      });

      await attachFacebookConnection({
        customerEmail,
        facebookUserId: profile.id,
        facebookUserName: profile.name,
        facebookPageCount: 0,
      });

      return Response.redirect(`${origin}/success?facebook=connected_no_pages`, 302);
    }
  } catch (exchangeError) {
    console.log("Facebook token exchange failed", {
      reason: exchangeError instanceof Error ? exchangeError.message : "Unknown error",
    });

    return Response.redirect(`${origin}/success?facebook=token_error`, 302);
  }
}
