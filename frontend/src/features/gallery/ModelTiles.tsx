import type { ReactNode } from "react";

import { ActionRow } from "@/components/ui/ActionRow";
import { CardLink } from "@/components/ui/Card";
import { IdentityMark } from "@/components/ui/IdentityMark";
import { StateBlock } from "@/components/ui/StateBlock";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { cx } from "@/components/ui/class-names";
import { hoverTitleClassName } from "@/components/ui/hover";
import { microLabelClassName } from "@/components/ui/type-scale";
import {
  BrowseTileCount,
  BrowseTileEdge,
  browseLayout,
  browseTileBodyClassName,
  browseTileShellClassName,
  browseTileTitleClassName,
} from "@/features/hub/browse-tile";
import { axisSectionAccent, type SectionAccent } from "@/features/hub/section-accent";
import type { TaxonomyWithCount } from "@/lib/content/types";

import { termLabel, tileActionLabel } from "./image-prompts";

export interface ModelTilesProps {
  /**
   * Model terms restricted to the image subset, with `count` already recomputed
   * over it by `countTermsWithin`.
   */
  models: readonly TaxonomyWithCount[];
  /**
   * The band's accent, painted as the tile's top edge. Defaults to the MODEL
   * axis's colour from the shared
   * taxonomy map — the same one the hub's 按模型浏览 band and every 模型 chip
   * row read. It used to default to the third step of the band rotation
   * (yellow), so one taxonomy axis was red on L1 and yellow on L2 and the
   * colour told the reader nothing. A band that stands for an axis does not
   * get to pick.
   */
  accent?: SectionAccent;
  emptyMessage?: string;
  className?: string;
}

/**
 * Browse-by-model tiles for the gallery — the identity variant of the card.
 *
 * A model links to its own page only when the repository gave the term a real
 * `href`. A model without one renders as plain text carrying the same count and
 * a visible explanation — never a `#` placeholder and never a link into a route
 * this phase does not ship.
 *
 * Weight and layout come from the shared browse-tile family (`features/hub`), so
 * the L2 bands read as the same object as the hub's: display-scale count,
 * small caption, accent top edge, and the biggest model leading the band.
 *
 * Three slots are pushed into that chassis here and nothing else changes:
 *
 * - `IdentityMark` — a monogram derived from the model's own name. The
 *   reference puts each vendor's SVG logo in this square; we do not ship other
 *   companies' marks, and the monogram identifies the same thing from data we
 *   already hold. See `components/ui/IdentityMark`.
 * - `StatusBadge` — the tile's one verdict, `N 条热门`. Same words it has
 *   always carried, moved out of the count caption and onto the stamp so the
 *   two numbers stop reading as one sentence.
 * - `ActionRow` — the tile's affordance, in the same `查看全部 N 条` wording the
 *   rails above already use (`tileActionLabel`); the arrow is the shared
 *   `Chevron`, and only the gap between them animates on hover.
 */
export function ModelTiles({
  models,
  accent = axisSectionAccent("model"),
  emptyMessage = "当前收录里还没有带模型标注的图片提示词。",
  className,
}: ModelTilesProps) {
  if (models.length === 0) return <StateBlock variant="empty" message={emptyMessage} />;

  const layout = browseLayout(
    models.map((model) => model.count),
    "gallery-3",
  );

  return (
    <ul className={className ?? layout.gridClassName}>
      {models.map((model, index) => {
        const label = termLabel(model);
        const lead = layout.lead && index === 0;

        /**
         * `footer` is the tile's last line: the action row when the tile is a
         * link, the "no page yet" note when it is not. `linked` decides only
         * whether the title answers the card's hover — the plain-text tile has
         * no `group` to hang that off.
         */
        const body = (footer: ReactNode, linked: boolean) => (
          <>
            <BrowseTileEdge accent={accent} />
            <div className="flex items-start justify-between gap-3">
              <IdentityMark name={label} />
              <StatusBadge>{model.highValueCount} 条热门</StatusBadge>
            </div>
            <h3
              className={
                linked
                  ? hoverTitleClassName(browseTileTitleClassName(lead))
                  : browseTileTitleClassName(lead)
              }
            >
              {label}
            </h3>
            {/* Prototype tile line: `136 条`; the 热门 half is the badge above. */}
            <BrowseTileCount value={model.count} caption="条" lead={lead} />
            {/* The footer travels to the bottom on its own `mt-auto`.
                (`ActionRow` no longer brings one — see its `pushToBottom`
                prop.) */}
            <div className="mt-auto">{footer}</div>
          </>
        );

        return (
          <li key={model.id} className={layout.cellClassName(index)}>
            {model.href === null ? (
              <div
                data-model-tile={model.slug}
                className={cx(
                  browseTileShellClassName,
                  // `relative` is the chassis's own; a plain `<div>` tile has
                  // to declare it so the accent edge has something to pin to.
                  "relative flex flex-col gap-3 border-2 border-foreground bg-muted p-4",
                  "md:border-4",
                )}
              >
                {body(<p className={microLabelClassName()}>模型页尚未发布</p>, false)}
              </div>
            ) : (
              <CardLink
                href={model.href}
                data-model-tile={model.slug}
                className={cx(browseTileShellClassName, browseTileBodyClassName(lead))}
              >
                {/* The whole tile is the link, exactly as in the prototype —
                    the action row is a `<span>`, not a second focusable
                    control for the same destination. */}
                {body(<ActionRow label={tileActionLabel(model.count)} divider />, true)}
              </CardLink>
            )}
          </li>
        );
      })}
    </ul>
  );
}
