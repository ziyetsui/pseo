import { splitPromptText } from "./variable-view";

export interface PromptSourceTextProps {
  id: string;
  /** The prompt exactly as published. Rendered in full, never truncated. */
  text: string;
  tokens: readonly string[];
}

/**
 * The published prompt, verbatim, in a monospace `<pre>` whose variable tokens
 * are wrapped in `<mark>`.
 *
 * `<mark>` carries the meaning semantically (not colour alone), and because the
 * marks contain the token text itself, selecting or copying the `<pre>` still
 * yields byte-for-byte the original prompt.
 */
export function PromptSourceText({ id, text, tokens }: PromptSourceTextProps) {
  const segments = splitPromptText(text, tokens);

  return (
    <pre
      id={id}
      // Same contract as `PromptText`: a scrollable region must be reachable by
      // keyboard, and the name is only legal because of the explicit role.
      tabIndex={0}
      role="group"
      aria-label="提示词原文"
      // No border of its own: it sits inside the payload box, which owns the
      // frame and the bar above it (the prototype's `.payload` / `.payload-body`).
      className="max-h-96 overflow-auto bg-surface p-4 font-mono text-sm leading-relaxed wrap-anywhere whitespace-pre-wrap select-text"
    >
      {segments.map((segment, index) =>
        segment.token ? (
          <mark key={index} className="bg-accent-yellow px-0.5 font-bold text-foreground">
            {segment.text}
          </mark>
        ) : (
          <span key={index}>{segment.text}</span>
        ),
      )}
    </pre>
  );
}
