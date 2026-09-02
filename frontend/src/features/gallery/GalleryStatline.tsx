import type { GalleryStats } from "./image-prompts";

export interface GalleryStatlineProps {
  stats: GalleryStats;
  /** Snapshot date every interaction figure was observed on. */
  observedAt: string;
  className?: string;
}

/**
 * The gallery's headline figures.
 *
 * Every number is computed by `galleryStats` from the prompts this page
 * actually renders — the prototype's declared 324 images never appear. A
 * missing publication date is stated as such instead of being filled with a
 * plausible-looking value, and the note keeps the interaction snapshot date
 * next to the counts (global constraint 4).
 */
export function GalleryStatline({ stats, observedAt, className }: GalleryStatlineProps) {
  const dateNote =
    stats.datedCount === stats.total
      ? `全部 ${stats.total} 条都标注了发布日期。`
      : `${stats.total} 条中有 ${stats.datedCount} 条标注了发布日期，其余日期未收录。`;

  return (
    <div className={className}>
      <dl className="flex flex-wrap gap-x-8 gap-y-3">
        <div>
          <dt className="text-xs font-bold tracking-wider uppercase">收录条数</dt>
          <dd className="text-xl font-black tracking-tight">{stats.total} 条</dd>
        </div>
        <div>
          <dt className="text-xs font-bold tracking-wider uppercase">热门提示词</dt>
          <dd className="text-xl font-black tracking-tight">{stats.highValueCount} 条</dd>
        </div>
        <div>
          <dt className="text-xs font-bold tracking-wider uppercase">创作者</dt>
          <dd className="text-xl font-black tracking-tight">{stats.creatorCount} 位</dd>
        </div>
        <div>
          <dt className="text-xs font-bold tracking-wider uppercase">最新收录</dt>
          <dd className="text-xl font-black tracking-tight">
            {stats.latestPublishedAt === null ? (
              "日期未收录"
            ) : (
              <time dateTime={stats.latestPublishedAt}>{stats.latestPublishedAt}</time>
            )}
          </dd>
        </div>
      </dl>
      <p className="mt-3 text-sm font-medium">
        互动数据观测于 {observedAt}；{dateNote}
      </p>
    </div>
  );
}
