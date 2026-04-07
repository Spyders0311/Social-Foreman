export const runtime = "nodejs";

function getOrigin(request: Request) {
  const requestUrl = new URL(request.url);
  return `${requestUrl.protocol}//${requestUrl.host}`;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const error = requestUrl.searchParams.get("error");

  if (error) {
    return Response.redirect(`${getOrigin(request)}/success?facebook=error`, 302);
  }

  if (!code) {
    return Response.redirect(`${getOrigin(request)}/success?facebook=missing_code`, 302);
  }

  console.log("Facebook OAuth callback received", {
    codeReceived: true,
    note: "Token exchange and persistence not implemented yet.",
  });

  return Response.redirect(`${getOrigin(request)}/success?facebook=connected`, 302);
}
