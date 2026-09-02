import Link from "next/link";
import type { ReactNode } from "react";

import { accentFillClassName, type Accent } from "./accent";
import { cardClassName } from "./Card";
import { cx } from "./class-names";
import { dividerClassName } from "./dividers";

/**
 * A card with a colour column down its left edge — 38px solid in `bauhaus`,
 * narrowed to a 4px rail in `neutral`.
 *
 * The spine carries no text and no meaning of its own — it exists so that one
 * FAMILY of card is distinguishable from every other card at a glance, from
 * across a scroll, before a single word has been read. It costs one element
 * and it is the highest-recognition-per-byte thing in this system.
 *
 * Because it says nothing, it is `aria-hidden` and colour is never the only
 * signal: the card's own heading says what kind of thing it is. Accents come
 * from `accent.ts`, so a spine can only ever be one of the four the palette
 * already has.
 */

export interface SpineCardProps {
  /** Which of the four accents fills the column. */
  accent: Accent;
  children: ReactNode;
  /** Makes the whole card one internal link. */
  href?: string;
  /**
   * Padding and spacing for the body column beside the spine.
   *
   * The spine is full-bleed, so the card itself cannot carry the padding —
   * which used to mean every caller wrapped `children` in its own padded
   * column and the padding of a "spine card" was decided outside the spine
   * card. The slot puts it back on the component.
   */
  bodyClassName?: string;
  className?: string;
}

export function SpineCard({
  accent,
  children,
  href,
  bodyClassName,
  className,
}: SpineCardProps) {
  const inner = (
    // A nested row rather than `flex-row` on the shell itself: overriding the
    // shell's `flex-col` by appending `flex-row` would depend on stylesheet
    // order rather than on class order, which is not something to rely on.
    <div className="flex min-h-0 flex-1">
      <span
        aria-hidden="true"
        className={cx(
          /*
           * The one Bauhaus decoration that is KEPT rather than dropped,
           * because it is the only one doing a job: it is what makes one family
           * of card recognisable from across a scroll before a word is read.
           * What changes with the theme is how loudly it says it — 38px of flat
           * primary colour is a poster device, and `neutral` narrows the same
           * element to a 4px rail. That narrowing is a WIDTH, so it is done in
           * `globals.css` off this exact class rather than by branching here:
           * `w-9.5` is the hook two suites already use to find the spine, and a
           * theme should not move the furniture other people navigate by.
           */
          // 38px on the spacing scale — not an arbitrary length.
          "w-9.5 shrink-0",
          dividerClassName("card", "right"),
          accentFillClassName(accent),
        )}
      />
      <div className={cx("flex min-w-0 flex-1 flex-col", bodyClassName)}>{children}</div>
    </div>
  );

  if (href !== undefined) {
    return (
      <Link
        href={href}
        className={cardClassName(cx("overflow-hidden", className), { interactive: true })}
      >
        {inner}
      </Link>
    );
  }

  return <div className={cardClassName(cx("overflow-hidden", className))}>{inner}</div>;
}
