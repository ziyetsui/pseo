import { TAXONOMY_ACCENT, accentFillClassName, type Accent } from "@/components/ui/accent";
import type { QueryFacetKey } from "@/lib/content/types";

/**
 * One accent per browse band.
 *
 * The hub used to run six consecutive tile grids that were identical: same
 * cell, same red hairline, same 14px number. Scrolling read as one picture
 * repeated forty times. Giving each band its own accent turns that repetition
 * into rhythm. Three of those grids have since been deleted as duplicates of
 * the chip rows above them; the three that remain — 按模型浏览 / 精选合集 /
 * 创作者 — still take one accent each.
 *
 * A band that IS a taxonomy axis takes its accent from the shared axis map, so
 * a 模型 band and a 模型 chip row are always the same colour. 精选合集 and
 * 创作者 are not taxonomy axes, so they borrow two of the same four accents,
 * placed so no two neighbouring bands match.
 *
 * The division is the whole point, and it is what `axisSectionAccent` below
 * enforces: **a band that represents a taxonomy axis never picks its own
 * colour.** L2's 按模型浏览 band did pick its own — it defaulted to the third
 * step of the rotation, yellow, while the same axis on L1 read the map and came
 * out red. One object, one page level apart, two colours, so the colour encoded
 * nothing. Rotation is now reachable only for bands that are NOT axes.
 */
export type SectionAccent = Accent;

export { accentFillClassName };

/**
 * Rotation order, for bands that are not taxonomy axes and therefore have no
 * entry in the axis map — the hub's 精选合集 and 创作者, the gallery's 其他类型.
 * An axis band must go through `axisSectionAccent` instead.
 */
export const SECTION_ACCENT_ORDER: readonly SectionAccent[] = [
  "red",
  "blue",
  "yellow",
  "foreground",
];

/** The accent for the nth band, wrapping around the four. */
export function sectionAccentAt(index: number): SectionAccent {
  const order = SECTION_ACCENT_ORDER;
  return order[((index % order.length) + order.length) % order.length] ?? "red";
}

/**
 * The accent for a band that REPRESENTS a taxonomy axis — the hub's four
 * taxonomy grids and the gallery's 按模型浏览 grid.
 *
 * It is a one-line function on purpose: it gives the rule a name, so a band
 * that is an axis can be seen to be reading the shared map rather than picking
 * a colour, and so the two never drift again. `features/search`'s
 * `axisAccentClassName` is the same lookup on the chip side.
 */
export function axisSectionAccent(axis: QueryFacetKey): SectionAccent {
  return TAXONOMY_ACCENT[axis];
}

/**
 * The hub's three browse bands, in page order. Keys match `HUB_SECTION_IDS`.
 *
 * 任务 / 镜头 / 风格 are absent because their bands are: those axes now appear
 * on the hub only as facet chips, which read the same `TAXONOMY_ACCENT` map
 * through `features/search`'s `axisAccentClassName`, so the axis-to-colour
 * agreement this file exists to enforce is unchanged.
 */
export const HUB_SECTION_ACCENTS = {
  models: TAXONOMY_ACCENT.model,
  collections: "blue",
  creators: "yellow",
} as const satisfies Record<string, SectionAccent>;
