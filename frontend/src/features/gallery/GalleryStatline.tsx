import type { GalleryStats } from "./image-prompts";

export interface GalleryStatlineProps {
  stats: GalleryStats;
  /** Snapshot date every interaction figure was observed on. */
  observedAt: string;
  className?: string;
}

/**
 * The gallery's headline figures — the prototype's
 * `<b>324</b>条提示词 / <b>63</b>热门 / <b>105</b>位创作者 / <b>2026-08-20</b>最新收录`.
 *
 * Every number is computed by `galleryStats` from the prompts this page
 * actually renders; the prototype's declared 324 never appears. The value sits
 * above its label, as in the prototype, but stays a `<dd>` after its `<dt>` in
 * source order (flex ordering does the visual swap) so the description list
 * remains valid and readable to assistive tech.
 *
 * A missing publication date is stated as such instead of being filled with a
 * plausible-looking value, and the note keeps the interaction snapshot date
 * next to the counts (global constraint 4).
 */
export function GalleryStatline({ stats, observedAt, className }: GalleryStatlineProps) {
  const dateNote =
    stats.datedCount === stats.total
      ? `全部 ${stats.total} 条都标注了发布日期。`
      : `${stats.total} 条中有 ${stats.datedCount} 条标注了发布日期，其余日期未收录。`;

  const items: { label: string; value: React.ReactNode }[] = [
    { label: "条提示词", value: stats.total },
    { label: "热门", value: stats.highValueCount },
    { label: "位创作者", value: stats.creatorCount },
    {
      label: "最新收录",
      value:
        stats.latestPublishedAt === null ? (
          "日期未收录"
        ) : (
          <time dateTime={stats.latestPublishedAt}>{stats.latestPublishedAt}</time>
        ),
    },
  ];

  return (
    <div className={className}>
      <dl className="flex flex-wrap gap-x-8 gap-y-3">
        {items.map((item) => (
          <div key={item.label} className="flex flex-col">
            <dt className="order-2 text-xs font-bold tracking-wider uppercase">{item.label}</dt>
            <dd className="order-1 text-xl font-black tracking-tight tabular-nums">{item.value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-sm font-medium">
        互动数据观测于 {observedAt}；{dateNote}
      </p>
    </div>
  );
}
