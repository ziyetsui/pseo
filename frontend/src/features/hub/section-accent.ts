import { TAXONOMY_ACCENT, accentFillClassName, type Accent } from "@/components/ui/accent";

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
 */
export type SectionAccent = Accent;

export { accentFillClassName };

/** Rotation order, used by bands that have no fixed slot (the L2 grids). */
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

/** The hub's six browse bands, in the prototype's order. Keys match `HUB_SECTION_IDS`. */
export const HUB_SECTION_ACCENTS = {
  tasks: TAXONOMY_ACCENT.useCase,
  camera: TAXONOMY_ACCENT.technique,
  models: TAXONOMY_ACCENT.model,
  styles: TAXONOMY_ACCENT.style,
  collections: "blue",
  creators: "yellow",
} as const satisfies Record<string, SectionAccent>;
