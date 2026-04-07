type FacebookTokenResponse = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  error?: { message?: string };
};

type FacebookMeResponse = {
  id?: string;
  name?: string;
  error?: { message?: string };
};

type FacebookPagesResponse = {
  data?: Array<{ id: string; name: string; access_token?: string }>;
  error?: { message?: string };
};

type FacebookPostResponse = {
  id?: string;
  error?: { message?: string };
};

export type FacebookPage = {
  id: string;
  name: string;
  accessToken: string | null;
};

export function getFacebookAppId() {
  const appId = process.env.FACEBOOK_APP_ID;

  if (!appId) {
    throw new Error("Missing FACEBOOK_APP_ID");
  }

  return appId;
}

export function getFacebookAppSecret() {
  const appSecret = process.env.FACEBOOK_APP_SECRET;

  if (!appSecret) {
    throw new Error("Missing FACEBOOK_APP_SECRET");
  }

  return appSecret;
}

export function getFacebookRedirectUri(origin: string) {
  return `${origin}/api/facebook/callback`;
}

export function getFacebookTestPostSecret() {
  const secret = process.env.FACEBOOK_TEST_POST_SECRET;

  if (!secret) {
    throw new Error("Missing FACEBOOK_TEST_POST_SECRET");
  }

  return secret;
}

export function getFacebookTestPostAllowedEmail() {
  const email = process.env.FACEBOOK_TEST_POST_ALLOWED_EMAIL;

  if (!email) {
    throw new Error("Missing FACEBOOK_TEST_POST_ALLOWED_EMAIL");
  }

  return email.trim().toLowerCase();
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
    ].join(","),
    response_type: "code",
  });

  return `https://www.facebook.com/v22.0/dialog/oauth?${params.toString()}`;
}

export async function exchangeFacebookCodeForToken(origin: string, code: string) {
  const params = new URLSearchParams({
    client_id: getFacebookAppId(),
    client_secret: getFacebookAppSecret(),
    redirect_uri: getFacebookRedirectUri(origin),
    code,
  });

  const response = await fetch(`https://graph.facebook.com/v22.0/oauth/access_token?${params}`);
  const data = (await response.json()) as FacebookTokenResponse;

  if (!response.ok || !data.access_token) {
    throw new Error(data.error?.message ?? "Unable to exchange Facebook code for token.");
  }

  return data.access_token;
}

export async function fetchFacebookProfile(accessToken: string) {
  const response = await fetch(
    `https://graph.facebook.com/v22.0/me?fields=id,name&access_token=${encodeURIComponent(accessToken)}`,
  );
  const data = (await response.json()) as FacebookMeResponse;

  if (!response.ok) {
    throw new Error(data.error?.message ?? "Unable to fetch Facebook profile.");
  }

  return {
    id: data.id ?? null,
    name: data.name ?? null,
  };
}

export async function fetchFacebookPages(accessToken: string): Promise<FacebookPage[]> {
  const response = await fetch(
    `https://graph.facebook.com/v22.0/me/accounts?access_token=${encodeURIComponent(accessToken)}`,
  );
  const data = (await response.json()) as FacebookPagesResponse;

  if (!response.ok) {
    throw new Error(data.error?.message ?? "Unable to fetch Facebook pages.");
  }

  return (data.data ?? []).map((page) => ({
    id: page.id,
    name: page.name,
    accessToken: page.access_token ?? null,
  }));
}

export async function publishFacebookPagePost(input: {
  pageId: string;
  pageAccessToken: string;
  message: string;
}) {
  const response = await fetch(`https://graph.facebook.com/v22.0/${encodeURIComponent(input.pageId)}/feed`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      message: input.message,
      access_token: input.pageAccessToken,
    }),
  });

  const data = (await response.json()) as FacebookPostResponse;

  if (!response.ok || !data.id) {
    throw new Error(data.error?.message ?? "Unable to publish Facebook page post.");
  }

  return data.id;
}
