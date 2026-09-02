"use client";

import { useState, type ReactNode } from "react";

import { cx } from "@/components/ui/class-names";
import { pressClassName, transitionClassName } from "@/components/ui/hover";
import { microLabelClassName } from "@/components/ui/type-scale";

export interface ExpandToggleProps {
  /** Id of the element being expanded — usually the `<pre>` this wraps. */
  contentId: string;
  children: ReactNode;
  /** Prototype labels. Both cards say `展开` ⇄ `收起`. */
  expandLabel?: string;
  collapseLabel?: string;
  /**
   * Rendered between the clamped content and the toggle row — the card's meta
   * line, which the prototype places after the `<pre>` and before the action
   * row the toggle lives in.
   */
  belowContent?: ReactNode;
  /** Rendered before / after the toggle button inside the action row. */
  actionsBefore?: ReactNode;
  actionsAfter?: ReactNode;
  /** Applied to the action row; lets a card style its own `.cardact`. */
  rowClassName?: string;
  toggleClassName?: string;
  /**
   * Applied to the wrapper. A card passes `flex-1` so this column stretches to
   * the card's full height and the action row's `mt-auto` can push itself to
   * the bottom edge — without it, cards in one grid row end their buttons at
   * three different heights.
   */
  className?: string;
}

/**
 * The clamped preview's height, made animatable — the ONE rule this component
 * owns that could not be written as a class.
 *
 * ## What it fixes
 *
 * 展开 takes the prompt from four lines (七 from `sm` up) to forty-plus in a
 * single frame, so everything below the card is thrown hundreds of pixels down
 * and, in a grid, the neighbouring cards reflow with no bridge at all. 收起 is
 * the worse of the two directions: the page above the card stays put while
 * everything below it leaps back up, and the 收起 button itself is yanked out
 * from under the finger that just pressed it.
 *
 * ## Why `lh`, and why not `max-height` in pixels
 *
 * `globals.css` already carries the scar of the obvious attempt: a pixel
 * `max-height` cut the monospace block mid-glyph and clipped away the `<pre>`'s
 * own bottom padding and border, so the preview ended in a torn line inside a
 * box with no floor. `lh` is that same cap expressed in the element's own line
 * boxes, so `4lh` IS four whole lines by construction, whatever the prompt
 * contains and whatever leading the `<pre>` is set in — and `box-sizing:
 * content-box` makes those four lines the CONTENT, so the padding and the
 * border are added outside the cap and still paint. The collapsed block is
 * therefore exactly as tall as the line clamp made it.
 *
 * ## Why it is here and not in `globals.css`
 *
 * Two reasons. It has to out-specify the `.prompt-clamp[data-expanded="false"]`
 * rule in that file (hence the doubled class), and this fix wave does not own
 * that file. React hoists and de-duplicates a `<style href precedence>`, so the
 * page carries one copy of these rules however many prompt cards are on it.
 *
 * ## The degrade, and reduced motion
 *
 * Everything is inside `@supports (interpolate-size: allow-keywords)`, which is
 * Chromium-only at the time of writing. Anywhere else NONE of it applies and
 * the block keeps snapping exactly as it does today, line clamp and all — the
 * fallback is the current behaviour, not an approximation of it. Under
 * `prefers-reduced-motion: reduce` the document-wide rule in `globals.css`
 * collapses every `transition-duration` to 0.01ms, which turns this back into
 * the same instant jump. The motion is additive in both directions.
 *
 * The expanded endpoint is `max-content` rather than the `none` the audit
 * wrote: `interpolate-size` makes the INTRINSIC size keywords interpolable, and
 * for a block's height `max-content` is its content height, i.e. the same
 * height `none` would leave it at. If it ever fails to interpolate, the block
 * snaps — which is the documented fallback anyway.
 *
 * `display: block` replaces the collapsed `-webkit-box`: `-webkit-line-clamp`
 * re-clamps the instant `data-expanded` flips back to `false`, which shrinks
 * the block BEFORE the height transition can start from where it was, so 收起
 * would still snap. Losing the clamp also loses its trailing ellipsis on this
 * path; the cut is still visible mid-sentence and 展开 is directly beneath it.
 */
const CLAMP_MOTION_CSS = `
@supports (interpolate-size: allow-keywords) {
  .prompt-clamp.prompt-clamp {
    interpolate-size: allow-keywords;
  }

  .prompt-clamp.prompt-clamp > * {
    box-sizing: content-box;
    overflow: clip;
    overflow-clip-margin: content-box;
    max-height: max-content;
    transition: max-height var(--motion-base) ease-out;
  }

  .prompt-clamp.prompt-clamp[data-expanded="false"] > * {
    display: block;
    max-height: 4lh;
  }

  @media (width >= 40rem) {
    .prompt-clamp.prompt-clamp[data-expanded="false"] > * {
      max-height: 7lh;
    }
  }
}
`;

/**
 * The toggle's own skin: a micro label, and the press every other control on
 * the site now has.
 *
 * `invert` rather than `flatten` — the toggle carries no shadow, so there is
 * nothing to collapse and a one-pixel nudge on a text control is invisible.
 * Its only surface is its fill, so the press fills it.
 */
const TOGGLE_CLASS = cx(
  "inline-flex min-h-11 min-w-11 items-center justify-center px-1 underline",
  microLabelClassName(),
  transitionClassName("fill"),
  pressClassName("invert"),
);

/**
 * Client leaf that clamps its server-rendered children.
 *
 * The children are passed through untouched, so the full prompt text is always
 * in the HTML — copy, text selection, find-in-page and search engines all see
 * it whether or not the block is expanded, and that stays true at every frame
 * of the expand animation. Only the height the block is allowed to paint
 * changes.
 *
 * The toggle is rendered exactly once, in the same row as the card's other
 * actions (the prototype's `复制 / 展开 / 原帖` row). `belowContent`,
 * `actionsBefore` and `actionsAfter` exist so a server component can hand that
 * whole arrangement down without this component knowing anything about cards.
 */
export function ExpandToggle({
  contentId,
  children,
  expandLabel = "展开",
  collapseLabel = "收起",
  belowContent,
  actionsBefore,
  actionsAfter,
  rowClassName,
  toggleClassName,
  className,
}: ExpandToggleProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    // `min-w-0`: as a flex item this wrapper would otherwise take its
    // automatic minimum size from the prompt's min-content width, which a long
    // unbroken token can push far past the card — that is what made L3 scroll
    // sideways at 320/375. The `<pre>` inside scrolls instead.
    <div className={cx("flex min-w-0 flex-col gap-3", className)}>
      {/*
        Hoisted to `<head>` and de-duplicated by React across every card on the
        page. See `CLAMP_MOTION_CSS`.
      */}
      <style href="prompt-clamp-motion" precedence="medium">
        {CLAMP_MOTION_CSS}
      </style>

      <div
        data-expanded={expanded ? "true" : "false"}
        // `prompt-clamp` (globals.css) reads the same `data-expanded` and
        // clamps to a whole number of monospace lines, so the collapsed block
        // never ends mid-glyph. `CLAMP_MOTION_CSS` above reads it too, and
        // turns that same step into a 300ms one where the browser can.
        className="prompt-clamp"
      >
        {children}
      </div>

      {belowContent}

      <div className={rowClassName ?? "flex flex-wrap items-center gap-3"}>
        {actionsBefore}
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={contentId}
          onClick={() => setExpanded((value) => !value)}
          className={toggleClassName ?? TOGGLE_CLASS}
        >
          {expanded ? collapseLabel : expandLabel}
        </button>
        {actionsAfter}
      </div>
    </div>
  );
}
