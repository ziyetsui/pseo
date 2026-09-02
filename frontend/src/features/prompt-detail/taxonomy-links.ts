import { queryHref, setFacet } from "@/features/search/query-links";
import type { QueryFacetKey, Taxonomy } from "@/lib/content/types";
import type { Locale } from "@/lib/i18n/config";
import { promptsHome } from "@/lib/i18n/routes";

const FACET_AXES: readonly QueryFacetKey[] = ["model", "useCase", "technique", "style", "subject"];

function isFacetAxis(axis: Taxonomy["axis"]): axis is QueryFacetKey {
  return (FACET_AXES as readonly string[]).includes(axis);
}

/**
 * Where a taxonomy chip should point.
 *
 * A term with a real page of its own (a model, the image gallery) links there;
 * everything else links to the L1 library pre-filtered on that term, built by
 * `query-links` so the query contract lives in one place. Returns `null` when
 * neither exists — the caller must then render plain text, never `href="#"`
 * (global constraint 5).
 */
export function taxonomyHref(locale: Locale, term: Taxonomy): string | null {
  if (term.href !== null) return term.href;
  if (!isFacetAxis(term.axis)) return null;
  return queryHref(promptsHome(locale), setFacet({}, term.axis, [term.slug]));
}

export function taxonomyLabel(term: Taxonomy): string {
  return term.labelZh ?? term.label;
}
