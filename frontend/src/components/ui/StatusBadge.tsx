import type { ReactNode } from "react";

import { cx } from "./class-names";

/**
 * The stamp: a yellow pill with a black border and tiny, bold, wide-tracked
 * text. It is the one marker on a card that is a VERDICT (热门, 新, 已收录)
 * rather than a fact, which is why it reads as something pressed onto the card
 * instead of printed with it.
 *
 * The word is always the signal. Yellow alone would be colour-as-information;
 * a badge with no children is not a valid badge.
 */

export type BadgeCorner = "none" | "top-left" | "top-right" | "bottom-left" | "bottom-right";

/**
 * Corner placement. Absolute, so the badge overlaps the card's own frame and
 * sits above the media (`z-10`). The card shell is already `relative`, so
 * nothing else is needed.
 */
const CORNER: Record<BadgeCorner, string | undefined> = {
  none: undefined,
  "top-left": "absolute top-2 left-2 z-10",
  "top-right": "absolute top-2 right-2 z-10",
  "bottom-left": "absolute bottom-2 left-2 z-10",
  "bottom-right": "absolute bottom-2 right-2 z-10",
};

export interface StatusBadgeProps {
  children: ReactNode;
  /** Where it sits. `none` (default) leaves it inline in the flow. */
  corner?: BadgeCorner;
  className?: string;
}

export function StatusBadge({ children, corner = "none", className }: StatusBadgeProps) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-pill border-2 border-foreground bg-accent-yellow px-2.5 py-0.5 text-xs font-bold tracking-wider shadow-hard-sm",
        CORNER[corner],
        className,
      )}
    >
      {children}
    </span>
  );
}
