import Image from "next/image";
import { fetchCustomerFacebookConnection } from "../../src/lib/customer-store";
import { createServerClient } from "../../src/lib/supabase-server";
import { PostComposer } from "./PostComposer";
import {
  fetchFacebookPageInfo,
  fetchFacebookPagePosts,
  fetchFacebookPages,
  type FacebookPageInfo,
  type FacebookPagePost,
  type FacebookPage,
} from "../../src/lib/facebook";

export const metadata = {
  title: "Page Dashboard | Social Foreman",
};

type DashboardPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getString(value: string | string[] | undefined): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  return null;
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function buildConnectHref(params: {
  onboardingId: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  customerEmail: string | null;
}) {
  const p = new URLSearchParams();
  if (params.onboardingId) p.set("onboardingId", params.onboardingId);
  if (params.stripeCustomerId) p.set("stripeCustomerId", params.stripeCustomerId);
  if (params.stripeSubscriptionId) p.set("stripeSubscriptionId", params.stripeSubscriptionId);
  if (params.customerEmail) p.set("email", params.customerEmail);
  const qs = p.toString();
  return qs ? `/api/facebook/connect?${qs}` : "/api/facebook/connect";
}

function buildDashboardHref(params: {
  onboardingId: string;
  pageId?: string;
}) {
  const p = new URLSearchParams({ onboardingId: params.onboardingId });
  if (params.pageId) p.set("pageId", params.pageId);
  return `/dashboard?${p}`;
}

// ─── Empty / error states ────────────────────────────────────────────────────

function NoParamsState() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6">
      <div className="w-full max-w-md rounded-3xl border border-[#d9d2c3] bg-white p-10 text-center shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#846b42]">Dashboard</p>
        <h1 className="mt-4 text-3xl font-bold text-[#132027]">Sign in to continue</h1>
        <p className="mt-4 text-[#405058]">
          Sign in with your email to access your Social Foreman dashboard.
        </p>
        <a
          href="/login"
          className="mt-6 inline-flex rounded-full bg-[#132027] px-6 py-3 font-semibold text-[#f8f2e8] transition hover:bg-[#21414b]"
        >
          Sign in
        </a>
      </div>
    </div>
  );
}

function NotFoundState() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6">
      <div className="w-full max-w-md rounded-3xl border border-[#d9d2c3] bg-white p-10 text-center shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#9a4a2f]">Error</p>
        <h1 className="mt-4 text-3xl font-bold text-[#132027]">Account not found</h1>
        <p className="mt-4 text-[#405058]">
          We could not find a customer record for those details. Try opening the dashboard from your original onboarding link.
        </p>
      </div>
    </div>
  );
}

function NoSubscriptionState() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6">
      <div className="w-full max-w-md rounded-3xl border border-[#d9d2c3] bg-white p-10 text-center shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#846b42]">No subscription</p>
        <h1 className="mt-4 text-3xl font-bold text-[#132027]">No subscription found</h1>
        <p className="mt-4 text-[#405058]">
          No subscription found for this account. Need help?{" "}
          <a href="mailto:support@socialforeman.com" className="font-semibold underline">
            Contact support
          </a>
          .
        </p>
        <SignOutButton />
      </div>
    </div>
  );
}

function ConnectFacebookState(props: {
  onboardingId: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  customerEmail: string | null;
}) {
  const connectHref = buildConnectHref(props);
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6">
      <div className="w-full max-w-md rounded-3xl border border-[#d9d2c3] bg-white p-10 text-center shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#1877f2]">Facebook</p>
        <h1 className="mt-4 text-3xl font-bold text-[#132027]">Connect your Facebook Page</h1>
        <p className="mt-4 text-[#405058]">
          You need to connect a Facebook Page before the dashboard can show your content and engagement data.
        </p>
        <a
          href={connectHref}
          className="mt-6 inline-flex rounded-full bg-[#1877f2] px-6 py-3 font-semibold text-white transition hover:bg-[#1669d8]"
        >
          Connect Facebook
        </a>
      </div>
    </div>
  );
}

function TokenExpiredState(props: {
  onboardingId: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  customerEmail: string | null;
}) {
  const connectHref = buildConnectHref(props);
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6">
      <div className="w-full max-w-md rounded-3xl border border-[#f0d9a6] bg-[#fff8e8] p-10 text-center shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#846b42]">Session expired</p>
        <h1 className="mt-4 text-3xl font-bold text-[#132027]">Reconnect Facebook</h1>
        <p className="mt-4 text-[#6a4c12]">
          Your Facebook access token has expired. Reconnect to restore dashboard access and keep publishing running.
        </p>
        <a
          href={connectHref}
          className="mt-6 inline-flex rounded-full bg-[#1877f2] px-6 py-3 font-semibold text-white transition hover:bg-[#1669d8]"
        >
          Reconnect Facebook
        </a>
      </div>
    </div>
  );
}

