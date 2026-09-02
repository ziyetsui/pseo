import { Rail } from "@/components/ui/Rail";
import { StateBlock } from "@/components/ui/StateBlock";
import type { Locale, PromptSummary } from "@/lib/content/types";
import { PromptCard, type PromptCardVariant } from "@/features/prompt/PromptCard";

export interface PromptRailProps {
  /** Accessible name of the scroll region, e.g. `Nano Banana Pro 图片提示词`. */
  label: string;
  prompts: readonly PromptSummary[];
  locale: Locale;
  /**
   * Namespace for the `<pre>` id inside each card. Required: this page renders
   * the same prompt in several rails, and two cards sharing a DOM id would
   * break the copy button's `aria-controls` target.
   */
  idPrefix: string;
  /** Show at most this many cards; the rail's "查看全部" link carries the rest. */
  limit?: number;
  /** Give the first card eager, high-priority media (above-the-fold rails only). */
  priorityFirst?: boolean;
  /**
   * Card anatomy. Every rail on this page is the prototype's L2 card, so the
   * default is `compact` rather than the L1 `hub` card.
   */
  variant?: PromptCardVariant;
  emptyMessage?: string;
}

/** A horizontal rail of prompt cards, or an empty state when there are none. */
export function PromptRail({
  label,
  prompts,
  locale,
  idPrefix,
  limit,
  priorityFirst = false,
  variant = "compact",
  emptyMessage = "这里还没有提示词。",
}: PromptRailProps) {
  const visible = limit === undefined ? prompts : prompts.slice(0, limit);
  if (visible.length === 0) return <StateBlock variant="empty" message={emptyMessage} />;

  return (
    <Rail label={label} itemClassName="w-80 md:w-96">
      {visible.map((prompt, index) => (
        <PromptCard
          key={prompt.id}
          prompt={prompt}
          locale={locale}
          variant={variant}
          idPrefix={idPrefix}
          priority={priorityFirst && index === 0}
        />
      ))}
    </Rail>
  );
}
