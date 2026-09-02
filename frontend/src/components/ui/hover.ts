import { cx } from "./class-names";

/**
 * The interaction vocabulary: what a surface does when it is pointed at,
 * focused, or pressed — and the exact set of properties each of those is
 * allowed to animate.
 *
 * A page feels alive not because it animates a lot but because each KIND of
 * element has its own reply — and because every reply happens in the same
 * 200ms ease-out, so they never argue with each other.
 *
 *   1. card lift          — `cardClassName` (shadow)
 *   2. title colour       — `hoverTitleClassName`
 *   3. action-row gap     — `ActionRow` (`hoverGapClassName`)
 *   4. underline growth   — `GrowingUnderline` (`hoverUnderlineBarClassName`)
 *   5. chevron reveal     — `HairlineRow` (`hoverRevealClassName`)
 *   6. press              — `pressClassName`, on every control family
 *
 * Each of them animates a NAMED set of properties (see `transitionClassName`),
 * so none forces a layout of the whole card and none catches a property it was
 * never meant to touch. Most of them ride a `group` on the card or row, so the
 * whole object answers as one thing rather than lighting up piece by piece
 * under the pointer.
 *
 * `prefers-reduced-motion`: `globals.css` collapses every transition duration
 * to 0.01ms document-wide, so each of these becomes an instant state change
 * rather than a movement, and it additionally cancels the press TRAVEL (see
 * `PRESS_FLATTEN_MARKER`) so a press under reduced motion is a shadow
 * collapsing rather than an object sliding. That is the intended behaviour —
 * the information (this is hovered, this is focused, this is being pressed)
 * survives; the motion does not. Nothing here is the only signal for anything:
 * every one of them sits on an element that is already a link, already a
 * button, or already says its state in text.
 */

/* -------------------------------------------------------------- transitions */

/**
 * The property sets a transition is allowed to name.
 *
 * Tailwind's bare `transition` utility is not `all`, but it behaves like it for
 * review purposes: v4 expands it to twenty-one properties — and `transition-
 * colors` to seven — and BOTH lists include `outline-color`. `:focus-visible`
 * paints a 2px outline whose colour starts at `currentcolor`, so a bare
 * `transition` makes every focus ring fade in from the element's own text
 * colour: white → blue on a red button, black → blue on a card. Keyboard focus
 * is the highest-frequency interaction there is; it must be instant and it must
 * be one colour.
 *
 * So every transition in this system names its properties, and no name in this
 * table is an `outline-*` property. That is the invariant — `outline` is state,
 * never motion.
 *
 * - `ink`       — text colour alone. A title reddening when its card is hovered.
 * - `fill`      — colour + background. A chip, a tab, a row band inverting.
 * - `elevation` — shadow + translate. Anything that rises and presses flat.
 * - `control`   — `fill` + `elevation`, for a control that does both at once.
 * - `reveal`    — opacity. A decoration appearing on hover or focus.
 * - `move`      — translate alone. A chevron stepping away from its label.
 */
export type TransitionChannel = "ink" | "fill" | "elevation" | "control" | "reveal" | "move";

export const TRANSITION_CHANNELS = [
  "ink",
  "fill",
  "elevation",
  "control",
  "reveal",
  "move",
] as const satisfies readonly TransitionChannel[];

/**
 * Written out as whole utility strings rather than assembled from a property
 * list: Tailwind reads source text, so a template-built
 * `transition-[${properties}]` is a class it never sees.
 */
const TRANSITION: Record<TransitionChannel, string> = {
  ink: "transition-[color]",
  fill: "transition-[color,background-color]",
  elevation: "transition-[box-shadow,translate]",
  control: "transition-[color,background-color,box-shadow,translate]",
  reveal: "transition-[opacity]",
  move: "transition-[translate]",
};

/** The shared tempo. `--motion-fast` in `globals.css` is this value. */
const TEMPO = "duration-200 ease-out";

/**
 * The transition every interactive surface should reach for, instead of the
 * bare `transition` utility.
 *
 *   transitionClassName("control")
 *   // → "transition-[color,background-color,box-shadow,translate] duration-200 ease-out"
 */
export function transitionClassName(channel: TransitionChannel, className?: string): string {
  return cx(TRANSITION[channel], TEMPO, className);
}

/* --------------------------------------------------------------- elevation */

