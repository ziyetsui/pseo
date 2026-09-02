import { CardLink, tileShellClassName } from "@/components/ui/Card";
import { cx } from "@/components/ui/class-names";
import { dividerClassName } from "@/components/ui/dividers";
import { hoverTitleClassName } from "@/components/ui/hover";
import { microLabelClassName } from "@/components/ui/type-scale";
import { StateBlock } from "@/components/ui/StateBlock";
import {
  BrowseTileBar,
  BrowseTileCount,
  browseTileBodyClassName,
  browseTileCellClassName,
  browseTileTitleClassName,
  leadsGroup,
} from "@/features/hub/browse-tile";
import { accentFillClassName, type SectionAccent } from "@/features/hub/section-accent";
import type { TaxonomyWithCount } from "@/lib/content/types";

import { termLabel } from "./image-prompts";

export interface ContentTypeTilesProps {
  /** `listTaxonomies(locale, "contentType")` — counts are library-wide. */
  types: readonly TaxonomyWithCount[];
  /** The type this page publishes; its tile is marked as the current page. */
  currentSlug: string;
  /** The band's accent — different from the model band above it. */
  accent?: SectionAccent;
  emptyMessage?: string;
  className?: string;
}

/**
 * The "other content types" band — the colour-bar variant of the card.
 *
 * Only a type whose repository term carries an `href` becomes a link — in this
 * phase that is the image gallery itself. Video and unlabelled prompts are real
 * content in the data set, so their counts are shown honestly, but their pages
 * do not exist yet and are therefore rendered as plain text with a visible
 * note rather than as links to `/prompts/video`.
 *
 * Same browse-tile family as every other band, in its own accent so the two L2
 * grids do not merge into one another while scrolling. What is added here is
 * the 6px accent stripe across the top, drawn edge to edge and closed with the
 * card-tier rule — the same compartment rule `CardMedia` applies, because the
 * stripe is exactly that: a band of the card, not a decoration floating inside
 * its padding. The padding therefore lives on an inner element rather than on
 * the card itself. The stripe also takes over the leading tile's rank marker
 * (a second accent block directly under a full-width accent stripe reads as a
 * mistake); the lead is still told by its width and by its larger figure, so
 * nothing here is signalled by colour alone.
 *
 * Both numbers and both explanatory notes are unchanged.
 */
export function ContentTypeTiles({
  types,
  currentSlug,
  accent = "blue",
  emptyMessage = "当前收录里还没有内容类型标注。",
  className,
}: ContentTypeTilesProps) {
  if (types.length === 0) return <StateBlock variant="empty" message={emptyMessage} />;

  const max = types.reduce((best, type) => Math.max(best, type.count), 0);
  const hasLead = leadsGroup(types.map((type) => type.count));

  // 6px of the band's accent, then the card-tier rule. `aria-hidden`: the type
  // is named in the heading right below it.
  const stripe = (
    <span
      aria-hidden="true"
      className={cx(
        "block h-1.5 w-full shrink-0",
        accentFillClassName(accent),
        dividerClassName("card", "bottom", { desktopThick: true }),
      )}
    />
  );

  return (
    <ul className={className ?? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3"}>
      {types.map((type, index) => {
        const label = termLabel(type);
        const share = max === 0 ? 0 : Math.round((type.count / max) * 100);
        const lead = hasLead && index === 0;
        const body = (linked: boolean) => (
          <>
            <h3
              className={
                linked
                  ? hoverTitleClassName(browseTileTitleClassName(lead))
                  : browseTileTitleClassName(lead)
              }
            >
              {label}
            </h3>
            {/* Prototype tile line: `N 条 · N 条热门`. */}
            <BrowseTileCount
              value={type.count}
              caption={`条 · ${type.highValueCount} 条热门`}
              lead={lead}
            />
            <BrowseTileBar share={share} accent={accent} lead={lead} />
          </>
        );
        // The stripe is full-bleed, so the tile's padding moves off the card
        // and onto this inner column. It is still the family's padding.
        const inner = cx("flex flex-1 flex-col", browseTileBodyClassName(lead));

        return (
          <li key={type.id} className={browseTileCellClassName(lead)}>
            {type.href === null ? (
              <div
                data-content-type={type.slug}
                className={cx(
                  tileShellClassName,
                  "flex flex-col border-2 border-foreground bg-muted md:border-4",
                )}
              >
                {stripe}
                <div className={inner}>
                  {body(false)}
                  <p className={microLabelClassName()}>
                    {type.slug === "unknown" ? "未标注类型，不会生成独立页面" : "该类型页面尚未发布"}
                  </p>
                </div>
              </div>
            ) : (
              <CardLink
                href={type.href}
                data-content-type={type.slug}
                aria-current={type.slug === currentSlug ? "page" : undefined}
                className={tileShellClassName}
              >
                {/* The whole tile is the link, as in the prototype; the current
                    page is marked with `aria-current` rather than a caption. */}
                {stripe}
                <div className={inner}>{body(true)}</div>
              </CardLink>
            )}
          </li>
        );
      })}
    </ul>
  );
}