function NoPagesState(props: {
  onboardingId: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  customerEmail: string | null;
}) {
  const connectHref = buildConnectHref(props);
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6">
      <div className="w-full max-w-md rounded-3xl border border-[#d9d2c3] bg-white p-10 text-center shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#846b42]">No pages found</p>
        <h1 className="mt-4 text-3xl font-bold text-[#132027]">No Facebook Pages available</h1>
        <p className="mt-4 text-[#405058]">
          The connected Facebook account has no manageable Pages. Make sure you have admin access to at least one Facebook Business Page and reconnect.
        </p>
        <a
          href={connectHref}
          className="mt-6 inline-flex rounded-full bg-[#1877f2] px-6 py-3 font-semibold text-white transition hover:bg-[#1669d8]"
        >
          Reconnect Facebook
        </a>
      </div>
    </div>
  );
}

// ─── Header actions (sign out + manage subscription) ─────────────────────────

function SignOutButton() {
  return (
    <form action="/api/auth/signout" method="POST">
      <button
        type="submit"
        className="mt-6 rounded-full border border-[#d9d2c3] bg-white px-5 py-2 text-sm font-semibold text-[#132027] transition hover:bg-[#f7f5ef]"
      >
        Sign out
      </button>
    </form>
  );
}

function ManageSubscriptionButton() {
  return (
    <form action="/api/stripe/portal" method="POST">
      <button
        type="submit"
        className="rounded-full border border-[#d9d2c3] bg-white px-5 py-2 text-sm font-semibold text-[#132027] transition hover:bg-[#f7f5ef]"
      >
        Manage subscription
      </button>
    </form>
  );
}

// ─── Page identity header ─────────────────────────────────────────────────────

