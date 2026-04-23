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

export type FacebookUserToken = {
  accessToken: string;
  expiresIn: number | null;
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

export async function exchangeFacebookCodeForToken(origin: string, code: string): Promise<FacebookUserToken> {
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

  return {
    accessToken: data.access_token,
    expiresIn: typeof data.expires_in === "number" ? data.expires_in : null,
  };
}

export async function exchangeForLongLivedFacebookToken(accessToken: string): Promise<FacebookUserToken> {
  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: getFacebookAppId(),
    client_secret: getFacebookAppSecret(),
    fb_exchange_token: accessToken,
  });

  const response = await fetch(`https://graph.facebook.com/v22.0/oauth/access_token?${params}`);
  const data = (await response.json()) as FacebookTokenResponse;

  if (!response.ok || !data.access_token) {
    throw new Error(data.error?.message ?? "Unable to exchange for a long-lived Facebook token.");
  }

  return {
    accessToken: data.access_token,
    expiresIn: typeof data.expires_in === "number" ? data.expires_in : null,
  };
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

type FacebookPageInfoResponse = {
  id?: string;
  name?: string;
  picture?: { data?: { url?: string } };
  followers_count?: number;
  fan_count?: number;
  error?: { message?: string };
};

type FacebookPagePostsResponse = {
  data?: Array<{
    id: string;
    message?: string;
    created_time?: string;
    full_picture?: string;
    permalink_url?: string;
    likes?: { summary?: { total_count?: number } };
    comments?: { summary?: { total_count?: number } };
    shares?: { count?: number };
  }>;
  error?: { message?: string };
};

export type FacebookPageInfo = {
  id: string;
  name: string;
  pictureUrl: string | null;
  followersCount: number;
  fanCount: number;
};

export type FacebookPagePost = {
  id: string;
  message: string | null;
  createdTime: string | null;
  fullPicture: string | null;
  permalinkUrl: string | null;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
};

export async function fetchFacebookPageInfo(pageId: string, pageAccessToken: string): Promise<FacebookPageInfo> {
  const params = new URLSearchParams({
    fields: "id,name,picture,followers_count,fan_count",
    access_token: pageAccessToken,
  });

  const response = await fetch(
    `https://graph.facebook.com/v22.0/${encodeURIComponent(pageId)}?${params}`,
  );
  const data = (await response.json()) as FacebookPageInfoResponse;

  if (!response.ok) {
    throw new Error(data.error?.message ?? "Unable to fetch Facebook page info.");
  }

  return {
    id: data.id ?? pageId,
    name: data.name ?? "Unknown Page",
    pictureUrl: data.picture?.data?.url ?? null,
    followersCount: data.followers_count ?? 0,
    fanCount: data.fan_count ?? 0,
  };
}

export async function fetchFacebookPagePosts(pageId: string, pageAccessToken: string): Promise<FacebookPagePost[]> {
  const params = new URLSearchParams({
    fields: "id,message,created_time,full_picture,permalink_url,likes.summary(true),comments.summary(true),shares",
    limit: "10",
    access_token: pageAccessToken,
  });

  const response = await fetch(
    `https://graph.facebook.com/v22.0/${encodeURIComponent(pageId)}/posts?${params}`,
  );
  const data = (await response.json()) as FacebookPagePostsResponse;

  if (!response.ok) {
    throw new Error(data.error?.message ?? "Unable to fetch Facebook page posts.");
  }

  return (data.data ?? []).map((post) => ({
    id: post.id,
    message: post.message ?? null,
    createdTime: post.created_time ?? null,
    fullPicture: post.full_picture ?? null,
    permalinkUrl: post.permalink_url ?? null,
    likesCount: post.likes?.summary?.total_count ?? 0,
    commentsCount: post.comments?.summary?.total_count ?? 0,
    sharesCount: post.shares?.count ?? 0,
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
