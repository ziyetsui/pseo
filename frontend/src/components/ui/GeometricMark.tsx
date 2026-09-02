import { cx } from "./class-names";

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
 */
export function GeometricMark({ shape, color, className }: GeometricMarkProps) {
  return (
    <span aria-hidden="true" className={cx("block size-3", SHAPE[shape], COLOR[color], className)} />
  );
}
