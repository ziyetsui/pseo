import type { ReactNode } from "react";

import { HairlineList, HairlineRow } from "@/components/ui/HairlineList";
import { microLabelClassName } from "@/components/ui/type-scale";
import { formatCreatorHandle } from "@/lib/content/creator-handle";
import { extractVariables } from "@/lib/content/variables";
import type { PromptSummary } from "@/lib/content/types";

/**
 * A model page's secondary prompt bands, as 44px hairline rows instead of
 * cards.
 *
 * 近期热门 and 带变量的提示词 are both **100% subsets** of 全部提示词 on the
 * same page — verified slug by slug — so every card they drew was a second
 * render of a card already on the page: the same thumbnail, the same title, the
 * same mono excerpt, the same action row, a few thousand pixels apart. What
 * each band adds over 全部提示词 is one bit per prompt ("this one is in the
 * trending window", "this one carries placeholders"), and it was charging
 * ~266px and ~430px per card to deliver it.
 *
 * A row carries the title as the link to the prompt, the creator, and one micro
 * label — the rank for the ranked band, the prompt's own first variable token
 * for the variable band. The full card renders once per page, in 全部提示词,
 * where the reader can copy it. Headings, section counts and the ranking order
 * are untouched: this is a change of weight, not of content.
 *
 * `href` is the prompt's own detail page rather than a fragment pointing at its
 * card further down — an id inside a card is not a destination the page
 * guarantees, and the row's job is to open the prompt.
 */

export interface ModelPromptListProps {
  prompts: readonly PromptSummary[];
  /** The row's one micro label, set at the end of the row. */
  meta: (prompt: PromptSummary, index: number) => ReactNode;
}

export function ModelPromptList({ prompts, meta }: ModelPromptListProps) {
  return (
    <HairlineList className="max-w-3xl">
      {prompts.map((prompt, index) => (
        <HairlineRow
          key={prompt.id}
          href={prompt.href}
          last={index === prompts.length - 1}
          meta={<span className={microLabelClassName()}>{meta(prompt, index)}</span>}
        >
          {/* Title and creator on one baseline where there is room, stacked
              below `sm`. The title truncates rather than wrapping so a row
              stays one row: these titles are the opening words of the prompt
              itself and run to 70+ characters. */}
          <span className="flex min-w-0 flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-2">
            <span className="truncate font-bold">{prompt.title}</span>
            <span className={microLabelClassName("shrink-0 text-foreground/70")}>
              {formatCreatorHandle(prompt.creator.handle)}
            </span>
          </span>
        </HairlineRow>
      ))}
    </HairlineList>
  );
}

/** `01`, `02`, `03` — the band's own ranking order, said out loud. */
export function rankLabel(index: number): string {
  return String(index + 1).padStart(2, "0");
}

/**
 * The prompt's first placeholder (`[COUNTRY]`), counted from its own text —
 * never a literal. `null` when the text carries none, which cannot happen for a
 * prompt the repository put in `listPromptsWithVariables` but is handled rather
 * than assumed.
 */
export function firstVariableToken(prompt: PromptSummary): string | null {
  return extractVariables(prompt.promptText)[0]?.token ?? null;
}
