import Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";

import { cx } from "./class-names";
import { elevationClassName, pressClassName, transitionClassName } from "./hover";

import { GeometricMark, type MarkShape, type MarkColor } from "./GeometricMark";

/**
 * The chassis.
 *
 * Every card on the site is this one shell — white, hard black border (2px
 * mobile / 4px desktop), unblurred offset shadow — and differs only by which
 * SLOTS are pushed into it (`CardMedia`, `IdentityMark`, `StatusBadge`,
 * `ActionRow`, `SpineCard`'s colour column). The shell is what
 * makes forty different cards read as one system; the slots are what keeps
 * them from reading as forty copies of one card.
 *
 * `cardClassName` is exported so semantic wrappers (`<article>`, `<li>`,
 * `<a>`) can wear it without nesting an extra `<div>`.
 */

export interface CardStyleOptions {
  /**
   * The whole card is one link or button.
   *
   * This is the switch for EVERY interactive expression the chassis makes: the
   * hover elevation, the press, and dropping the document-wide hover underline
   * (underlining an entire tile is noise, not feedback — see the
   * `a[href]:not(.no-underline, …)` rule in `globals.css`).
   *
   * It has to be, because a card that does nothing when you click it must not
   * answer a pointer as though it did. `PromptCard` and `ArticleCard` render a
   * plain `<article>` whose real destinations are the title link, the chips and
   * the action buttons INSIDE it; when the shell rose under the pointer, the
   * loudest motion on the busiest surface in the product was fired by hovering
   * something with no behaviour at all.
   *
   * The `group` hook is deliberately NOT conditional on this: it is on every
   * card, so a card that merely *contains* a link can still colour its title
   * when the card is hovered — that expression points at a real destination.
   */
  interactive?: boolean;
}

export function cardClassName(className?: string, options: CardStyleOptions = {}): string {
  const interactive = options.interactive === true;

  return cx(
    // `group`: the anchor for every hover expression in `hover.ts`. It paints
    // nothing on its own, so putting it on all cards costs nothing and means a
    // slot never has to ask its parent to opt in.
    "group",
    "relative flex min-w-0 flex-col border-2 border-foreground bg-surface md:border-4",
    // Named properties, never the bare `transition` utility: that one expands
    // to twenty-one properties in Tailwind v4, `outline-color` among them, so
    // it made every focus ring fade in from black over 200ms.
    transitionClassName("elevation"),
    // THE SHADOW GROWS AND NOTHING MOVES — the idiom `Button.tsx` already
    // writes down, now spoken by the chassis too.
    //
    // The chassis used to translate 2px up-left while its shadow grew 2px. That
    // failed three ways. It translated AWAY from the pointer along its own
    // right and bottom edges, so a pointer resting within 2px of either edge
    // oscillated: hover → card moves away → un-hover → card returns. It
    // animated `translate` (compositor) against `box-shadow` (paint) under a
    // blur-free 4px band, where a single desynced frame is a countable
    // rectangle rather than a soft blur nobody sees. And it was a second
    // vocabulary for the same idea buttons already expressed.
    //
    // Under a hard offset shadow a growing offset IS the object rising: the
    // shadow's far corner stays pinned to the page and the gap under the card
    // opens. Same reading, one pipeline, no edge to oscillate on.
    elevationClassName("card", { hover: interactive }),
    interactive
      ? cx("no-underline", pressClassName("flatten", { elevation: "card" }))
      : undefined,
    className,
  );
}

/**
 * Shared tile geometry for the browse bands (models, content types,
 * collections, taxonomy axes, creators).
 *
 * A grid row already stretches its tiles to the tallest one, so the ragged
 * edge was BETWEEN rows and between bands: a one-line label produced a
 * noticeably shorter tile than a two-line one. A shared minimum height plus
 * `justify-between` gives every tile the same floor and pins its last element
 * (the proportion bar, or the counts line) to it, so the whole grid lines up
 * whatever the labels say. It changes no tile content.
 *
 * The floor moved up with the display-scale count: a tile is now a title, a
 * large figure, a caption and a thicker bar, which is taller than the old 8rem
 * on its own. Keeping the floor just under the natural height is what still
 * makes a one-line band and a two-line band share a baseline.
 */
export const tileShellClassName = "min-h-40 w-full justify-between md:min-h-44";

export interface CardProps extends Omit<ComponentPropsWithoutRef<"div">, "className"> {
  className?: string;
  /** Optional corner decoration. Purely visual — see `GeometricMark`. */
  mark?: { shape: MarkShape; color: MarkColor };
}

export function Card({ className, mark, children, ...rest }: CardProps) {
  return (
    <div {...rest} className={cardClassName(className)}>
      {mark === undefined ? null : (
        <GeometricMark
          shape={mark.shape}
          color={mark.color}
          className="absolute top-2 right-2 z-10"
        />
      )}
      {children}
    </div>
  );
}

export interface CardLinkProps extends Omit<ComponentPropsWithoutRef<typeof Link>, "className"> {
  className?: string;
}

/**
 * The interactive variant: the whole card is one internal link.
 *
 * One link per card, not a link per line inside it — a tile with three
 * separately focusable fragments makes a keyboard walk the same destination
 * three times. External destinations do not go through `next/link`, so they
 * stay a plain `<a>` wearing `cardClassName(…, { interactive: true })`.
 */
export function CardLink({ className, children, ...rest }: CardLinkProps) {
  return (
    <Link {...rest} className={cardClassName(className, { interactive: true })}>
      {children}
    </Link>
  );
}
