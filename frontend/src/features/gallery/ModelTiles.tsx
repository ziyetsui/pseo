import Link from "next/link";

import { cardClassName, tileShellClassName } from "@/components/ui/Card";
import { StateBlock } from "@/components/ui/StateBlock";
import { cx } from "@/components/ui/class-names";
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

export interface ModelTilesProps {
  /**
   * Model terms restricted to the image subset, with `count` already recomputed
   * over it by `countTermsWithin`.
   */
  models: readonly TaxonomyWithCount[];
  /** The band's accent. Yellow matches the hub's 按模型浏览 band. */
  accent?: SectionAccent;
  emptyMessage?: string;
  className?: string;
}

/**
 * Browse-by-model tiles for the gallery.
 *
 * A model links to its own page only when the repository gave the term a real
 * `href`. A model without one renders as plain text carrying the same count and
 * a visible explanation — never a `#` placeholder and never a link into a route
 * this phase does not ship.
 *
 * Weight and layout come from the shared browse-tile family (`features/hub`), so
 * the L2 bands read as the same object as the hub's: display-scale count, small
 * caption, accent proportion bar, and the biggest model leading the band. The
 * tile's content is unchanged.
 */
export function ModelTiles({
  models,
  accent = "yellow",
  emptyMessage = "当前收录里还没有带模型标注的图片提示词。",
  className,
}: ModelTilesProps) {
  if (models.length === 0) return <StateBlock variant="empty" message={emptyMessage} />;

  const max = models.reduce((best, model) => Math.max(best, model.count), 0);
  const hasLead = leadsGroup(models.map((model) => model.count));

  return (
    <ul className={className ?? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3"}>
      {models.map((model, index) => {
        const label = termLabel(model);
        const share = max === 0 ? 0 : Math.round((model.count / max) * 100);
        const lead = hasLead && index === 0;
        const body = (
          <>
            {lead ? <BrowseTileRank accent={accent} /> : null}
            <h3 className={browseTileTitleClassName(lead)}>{label}</h3>
            {/* Prototype tile line: `136 条 · 46 条热门`. */}
            <BrowseTileCount
              value={model.count}
              caption={`条 · ${model.highValueCount} 条热门`}
              lead={lead}
            />
            <BrowseTileBar share={share} accent={accent} lead={lead} />
          </>
        );

        return (
          <li key={model.id} className={browseTileCellClassName(lead)}>
            {model.href === null ? (
              <div
                data-model-tile={model.slug}
                className={cx(
                  tileShellClassName,
                  "flex flex-col gap-3 border-2 border-foreground bg-muted p-4",
                  "md:border-4",
                )}
              >
                {body}
                <p className="text-xs font-bold tracking-wider uppercase">模型页尚未发布</p>
              </div>
            ) : (
              <Link
                href={model.href}
                data-model-tile={model.slug}
                className={cardClassName(cx(tileShellClassName, browseTileBodyClassName(lead)))}
              >
                {/* The whole tile is the link, exactly as in the prototype —
                    no extra call-to-action line underneath it. */}
                {body}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}
