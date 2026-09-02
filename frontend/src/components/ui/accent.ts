/**
 * The four accents the page may use to tell one group of things from another,
 * and the single mapping from a taxonomy axis to its accent.
 *
 * Why this lives in `components/ui` rather than in either feature: the filter
 * chips (`features/search`) and the browse bands (`features/hub`) colour the
 * *same* concepts on the *same* page — 任务 is a `useCase` band and a `useCase`
 * chip row. When the two kept private maps they disagreed, and a reader saw
 * blue 用例 chips above a red 按任务浏览 band, which makes the colour encode
 * nothing. One map, imported by both, makes agreement structural instead of a
 * thing someone has to remember.
 *
 * The record is keyed by plain axis names rather than by the domain type, so
 * this module stays free of business imports (see CLAUDE.md §4); each feature
 * looks its own key up here.
 *
 * Colour is never the only signal: every band names itself in its heading and
 * every chip row names its axis in text, and the accented parts are
 * `aria-hidden` decoration over facts that are already written out.
 */
export type Accent = "red" | "blue" | "yellow" | "foreground";

const ACCENT_FILL: Record<Accent, string> = {
  red: "bg-accent-red",
  blue: "bg-accent-blue",
  yellow: "bg-accent-yellow",
  foreground: "bg-foreground",
};

/** Background utility for an accent. Always an already-defined token utility. */
export function accentFillClassName(accent: Accent): string {
  return ACCENT_FILL[accent];
}

/**
 * One accent per taxonomy axis, shared by the chip rows and the browse bands.
 *
 * `subject` reuses yellow because it only ever appears on L2/L3, where the axes
 * are 用例 / 风格 / 主体 and `technique` is absent — so those pages still get
 * three distinct edges without inventing a fifth colour.
 */
export const TAXONOMY_ACCENT = {
  model: "red",
  useCase: "blue",
  technique: "yellow",
  style: "foreground",
  subject: "yellow",
} as const satisfies Record<string, Accent>;
