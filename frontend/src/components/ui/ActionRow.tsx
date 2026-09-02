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
  /**
   * Push the row to the bottom of its flex column (`mt-auto`).
   *
   * Opt-in, because two `mt-auto` siblings inside one flex column split the
   * free space between them instead of moving one block to the floor — which
   * is what once made a browse tile's last row and its action row land at
   * different heights within a single grid row. A tile's accent is no longer
   * part of that flow (`features/hub/browse-tile.tsx` pins `BrowseTileEdge`
   * absolutely, at zero height), so today this row is normally the only
   * claimant; turn it on only where that is actually true.
   */
  pushToBottom?: boolean;
  className?: string;
}

export function ActionRow({
  label,
  direction = "right",
  divider = false,
  pushToBottom = false,
  className,
}: ActionRowProps) {
  return (
    <span
      className={cx(
        "inline-flex items-center",
        pushToBottom ? "mt-auto" : undefined,
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
