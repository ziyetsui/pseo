import { StateBlock } from "@/components/ui/StateBlock";
import { CardLink, tileShellClassName } from "@/components/ui/Card";
import { cx } from "@/components/ui/class-names";
import type { CollectionWithCount } from "@/lib/content/types";
import { queryHref } from "@/features/search/query-links";

import {
  BrowseTileBar,
  BrowseTileCount,
  BrowseTileRank,
  browseTileBodyClassName,
  browseTileCellClassName,
  browseTileTitleClassName,
  leadsGroup,
} from "./browse-tile";
import type { SectionAccent } from "./section-accent";

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
  /** The band's accent, from `section-accent`. */
  accent?: SectionAccent;
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
 *
 * These tiles carry one thing the taxonomy tiles do not: a subtitle. It keeps
 * its words and sits with the title; the count below it becomes the tile's
 * figure, so a collection reads as the same object as every other browse tile.
 * Collections arrive in their editorial order, which is not sorted by size, so
 * the leading-tile treatment appears only when the first collection really is
 * the biggest — never by re-sorting them.
 */
export function CollectionTiles({
  basePath,
  collections,
  limit,
  total,
  accent = "red",
  emptyMessage = "暂无可展示的合集。",
  className,
}: CollectionTilesProps) {
  const visible = limit === undefined ? collections : collections.slice(0, limit);
  if (visible.length === 0) return <StateBlock variant="empty" message={emptyMessage} />;

  const denominator =
    total !== undefined && total > 0
      ? total
      : visible.reduce((best, collection) => Math.max(best, collection.count), 0);
  const hasLead = leadsGroup(visible.map((collection) => collection.count));

  return (
    <ul className={className ?? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3"}>
      {visible.map((collection, index) => {
        const share =
          denominator === 0 ? 0 : Math.round((collection.count / denominator) * 100);
        const lead = hasLead && index === 0;

        return (
          <li key={collection.id} className={browseTileCellClassName(lead)}>
            <CardLink
              href={queryHref(basePath, { collection: collection.slug })}
              className={cx(tileShellClassName, browseTileBodyClassName(lead))}
            >
              {lead ? <BrowseTileRank accent={accent} /> : null}
              <h3 className={browseTileTitleClassName(lead)}>{collection.title}</h3>
              {/* Prototype: `副标题 · N 条`. Same words, re-weighted — the
                  subtitle stays with the title it describes, the count becomes
                  the figure. */}
              <p className="text-xs font-bold tracking-wide">{collection.subtitle}</p>
              <BrowseTileCount value={collection.count} caption="条" lead={lead} />
              <BrowseTileBar share={share} accent={accent} lead={lead} />
            </CardLink>
          </li>
        );
      })}
    </ul>
  );
}
