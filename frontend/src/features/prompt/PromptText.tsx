import { ExpandToggle } from "./ExpandToggle";

export interface PromptTextProps {
  /** Id of the `<pre>`. `CopyPromptButton.targetId` points at the same value. */
  id: string;
  text: string;
  /** Wraps the text in a collapsible clamp. Defaults to `true`. */
  expandable?: boolean;
  className?: string;
}

/**
 * The prompt itself, verbatim, in a monospace `<pre>`.
 *
 * Truncation is presentation only: whatever string it is handed is rendered in
 * full into the DOM, so the copy button and manual text selection always get
 * exactly what the reader sees claimed.
 */
export function PromptText({ id, text, expandable = true, className }: PromptTextProps) {
  const pre = (
    <pre
      id={id}
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
