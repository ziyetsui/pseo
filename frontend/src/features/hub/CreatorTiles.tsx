import { StateBlock } from "@/components/ui/StateBlock";
import { cardClassName } from "@/components/ui/Card";
import type { CreatorWithCount } from "@/lib/content/types";

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
 * Only the count derived from the current data is shown; the prototype's
 * declared per-creator prompt/like/bookmark figures stay out of the render path.
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
            <span className="text-base font-black tracking-tight">@{creator.handle}</span>
            <span className="text-sm font-medium">{creator.count} 条提示词</span>
            <span className="sr-only">（外部链接，新窗口打开）</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
