import type { ReactNode } from "react";

import { cx } from "./class-names";
import { hoverUnderlineBarClassName } from "./hover";

/**
 * A label whose underline grows from zero to full width on hover or focus.
 *
 * The fourth hover expression, for links that carry no standing underline —
 * navigation, anchor bars, the label inside a tile. Only `width` animates, on
 * a 2px bar that is `currentColor`, so it costs one property and inherits the
 * link's own colour.
 *
 * It reacts to a `group`, so put it inside the link (or inside the card) that
 * owns the interaction rather than around it — that way the bar answers when
 * the whole target is hovered, not only when the pointer is over the glyphs.
 *
 * Not a substitute for a real underline where one is required: this is for
 * links that are already unmistakable as links from their position. Anything
 * sitting in a paragraph of prose keeps its permanent underline.
 */

export interface GrowingUnderlineProps {
  children: ReactNode;
  className?: string;
}

export function GrowingUnderline({ children, className }: GrowingUnderlineProps) {
  return (
    <span className={cx("relative inline-block", className)}>
      {children}
      <span aria-hidden="true" className={hoverUnderlineBarClassName()} />
    </span>
  );
}
