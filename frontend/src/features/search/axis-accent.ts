import { TAXONOMY_ACCENT, accentFillClassName } from "@/components/ui/accent";
import type { QueryFacetKey } from "@/lib/content/types";

/**
 * The band edge colour for one filter axis.
 *
 * The filter block used to read as a single undifferentiated mass: four axis
 * rows with the same border weight and the same type weight. Each row now
 * carries a 4px vertical edge in its axis colour, so the eye can tell "these
 * are four different things" before reading a word.
 *
 * The mapping itself lives in `components/ui/accent` because the browse bands
 * on the same page colour the same axes — see the note there.
 */
export function axisAccentClassName(key: QueryFacetKey): string {
  return accentFillClassName(TAXONOMY_ACCENT[key]);
}