/**
 * The elevation scale, in roles rather than in pixels.
 *
 * `shadow-hard-lg` used to mean two unrelated things — "a card at rest on
 * desktop" in `Card.tsx` and "a button under the pointer" in `Button.tsx` — so
 * a hovered button sat at exactly the height of a resting card and the scale
 * stopped ranking anything. The fix is to stop naming the pixel and start
 * naming the role: a role owns its resting cast AND its hover partner, and the
 * two can never drift apart.
 *
 * The shadow IS the object's height above the page, so the ladder reads
 * literally: chrome sits lowest, a control sits above it, a card sits highest
 * and gains a step again on desktop where it is physically bigger.
 *
 * - `chrome`  — the shallowest cast. Rail arrows, the mobile nav trigger, an
 *   unselected tab: furniture around the content, never the content itself.
 * - `control` — one step up, at every width. Buttons and button-shaped links.
 * - `card`    — one step up again, and one more from `md`. The card chassis
 *   and every tile.
 *
 * Each hover partner deepens and widens the same cast, so the object reads as
 * rising off the page. `--shadow-hard-*` is a historical NAME — the tokens are
 * layered soft casts, not hard offsets (see `globals.css`) — and it is kept
 * because every call site says it.
 */
export type ElevationRole = "chrome" | "control" | "card";

export const ELEVATION_ROLES = [
  "chrome",
  "control",
  "card",
] as const satisfies readonly ElevationRole[];

const ELEVATION_REST: Record<ElevationRole, string> = {
  chrome: "shadow-hard-sm",
  control: "shadow-hard-md",
  card: "shadow-hard-md md:shadow-hard-lg",
};

/**
 * `chrome` has no hover partner on purpose: one step on the shallowest cast is
 * below the perceptual threshold on a 44px control and costs a repaint to
 * deliver nothing. Chrome's hover reply is its fill (`hover:bg-muted`).
 */
const ELEVATION_HOVER: Record<ElevationRole, string | undefined> = {
  chrome: undefined,
  control: "hover:shadow-hard-md-hover",
  card: "hover:shadow-hard-md-hover md:hover:shadow-hard-lg-hover",
};

export interface ElevationOptions {
  /** Add the role's hover partner. Off by default — a resting surface only. */
  hover?: boolean;
  className?: string;
}

/**
 * Resting (and optionally hover) shadow for one elevation role.
 *
 *   elevationClassName("card", { hover: true })
 *   // → "shadow-hard-md md:shadow-hard-lg hover:shadow-hard-md-hover md:hover:shadow-hard-lg-hover"
 */
export function elevationClassName(
  role: ElevationRole,
  { hover = false, className }: ElevationOptions = {},
): string {
  return cx(ELEVATION_REST[role], hover ? ELEVATION_HOVER[role] : undefined, className);
}

/* ------------------------------------------------------------------- press */

/**
 * The marker class `globals.css` looks for, in two places.
 *
 * It paints nothing itself. `.press-flatten:active` is where the elevation
 * drop that accompanies the scale lives, and the reduced-motion block cancels
 * the scale by the same name — which turns the press into a shadow changing in
 * place, keeping the feedback and dropping the movement. Exported so a test can
 * assert the halves still refer to the same name.
 */
export const PRESS_FLATTEN_MARKER = "press-flatten";

/**
 * How an element answers a press.
 *
 * A hover state is a promise; a press is a receipt. Until this existed the only
 * press feedback on the site was iOS Safari's default translucent grey rounded
 * box, which is to say the one piece of touch feedback nobody designed. On a
 * phone the browse grid has no hover to fall back on at all, so a tap produced
 * nothing until the next route painted, and people tapped again.
 *
 * Three kinds, because there are exactly three situations:
 *
 * - `flatten` — the object owns a shadow, and the shadow IS its height. So a
 *   press pushes it down: it shrinks under the finger while `globals.css`
 *   drops it one step of elevation, and the two halves say the same thing. The
 *   name is historical — it used to collapse a hard offset — and is kept
 *   because every call site and the marker class say it. Pass the `elevation`
 *   role so the step is sized to the object.
 *
 * - `invert` — the object has NO shadow (a chip, a variable radio). There is
 *   nothing to collapse, and a 1px nudge on a 32px pill is invisible. Its only
 *   surface is its fill, so the press previews the state the tap produces —
 *   cause and effect rather than decoration. Pass `selected` for a control
 *   that is already filled, so it previews the un-selected state instead.
 *
 * - `band` — a hairline row: no border, no shadow, no fill. Nothing to
 *   collapse and nothing to move against; translating a borderless row on a
 *   bare canvas reads as a glitch. Its one available surface is the row band,
 *   so the press fills the band and forces the chevron fully on (that half is
 *   in `hoverRevealClassName`, which answers `group-active` as well).
 *
 * None of these is the only signal for anything: every element carrying one is
 * already a link or a button, states its selection in text, and answers hover
 * and focus by other means. They are transient feedback for a gesture the user
 * is in the middle of making, not information the page holds.
 */
export type PressKind = "flatten" | "invert" | "band";

export const PRESS_KINDS = ["flatten", "invert", "band"] as const satisfies readonly PressKind[];

