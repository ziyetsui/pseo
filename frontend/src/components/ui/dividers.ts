import { cx } from "./class-names";

/**
 * Two divider tiers, and the rule that ranks them.
 *
 * The rule is one line: **the denser the rules, the lighter they are drawn.**
 * A card has one internal rule, so it is the strong one; a dense list has
 * dozens, so they are barely there. Applied consistently this keeps a list of
 * thirty rows from reading as dirt while still letting a single rule inside a
 * card do real work.
 *
 * Opacity is deliberately NOT a parameter. Callers pick a tier — "this is a
 * card-internal split" — and the tier owns the number, so two dense lists
 * built by two people cannot end up 15% and 20%. `styles/globals.css` renders
 * every one of these as a single translucent hairline, ranked by ink:
 *
 * | tier | painted as |
 * | --- | --- |
 * | `card` | `--border-strong` (20%) — a card frame, or a split inside one |
 * | `row` | `--border` (11%) — the rows of a dense list |
 *
 * There used to be a third `column` tier at 70% ink, and a `desktopThick`
 * option that stepped the card tier to 4px from `md`. Both existed because the
 * previous system ranked its rules by WIDTH as well as by ink; with one
 * hairline width there is nothing for either to say, so `column` collapsed into
 * `card` and the desktop step is simply what the card tier always draws. Both
 * are removed from the API rather than accepted and ignored — passing either is
 * a type error.
 */

export type DividerTier =
  /** A card frame, or a split inside a card: media | body. The strong one. */
  | "card"
  /** Between rows of a dense list. The lightest. */
  | "row";

export type DividerSide =
  | "top"
  | "right"
  | "bottom"
  | "left"
  /** All four sides — a frame rather than a split. See `DividerSide` note. */
  | "all";

/**
 * Which surface the rule is drawn ON.
 *
 * Every tier is a strength, not a colour: "the lightest of three" means 15% of
 * whatever the ink is here. On the page that ink is `foreground`; on the site's
 * one inverse surface (the footer, `bg-foreground text-surface`) `foreground`
 * IS the background, so a 15% foreground rule is black on black — no rule at
 * all. Naming the surface picks the right ink, which is what stops the footer
 * having to override the hue afterwards with `!`.
 */
export type DividerSurface = "canvas" | "inverse";

/**
 * Breakpoint a rule starts at. Tailwind's preflight zeroes every border width,
 * so prefixing only the WIDTH is enough to make the rule absent below it — the
 * colour can stay unprefixed because a 0-width border paints nothing.
 */
export type DividerFrom = "sm" | "md" | "lg";

const TIER: Record<DividerSurface, Record<DividerTier, string>> = {
  canvas: {
    card: "border-foreground",
    row: "border-foreground/15",
  },
  inverse: {
    card: "border-surface",
    row: "border-surface/15",
  },
};

/**
 * Width utilities, written out per breakpoint because Tailwind reads source
 * text: a template-built `${prefix}border-t-2` is a class it never sees.
 */
const SIDE: Record<"base" | DividerFrom, Record<DividerSide, string>> = {
  base: {
    top: "border-t-2",
    right: "border-r-2",
    bottom: "border-b-2",
    left: "border-l-2",
    all: "border-2",
  },
  sm: {
    top: "sm:border-t-2",
    right: "sm:border-r-2",
    bottom: "sm:border-b-2",
    left: "sm:border-l-2",
    all: "sm:border-2",
  },
  md: {
    top: "md:border-t-2",
    right: "md:border-r-2",
    bottom: "md:border-b-2",
    left: "md:border-l-2",
    all: "md:border-2",
  },
  lg: {
    top: "lg:border-t-2",
    right: "lg:border-r-2",
    bottom: "lg:border-b-2",
    left: "lg:border-l-2",
    all: "lg:border-2",
  },
};

/**
 * The desktop step. It is inert on its own — every width resolves to one
 * hairline — but the frames written inline across `src/features/**` and by
 * `cardClassName` still carry `md:border-4`, and a helper that disagreed with
 * them would be the odd one out the day those call sites are cleaned up. The
 * card tier always emits it; the `row` tier never does, because a list rule has
 * no frame to agree with.
 */
const SIDE_THICK: Record<DividerSide, string> = {
  top: "md:border-t-4",
  right: "md:border-r-4",
  bottom: "md:border-b-4",
  left: "md:border-l-4",
  all: "md:border-4",
};

export interface DividerOptions {
  /**
   * Surface the rule is drawn on. `canvas` (default) is every normal page
   * surface; `inverse` is the footer's `bg-foreground`.
   */
  surface?: DividerSurface;
  /**
   * Scope the whole rule to a breakpoint — `from: "lg"` draws nothing below
   * `lg`. Saves a caller writing the prefixed utilities by hand (which is what
   * the footer's column rule used to do, because it must only appear once the
   * columns actually sit side by side).
   */
  from?: DividerFrom;
  className?: string;
}

/**
 * Border utilities for one divider. Returns classes only — the caller decides
 * what element carries them, which is what lets the same tier be a `border-b`
 * on a list row, a `border-r` on a spine and a four-sided frame (`side:
 * "all"`) on a proportion bar or a piece of media.
 */
export function dividerClassName(
  tier: DividerTier,
  side: DividerSide,
  options: DividerOptions = {},
): string {
  const { surface = "canvas", from, className } = options;
  // The card tier carries the desktop step, except when the whole rule is
  // scoped to a breakpoint: a rule that only starts at `lg` cannot also
  // thicken at `md`, and the two together would make it appear early.
  return cx(
    SIDE[from ?? "base"][side],
    tier === "card" && from === undefined ? SIDE_THICK[side] : undefined,
    TIER[surface][tier],
    className,
  );
}
