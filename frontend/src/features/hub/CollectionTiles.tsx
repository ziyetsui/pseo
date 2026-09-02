import { StateBlock } from "@/components/ui/StateBlock";
import { tileShellClassName } from "@/components/ui/Card";
import { SpineCard } from "@/components/ui/SpineCard";
import { hoverTitleClassName } from "@/components/ui/hover";
import { displayTitleClassName, microLabelClassName } from "@/components/ui/type-scale";
import type { CollectionWithCount } from "@/lib/content/types";
import { queryHref } from "@/features/search/query-links";

import { BrowseTileBar, browseLayout, browseTileBodyClassName } from "./browse-tile";
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
 * its words and sits with the title, and the count keeps its words below it.
 *
 * A collection is the one browse band that is not an axis of the library but an
 * editorial pick, so it is the one that gets a SPINE: a 38px solid column of the
 * band's accent down the left edge, which says "this family is different" from
 * across a scroll without spending a word on it. Colour is not carrying that
 * alone — the band's heading names it, and the spine is `aria-hidden`.
 *
 * Weighting follows from the spine: the title takes the display tier (two
 * lines, then clamped) because the title is what a reader picks a collection
 * by, and the count drops to a micro label rather than being the tile's figure,
 * which is the difference between this variant and the number tiles. The
 * proportion bar stays — it is the share of the library this collection covers,
 * which is real data, not decoration of the accent.
 *
 * Collections arrive in their editorial order, which is not sorted by size, so
 * the leading-tile treatment appears only when the first collection really is
 * the biggest — never by re-sorting them. The leading tile takes the wider cell
 * and the taller bar; it does not take the rank block the number tiles use,
 * because the spine is already a solid accent shape on the same card.
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
  const layout = browseLayout(
    visible.map((collection) => collection.count),
    "hub-3",
  );

  return (
    <ul className={className ?? layout.gridClassName}>
      {visible.map((collection, index) => {
        const share =
          denominator === 0 ? 0 : Math.round((collection.count / denominator) * 100);
        const lead = layout.lead && index === 0;

        return (
          <li key={collection.id} className={layout.cellClassName(index)}>
            <SpineCard
              accent={accent}
              href={queryHref(basePath, { collection: collection.slug })}
              className={tileShellClassName}
              bodyClassName={browseTileBodyClassName(lead)}
            >
              {/* Prototype: `副标题 · N 条`. Same words, re-weighted — the
                  subtitle stays with the title it describes, and the count is
                  the card's label rather than its figure. */}
              {/* A taller clamp below `sm`: two-up, this tile has given a
                  quarter of a 165px cell to the spine, and a 24px CJK line
                  there holds two or three characters — the tier's usual
                  two-line budget would cut a seven-character collection name
                  in half, and the name is what a reader picks a collection by.
                  It costs no height where the title already fits. */}
              <h3
                className={hoverTitleClassName(
                  displayTitleClassName(undefined, { narrowLines: 4 }),
                )}
              >
                {collection.title}
              </h3>
              <p className={microLabelClassName()}>{collection.subtitle}</p>
              <p className={microLabelClassName("tabular-nums")}>{collection.count} 条</p>
              <BrowseTileBar share={share} accent={accent} lead={lead} />
            </SpineCard>
          </li>
        );
      })}
    </ul>
  );
}
