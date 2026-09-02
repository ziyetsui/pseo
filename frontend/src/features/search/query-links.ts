import { serializePromptQuery } from "@/lib/content/query";
import type { AppliedFilter, PromptQuery, QueryFacetKey } from "@/lib/content/types";
import { withQuery } from "@/lib/i18n/routes";

/**
 * URL arithmetic for the filter UI. Every filter link in the app is produced
 * here so the query contract (`q`, `model`, `useCase`, `technique`, `style`,
 * `subject`, `window`; same axis OR, across axes AND) lives in exactly one
 * place and is serialized by `serializePromptQuery` + `withQuery` — never by
 * hand-built strings.
 */

/** Replaces one axis. Written out per key so no type assertion is needed. */
export function setFacet(
  query: PromptQuery,
  key: QueryFacetKey,
  values: readonly string[],
): PromptQuery {
  const patch: PromptQuery = {};
  if (key === "model") patch.model = values;
  else if (key === "useCase") patch.useCase = values;
  else if (key === "technique") patch.technique = values;
  else if (key === "style") patch.style = values;
  else patch.subject = values;
  return { ...query, ...patch };
}

export function facetValues(query: PromptQuery, key: QueryFacetKey): readonly string[] {
  return query[key] ?? [];
}

export function isFacetSelected(query: PromptQuery, key: QueryFacetKey, slug: string): boolean {
  return facetValues(query, key).includes(slug);
}

/** Same-axis OR: adds the value if absent, removes it if present. */
export function toggleFacet(query: PromptQuery, key: QueryFacetKey, slug: string): PromptQuery {
  const current = facetValues(query, key);
  const next = current.includes(slug)
    ? current.filter((value) => value !== slug)
    : [...current, slug];
  return setFacet(query, key, next);
}

/** The query with exactly one applied filter taken out. */
export function removeFilter(query: PromptQuery, filter: AppliedFilter): PromptQuery {
  if (filter.key === "q") return { ...query, q: undefined };
  if (filter.key === "window") return { ...query, window: undefined };
  return setFacet(
    query,
    filter.key,
    facetValues(query, filter.key).filter((value) => value !== filter.value),
  );
}

/** Canonical href for a query on a given page. */
export function queryHref(basePath: string, query: PromptQuery): string {
  return withQuery(basePath, serializePromptQuery(query));
}
