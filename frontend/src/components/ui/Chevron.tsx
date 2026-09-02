import { cx } from "./class-names";

/**
 * An arrow head made of two borders rotated 45°.
 *
 * No icon library, no inline SVG, no emoji: a chevron is a corner, and this
 * system already owns corners. It inherits `currentColor`, so it is the same
 * colour as the text it follows without anyone passing a colour, and it scales
 * with `size-*` rather than with a viewBox.
 *
 * Always `aria-hidden`. It is a direction, not a word — every place it appears
 * the label next to it says where the link goes.
 */

export type ChevronDirection = "right" | "left" | "up" | "down";

const ROTATION: Record<ChevronDirection, string> = {
  right: "rotate-45",
  down: "rotate-135",
  left: "-rotate-135",
  up: "-rotate-45",
};

export interface ChevronProps {
  direction?: ChevronDirection;
  className?: string;
}

export function Chevron({ direction = "right", className }: ChevronProps) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        "block size-2 shrink-0 border-t-2 border-r-2 border-current",
        ROTATION[direction],
        className,
      )}
    />
  );
}
