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
    scope: [
      "pages_show_list",
      "pages_read_engagement",
      "pages_manage_posts",
      "pages_manage_metadata",
      "business_management",
    ].join(","),
    response_type: "code",
  });

  return `https://www.facebook.com/v22.0/dialog/oauth?${params.toString()}`;
}
