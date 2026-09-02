import { TAXONOMY_ACCENT, accentFillClassName, type Accent } from "@/components/ui/accent";
import type { QueryFacetKey } from "@/lib/content/types";

/**
 * One accent per browse band.
 *
 * The hub runs six consecutive tile grids — 按任务 / 镜头与运动 / 按模型 /
 * 按风格 / 精选合集 / 创作者 — that used to be identical: same cell, same red
 * hairline, same 14px number. Scrolling read as one picture repeated forty
 * times. Giving each band its own accent turns that repetition into rhythm.
 *
 * The four taxonomy bands take their accent from the shared axis map, so a
 * 任务 band and a 任务 chip row are always the same colour. 精选合集 and
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

/** The hub's six browse bands, in the prototype's order. Keys match `HUB_SECTION_IDS`. */
export const HUB_SECTION_ACCENTS = {
  tasks: TAXONOMY_ACCENT.useCase,
  camera: TAXONOMY_ACCENT.technique,
  models: TAXONOMY_ACCENT.model,
  styles: TAXONOMY_ACCENT.style,
  collections: "blue",
  creators: "yellow",
} as const satisfies Record<string, SectionAccent>;
