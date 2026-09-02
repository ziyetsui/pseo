import { GeometricMark } from "@/components/ui/GeometricMark";
import { MediaFrame } from "@/components/ui/MediaFrame";
import { StateBlock } from "@/components/ui/StateBlock";
import { cardClassName } from "@/components/ui/Card";
import { formatCreatorHandle } from "@/lib/content";

import type { ModelCreator } from "./model-data";

const AVATAR_SIZE = 48;

export interface ModelCreatorsProps {
  creators: readonly ModelCreator[];
  emptyMessage?: string;
}

/**
 * The people behind THIS model's prompts. Counts are derived from the model's
 * own prompt subset, so they never repeat the library-wide creator figures.
 * Profiles live on X, so each tile is a plain external link — `nofollow`
 * because we neither vouch for nor control what a profile shows next.
 */
export function ModelCreators({
  creators,
  emptyMessage = "暂无收录的创作者。",
}: ModelCreatorsProps) {
  if (creators.length === 0) return <StateBlock variant="empty" message={emptyMessage} />;

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {creators.map((creator) => (
        <li key={creator.id} className="flex">
          <a
            href={creator.url}
            target="_blank"
            rel="noopener nofollow"
            className={cardClassName("w-full flex-row items-center gap-4 p-4 no-underline")}
          >
            {creator.avatarUrl === null ? (
              <span
                aria-hidden="true"
                className="flex size-12 shrink-0 items-center justify-center border-2 border-foreground bg-muted"
              >
                <GeometricMark shape="circle" color="blue" className="size-5" />
              </span>
            ) : (
              <MediaFrame
                src={creator.avatarUrl}
                alt={`${formatCreatorHandle(creator.handle)} 的头像`}
                width={AVATAR_SIZE}
                height={AVATAR_SIZE}
                className="size-12 shrink-0 border-2 border-foreground md:border-2"
              />
            )}

            <span className="flex flex-col gap-1">
              <span className="text-base font-black tracking-tight">
                {formatCreatorHandle(creator.handle)}
              </span>
              <span className="text-sm font-medium">{creator.count} 条提示词</span>
            </span>
            <span className="sr-only">（外部链接，新窗口打开）</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
