import { cx } from "./class-names";

/**
 * The three — and only three — title tiers.
 *
 * A continuous type ramp (14 / 16 / 18 / 20 / 24…) produces steps too small to
 * read as hierarchy: forty cards set one notch apart look like forty cards set
 * the same. Three tiers pulled far apart do the opposite — a reader can tell
 * which of two adjacent things is the more important one without comparing
 * them.
 *
 * They are class helpers rather than components because a title's ELEMENT is
 * the caller's decision (heading levels must stay continuous per page, and
 * some of these tiers sit on a `<span>` or a `<p>`). The tier decides weight,
 * size, leading and overflow; nothing else.
 */

/**
 * Tier 1 — display. The heaviest weight, tight leading, clamped to two lines.
 *
 * The clamp is part of the tier, not an extra: a display title is only allowed
 * to be a poster because it can never grow past two lines and shove the rest
 * of the card down.
 */
export function displayTitleClassName(className?: string): string {
  return cx("line-clamp-2 text-2xl leading-none font-black tracking-tighter md:text-3xl", className);
}

/**
 * Tier 2 — single line. Bold, and ALWAYS truncated: a card whose title is
 * allowed to wrap is a card whose height depends on its title, which is what
 * makes a grid of them ragged. The full string stays in the DOM (and so in the
 * accessible name and in find-in-page); only the painted line is cut.
 */
export function singleLineTitleClassName(className?: string): string {
  return cx("truncate text-sm font-bold", className);
}

/**
 * Tier 3 — micro label. Every piece of metadata on the site: small, heaviest
 * weight, upper case, and opened to `--tracking-micro` (0.16em).
 *
 * The tracking is the whole point. At 11-12px a line of dense bold text reads
 * as unformatted body copy; the same line opened to 0.16em reads as a label
 * somebody designed. It is a token, so no caller ever types the number.
 *
 * `uppercase` is a no-op on CJK glyphs, so a Chinese label keeps its
 * characters and gains only the tracking.
 */
export function microLabelClassName(className?: string): string {
  return cx("tracking-micro text-xs font-black uppercase", className);
}
