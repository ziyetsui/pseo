import Link from "next/link";

import { StateBlock } from "@/components/ui/StateBlock";
import { cardClassName } from "@/components/ui/Card";
import type { CollectionWithCount } from "@/lib/content/types";
import { queryHref } from "@/features/search/query-links";

export interface CollectionTilesProps {
  /** Page the collection URLs live on — the hub, `promptsHome(locale)`. */
  basePath: string;
  collections: readonly CollectionWithCount[];
  limit?: number;
  /**
   * Denominator for the proportion bar — the size of the whole library, as in
   * the prototype. Falls back to the largest collection when omitted.
   */
  total?: number;
  emptyMessage?: string;
  className?: string;
}

/**
 * The prototype's 精选合集 grid.
 *
 * Every collection is a link, including the ones whose rule matches the prompt
 * body and therefore has no facet-query equivalent: the URL is
 * `?collection=<slug>`, and `PromptExplorer` resolves membership from the id
 * lists the page passes it. That is what removed the previous "this collection
 * cannot be turned into a link" tile — the honest answer was never to drop the
 * affordance, only to stop pretending a facet query could express the rule.
 */
export function CollectionTiles({
  basePath,
  collections,
  limit,
  total,
  emptyMessage = "暂无可展示的合集。",
  className,
}: CollectionTilesProps) {
  const visible = limit === undefined ? collections : collections.slice(0, limit);
  if (visible.length === 0) return <StateBlock variant="empty" message={emptyMessage} />;

  const denominator =
    total !== undefined && total > 0
      ? total
      : visible.reduce((best, collection) => Math.max(best, collection.count), 0);

  return (
    <ul className={className ?? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3"}>
      {visible.map((collection) => {
        const share =
          denominator === 0 ? 0 : Math.round((collection.count / denominator) * 100);

        return (
          <li key={collection.id} className="flex">
            <Link
              href={queryHref(basePath, { collection: collection.slug })}
              className={cardClassName("w-full gap-3 p-4 no-underline")}
            >
              <h3 className="text-base font-black tracking-tight md:text-lg">{collection.title}</h3>
              {/* Prototype: `副标题 · N 条`, one line. */}
              <p className="text-sm font-medium">
                {collection.subtitle} · {collection.count} 条
              </p>
              <span
                aria-hidden="true"
                className="mt-auto block h-3 border-2 border-foreground bg-surface"
              >
                <span className="block h-full bg-accent-red" style={{ width: `${share}%` }} />
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
