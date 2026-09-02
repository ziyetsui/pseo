import { cx } from "./class-names";

/**
 * The hover vocabulary: five ways to answer the pointer, one tempo.
 *
 * A page feels alive not because it animates a lot but because each KIND of
 * element has its own reply — and because every reply happens in the same
 * 200-300ms ease-out, so they never argue with each other. The card lift lives
 * in `cardClassName`; the other four are here.
 *
 *   1. card lift          — `cardClassName` (translate + shadow)
 *   2. title colour       — `hoverTitleClassName`
 *   3. action-row gap     — `ActionRow` (`hoverGapClassName`)
 *   4. underline growth   — `GrowingUnderline` (`hoverUnderlineBarClassName`)
 *   5. chevron reveal     — `HairlineRow` (`hoverRevealClassName`)
 *
 * Each of them animates exactly ONE property, so none forces a layout of the
 * whole card. All of them ride a `group` on the card or row, so the whole
 * object answers as one thing rather than lighting up piece by piece under the
 * pointer.
 *
 * `prefers-reduced-motion`: `globals.css` already collapses every transition
 * duration to 0.01ms document-wide, so each of these becomes an instant state
 * change rather than a movement. That is the intended behaviour — the
 * information (this is hovered, this is focused) survives; the motion does
 * not. Nothing here is the only signal for anything: every one of them sits on
 * an element that is already a link or already says its state in text.
 */

/** The shared tempo. 200ms for state, 300ms for the two that move distance. */
const FAST = "transition duration-200 ease-out";

/**
 * 2. A title that changes colour when its CARD is hovered — not when the title
 * itself is. Requires the card to carry `group` (`cardClassName` always does).
 */
export function hoverTitleClassName(className?: string): string {
  return cx("transition-colors duration-200 ease-out group-hover:text-accent-red", className);
}

/**
 * 3. The action row's gap, growing from 0.25rem to 0.5rem so the arrow steps
 * away from its label. `transition-[gap]` and nothing else: the row does not
 * move, only the space inside it opens.
 */
export function hoverGapClassName(className?: string): string {
  return cx(
    "gap-1 transition-[gap] duration-300 ease-out group-hover:gap-2 hover:gap-2",
    className,
  );
}

/**
 * 4. The bar under a link, growing from zero to full width. Belongs on an
 * absolutely positioned child of a `relative`, `group`-bearing link — see
 * `GrowingUnderline`, which is the component form of exactly this.
 */
export function hoverUnderlineBarClassName(className?: string): string {
  return cx(
    "absolute -bottom-0.5 left-0 h-0.5 w-0 bg-current transition-[width] duration-300 ease-out group-hover:w-full group-focus-visible:w-full",
    className,
  );
}

/**
 * 5. A decoration that is invisible until its row is hovered OR focused. Focus
 * is not optional here: a chevron that only ever appears under a mouse is
 * information a keyboard never receives.
 */
export function hoverRevealClassName(className?: string): string {
  return cx(
    FAST,
    "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 group-focus-within:opacity-100",
    className,
  );
}
