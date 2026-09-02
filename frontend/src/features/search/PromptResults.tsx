import { StateBlock } from "@/components/ui/StateBlock";
import type { Locale, PromptSummary } from "@/lib/content/types";
import { PromptCard } from "@/features/prompt/PromptCard";

export interface PromptResultsProps {
  prompts: readonly PromptSummary[];
  locale: Locale;
  /** Replaces the default no-results copy — e.g. naming the active filters. */
  emptyMessage?: string;
  /**
   * Rendered inside the no-results block: removal links and a reset link, so a
   * dead end is always recoverable in one click.
   */
  children?: React.ReactNode;
  /** How many leading cards get eager, high-priority media. */
  priorityCount?: number;
  className?: string;
}

/**
 * The result grid. Server-rendered so the first screenful of results is in the
 * HTML for crawlers and for readers without JavaScript.
 */
export function PromptResults({
  prompts,
  locale,
  emptyMessage,
  children,
  priorityCount = 0,
  className,
}: PromptResultsProps) {
  if (prompts.length === 0) {
    return (
      <StateBlock variant="no-results" message={emptyMessage}>
        {children}
      </StateBlock>
    );
  }

  return (
    <ul className={className ?? "grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"}>
      {prompts.map((prompt, index) => (
        <li key={prompt.id} className="flex min-w-0">
          <PromptCard prompt={prompt} locale={locale} priority={index < priorityCount} />
        </li>
      ))}
    </ul>
  );
}
