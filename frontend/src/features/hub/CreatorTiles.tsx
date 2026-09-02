import { StateBlock } from "@/components/ui/StateBlock";
import { Avatar } from "@/components/ui/IdentityMark";
import { cardClassName } from "@/components/ui/Card";
import { cx } from "@/components/ui/class-names";
import { hoverTitleClassName } from "@/components/ui/hover";
import { microLabelClassName, singleLineTitleClassName } from "@/components/ui/type-scale";
import { formatCreatorHandle } from "@/lib/content";
import type { CreatorWithCount } from "@/lib/content/types";
import { formatThousands } from "@/lib/format/numbers";

import {
  BrowseTileEdge,
  browseLayout,
  browseTileBodyClassName,
  browseTileShellClassName,
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
 * The line is unchanged; only its weight is. A creator is a PERSON, so the tile
 * leads with the one thing that identifies a person fastest — a 28px round
 * avatar, from the profile picture we already hold, falling back to the first
 * character of the handle when a creator never exposed one. It is decoration
 * (`aria-hidden`): the handle it stands for is written immediately beside it.
 *
 * That identity slot is why this variant does not make the prompt count its
 * figure the way the number tiles do. Here the whole `N 条提示词 · N 赞 · N 藏`
 * line is one micro label under the handle — the same words in the same order,
 * set as the label they always were. The handle takes the single-line tier, so
 * a long handle truncates instead of making one tile taller than its
 * neighbours, and it answers the card's hover with a colour change. The band's
 * accent is the tile's top edge.
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

  const layout = browseLayout(
    visible.map((creator) => creator.count),
    "hub-4",
  );

  return (
    <ul className={className ?? layout.gridClassName}>
      {visible.map((creator, index) => {
        const lead = layout.lead && index === 0;

        return (
          <li key={creator.id} className={layout.cellClassName(index)}>
            <a
              href={creator.url}
              target="_blank"
              rel="noopener nofollow"
              className={cardClassName(
                cx(browseTileShellClassName, browseTileBodyClassName(lead)),
                { interactive: true },
              )}
            >
              <BrowseTileEdge accent={accent} />
              <span className="flex min-w-0 items-center gap-2">
                <Avatar name={creator.handle} src={creator.avatarUrl} />
                <span className={hoverTitleClassName(singleLineTitleClassName("min-w-0"))}>
                  {formatCreatorHandle(creator.handle)}
                </span>
              </span>
              <p className={microLabelClassName("tabular-nums")}>
                {`${creator.count} 条提示词 · ${formatThousands(creator.likes)} 赞 · ${formatThousands(creator.bookmarks)} 藏`}
              </p>
              <span className="sr-only">（外部链接，新窗口打开）</span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
