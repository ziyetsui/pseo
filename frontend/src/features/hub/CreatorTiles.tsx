import { StateBlock } from "@/components/ui/StateBlock";
import { cardClassName, tileShellClassName } from "@/components/ui/Card";
import { cx } from "@/components/ui/class-names";
import { formatCreatorHandle } from "@/lib/content";
import type { CreatorWithCount } from "@/lib/content/types";
import { formatThousands } from "@/lib/format/numbers";

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

export interface CreatorTilesProps {
  creators: readonly CreatorWithCount[];
  limit?: number;
  /** The band's accent, from `section-accent`. */
  accent?: SectionAccent;
  emptyMessage?: string;
  className?: string;
}

/**
 * The people whose posts these prompts came from. Their profiles live off-site,
 * so each tile is a plain external link — `nofollow` because we neither vouch
 * for nor control what an X profile shows next.
 *
 * Every figure — the prompt count and the like/bookmark sums — is aggregated
 * from the prompts currently in the library, exactly as the prototype's
 * `N 条提示词 · N 赞 · N 藏` line reads. The prototype's own declared
 * per-creator numbers stay out of the render path; a creator whose posts never
 * exposed a metric shows `—`, never `0`.
 *
 * The line is unchanged; only its weight is. The prompt count is the figure and
 * the rest of the line is its caption, which is what makes this band a member of
 * the same tile family as the taxonomy and collection grids rather than a third
 * card design. The proportion bar reads against the busiest creator shown.
 */
export function CreatorTiles({
  creators,
  limit,
  accent = "blue",
  emptyMessage = "暂无收录的创作者。",
  className,
}: CreatorTilesProps) {
  const visible = limit === undefined ? creators : creators.slice(0, limit);
  if (visible.length === 0) return <StateBlock variant="empty" message={emptyMessage} />;

  const max = visible.reduce((best, creator) => Math.max(best, creator.count), 0);
  const hasLead = leadsGroup(visible.map((creator) => creator.count));

  return (
    <ul className={className ?? "grid gap-4 sm:grid-cols-2 lg:grid-cols-4"}>
      {visible.map((creator, index) => {
        const share = max === 0 ? 0 : Math.round((creator.count / max) * 100);
        const lead = hasLead && index === 0;

        return (
          <li key={creator.id} className={browseTileCellClassName(lead)}>
            <a
              href={creator.url}
              target="_blank"
              rel="noopener nofollow"
              className={cardClassName(cx(tileShellClassName, browseTileBodyClassName(lead)))}
            >
              {lead ? <BrowseTileRank accent={accent} /> : null}
              <span className={browseTileTitleClassName(lead)}>
                {formatCreatorHandle(creator.handle)}
              </span>
              <BrowseTileCount
                value={creator.count}
                caption={`条提示词 · ${formatThousands(creator.likes)} 赞 · ${formatThousands(creator.bookmarks)} 藏`}
                lead={lead}
              />
              <BrowseTileBar share={share} accent={accent} lead={lead} />
              <span className="sr-only">（外部链接，新窗口打开）</span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
