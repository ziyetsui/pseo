import Link from "next/link";
import type { ReactNode } from "react";

import { accentFillClassName, type Accent } from "./accent";
import { cardClassName } from "./Card";
import { cx } from "./class-names";
import { dividerClassName } from "./dividers";

/**
 * A card with a 38px solid colour column down its left edge.
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
