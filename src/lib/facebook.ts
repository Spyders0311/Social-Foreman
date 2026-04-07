export function getFacebookAppId() {
  const appId = process.env.FACEBOOK_APP_ID;

  if (!appId) {
    throw new Error("Missing FACEBOOK_APP_ID");
  }

  return appId;
}

export function getFacebookRedirectUri(origin: string) {
  return `${origin}/api/facebook/callback`;
}

export function buildFacebookOAuthUrl(origin: string, state: string) {
  const params = new URLSearchParams({
    client_id: getFacebookAppId(),
    redirect_uri: getFacebookRedirectUri(origin),
    state,
    scope: "public_profile",
    response_type: "code",
  });

  return `https://www.facebook.com/v22.0/dialog/oauth?${params.toString()}`;
}
