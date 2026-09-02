import { StateBlock } from "@/components/ui/StateBlock";
import { cx } from "@/components/ui/class-names";
import type { ArticleSummary } from "@/lib/content";

import { ArticleCard } from "./ArticleCard";

export interface ArticleListProps {
  articles: readonly ArticleSummary[];
  emptyMessage?: string;
  className?: string;
}

/** A grid of article cards, or an honest empty state when there are none. */
export function ArticleList({
  articles,
  emptyMessage = "这个分类下还没有文章。",
  className,
}: ArticleListProps) {
  if (articles.length === 0) {
    return <StateBlock variant="empty" message={emptyMessage} className={className} />;
  }

  return (
    <ul className={cx("grid gap-6 md:grid-cols-2", className)}>
      {articles.map((article) => (
        <li key={article.id} className="flex">
          <ArticleCard article={article} className="w-full" />
        </li>
      ))}
    </ul>
  );
}
