/**
 * The smallest possible inline-Markdown reader for fixture article bodies.
 *
 * Article paragraphs are plain strings that occasionally use three inline
 * conventions: `` `code` ``, `**bold**` and `[label](https://…)`. Everything
 * else — including bare bracket groups such as `[COUNTRY]`, which appear
 * constantly in prompt copy — stays literal text.
 *
 * It returns tokens instead of HTML on purpose: the renderer maps them to real
 * React elements, so no article string ever reaches `dangerouslySetInnerHTML`
 * and no HTML sanitiser (or Markdown dependency) is needed.
 */

export type InlineToken =
  | { type: "text"; value: string }
  | { type: "code"; value: string }
  | { type: "strong"; value: string }
  | { type: "link"; value: string; href: string };

/** code | bold | link — links are restricted to absolute http(s) URLs. */
const PATTERN = /`([^`\n]+)`|\*\*([^*\n]+)\*\*|\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g;

export function renderInlineMarkdown(input: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  let cursor = 0;

  PATTERN.lastIndex = 0;
  let match = PATTERN.exec(input);
  while (match !== null) {
    if (match.index > cursor) {
      tokens.push({ type: "text", value: input.slice(cursor, match.index) });
    }

    const [, code, strong, linkLabel, linkHref] = match;
    if (code !== undefined) {
      tokens.push({ type: "code", value: code });
    } else if (strong !== undefined) {
      tokens.push({ type: "strong", value: strong });
    } else if (linkLabel !== undefined && linkHref !== undefined) {
      tokens.push({ type: "link", value: linkLabel, href: linkHref });
    }

    cursor = match.index + match[0].length;
    match = PATTERN.exec(input);
  }

  if (cursor < input.length) {
    tokens.push({ type: "text", value: input.slice(cursor) });
  }

  return tokens;
}
