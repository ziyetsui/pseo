import Link from "next/link";

import { cx } from "@/components/ui/class-names";
import type { ArticleSummary } from "@/lib/content";

export interface ArticleMetaProps {
  article: ArticleSummary;
  /** Show the updated date too — the article page does, cards do not. */
  showUpdated?: boolean;
  className?: string;
}

/**
 * Publication metadata. Dates come straight from the record and are emitted as
 * `<time dateTime>` so they are machine readable; the reading estimate is
 * computed by the repository from the real body length, never hard-coded.
 */
export function ArticleMeta({ article, showUpdated = false, className }: ArticleMetaProps) {
  return (
    <p className={cx("flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-bold", className)}>
      <Link
        href={article.category.href}
        className="inline-flex min-h-11 min-w-11 items-center justify-center px-1 underline"
      >
        {article.category.label}
      </Link>
      <span>
        发布于 <time dateTime={article.publishedAt}>{article.publishedAt}</time>
      </span>
      {showUpdated ? (
        <span>
          更新于 <time dateTime={article.updatedAt}>{article.updatedAt}</time>
        </span>
      ) : null}
      <span>约 {article.readingMinutes} 分钟</span>
    </p>
  );
}
