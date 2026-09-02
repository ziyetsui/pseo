import { Avatar } from "@/components/ui/IdentityMark";
import { StateBlock } from "@/components/ui/StateBlock";
import { formatCreatorHandle } from "@/lib/content";

import type { ModelCreator } from "./model-data";

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
 *
 * The face is the shared `Avatar` at its 40px size, not a private 40px square
 * built here: a person gets the same round mark on this page as on the hub's
 * creator tiles, and a creator with no picture falls back to the initial of
 * the handle written immediately beside it rather than to a shape that says
 * nothing.
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
          <Avatar name={creator.handle} src={creator.avatarUrl} size="md" />

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