function PageIdentityHeader(props: {
  pageInfo: FacebookPageInfo;
  pageName: string;
}) {
  const { pageInfo } = props;
  const displayFollowers = pageInfo.followersCount > 0
    ? pageInfo.followersCount.toLocaleString()
    : pageInfo.fanCount > 0
      ? pageInfo.fanCount.toLocaleString()
      : null;

  return (
    <section className="rounded-3xl bg-gradient-to-br from-[#132027] to-[#21414b] p-8 text-[#f8f2e8] sm:p-10">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#d7c6a1]">
        Facebook Page Identity
      </p>
      <div className="mt-5 flex items-center gap-5">
        {pageInfo.pictureUrl ? (
          <Image
            src={pageInfo.pictureUrl}
            alt={pageInfo.name}
            width={72}
            height={72}
            className="h-18 w-18 rounded-full border-2 border-white/20 object-cover"
            unoptimized
          />
        ) : (
          <div className="flex h-18 w-18 items-center justify-center rounded-full bg-[#1877f2] text-2xl font-bold text-white">
            {pageInfo.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <h1 className="text-3xl font-bold leading-tight sm:text-4xl">{pageInfo.name}</h1>
          <p className="mt-1 text-sm text-[#d8cec1]">Page ID: {pageInfo.id}</p>
          {displayFollowers ? (
            <p className="mt-1 text-sm font-semibold text-[#d7c6a1]">
              {displayFollowers} followers
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

// ─── Page picker ──────────────────────────────────────────────────────────────

function PagePicker(props: {
  pages: FacebookPage[];
  activePageId: string;
  onboardingId: string;
}) {
  const { pages, activePageId, onboardingId } = props;
  if (pages.length <= 1) return null;

  return (
    <section className="rounded-3xl border border-[#d9d2c3] bg-white p-6 sm:p-8">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#846b42]">Page selector</p>
      <h2 className="mt-2 text-xl font-bold text-[#132027]">Switch Facebook Page</h2>
      <div className="mt-4 flex flex-wrap gap-3">
        {pages.map((page) => {
          const href = buildDashboardHref({ onboardingId, pageId: page.id });
          const isActive = page.id === activePageId;
          return (
            <a
              key={page.id}
              href={href}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                isActive
                  ? "bg-[#132027] text-[#f8f2e8]"
                  : "border border-[#d9d2c3] bg-white text-[#132027] hover:bg-[#f7f5ef]"
              }`}
            >
              {page.name}
            </a>
          );
        })}
      </div>
    </section>
  );
}

// ─── Posts feed ──────────────────────────────────────────────────────────────

function PostCard(props: { post: FacebookPagePost; index: number }) {
  const { post } = props;
  return (
    <article className="rounded-2xl border border-[#d9d2c3] bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {post.message ? (
            <p className="whitespace-pre-wrap text-[#132027] leading-7">{post.message}</p>
          ) : (
            <p className="italic text-[#8c9ba0]">No text content</p>
          )}
          <p className="mt-3 text-xs text-[#8c9ba0]">{formatDate(post.createdTime)}</p>
        </div>
        {post.fullPicture ? (
          <div className="shrink-0">
            <Image
              src={post.fullPicture}
              alt="Post image"
              width={120}
              height={120}
              className="h-28 w-28 rounded-xl object-cover"
              unoptimized
            />
          </div>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-[#f0ece4] pt-4">
        <span className="flex items-center gap-1.5 text-sm text-[#405058]">
          <span className="font-semibold text-[#132027]">{post.likesCount.toLocaleString()}</span>
          {post.likesCount === 1 ? "like" : "likes"}
        </span>
        <span className="flex items-center gap-1.5 text-sm text-[#405058]">
          <span className="font-semibold text-[#132027]">{post.commentsCount.toLocaleString()}</span>
          {post.commentsCount === 1 ? "comment" : "comments"}
        </span>
        <span className="flex items-center gap-1.5 text-sm text-[#405058]">
          <span className="font-semibold text-[#132027]">{post.sharesCount.toLocaleString()}</span>
          {post.sharesCount === 1 ? "share" : "shares"}
        </span>
        {post.permalinkUrl ? (
          <a
            href={post.permalinkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto text-sm font-semibold text-[#1877f2] hover:underline"
          >
            View on Facebook →
          </a>
        ) : null}
      </div>
    </article>
  );
}

function PostsFeed(props: { posts: FacebookPagePost[] }) {
  const { posts } = props;

  if (!posts.length) {
    return (
      <div className="rounded-2xl border border-[#d9d2c3] bg-white p-8 text-center text-[#8c9ba0]">
        No posts found for this page yet. Use the composer below to publish your first post.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post, i) => (
        <PostCard key={post.id} post={post} index={i} />
      ))}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = searchParams ? await searchParams : undefined;

  const onboardingId = getString(params?.onboardingId);
  const stripeCustomerId = getString(params?.stripeCustomerId);
  const stripeSubscriptionId = getString(params?.stripeSubscriptionId);
  const customerEmail = getString(params?.email);
  const requestedPageId = getString(params?.pageId);
  const posted = getString(params?.posted);
  const postError = getString(params?.error);

  // Attempt auth-first lookup via logged-in user.
  let authEmail: string | null = null;
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    authEmail = user?.email ?? null;
  } catch {
    // Env vars may not be set in all environments — fall through to param-based lookup.
  }

  // Resolve which email/id to use for lookup.
  // Auth session takes precedence; fall back to URL params for backwards compat (Meta App Review link).
  const lookupEmail = authEmail ?? customerEmail;

  const hasLookupParams = !!(onboardingId || stripeCustomerId || stripeSubscriptionId || lookupEmail);

  if (!hasLookupParams) {
    return <NoParamsState />;
  }

  const record = await fetchCustomerFacebookConnection({
    onboardingId: onboardingId ?? undefined,
    stripeCustomerId: stripeCustomerId ?? undefined,
    stripeSubscriptionId: stripeSubscriptionId ?? undefined,
    customerEmail: lookupEmail ?? undefined,
  }).catch(() => null);

  // If the user is logged in but has no record, show the no-subscription state.
  if (!record && authEmail) {
    return <NoSubscriptionState />;
  }

  if (!record) {
    return <NotFoundState />;
  }

  const customerParams = {
    onboardingId: record.id,
    stripeCustomerId: record.stripe_customer_id,
    stripeSubscriptionId: record.stripe_subscription_id,
    customerEmail: record.customer_email,
  };

  if (!record.facebook_connected_at || !record.facebook_long_lived_user_access_token) {
    return <ConnectFacebookState {...customerParams} />;
  }

  const tokenExpired =
    record.facebook_long_lived_user_token_expires_at
      ? new Date(record.facebook_long_lived_user_token_expires_at) < new Date()
      : false;

  if (tokenExpired) {
    return <TokenExpiredState {...customerParams} />;
  }

  // Fetch all pages the user can manage
  let pages: FacebookPage[] = [];
  try {
    pages = await fetchFacebookPages(record.facebook_long_lived_user_access_token);
  } catch {
    return <TokenExpiredState {...customerParams} />;
  }

  if (!pages.length) {
    return <NoPagesState {...customerParams} />;
  }

  // Determine which page to display
  const activePageId =
    requestedPageId ??
    record.facebook_selected_page_id ??
    pages[0].id;

  const activePage = pages.find((p) => p.id === activePageId) ?? pages[0];

  // Use stored token if it matches, otherwise use token from the pages list
  const pageAccessToken =
    record.facebook_selected_page_id === activePage.id && record.facebook_page_access_token
      ? record.facebook_page_access_token
      : activePage.accessToken;

  if (!pageAccessToken) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-6">
        <div className="rounded-3xl border border-[#e3c2b7] bg-[#fff4ef] p-10 text-center">
          <p className="text-[#7a3d2b]">No access token available for this page. Try reconnecting Facebook.</p>
          <a href={buildConnectHref(customerParams)} className="mt-4 inline-flex rounded-full bg-[#1877f2] px-6 py-3 font-semibold text-white transition hover:bg-[#1669d8]">
            Reconnect Facebook
          </a>
        </div>
      </div>
    );
  }

  // Fetch page info and posts in parallel
  const [pageInfo, posts] = await Promise.allSettled([
    fetchFacebookPageInfo(activePage.id, pageAccessToken),
    fetchFacebookPagePosts(activePage.id, pageAccessToken),
  ]);

  const resolvedPageInfo: FacebookPageInfo =
    pageInfo.status === "fulfilled"
      ? pageInfo.value
      : { id: activePage.id, name: activePage.name, pictureUrl: null, followersCount: 0, fanCount: 0 };

  const resolvedPosts: FacebookPagePost[] =
    posts.status === "fulfilled" ? posts.value : [];

  const pageInfoError = pageInfo.status === "rejected" ? (pageInfo.reason as Error)?.message ?? "Unknown error" : null;
  const postsError = posts.status === "rejected" ? (posts.reason as Error)?.message ?? "Unknown error" : null;

  return (
    <div className="min-h-screen bg-[#f7f5ef] text-[#132027]">
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-12 sm:px-10">

        {/* Dashboard header actions */}
        <div className="flex items-center justify-end gap-3">
          <ManageSubscriptionButton />
          {authEmail ? <SignOutButton /> : null}
        </div>

        {/* Success / error banners */}
        {posted === "success" ? (
          <div className="rounded-2xl border border-[#b7d5c2] bg-[#edf7f0] px-5 py-4 text-sm font-medium text-[#214b33]">
            Post published successfully. The feed below reflects the latest content from your Page.
          </div>
        ) : null}
        {postError ? (
          <div className="rounded-2xl border border-[#e3c2b7] bg-[#fff4ef] px-5 py-4 text-sm font-medium text-[#7a3d2b]">
            {postError === "empty_message"
              ? "Post message cannot be empty."
              : postError === "token_expired"
                ? "Facebook token expired. Please reconnect."
                : postError === "publish_failed"
                  ? "Failed to publish the post. Please try again."
                  : `Error: ${postError}`}
          </div>
        ) : null}

        {/* Page identity — always visible, required by Meta */}
        <PageIdentityHeader pageInfo={resolvedPageInfo} pageName={activePage.name} />

        {pageInfoError ? (
          <div className="rounded-2xl border border-[#f0d9a6] bg-[#fff8e8] px-5 py-4 text-sm text-[#6a4c12]">
            Could not load full page details: {pageInfoError}
          </div>
        ) : null}

        {/* Page picker — shown when user manages multiple pages */}
        <PagePicker pages={pages} activePageId={activePage.id} onboardingId={record.id} />

        {/* Recent posts — uses pages_read_engagement */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#846b42]">Recent posts</p>
              <h2 className="mt-1 text-2xl font-bold text-[#132027]">
                Page content via <code className="rounded bg-[#ede8df] px-1.5 py-0.5 text-base">pages_read_engagement</code>
              </h2>
            </div>
            <a
              href={buildDashboardHref({ onboardingId: record.id, pageId: activePage.id })}
              className="rounded-full border border-[#d9d2c3] bg-white px-4 py-2 text-sm font-semibold text-[#132027] transition hover:bg-[#f7f5ef]"
            >
              Refresh
            </a>
          </div>

          {postsError ? (
            <div className="rounded-2xl border border-[#e3c2b7] bg-[#fff4ef] px-5 py-4 text-sm text-[#7a3d2b]">
              Could not load posts: {postsError}
            </div>
          ) : (
            <PostsFeed posts={resolvedPosts} />
          )}
        </section>

        {/* Post composer — uses pages_manage_posts */}
        <PostComposer
          pageId={activePage.id}
          onboardingId={record.id}
          pageName={resolvedPageInfo.name}
        />

      </main>
    </div>
  );
}
