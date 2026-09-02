import { StateBlock } from "@/components/ui/StateBlock";
import { CardLink, tileShellClassName } from "@/components/ui/Card";
import { cx } from "@/components/ui/class-names";
import type { QueryFacetKey, TaxonomyWithCount } from "@/lib/content/types";
import { queryHref, setFacet } from "@/features/search/query-links";

import {
  BrowseTileBar,
  BrowseTileCount,
  BrowseTileRank,
  browseLayout,
  browseTileBodyClassName,
  browseTileTitleClassName,
} from "./browse-tile";
import type { SectionAccent } from "./section-accent";

export interface TaxonomyTilesProps {
  /** Page the filtered links point at, e.g. `promptsHome(locale)`. */
  basePath: string;
  axis: QueryFacetKey;
  /** Terms with counts from `listTaxonomies` — already sorted by the repository. */
  terms: readonly TaxonomyWithCount[];
  /** Render at most this many tiles. The rest stay reachable through the URL. */
  limit?: number;
  /** The band's accent, from `section-accent`. Colours the bar and rank marker. */
  accent?: SectionAccent;
  emptyMessage?: string;
  /**
   * Replaces the band's own grid classes. Overriding the COLUMN counts also
   * invalidates the leading tile's fit rule, which is resolved against
   * `browseLayout`'s grid — so pass this only for gap or spacing.
   */
  className?: string;
}

/**
 * Browse-by-axis tiles.
 *
 * A term that owns a real page in this phase (a model with an L3 page) links
 * there; everything else links to this page pre-filtered on that one term. No
 * tile ever renders a placeholder href, and every count comes from the current
 * data — the prototype's declared library-wide figures are never shown.
 *
 * Visual weight follows the count: the number is the tile's protagonist, the
 * biggest term leads the band across two columns on wide viewports, and the
 * proportion bar carries the band's accent. Order, counts and links are exactly
 * what the caller passed.
 */
export function TaxonomyTiles({
  basePath,
  axis,
  terms,
  limit,
  accent = "red",
  emptyMessage = "该维度暂无收录的提示词。",
  className,
}: TaxonomyTilesProps) {
  const visible = limit === undefined ? terms : terms.slice(0, limit);
  if (visible.length === 0) return <StateBlock variant="empty" message={emptyMessage} />;

  const max = visible.reduce((best, term) => Math.max(best, term.count), 0);
  const layout = browseLayout(
    visible.map((term) => term.count),
    "hub-4",
  );

  return (
    <ul className={className ?? layout.gridClassName}>
      {visible.map((term, index) => {
        // `href` is only ever non-null for a term that has a real page in this
        // phase (currently: models with an L3 page) — checked directly rather
        // than re-deriving "is this a model" from `term.axis`, which this
        // component's own `axis` prop already pins for every item in `terms`.
        const href =
          term.href !== null ? term.href : queryHref(basePath, setFacet({}, axis, [term.slug]));
        const share = max === 0 ? 0 : Math.round((term.count / max) * 100);
        const lead = layout.lead && index === 0;

        return (
          <li key={term.id} className={layout.cellClassName(index)}>
            <CardLink
              href={href}
              className={cx(tileShellClassName, browseTileBodyClassName(lead))}
            >
              {lead ? <BrowseTileRank accent={accent} /> : null}
              {/* Prototype tiles carry the English taxonomy value (`Fashion`,
                  `Camera movement / shot language`); `labelZh` is reserved for
                  the Chinese-labelled footer columns. */}
              <h3 className={browseTileTitleClassName(lead)}>{term.label}</h3>
              <BrowseTileCount value={term.count} caption="条提示词" lead={lead} />
              <BrowseTileBar share={share} accent={accent} lead={lead} />
            </CardLink>
          </li>
        );
      })}
    </ul>
  );
}
