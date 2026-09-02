import { ChipLink } from "@/components/ui/Chip";
import { cx } from "@/components/ui/class-names";
import { microLabelClassName } from "@/components/ui/type-scale";
import type { FacetGroup, PromptQuery } from "@/lib/content/types";

import { axisAccentClassName } from "./axis-accent";
import { isFacetSelected, queryHref, toggleFacet } from "./query-links";

export interface FacetChipsProps {
  /** Page the filters apply to, e.g. `promptsHome(locale)`. */
  basePath: string;
  /** The query currently reflected in the URL. */
  query: PromptQuery;
  /** Groups with counts, straight from `PromptListResult.facets`. */
  groups: readonly FacetGroup[];
  /** Prefix for the generated group heading ids. Unique per page. */
  idPrefix?: string;
  /** Cap the chips shown per axis; the rest stay reachable via the URL. */
  maxPerGroup?: number;
  /**
   * How the axis name is marked up. `none` (default) is L1's plain `<b>`-style
   * label — its prototype has no `<h2>` above the filter block, so a heading
   * there would skip a level. `h3` matches the L2/L3 prototypes, whose axis
   * names ARE `<h3>`s inside a section that already carries an `<h2>`.
   */
  headingLevel?: "none" | "h3";
  className?: string;
}

/**
 * Each axis is one band: a fixed left gutter carrying a 4px edge in the axis's
 * colour and the axis name, with that axis's chips in the right cell.
 *
 * The gutter is a container query, not a viewport one, because the same
 * component is laid out full-width on L1 and inside a three-column grid on
 * L2/L3 — when the band itself is narrow the gutter stacks above the chips
 * instead of eating the row.
 */
const BAND = "flex flex-col gap-3 @lg:flex-row @lg:gap-5";
/** `w-36` is the fixed landing point every axis name shares. */
const GUTTER = "flex gap-3 @lg:w-36 @lg:shrink-0";
/**
 * The colour edge. Decoration only: it is `aria-hidden`, and the axis is always
 * named in text beside it, so nothing here is carried by colour alone.
 */
const EDGE = "w-1 shrink-0 self-stretch";
/**
 * `min-h-11` + `items-center` puts the axis name on the optical centre line of
 * the first chip row (chips are `min-h-11` too) without a hand-tuned offset;
 * `self-start` keeps it there while the edge beside it stretches the band.
 */
const AXIS_LABEL = microLabelClassName(
  "flex min-h-11 items-center self-start text-foreground",
);

/**
 * Facet navigation, entirely as links.
 *
 * Every chip is an `<a>` whose href is the current URL with that one value
 * toggled on its own axis — other axes and the search term are preserved — so
 * filtering works with JavaScript disabled and every state is shareable and
 * back-button-able. Counts come from props; nothing is computed here.
 */
export function FacetChips({
  basePath,
  query,
  groups,
  idPrefix = "facet",
  maxPerGroup,
  headingLevel = "none",
  className,
}: FacetChipsProps) {
  const visible = groups.filter((group) => group.options.length > 0);
  if (visible.length === 0) return null;

  return (
    <div className={className ?? "flex flex-col gap-6"}>
      {visible.map((group) => {
        const headingId = `${idPrefix}-${group.key}`;
        const options =
          maxPerGroup === undefined ? group.options : group.options.slice(0, maxPerGroup);

        return (
          <div key={group.key} role="group" aria-labelledby={headingId} className="@container">
            <div className={BAND}>
              <div className={GUTTER}>
                <span aria-hidden="true" className={cx(EDGE, axisAccentClassName(group.key))} />
                {/*
                  L1: a plain label, not a heading. Its prototype's facet rows
                  are `<b>模型</b>` inside an unlabelled filter block; promoting
                  them to `<h3>` would invent document structure the page does
                  not have (and would follow the page `<h1>` with a level
                  skipped, since that prototype has no `<h2>` above the filters
                  either). `role="group"` plus `aria-labelledby` gives assistive
                  tech the same grouping without the heading semantics.

                  L2/L3 (`headingLevel="h3"`): their prototypes DO write
                  `<h3>用例</h3>` — there the block sits under a real `<h2>`
                  (`按标签浏览` / `全部提示词`), so the level is continuous.
                */}
                {headingLevel === "h3" ? (
                  <h3 id={headingId} className={AXIS_LABEL}>
                    {group.label}
                  </h3>
                ) : (
                  <span id={headingId} className={AXIS_LABEL}>
                    {group.label}
                  </span>
                )}
              </div>

              <div className="flex min-w-0 flex-wrap gap-2 @lg:flex-1">
                {options.map((option) => {
                  const active = isFacetSelected(query, group.key, option.slug);
                  return (
                    <ChipLink
                      key={option.slug}
                      href={queryHref(basePath, toggleFacet(query, group.key, option.slug))}
                      // The reader is working IN this chip row: the whole
                      // point of a facet is that you toggle one, look at what
                      // came back, and toggle the next. Letting `next/link`
                      // restore scroll to the top of the document threw them
                      // away from the control they were using — on L1 the chip
                      // block sits ~300px down and the result region below it,
                      // so every filter cost a scroll back. The URL is still
                      // the state; only the viewport stays put.
                      scroll={false}
                      label={option.label}
                      count={option.count}
                      active={active}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
