import type { ReactNode } from "react";

import { Chevron } from "./Chevron";
import { cx } from "./class-names";
import { dividerClassName } from "./dividers";
import { hoverGapClassName } from "./hover";
import { microLabelClassName } from "./type-scale";

/**
 * The card's last line: a label and an arrow, with the SPACE between them
 * growing when the card is hovered.
 *
 * Of the five hover expressions this is the cheapest and the most legible:
 * only `gap` animates, so nothing about the row moves or reflows, and the
 * arrow reads as stepping away towards where it points. It answers to the
 * card's `group` (so hovering anywhere on the card moves it) and to its own
 * hover (so it still responds when it is not inside a card).
 *
 * It renders a `<span>`, never a link. The whole card is usually already the
 * link; a second focusable control saying the same thing makes a keyboard walk
 * one destination twice. Where the row IS the only affordance, wrap it in the
 * caller's own `<a>` / `<Link>`.
 */

export interface ActionRowProps {
  /** What the action says. Kept as text — the arrow is decoration. */
  label: ReactNode;
  /** Which way the arrow points. `right` navigates; `down` expands. */
  direction?: "right" | "down";
  /** Draw the card-tier rule above the row. */
  divider?: boolean;
  className?: string;
}

export function ActionRow({
  label,
  direction = "right",
  divider = false,
  className,
}: ActionRowProps) {
  return (
    <span
      className={cx(
        "mt-auto inline-flex items-center",
        hoverGapClassName(),
        microLabelClassName(),
        divider ? dividerClassName("card", "top", { className: "pt-3" }) : undefined,
        className,
      )}
    >
      <span>{label}</span>
      <Chevron direction={direction} />
    </span>
  );
}
