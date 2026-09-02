/**
 * One accent per browse band.
 *
 * The hub runs six consecutive tile grids — 按任务 / 镜头与运动 / 按模型 /
 * 按风格 / 精选合集 / 创作者 — that used to be identical: same cell, same red
 * hairline, same 14px number. Scrolling read as one picture repeated forty
 * times. Giving each band its own accent (on the proportion bar and on the
 * leading tile's rank marker) turns that repetition into rhythm: you can tell
 * you have entered a new band before reading its heading.
 *
 * Colour is never the only signal. Every band still names itself in its `<h2>`,
 * every tile still names its term and prints its count, and the accented parts
 * are `aria-hidden` decoration over facts that are already in the text.
 *
 * Only tokens that already exist in `globals.css` are returned — red, blue,
 * yellow and foreground. Six bands over four accents means two repeats; the
 * order below keeps repeats non-adjacent so no two neighbouring bands match.
 */
export type SectionAccent = "red" | "blue" | "yellow" | "foreground";

const ACCENT_FILL: Record<SectionAccent, string> = {
  red: "bg-accent-red",
  blue: "bg-accent-blue",
  yellow: "bg-accent-yellow",
  foreground: "bg-foreground",
};

/** Rotation order, used by bands that have no fixed slot (the L2 grids). */
export const SECTION_ACCENT_ORDER: readonly SectionAccent[] = [
  "red",
  "blue",
  "yellow",
  "foreground",
];

/** Background utility for one accent. Always an existing token utility. */
export function accentFillClassName(accent: SectionAccent): string {
  return ACCENT_FILL[accent];
}

/** The accent for the nth band, wrapping around the four. */
export function sectionAccentAt(index: number): SectionAccent {
  const order = SECTION_ACCENT_ORDER;
  return order[((index % order.length) + order.length) % order.length] ?? "red";
}

/**
 * The hub's six browse bands, in the prototype's order. Keys match
 * `HUB_SECTION_IDS`; the first three follow the teardown plate exactly
 * (按任务 red, 镜头与运动 blue, 按模型 yellow).
 */
export const HUB_SECTION_ACCENTS = {
  tasks: "red",
  camera: "blue",
  models: "yellow",
  styles: "foreground",
  collections: "red",
  creators: "blue",
} as const satisfies Record<string, SectionAccent>;
