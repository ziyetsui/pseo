import type { ComponentPropsWithoutRef } from "react";

import { cx } from "./class-names";

import { GeometricMark, type MarkColor, type MarkShape } from "./GeometricMark";

/**
 * Bauhaus surface: white, hard black border (2px mobile / 4px desktop) and an
 * unblurred offset shadow. `cardClassName` is exported so semantic wrappers
 * (`<article>`, `<li>`) can wear it without nesting an extra `<div>`.
 */
export function cardClassName(className?: string): string {
  return cx(
    // Hover is deliberately small: 2px of lift keeps the hard shadow reading as
    // a shadow. A 4px jump made a whole grid of cards twitch under the pointer.
    //
    // The lift is up-LEFT and the shadow grows by the same 2px, so the offset
    // shadow's far corner stays where it was: the card rises off the page.
    // Lifting without growing the shadow (what this used to do) shortened the
    // visible gap instead and made the card look like it was sinking into its
    // own shadow. Both steps ride the same 200ms ease-out; `prefers-reduced-
    // motion` is neutralised globally in `globals.css`.
    "relative flex min-w-0 flex-col border-2 border-foreground bg-surface shadow-hard-md transition duration-200 ease-out hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-md-hover md:border-4 md:shadow-hard-lg md:hover:shadow-hard-lg-hover",
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
