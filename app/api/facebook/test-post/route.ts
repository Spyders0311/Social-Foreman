import { fetchCustomerFacebookConnection } from "../../../../src/lib/customer-store";
import {
  getFacebookTestPostAllowedEmail,
  getFacebookTestPostSecret,
  publishFacebookPagePost,
} from "../../../../src/lib/facebook";

export const runtime = "nodejs";

const DEFAULT_TEST_POST_MESSAGE =
  "Social Foreman test post: Facebook page connection is live and server-side publishing is ready for verification.";

function respondHtml(status: "success" | "error", title: string, message: string, details?: string[]) {
  const detailItems = (details ?? [])
    .map((detail) => `<li>${detail.replaceAll("<", "&lt;").replaceAll(">", "&gt;")}</li>`)
    .join("");

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>
      body { margin: 0; font-family: ui-sans-serif, system-ui, sans-serif; background: #f7f5ef; color: #132027; }
      .wrap { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; }
      .card { width: 100%; max-width: 720px; background: white; border-radius: 24px; padding: 32px; box-shadow: 0 12px 30px rgba(19, 32, 39, 0.08); border: 1px solid #ded7c9; }
      .eyebrow { font-size: 12px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: ${status === "success" ? "#2f6b47" : "#9a4a2f"}; }
      h1 { margin: 12px 0 0; font-size: 32px; line-height: 1.15; }
      p { margin: 16px 0 0; font-size: 16px; line-height: 1.7; color: #405058; }
      ul { margin: 20px 0 0; padding-left: 22px; color: #2f3d43; line-height: 1.7; }
      a { display: inline-flex; margin-top: 24px; padding: 12px 18px; border-radius: 999px; background: #132027; color: #f8f2e8; text-decoration: none; font-weight: 700; }
      a:hover { background: #21414b; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="card">
        <div class="eyebrow">${status === "success" ? "Test post sent" : "Test post failed"}</div>
        <h1>${title}</h1>
        <p>${message}</p>
        ${detailItems ? `<ul>${detailItems}</ul>` : ""}
        <a href="javascript:history.back()">Back to Social Foreman</a>
      </div>
    </div>
  </body>
</html>`;

  return new Response(html, {
    status: status === "success" ? 200 : 400,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    let onboardingId = "";
    let stripeCustomerId = "";
    let stripeSubscriptionId = "";
    let customerEmail = "";
    let secret = "";
    let message = DEFAULT_TEST_POST_MESSAGE;

    if (contentType.includes("application/json")) {
      const body = (await request.json()) as {
        onboardingId?: string;
        stripeCustomerId?: string;
        stripeSubscriptionId?: string;
        customerEmail?: string;
        secret?: string;
        message?: string;
      };
      onboardingId = body.onboardingId ?? "";
      stripeCustomerId = body.stripeCustomerId ?? "";
      stripeSubscriptionId = body.stripeSubscriptionId ?? "";
      customerEmail = body.customerEmail ?? "";
      secret = body.secret ?? "";
      message = body.message?.trim() || DEFAULT_TEST_POST_MESSAGE;
    } else {
      const formData = await request.formData();
      onboardingId = String(formData.get("onboardingId") ?? "");
      stripeCustomerId = String(formData.get("stripeCustomerId") ?? "");
      stripeSubscriptionId = String(formData.get("stripeSubscriptionId") ?? "");
      customerEmail = String(formData.get("customerEmail") ?? "");
      secret = String(formData.get("secret") ?? "");
      message = String(formData.get("message") ?? "").trim() || DEFAULT_TEST_POST_MESSAGE;
    }

    const normalizedEmail = customerEmail.trim().toLowerCase();

    if (!onboardingId && !stripeCustomerId && !stripeSubscriptionId && !normalizedEmail) {
      const errorMessage = "Missing customer identifier.";
      return contentType.includes("application/json")
        ? Response.json({ error: errorMessage }, { status: 400 })
        : respondHtml("error", "We couldn’t find that customer record", "Try the success page again so the test form carries the right onboarding link.");
    }

    if (normalizedEmail && normalizedEmail !== getFacebookTestPostAllowedEmail()) {
      const errorMessage = "Test posting is restricted for this account.";
      return contentType.includes("application/json")
        ? Response.json({ error: errorMessage }, { status: 403 })
        : respondHtml("error", "This test tool is locked down", "That email is not allowlisted for Facebook test posting in this environment.");
    }

    if (secret !== getFacebookTestPostSecret()) {
      const errorMessage = "Invalid test post secret.";
      return contentType.includes("application/json")
        ? Response.json({ error: errorMessage }, { status: 401 })
        : respondHtml("error", "Secret didn’t match", "Double-check the test post secret and try again.");
    }

    const connection = await fetchCustomerFacebookConnection({
      onboardingId,
      stripeCustomerId,
      stripeSubscriptionId,
      customerEmail: normalizedEmail,
    });

    if (!connection) {
      const errorMessage = "No onboarding record found for that customer.";
      return contentType.includes("application/json")
        ? Response.json({ error: errorMessage }, { status: 404 })
        : respondHtml("error", "No onboarding record found", "We couldn’t match this request to a stored Social Foreman customer record.");
    }

    if (!connection.facebook_selected_page_id || !connection.facebook_page_access_token) {
      const errorMessage = "No linked Facebook page is ready for test posting yet.";
      return contentType.includes("application/json")
        ? Response.json({ error: errorMessage }, { status: 409 })
        : respondHtml("error", "Facebook page still isn’t linked", "Finish the Facebook connection first, then send the test post again.");
    }

    const postId = await publishFacebookPagePost({
      pageId: connection.facebook_selected_page_id,
      pageAccessToken: connection.facebook_page_access_token,
      message,
    });

    if (contentType.includes("application/json")) {
      return Response.json({
        ok: true,
        postId,
        pageId: connection.facebook_selected_page_id,
        pageName: connection.facebook_selected_page_name,
      });
    }

    return respondHtml(
      "success",
      "Facebook test post sent",
      `The post was sent to ${connection.facebook_selected_page_name ?? "your connected Facebook page"}.`,
      [
        `Post ID: ${postId}`,
        `Page ID: ${connection.facebook_selected_page_id}`,
      ],
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown test post failure.";
    return request.headers.get("content-type")?.includes("application/json")
      ? Response.json({ error: message }, { status: 500 })
      : respondHtml("error", "Facebook test post failed", message);
  }
}
