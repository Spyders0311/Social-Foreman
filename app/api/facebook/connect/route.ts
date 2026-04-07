import { buildFacebookOAuthUrl } from "../../../../src/lib/facebook";

export const runtime = "nodejs";

function getOrigin(request: Request) {
  const requestUrl = new URL(request.url);
  return `${requestUrl.protocol}//${requestUrl.host}`;
}

export async function GET(request: Request) {
  try {
    const requestUrl = new URL(request.url);
    const state = requestUrl.searchParams.get("state") ?? crypto.randomUUID();
    const redirectUrl = buildFacebookOAuthUrl(getOrigin(request), state);

    return Response.redirect(redirectUrl, 302);
  } catch (error) {
    return Response.json(
      {
        error: "Unable to start Facebook connection.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
