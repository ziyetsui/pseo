import Link from "next/link";

import { cx } from "@/components/ui/class-names";
import type { ArticleAuthor, ArticleSummary } from "@/lib/content";

export interface ArticleMetaProps {
  article: ArticleSummary;
  /** Show the updated date too — the article page does, cards do not. */
  showUpdated?: boolean;
  className?: string;
}

const EXTERNAL_URL = /^https?:\/\//;

/**
 * Byline: plain text when the record carries no honest link target, an
 * internal `<Link>` for a site-relative href, an external link (new tab,
 * `rel="noopener nofollow"`, sr-only note) for an absolute one. Never
 * fabricates a link the data does not carry.
 */
function Byline({ author }: { author: ArticleAuthor }) {
  if (author.url === null) {
    return <span>作者：{author.name}</span>;
  }

  if (EXTERNAL_URL.test(author.url)) {
    return (
      <span>
        作者：
        <a
          href={author.url}
          target="_blank"
          rel="noopener nofollow"
          className="underline decoration-accent-blue decoration-2"
        >
          {author.name}
          <span className="sr-only">（外部链接，新窗口打开）</span>
        </a>
      </span>
    );
  }

  return (
    <span>
      作者：
      <Link
        href={author.url}
        className="inline-flex min-h-11 min-w-11 items-center justify-center px-1 underline"
      >
        {author.name}
      </Link>
    </span>
  );
}

/**
 * Publication metadata. Dates come straight from the record and are emitted as
 * `<time dateTime>` so they are machine readable; the reading estimate is
 * computed by the repository from the real body length, never hard-coded.
 * The byline renders before the dates.
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
      <Byline author={article.author} />
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
