import { GeometricMark } from "@/components/ui/GeometricMark";
import { MediaFrame } from "@/components/ui/MediaFrame";
import { StateBlock } from "@/components/ui/StateBlock";
import { formatCreatorHandle } from "@/lib/content";

import type { ModelCreator } from "./model-data";

const AVATAR_SIZE = 40;

export interface ModelCreatorsProps {
  creators: readonly ModelCreator[];
  emptyMessage?: string;
}

/**
 * The prototype's `inline-list`: avatar + `@handle` + the number of prompts,
 * flowing on one wrapping row rather than as tiles.
 *
 * Counts are derived from THIS model's prompt subset, so they never repeat the
 * library-wide creator figures. Profiles live on X, so each handle is a plain
 * external link — `nofollow`, because we neither vouch for nor control what a
 * profile shows next. The prototype prints a bare `<b>26</b>`; the unit is
 * carried for assistive tech in a visually hidden span so the number is not
 * announced as a naked integer.
 */
export function ModelCreators({
  creators,
  emptyMessage = "暂无收录的创作者。",
}: ModelCreatorsProps) {
  if (creators.length === 0) return <StateBlock variant="empty" message={emptyMessage} />;

  return (
    <ul className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm font-bold">
      {creators.map((creator) => (
        <li key={creator.id} className="flex items-center gap-2">
          {creator.avatarUrl === null ? (
            <span
              aria-hidden="true"
              className="flex size-10 shrink-0 items-center justify-center border-2 border-foreground bg-muted"
            >
              <GeometricMark shape="circle" color="blue" className="size-4" />
            </span>
          ) : (
            <MediaFrame
              src={creator.avatarUrl}
              alt=""
              width={AVATAR_SIZE}
              height={AVATAR_SIZE}
              className="size-10 shrink-0 border-2 border-foreground md:border-2"
            />
          )}

          <a
            href={creator.url}
            target="_blank"
            rel="noopener nofollow"
            className="inline-flex min-h-11 items-center underline"
          >
            {formatCreatorHandle(creator.handle)}
            <span className="sr-only">（外部链接，新窗口打开）</span>
          </a>

          <span className="font-mono tabular-nums">
            {creator.count}
            <span className="sr-only"> 条提示词</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
