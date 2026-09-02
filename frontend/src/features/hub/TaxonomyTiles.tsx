import Link from "next/link";

import { StateBlock } from "@/components/ui/StateBlock";
import { cardClassName, tileShellClassName } from "@/components/ui/Card";
import { cx } from "@/components/ui/class-names";
import type { QueryFacetKey, TaxonomyWithCount } from "@/lib/content/types";
import { queryHref, setFacet } from "@/features/search/query-links";

export interface TaxonomyTilesProps {
  /** Page the filtered links point at, e.g. `promptsHome(locale)`. */
  basePath: string;
  axis: QueryFacetKey;
  /** Terms with counts from `listTaxonomies` — already sorted by the repository. */
  terms: readonly TaxonomyWithCount[];
  /** Render at most this many tiles. The rest stay reachable through the URL. */
  limit?: number;
  emptyMessage?: string;
  className?: string;
}

/**
 * Browse-by-axis tiles.
 *
 * A term that owns a real page in this phase (a model with an L3 page) links
 * there; everything else links to this page pre-filtered on that one term. No
 * tile ever renders a placeholder href, and every count comes from the current
 * data — the prototype's declared library-wide figures are never shown.
 */
export function TaxonomyTiles({
  basePath,
  axis,
  terms,
  limit,
  emptyMessage = "该维度暂无收录的提示词。",
  className,
}: TaxonomyTilesProps) {
  const visible = limit === undefined ? terms : terms.slice(0, limit);
  if (visible.length === 0) return <StateBlock variant="empty" message={emptyMessage} />;

  const max = visible.reduce((best, term) => Math.max(best, term.count), 0);

  return (
    <ul className={className ?? "grid gap-4 sm:grid-cols-2 lg:grid-cols-4"}>
      {visible.map((term) => {
        // `href` is only ever non-null for a term that has a real page in this
        // phase (currently: models with an L3 page) — checked directly rather
        // than re-deriving "is this a model" from `term.axis`, which this
        // component's own `axis` prop already pins for every item in `terms`.
        const href =
          term.href !== null ? term.href : queryHref(basePath, setFacet({}, axis, [term.slug]));
        const share = max === 0 ? 0 : Math.round((term.count / max) * 100);

        return (
          <li key={term.id} className="flex">
            <Link href={href} className={cardClassName(cx(tileShellClassName, "gap-3 p-4 no-underline"))}>
              {/* Prototype tiles carry the English taxonomy value (`Fashion`,
                  `Camera movement / shot language`); `labelZh` is reserved for
                  the Chinese-labelled footer columns. */}
              <h3 className="text-base font-black tracking-tight md:text-lg">{term.label}</h3>
              <p className="text-sm font-medium">{term.count} 条提示词</p>
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
