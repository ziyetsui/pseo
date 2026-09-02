import type { ReactNode } from "react";

import { cx } from "./class-names";
import { microLabelClassName } from "./type-scale";

/**
 * The inverted pill: solid foreground fill, canvas-coloured text.
 *
 * It names what KIND of thing a card is — the medium or content type (图片 /
 * 视频), not one of its taxonomy values. That distinction is the reason it is
 * inverted: a taxonomy value is a `Chip`, it is a filter, and it is a link;
 * this is a statement about the card and never navigates anywhere. Making them
 * look alike invited people to click a label that does nothing.
 *
 * Not a `Chip` variant for the same reason: `Chip`'s inverted skin already
 * means "selected", and one appearance cannot mean both "selected" and "this
 * is a video".
 */

export interface CategoryPillProps {
  children: ReactNode;
  className?: string;
}

export function CategoryPill({ children, className }: CategoryPillProps) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-pill border-2 border-foreground bg-foreground px-2.5 py-0.5 text-canvas",
        microLabelClassName(),
        className,
      )}
    >
      {children}
    </span>
  );
}
