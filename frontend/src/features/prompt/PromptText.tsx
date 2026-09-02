import { ExpandToggle } from "./ExpandToggle";

export interface PromptTextProps {
  /** Id of the `<pre>`. `CopyPromptButton.targetId` points at the same value. */
  id: string;
  text: string;
  /** Wraps the text in a collapsible clamp. Defaults to `true`. */
  expandable?: boolean;
  /** Accessible name of the scrollable `<pre>`. */
  label?: string;
  className?: string;
}

/**
 * The prompt itself, verbatim, in a monospace `<pre>`.
 *
 * Truncation is presentation only: whatever string it is handed is rendered in
 * full into the DOM, so the copy button and manual text selection always get
 * exactly what the reader sees claimed.
 */
export function PromptText({
  id,
  text,
  expandable = true,
  label = "提示词原文",
  className,
}: PromptTextProps) {
  const pre = (
    <pre
      id={id}
      // Keyboard access for a region a mouse can scroll (axe
      // `scrollable-region-focusable`, WCAG 2.1.1). `role="group"` is what makes
      // the label legal: `aria-label` on a role-less element is prohibited ARIA
      // and would trade one axe violation for another.
      tabIndex={0}
      role="group"
      aria-label={label}
      className={
        className ??
        "overflow-x-auto border-2 border-foreground bg-muted p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap select-text md:text-sm"
      }
    >
      {text}
    </pre>
  );

  if (!expandable) return pre;

  return <ExpandToggle contentId={id}>{pre}</ExpandToggle>;
}
