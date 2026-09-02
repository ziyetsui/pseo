import { cx } from "./class-names";
import { IS_BAUHAUS } from "./theme";

export type MarkShape = "circle" | "square" | "triangle";
export type MarkColor = "red" | "blue" | "yellow";

const COLOR: Record<MarkColor, string> = {
  red: "bg-accent-red",
  blue: "bg-accent-blue",
  yellow: "bg-accent-yellow",
};

const SHAPE: Record<MarkShape, string> = {
  circle: "rounded-pill",
  square: "rounded-none",
  triangle: "shape-triangle",
};

export interface GeometricMarkProps {
  shape: MarkShape;
  color: MarkColor;
  className?: string;
}

/**
 * Decoration only: a Bauhaus circle / square / triangle. Always `aria-hidden`
 * so it never becomes part of an accessible name and never implies an action.
 *
 * **Renders nothing in the `neutral` theme.** This is the most Bauhaus object
 * in the system — a primary-coloured primitive shape pinned to a card's corner,
 * quoting the school directly — and unlike a border width or a shadow there is
 * no soft-system equivalent of it, because a soft system does not decorate a
 * corner at all. Softening it (a grey square, a smaller square) would leave a
 * mark that means nothing in a place a reader keeps checking. It carries no
 * information: every card it sits on states its kind in its own heading, and
 * `aria-hidden` has always said as much. So `neutral` drops it rather than
 * translating it, and `bauhaus` renders it exactly as before.
 *
 * The one caller that wanted a picture rather than an ornament — `MediaFrame`'s
 * media-unavailable state — supplies its own neutral placeholder.
 */
export function GeometricMark({ shape, color, className }: GeometricMarkProps) {
  if (!IS_BAUHAUS) return null;

  return (
    <span aria-hidden="true" className={cx("block size-3", SHAPE[shape], COLOR[color], className)} />
  );
}
