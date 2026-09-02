import { CardLink, tileShellClassName } from "@/components/ui/Card";
import { cx } from "@/components/ui/class-names";
import { StateBlock } from "@/components/ui/StateBlock";
import {
  BrowseTileBar,
  BrowseTileCount,
  BrowseTileRank,
  browseTileBodyClassName,
  browseTileCellClassName,
  browseTileTitleClassName,
  leadsGroup,
} from "@/features/hub/browse-tile";
import type { SectionAccent } from "@/features/hub/section-accent";
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
 * The "other content types" band.
 *
 * Only a type whose repository term carries an `href` becomes a link — in this
 * phase that is the image gallery itself. Video and unlabelled prompts are real
 * content in the data set, so their counts are shown honestly, but their pages
 * do not exist yet and are therefore rendered as plain text with a visible
 * note rather than as links to `/prompts/video`.
 *
 * Same browse-tile family as every other band, in its own accent so the two L2
 * grids do not merge into one another while scrolling.
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

  return (
    <ul className={className ?? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3"}>
      {types.map((type, index) => {
        const label = termLabel(type);
        const share = max === 0 ? 0 : Math.round((type.count / max) * 100);
        const lead = hasLead && index === 0;
        const body = (
          <>
            {lead ? <BrowseTileRank accent={accent} /> : null}
            <h3 className={browseTileTitleClassName(lead)}>{label}</h3>
            {/* Prototype tile line: `N 条 · N 条热门`. */}
            <BrowseTileCount
              value={type.count}
              caption={`条 · ${type.highValueCount} 条热门`}
              lead={lead}
            />
            <BrowseTileBar share={share} accent={accent} lead={lead} />
          </>
        );

        return (
          <li key={type.id} className={browseTileCellClassName(lead)}>
            {type.href === null ? (
              <div
                data-content-type={type.slug}
                className={cx(
                  tileShellClassName,
                  "flex flex-col gap-3 border-2 border-foreground bg-muted p-4 md:border-4",
                )}
              >
                {body}
                <p className="text-xs font-bold tracking-wider uppercase">
                  {type.slug === "unknown" ? "未标注类型，不会生成独立页面" : "该类型页面尚未发布"}
                </p>
              </div>
            ) : (
              <CardLink
                href={type.href}
                data-content-type={type.slug}
                aria-current={type.slug === currentSlug ? "page" : undefined}
                className={cx(tileShellClassName, browseTileBodyClassName(lead))}
              >
                {/* The whole tile is the link, as in the prototype; the current
                    page is marked with `aria-current` rather than a caption. */}
                {body}
              </CardLink>
            )}
          </li>
        );
      })}
    </ul>
  );
}
