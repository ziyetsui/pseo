import { cx } from "./class-names";

/**
 * Three divider tiers, and the rule that ranks them.
 *
 * The rule is one line: **the denser the rules, the lighter they are drawn.**
 * A card has one internal rule, so it is the full-strength one; a page column
 * has a handful, so they recede; a dense list has dozens, so they are barely
 * there. Applied consistently this keeps a list of thirty rows from reading as
 * dirt while still letting a single rule inside a card do real work.
 *
 * Opacity is deliberately NOT a parameter. Callers pick a tier — "this is a
 * card-internal split" — and the tier owns the number, so two dense lists
 * built by two people cannot end up 15% and 20%. Every tier is drawn at the
 * system's 2px border width on the existing `foreground` token; no new colour
 * and no third border width enter the system here.
 */

export type DividerTier =
  /** Inside a card: media | body. The heavy one — full-strength foreground. */
  | "card"
  /** Between page columns / sections. */
  | "column"
  /** Between rows of a dense list. The lightest. */
  | "row";

export type DividerSide = "top" | "right" | "bottom" | "left";

const TIER: Record<DividerTier, string> = {
  card: "border-foreground",
  column: "border-foreground/70",
  row: "border-foreground/15",
};

const SIDE: Record<DividerSide, string> = {
  top: "border-t-2",
  right: "border-r-2",
  bottom: "border-b-2",
  left: "border-l-2",
};

/**
 * The desktop step, for the one place it applies: a card-internal rule that
 * has to match a card border which is itself 2px on mobile and 4px from `md`.
 * A rule thinner than the frame it sits in reads as a mistake.
 */
const SIDE_THICK: Record<DividerSide, string> = {
  top: "md:border-t-4",
  right: "md:border-r-4",
  bottom: "md:border-b-4",
  left: "md:border-l-4",
};

export interface DividerOptions {
  /**
   * Step up to the 4px desktop border from `md`. Only meaningful for the
   * `card` tier, where the rule has to match the card's own frame. Off by
   * default: everything else in this system draws a 2px rule at every width.
   */
  desktopThick?: boolean;
  className?: string;
}

/**
 * Border utilities for one divider. Returns classes only — the caller decides
 * what element carries them, which is what lets the same tier be a `border-b`
 * on a list row and a `border-r` on a spine.
 */
export function dividerClassName(
  tier: DividerTier,
  side: DividerSide,
  options: DividerOptions = {},
): string {
  const { desktopThick = false, className } = options;
  return cx(SIDE[side], desktopThick ? SIDE_THICK[side] : undefined, TIER[tier], className);
}
