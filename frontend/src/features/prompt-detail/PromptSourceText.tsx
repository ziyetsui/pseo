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
 *
 * **No height cap.** This block used to be `max-h-96 overflow-auto`, which put
 * a 384px scroll window around the one artifact the whole site exists to hand
 * over — with no fade, no rule and no line count, so nothing even said there
 * was more. It also contradicted this file's own prop doc four lines up. The
 * page is what should be bounded, never the payload: the prompt now renders at
 * its full height and the reader scrolls the page, once, the way they were
 * already scrolling it.
 *
 * What is bounded instead is the MEASURE. `max-w-[85ch]` is exact here because
 * the block is monospace, so `ch` is the character cell: 85 columns is the top
 * of the readable band for code-shaped text, and without it the prompt would
 * set at the full width of the content column now that the disabled generator
 * aside no longer takes a third of it. The frame around this `<pre>` carries
 * `bg-surface`, so the measure reads as a column of text on the payload's own
 * paper rather than as a `<pre>` narrower than its box.
 */
export function PromptSourceText({ id, text, tokens }: PromptSourceTextProps) {
  const segments = splitPromptText(text, tokens);

  return (
    <pre
      id={id}
      // Named for assistive tech: a verbatim payload the reader is meant to
      // take away is worth announcing as one region. It is deliberately NOT
      // focusable any more — `tabIndex={0}` was there for axe's
      // `scrollable-region-focusable` rule, and with the height cap gone (and
      // `whitespace-pre-wrap wrap-anywhere` meaning it never scrolls sideways
      // either) this element does not scroll in any axis, so a tab stop on it
      // would be a stop that does nothing.
      role="group"
      aria-label="提示词原文"
      // No border of its own: it sits inside the payload box, which owns the
      // frame and the bar above it (the prototype's `.payload` / `.payload-body`).
      className="max-w-[85ch] bg-surface p-4 font-mono text-sm leading-relaxed wrap-anywhere whitespace-pre-wrap select-text"
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