/**
 * Scale per role, not one value.
 *
 * `emil-design-eng` and `ui-polish` both put a button's press at 0.96–0.97 and
 * warn that below 0.95 reads as exaggerated, but those numbers are written for
 * a 44px control. The same ratio on a 400px card moves its edges 6px and reads
 * as the card recoiling, so a card gets the gentlest step that is still
 * visible. `transform-origin` stays centred, which is correct here — nothing in
 * this system is anchored to a trigger.
 *
 * `globals.css` supplies the other half: it drops one step of elevation at the
 * same moment, and puts `scale` into the element's transition list so the
 * RELEASE eases back rather than snapping.
 *
 * `aria-disabled` cancels it: `frontend/CLAUDE.md` §6 ships capabilities the
 * app does not have as `aria-disabled` with a written reason, and a control
 * that physically depresses is the app saying it did something. It did not.
 */
const PRESS_SCALE: Record<ElevationRole, string> = {
  chrome: "active:scale-[0.96]",
  control: "active:scale-[0.97]",
  card: "active:scale-[0.99]",
};

const PRESS_SCALE_COMMON =
  "active:duration-[var(--motion-press)] aria-disabled:active:scale-100";

const PRESS_INVERT = {
  idle: "active:bg-foreground active:text-surface",
  selected: "active:bg-surface active:text-foreground",
} as const;

const PRESS_BAND = {
  canvas: "active:bg-muted",
  inverse: "active:bg-surface/10",
} as const;

export type PressSurface = keyof typeof PRESS_BAND;

export interface PressOptions {
  /**
   * `flatten` only — which elevation is being collapsed. Defaults to
   * `control`, the plain 4px button.
   */
  elevation?: ElevationRole;
  /** `invert` only — the control is already filled, so the press un-fills it. */
  selected?: boolean;
  /** `band` only — which surface the row sits on. */
  surface?: PressSurface;
  className?: string;
}

/**
 * The press state for one element.
 *
 *   pressClassName("flatten", { elevation: "card" })
 *   // → the card collapses onto the page, 4px mobile / 8px desktop
 *   pressClassName("invert", { selected: isActive })
 *   // → a chip previews the fill the tap is about to give it
 *
 * Every `active:` utility lands outside `@media (hover:hover)` and after the
 * `hover:` block in the compiled sheet, so a press works on touch and beats a
 * hover on the same element without any specificity work.
 *
 * **The press-in runs at `--motion-press` (120ms), not at the 200–300ms band
 * the rest of the system's motion uses. This is a deliberate amendment, not an
 * oversight — do not "correct" it back.** That band is written for hover and
 * for state changes, where a fifth of a second reads as considered. A press is
 * different in kind: it has to land under the finger, and 200ms of travel
 * reads as mush rather than as a mechanism. 120ms keeps `ease-out` and keeps
 * the motion mechanical — it makes it MORE mechanical, not less. The release is
 * left on the standard 200ms, so the object snaps down and settles back up,
 * which is how a real key feels. It is also exactly the band
 * `emil-design-eng` and `animations` give for press feedback (100–160ms).
 */
export function pressClassName(kind: PressKind, options: PressOptions = {}): string {
  const { elevation = "control", selected = false, surface = "canvas", className } = options;

  if (kind === "flatten") {
    return cx(PRESS_FLATTEN_MARKER, PRESS_SCALE[elevation], PRESS_SCALE_COMMON, className);
  }
  if (kind === "invert") {
    return cx(PRESS_INVERT[selected ? "selected" : "idle"], className);
  }
  return cx(PRESS_BAND[surface], className);
}

/* ------------------------------------------------------- hover expressions */

/**
 * 2. A title that changes colour when its CARD is hovered — not when the title
 * itself is. Requires the card to carry `group` (`cardClassName` always does).
 */
export function hoverTitleClassName(className?: string): string {
  return cx(transitionClassName("ink"), "group-hover:text-accent-red", className);
}

/**
 * 3. The action row's gap, growing from 0.25rem to 0.5rem so the arrow steps
 * away from its label. `transition-[gap]` and nothing else: the row does not
 * move, only the space inside it opens.
 *
 * Tempo: one pointer entering one tile used to start four transitions on two
 * clocks — the card landing at 200ms while this was still opening at 300ms.
 * They are all 200ms now, so one gesture has one landing.
 */
export function hoverGapClassName(className?: string): string {
  return cx(
    "gap-1 transition-[gap] duration-200 ease-out group-hover:gap-2 hover:gap-2",
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
    "absolute -bottom-0.5 left-0 h-0.5 w-0 bg-current transition-[width] duration-200 ease-out group-hover:w-full group-focus-visible:w-full",
    className,
  );
}

/**
 * 5. A decoration that is invisible until its row is hovered, focused OR
 * pressed. Focus is not optional here: a chevron that only ever appears under a
 * mouse is information a keyboard never receives. `group-active` is the touch
 * half of the same argument — it is the second half of `pressClassName("band")`,
 * so a tapped row both fills its band and commits to its chevron.
 */
export function hoverRevealClassName(className?: string): string {
  return cx(
    transitionClassName("reveal"),
    "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 group-focus-within:opacity-100 group-active:opacity-100",
    className,
  );
}
