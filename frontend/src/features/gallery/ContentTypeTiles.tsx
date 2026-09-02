import { CardLink } from "@/components/ui/Card";
import { cx } from "@/components/ui/class-names";
import { hoverTitleClassName } from "@/components/ui/hover";
import { microLabelClassName } from "@/components/ui/type-scale";
import { StateBlock } from "@/components/ui/StateBlock";
import {
  BrowseTileCount,
  BrowseTileEdge,
  browseLayout,
  browseTileBodyClassName,
  browseTileShellClassName,
  browseTileTitleClassName,
} from "@/features/hub/browse-tile";
import type { SectionAccent } from "@/features/hub/section-accent";
import type { TaxonomyWithCount } from "@/lib/content/types";

import { termLabel } from "./image-prompts";

export interface ContentTypeTilesProps {
  /** `listTaxonomies(locale, "contentType")` — counts are library-wide. */
  types: readonly TaxonomyWithCount[];
  /** The type this page publishes; its tile is marked as the current page. */
  currentSlug: string;
  /**
   * The band's accent — different from the model band above it.
   *
   * A content type is not one of the query's taxonomy axes (`model`,
   * `useCase`, `technique`, `style`, `subject`), so it has no entry in the
   * shared axis map and legitimately takes a rotation colour: it is the one L2
   * grid that may pick, and it picks a value the 按模型浏览 band above it does
   * not use. `ModelTiles`, which IS an axis, reads the map instead.
   */
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
 * grids do not merge into one another while scrolling. The accent is the
 * family's `BrowseTileEdge` — 6px pinned inside the top of the frame — and the
 * lead is told by its width and by its larger figure, so nothing here is
 * signalled by colour alone.
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

  const layout = browseLayout(
    types.map((type) => type.count),
    "gallery-3",
  );

  return (
    <ul className={className ?? layout.gridClassName}>
      {types.map((type, index) => {
        const label = termLabel(type);
        const lead = layout.lead && index === 0;
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
          </>
        );

        return (
          <li key={type.id} className={layout.cellClassName(index)}>
            {type.href === null ? (
              <div
                data-content-type={type.slug}
                className={cx(
                  browseTileShellClassName,
                  // `relative` is the chassis's own; a plain `<div>` tile has
                  // to declare it so the accent edge has something to pin to.
                  "relative flex flex-col border-2 border-foreground bg-muted md:border-4",
                  browseTileBodyClassName(lead),
                )}
              >
                <BrowseTileEdge accent={accent} />
                {body(false)}
                <p className={microLabelClassName()}>
                  {type.slug === "unknown" ? "未标注类型，不会生成独立页面" : "该类型页面尚未发布"}
                </p>
              </div>
            ) : (
              <CardLink
                href={type.href}
                data-content-type={type.slug}
                aria-current={type.slug === currentSlug ? "page" : undefined}
                className={cx(browseTileShellClassName, browseTileBodyClassName(lead))}
              >
                {/* The whole tile is the link, as in the prototype; the current
                    page is marked with `aria-current` rather than a caption. */}
                <BrowseTileEdge accent={accent} />
                {body(true)}
              </CardLink>
            )}
          </li>
        );
      })}
    </ul>
  );
}
