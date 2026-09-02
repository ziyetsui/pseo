import type { ReactNode } from "react";

import { cx } from "@/components/ui/class-names";
import { dividerClassName } from "@/components/ui/dividers";
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
 * Whether the first tile of a group may lead it AT ALL.
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
 * The two browse grids in the system, as column counts per breakpoint.
 *
 * A browse tile is a number, a short label and a bar, so it reads perfectly
 * well at ~165px: the hub's six bands are therefore two-up from 320px, which
 * is what took the hub from one tile per screenful to two. The gallery's tiles
 * carry more than that (a 56px monogram beside a 热门 stamp, an action row, a
 * full-bleed accent stripe) and do not fit two-up on a 320px phone, so they
 * keep their single column until `sm`.
 *
 * The counts are listed narrowest-first and every entry must be a real
 * Tailwind breakpoint, because the classes below are written out per
 * breakpoint — Tailwind reads source text, so a template-built
 * `${prefix}col-span-2` is a class it would never emit.
 */
export type BrowseGridName = "hub-4" | "hub-3" | "gallery-3";

interface BrowseGridStep {
  /** Breakpoint prefix; `base` is 0-up. */
  at: "base" | "sm" | "lg";
  columns: number;
}

interface BrowseGridShape {
  className: string;
  steps: readonly BrowseGridStep[];
}

const BROWSE_GRIDS: Record<BrowseGridName, BrowseGridShape> = {
  "hub-4": {
    className: "grid grid-cols-2 gap-4 lg:grid-cols-4",
    steps: [
      { at: "base", columns: 2 },
      { at: "lg", columns: 4 },
    ],
  },
  "hub-3": {
    className: "grid grid-cols-2 gap-4 lg:grid-cols-3",
    steps: [
      { at: "base", columns: 2 },
      { at: "lg", columns: 3 },
    ],
  },
  "gallery-3": {
    className: "grid gap-4 sm:grid-cols-2 lg:grid-cols-3",
    steps: [
      { at: "base", columns: 1 },
      { at: "sm", columns: 2 },
      { at: "lg", columns: 3 },
    ],
  },
};

const SPAN: Record<BrowseGridStep["at"], { one: string; two: string }> = {
  base: { one: "col-span-1", two: "col-span-2" },
  sm: { one: "sm:col-span-1", two: "sm:col-span-2" },
  lg: { one: "lg:col-span-1", two: "lg:col-span-2" },
};

/** How many of `columns` cells the LAST row of `cells` actually holds. */
function lastRowFill(cells: number, columns: number): number {
  if (cells <= 0 || columns <= 1) return columns;
  const rest = cells % columns;
  return rest === 0 ? columns : rest;
}

/**
 * Whether the leading tile may take two cells in a grid of `columns`.
 *
 * The leading tile is the only thing on these grids that can change how many
 * cells a fixed list of tiles occupies, so it is the only lever available for
 * the last row — and the rule is that it may only be pulled when it makes that
 * row FULLER. `按模型浏览` has eight tiles: two-up, spanning the lead produces
 * nine cells and strands the ninth alone on a fifth row, so the lead does not
 * span there and the eight tiles fill four rows exactly. Seven tiles two-up go
 * the other way: spanning fills four rows, not spanning strands one.
 *
 * It is decided per band AND per breakpoint, because the same eight tiles are
 * four-up at `lg` where the arithmetic is different. Nothing is ever
 * reordered, added or dropped to make a row come out even — the tiles are the
 * caller's, and only the lead's width moves.
 *
 * A one-column grid is a special case with no arithmetic: every tile already
 * fills its row, so the lead "spans" trivially and paints no span class.
 */
function leadSpansAt(count: number, columns: number): boolean {
  if (columns <= 1) return true;
  return lastRowFill(count + 1, columns) > lastRowFill(count, columns);
}

export interface BrowseLayout {
  /** Grid classes for the `<ul>`. */
  readonly gridClassName: string;
  /**
   * Whether the first tile leads the band — the rank marker, the display-tier
   * title, the extra padding and the taller bar.
   *
   * Tied to the span at the NARROWEST breakpoint, because that is the one
   * where width is scarce: a display-scale title in a 165px half-row cell
   * clamps away half of `Nano Banana Pro`, so a tile that does not get the
   * full row does not get the poster treatment either. Width and weight are
   * one decision, not two.
   */
  readonly lead: boolean;
  /** Cell classes for the tile at `index`. */
  cellClassName(index: number): string;
}

/**
 * Resolves one band's grid: its column classes, whether its first tile leads,
 * and the span each tile takes at each breakpoint.
 */
export function browseLayout(counts: readonly number[], grid: BrowseGridName): BrowseLayout {
  const shape = BROWSE_GRIDS[grid];
  const count = counts.length;
  const spans = shape.steps.map((step) => leadSpansAt(count, step.columns));
  const lead = leadsGroup(counts) && (spans[0] ?? false);

  // Emit a span class only where it CHANGES, so a lead that keeps its two
  // cells all the way up carries one class rather than one per breakpoint.
  // The implicit starting point is one cell, which is the grid's own default.
  let previous = false;
  const leadCell: string[] = [];
  for (const [index, step] of shape.steps.entries()) {
    if (step.columns <= 1) continue;
    const two = lead && (spans[index] ?? false);
    if (two === previous) continue;
    leadCell.push(two ? SPAN[step.at].two : SPAN[step.at].one);
    previous = two;
  }
  const leadCellClassName = leadCell.join(" ");

  return {
    gridClassName: shape.className,
    lead,
    cellClassName(index: number): string {
      return cx("flex", index === 0 && lead ? leadCellClassName : undefined);
    },
  };
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
        // A four-sided card-tier frame, asked for by name: the bar is a
        // compartment of the card, so it is drawn at the same strength as
        // every other card-tier rule instead of restating the width and the
        // colour here. It stays 2px at every width — a 4px frame on a 16px bar
        // would leave 8px of fill.
        "mt-auto block bg-surface",
        dividerClassName("card", "all"),
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
