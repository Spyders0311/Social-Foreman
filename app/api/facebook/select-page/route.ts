import { fetchCustomerFacebookConnection, saveFacebookPageSelection } from "../../../../src/lib/customer-store";
import { fetchFacebookPages } from "../../../../src/lib/facebook";

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

export async function POST(request: Request) {
  const origin = getOrigin(request);

  try {
    const formData = await request.formData();
    const onboardingId = String(formData.get("onboardingId") ?? "").trim() || null;
    const stripeCustomerId = String(formData.get("stripeCustomerId") ?? "").trim() || null;
    const stripeSubscriptionId = String(formData.get("stripeSubscriptionId") ?? "").trim() || null;
    const customerEmail = String(formData.get("customerEmail") ?? "").trim().toLowerCase() || null;
    const pageId = String(formData.get("pageId") ?? "").trim();

    const record = await fetchCustomerFacebookConnection({
      onboardingId,
      stripeCustomerId,
      stripeSubscriptionId,
      customerEmail,
    });

    if (!record?.id) {
      return Response.redirect(
        buildSuccessRedirect(origin, {
          checkout: "success",
          facebook: "selection_error",
          onboardingId,
          stripeCustomerId,
          stripeSubscriptionId,
          email: customerEmail,
        }),
        303,
      );
    }

    if (!record.facebook_long_lived_user_access_token) {
      return Response.redirect(
        buildSuccessRedirect(origin, {
          checkout: "success",
          facebook: "selection_expired",
          onboardingId: record.id,
          stripeCustomerId: record.stripe_customer_id,
          stripeSubscriptionId: record.stripe_subscription_id,
          email: record.customer_email,
        }),
        303,
      );
    }

    const pages = await fetchFacebookPages(record.facebook_long_lived_user_access_token);
    const selectedPage = pages.find((page) => page.id === pageId && page.accessToken);

    if (!selectedPage?.accessToken) {
      return Response.redirect(
        buildSuccessRedirect(origin, {
          checkout: "success",
          facebook: "selection_invalid",
          onboardingId: record.id,
          stripeCustomerId: record.stripe_customer_id,
          stripeSubscriptionId: record.stripe_subscription_id,
          email: record.customer_email,
          pages: record.facebook_page_count != null ? String(record.facebook_page_count) : null,
        }),
        303,
      );
    }

    const updatedRecord = await saveFacebookPageSelection({
      onboardingId: record.id,
      selectedPage: {
        pageId: selectedPage.id,
        pageName: selectedPage.name,
        pageAccessToken: selectedPage.accessToken,
      },
    });

    return Response.redirect(
      buildSuccessRedirect(origin, {
        checkout: "success",
        facebook: "page_linked",
        onboardingId: updatedRecord.id,
        stripeCustomerId: updatedRecord.stripe_customer_id,
        stripeSubscriptionId: updatedRecord.stripe_subscription_id,
        email: updatedRecord.customer_email,
        pages: updatedRecord.facebook_page_count != null ? String(updatedRecord.facebook_page_count) : null,
        selectedPageId: updatedRecord.facebook_selected_page_id,
        selectedPageName: updatedRecord.facebook_selected_page_name,
      }),
      303,
    );
  } catch (error) {
    console.log("Facebook page selection failed", {
      reason: error instanceof Error ? error.message : "Unknown error",
    });

    return Response.redirect(
      buildSuccessRedirect(origin, {
        checkout: "success",
        facebook: "selection_error",
      }),
      303,
    );
  }
}
