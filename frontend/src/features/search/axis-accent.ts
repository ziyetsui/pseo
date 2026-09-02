import type { QueryFacetKey } from "@/lib/content/types";

/**
 * One colour per filter axis, as an existing background token utility.
 *
 * The filter block used to read as a single undifferentiated mass: four axis
 * rows with the same border weight and the same type weight. Each row now
 * carries a 4px vertical edge in its own axis colour, so the eye can tell "these
 * are four different things" before reading a single word. The colour is never
 * the only signal — every band still names its axis in text, and every chip
 * keeps its own selected/idle treatment.
 *
 * Only tokens that already exist are returned (`bg-accent-red`,
 * `bg-accent-blue`, `bg-accent-yellow`, `bg-foreground`); this module adds no
 * colour of its own and never touches `globals.css`.
 *
 * `subject` appears only on L2/L3, where the axes are 用例 / 风格 / 主体 and
 * `technique` is absent, so reusing yellow there gives those pages three
 * distinct edges without inventing a fifth colour.
 */
const AXIS_ACCENT: Record<QueryFacetKey, string> = {
  model: "bg-accent-red",
  useCase: "bg-accent-blue",
  technique: "bg-accent-yellow",
  style: "bg-foreground",
  subject: "bg-accent-yellow",
};

/** Background utility for one axis's band edge. */
export function axisAccentClassName(key: QueryFacetKey): string {
  return AXIS_ACCENT[key];
}
