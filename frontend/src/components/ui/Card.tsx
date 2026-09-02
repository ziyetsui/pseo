import Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";

import { cx } from "./class-names";
import { elevationClassName, pressClassName, transitionClassName } from "./hover";

/**
 * The chassis.
 *
 * Every card on the site is this one shell — a raised surface inside a
 * hairline frame, under a layered soft cast — and differs only by which
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
    // Every frame is rounded to the prototype's 12px (`globals.css`), and a
    // card's media is full-bleed: without clipping, the square top corners of
    // `CardMedia` poke through the rounded corners of the shell they sit in.
    "overflow-hidden",
    // Named properties, never the bare `transition` utility: that one expands
    // to twenty-one properties in Tailwind v4, `outline-color` among them, so
    // it made every focus ring fade in from black over 200ms.
    transitionClassName("elevation"),
    // THE SHADOW GROWS AND NOTHING MOVES — the idiom `Button.tsx` already
    // writes down, now spoken by the chassis too.
    //
    // The chassis used to translate 2px up-left while its shadow grew. That
    // failed two ways. It translated AWAY from the pointer along its own right
    // and bottom edges, so a pointer resting within 2px of either edge
    // oscillated: hover → card moves away → un-hover → card returns. And it
    // was a second vocabulary for the same idea buttons already expressed.
    //
    // A deepening cast IS the object rising, on one pipeline, with no edge to
    // oscillate on.
    elevationClassName("card", { hover: interactive }),
    interactive
      ? cx("no-underline", pressClassName("flatten", { elevation: "card" }))
      : undefined,
    className,
  );
}

export interface CardProps extends Omit<ComponentPropsWithoutRef<"div">, "className"> {
  className?: string;
}

export function Card({ className, children, ...rest }: CardProps) {
  return (
    <div {...rest} className={cardClassName(className)}>
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
