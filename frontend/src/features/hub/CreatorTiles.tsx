import { StateBlock } from "@/components/ui/StateBlock";
import { cardClassName } from "@/components/ui/Card";
import { formatCreatorHandle } from "@/lib/content";
import type { CreatorWithCount } from "@/lib/content/types";
import { formatThousands } from "@/lib/format/numbers";

export interface CreatorTilesProps {
  creators: readonly CreatorWithCount[];
  limit?: number;
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
 */
export function CreatorTiles({
  creators,
  limit,
  emptyMessage = "暂无收录的创作者。",
  className,
}: CreatorTilesProps) {
  const visible = limit === undefined ? creators : creators.slice(0, limit);
  if (visible.length === 0) return <StateBlock variant="empty" message={emptyMessage} />;

  return (
    <ul className={className ?? "grid gap-4 sm:grid-cols-2 lg:grid-cols-4"}>
      {visible.map((creator) => (
        <li key={creator.id} className="flex">
          <a
            href={creator.url}
            target="_blank"
            rel="noopener nofollow"
            className={cardClassName("w-full gap-2 p-4 no-underline")}
          >
            <span className="text-base font-black tracking-tight">
              {formatCreatorHandle(creator.handle)}
            </span>
            <span className="font-mono text-sm font-medium tabular-nums">
              {creator.count} 条提示词 · {formatThousands(creator.likes)} 赞 ·{" "}
              {formatThousands(creator.bookmarks)} 藏
            </span>
            <span className="sr-only">（外部链接，新窗口打开）</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
