type StatsPanelProps = {
  postsCount: number;
  followersCount: number;
  connectedSince: string | null;
  postingPlan: string | null;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
};

function formatConnectedSince(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function StatCard(props: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#d9d2c3] bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#846b42]">{props.label}</p>
      <p className="mt-2 text-2xl font-bold text-[#132027]">{props.value}</p>
    </div>
  );
}

export function StatsPanel(props: StatsPanelProps) {
  const {
    postsCount,
    followersCount,
    connectedSince,
    postingPlan,
    totalLikes,
    totalComments,
    totalShares,
  } = props;

  const followersDisplay = followersCount > 0 ? followersCount.toLocaleString() : "—";
  const connectedDisplay = formatConnectedSince(connectedSince);
  const planDisplay = postingPlan ?? "—";

  return (
    <section className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Posts Published" value={postsCount.toLocaleString()} />
        <StatCard label="Page Followers" value={followersDisplay} />
        <StatCard label="Connected Since" value={connectedDisplay} />
        <StatCard label="Posting Plan" value={planDisplay} />
      </div>

      {(totalLikes > 0 || totalComments > 0 || totalShares > 0) && (
        <div className="rounded-2xl border border-[#d9d2c3] bg-white px-5 py-3 shadow-sm text-center">
          <p className="text-sm font-medium text-[#405058]">
            ❤️ {totalLikes.toLocaleString()} likes · 💬 {totalComments.toLocaleString()} comments · 🔁 {totalShares.toLocaleString()} shares
          </p>
        </div>
      )}
    </section>
  );
}
