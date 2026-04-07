import { fetchCustomerFacebookConnection } from "../../../../src/lib/customer-store";
import {
  getFacebookTestPostAllowedEmail,
  getFacebookTestPostSecret,
  publishFacebookPagePost,
} from "../../../../src/lib/facebook";

export const runtime = "nodejs";

const DEFAULT_TEST_POST_MESSAGE =
  "Social Foreman test post: Facebook page connection is live and server-side publishing is ready for verification.";

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    let customerEmail = "";
    let secret = "";
    let message = DEFAULT_TEST_POST_MESSAGE;

    if (contentType.includes("application/json")) {
      const body = (await request.json()) as {
        customerEmail?: string;
        secret?: string;
        message?: string;
      };
      customerEmail = body.customerEmail ?? "";
      secret = body.secret ?? "";
      message = body.message?.trim() || DEFAULT_TEST_POST_MESSAGE;
    } else {
      const formData = await request.formData();
      customerEmail = String(formData.get("customerEmail") ?? "");
      secret = String(formData.get("secret") ?? "");
      message = String(formData.get("message") ?? "").trim() || DEFAULT_TEST_POST_MESSAGE;
    }

    const normalizedEmail = customerEmail.trim().toLowerCase();

    if (!normalizedEmail) {
      return Response.json({ error: "Missing customerEmail." }, { status: 400 });
    }

    if (normalizedEmail !== getFacebookTestPostAllowedEmail()) {
      return Response.json({ error: "Test posting is restricted for this account." }, { status: 403 });
    }

    if (secret !== getFacebookTestPostSecret()) {
      return Response.json({ error: "Invalid test post secret." }, { status: 401 });
    }

    const connection = await fetchCustomerFacebookConnection(normalizedEmail);

    if (!connection) {
      return Response.json({ error: "No onboarding record found for that email." }, { status: 404 });
    }

    if (!connection.facebook_selected_page_id || !connection.facebook_page_access_token) {
      return Response.json(
        { error: "No linked Facebook page is ready for test posting yet." },
        { status: 409 },
      );
    }

    const postId = await publishFacebookPagePost({
      pageId: connection.facebook_selected_page_id,
      pageAccessToken: connection.facebook_page_access_token,
      message,
    });

    return Response.json({
      ok: true,
      postId,
      pageId: connection.facebook_selected_page_id,
      pageName: connection.facebook_selected_page_name,
    });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Unknown test post failure.",
      },
      { status: 500 },
    );
  }
}
