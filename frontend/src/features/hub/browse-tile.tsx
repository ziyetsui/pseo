import type { ReactNode } from "react";

import { cx } from "@/components/ui/class-names";
import { hoverTitleClassName } from "@/components/ui/hover";
import {
  displayTitleClassName,
  microLabelClassName,
  singleLineTitleClassName,
} from "@/components/ui/type-scale";

import { accentFillClassName, type SectionAccent } from "./section-accent";

/**
 * The shared parts of a browse tile: the figure, its caption, the proportion
 * bar and the leading tile's rank marker.
 *
 * Every browse grid on the site — the hub's four taxonomy bands, its
 * collections and creators, and the gallery's models and content types — is the
 * same object: a name, a number, and how that number compares inside its group.
 * The number was the only thing separating one tile from the next and it was set
 * as 14px body text, so forty tiles read as one repeated picture. Here the
 * number is the protagonist (display scale, `tabular-nums`, heaviest weight) and
 * the unit drops to a caption underneath it.
 *
 * These live in `features/hub` because the hub defines the family; the gallery
 * bands import them so the L2 tiles read as members of it rather than as a
 * third card design.
 */

/**
 * Whether the first tile of a group may lead it.
 *
 * Rank is allowed to speak through size only when it is telling the truth: the
 * first tile leads only if it actually holds the group's maximum. Repositories
 * hand most of these lists over sorted by count descending, so that is the
 * normal case; a list in its own editorial order (the collections) simply gets
 * no leading tile rather than a wider tile that is not the biggest. Nothing is
 * ever re-sorted here — tile order is the caller's.
 */
export function leadsGroup(counts: readonly number[]): boolean {
  const first = counts[0];
  if (first === undefined) return false;
  const max = counts.reduce((best, count) => Math.max(best, count), 0);
  return max > 0 && first === max;
}

/**
 * Grid-cell classes for one tile. The leading tile takes two columns on wide
 * viewports; below `lg` every tile keeps one cell, so the mobile single-column
 * stack is untouched.
 */
export function browseTileCellClassName(lead: boolean): string {
  return cx("flex", lead && "lg:col-span-2");
}

/** Padding and spacing inside the tile; the leading tile gets more air. */
export function browseTileBodyClassName(lead: boolean): string {
  return cx("gap-3 p-4 no-underline", lead && "md:p-6");
}

/**
 * Tile heading type, drawn from the shared title tiers rather than from a size
 * of this band's own invention.
 *
 * Two tiers, not a ramp: the tile that leads its band takes the DISPLAY tier
 * (clamped to two lines, so it can never push the number off the card) and
 * every other tile takes the SINGLE-LINE tier, which truncates so that a long
 * taxonomy label can never make one tile taller than its neighbours. The full
 * string stays in the DOM either way, so the link's accessible name and
 * find-in-page are untouched.
 *
 * The title also carries hover expression ②: it answers the CARD's `group`, so
 * pointing anywhere at the tile colours its name. That is the reply the browse
 * bands were missing — every tile is a link, and only the shell moved.
 */
export function browseTileTitleClassName(lead: boolean): string {
  return hoverTitleClassName(lead ? displayTitleClassName() : singleLineTitleClassName());
}

export interface BrowseTileCountProps {
  /** The number itself — always computed from current data. */
  value: ReactNode;
  /**
   * What follows the number in the prototype's line: `条提示词`,
   * `条 · N 条热门`, `条提示词 · N 赞 · N 藏`. The space that separated it from
   * the number is re-inserted below, so the tile's text is word for word what it
   * was when the whole line was one 14px paragraph.
   */
  caption: ReactNode;
  lead?: boolean;
  className?: string;
}

/** Display-scale count over a small caption. */
export function BrowseTileCount({ value, caption, lead = false, className }: BrowseTileCountProps) {
  return (
    <p className={cx("flex flex-col gap-1", className)}>
      <span
        className={cx(
          "font-black tracking-tighter tabular-nums",
          // `leading-none` keeps the figure optically level with the caption; at
          // display sizes the default line box adds a visible gap.
          "leading-none",
          lead ? "text-4xl md:text-5xl" : "text-3xl md:text-4xl",
        )}
      >
        {value}
      </span>
      <span className={microLabelClassName("block tabular-nums")}>
        {" "}
        {caption}
      </span>
    </p>
  );
}

export interface BrowseTileBarProps {
  /** 0–100, relative to the group's own maximum (or the library, for collections). */
  share: number;
  accent: SectionAccent;
  lead?: boolean;
}

/**
 * The proportion bar: thicker than the old 12px hairline and filled in the
 * band's accent. Still `aria-hidden` — the number above it is the accessible
 * fact, and a screen reader gains nothing from a second, vaguer copy of it.
 */
export function BrowseTileBar({ share, accent, lead = false }: BrowseTileBarProps) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        "mt-auto block border-2 border-foreground bg-surface",
        lead ? "h-5 md:h-6" : "h-4",
      )}
    >
      <span className={cx("block h-full", accentFillClassName(accent))} style={{ width: `${share}%` }} />
    </span>
  );
}

/**
 * The leading tile's rank marker: a solid block of the band's accent above the
 * title. Pure geometry, `aria-hidden`, and never the only way to tell which tile
 * is biggest — the counts say that in text.
 */
export function BrowseTileRank({ accent }: { accent: SectionAccent }) {
  return (
    <span
      aria-hidden="true"
      className={cx("block h-2 w-16 md:h-2.5 md:w-20", accentFillClassName(accent))}
    />
  );
}
