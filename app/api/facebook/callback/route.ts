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
    const accessToken = await exchangeFacebookCodeForToken(origin, code, customerEmail);
    const profile = await fetchFacebookProfile(accessToken);

    try {
      const pages = await fetchFacebookPages(accessToken);
      const pageCount = String(pages.length);
      const selectedPage = pages.length === 1
        ? {
            pageId: pages[0].id,
            pageName: pages[0].name,
            pageAccessToken: pages[0].accessToken,
          }
        : null;

      await attachFacebookConnection({
        customerEmail,
        facebookUserId: profile.id,
        facebookUserName: profile.name,
        facebookPageCount: pages.length,
        selectedPage,
      });

      console.log("Facebook token exchange succeeded", {
        facebookUserId: profile.id,
        facebookUserName: profile.name,
        pageCount: pages.length,
        selectedPageId: selectedPage?.pageId ?? null,
      });

      const redirectParams = new URLSearchParams({
        facebook: selectedPage ? "page_linked" : "connected",
        pages: pageCount,
      });

      if (selectedPage?.pageId) {
        redirectParams.set("selectedPageId", selectedPage.pageId);
      }

      if (selectedPage?.pageName) {
        redirectParams.set("selectedPageName", selectedPage.pageName);
      }

      return Response.redirect(`${origin}/success?${redirectParams.toString()}`, 302);
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
