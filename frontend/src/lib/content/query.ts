import {
  QUERY_FACET_KEYS,
  type PromptQuery,
  type PromptSummary,
  type QueryFacetKey,
  type Taxonomy,
  type TaxonomyAxis,
  type TrendingWindow,
} from "./types";

/**
 * Filtering rules, shared verbatim by the server (initial HTML) and the client
 * (URL-driven re-filtering). Pure functions only — no fixture imports, no
 * `Date.now()`: trending windows are always relative to the snapshot date.
 */

const FACET_AXIS: Record<QueryFacetKey, TaxonomyAxis> = {
  model: "model",
  useCase: "useCase",
  technique: "technique",
  style: "style",
  subject: "subject",
};

/** The five taxonomy-array fields on `PromptSummary` a facet can filter by. */
type PromptTaxonomyField = "models" | "useCases" | "techniques" | "styles" | "subjects";

const PROMPT_FACET_FIELD: Record<QueryFacetKey, PromptTaxonomyField> = {
  model: "models",
  useCase: "useCases",
  technique: "techniques",
  style: "styles",
  subject: "subjects",
};

const TRENDING_WINDOWS: readonly TrendingWindow[] = ["7d", "30d", "all"];

export function facetAxis(key: QueryFacetKey): TaxonomyAxis {
  return FACET_AXIS[key];
}

export function promptTaxonomies(prompt: PromptSummary, key: QueryFacetKey): Taxonomy[] {
  return prompt[PROMPT_FACET_FIELD[key]];
}

function isTrendingWindow(value: string): value is TrendingWindow {
  return (TRENDING_WINDOWS as readonly string[]).includes(value);
}

/**
 * Start of a trending window, counted back from the snapshot date. `all` has no
 * lower bound. Returns an ISO date string so comparisons stay lexical (the
 * fixture stores `YYYY-MM-DD`).
 */
export function resolveWindowStart(observedAt: string, window: TrendingWindow): string | null {
  if (window === "all") return null;
  const days = window === "7d" ? 7 : 30;
  const start = new Date(`${observedAt}T00:00:00Z`);
  if (Number.isNaN(start.getTime())) return null;
  start.setUTCDate(start.getUTCDate() - days);
  return start.toISOString().slice(0, 10);
}

export interface PromptSearchTextInput {
  title: string;
  /**
   * The FULL prompt text — never the truncated 240-char `promptPreview` — so a
   * term that only appears past the preview cut-off still matches.
   */
  promptText: string;
  handle: string;
  taxonomies: readonly Taxonomy[];
}

/**
 * Builds the lower-cased, whitespace-normalized haystack a free-text term is
 * matched against: title + full prompt text + creator handle + every matched
 * taxonomy's label/slug/labelZh. The repository's view builder computes this
 * once per prompt and stores it as `PromptSummary.searchText`; `applyPromptQuery`
 * only ever reads that stored value, so it never falls back to the preview.
 */
export function buildPromptSearchText(input: PromptSearchTextInput): string {
  const parts: string[] = [input.title, input.promptText, input.handle];
  for (const term of input.taxonomies) {
    parts.push(term.label, term.slug);
    if (term.labelZh !== null) parts.push(term.labelZh);
  }
  return parts.join(" | ").toLowerCase().replace(/\s+/g, " ").trim();
}

/** Splits a raw search box value into the terms that must ALL match. */
export function searchTerms(q: string | undefined): string[] {
  if (q === undefined) return [];
  return q
    .trim()
    .split(/\s+/)
    .map((term) => term.replace(/^@/, "").toLowerCase())
    .filter((term) => term.length > 0);
}

export interface ApplyPromptQueryOptions {
  /**
   * Inclusive lower bound (ISO date) for `query.window`. The repository derives
   * it from the snapshot; when omitted the window filter is a no-op so client
   * components can filter without knowing the snapshot.
   */
  windowStart?: string | null;
  /**
   * Collection slug → the prompt ids that belong to it. Supplied by whoever
   * knows the collection rules (the repository on the server, or the page's
   * serialized `collections` prop on the client), which is what lets a
   * body-regex collection be filtered by a component that has never seen the
   * rule. A `query.collection` naming a slug absent from this map is a no-op,
   * exactly like an omitted map: the caller reports it as an unknown value
   * rather than silently filtering everything away.
   */
  collectionMembers?: Readonly<Record<string, readonly string[]>>;
}

/**
 * Same axis → OR. Across axes → AND. Free text → AND with everything, and every
 * whitespace-separated term must match.
 */
export function applyPromptQuery(
  prompts: readonly PromptSummary[],
  query: PromptQuery,
  options: ApplyPromptQueryOptions = {},
): PromptSummary[] {
  const terms = searchTerms(query.q);
  const windowStart = query.window === undefined ? null : (options.windowStart ?? null);

  const memberIds =
    query.collection === undefined
      ? null
      : resolveCollectionMembers(options.collectionMembers, query.collection);

  return prompts.filter((prompt) => {
    if (memberIds !== null && !memberIds.has(prompt.id)) return false;

    for (const key of QUERY_FACET_KEYS) {
      const selected = query[key];
      if (selected === undefined || selected.length === 0) continue;
      const slugs = new Set(promptTaxonomies(prompt, key).map((term) => term.slug));
      if (!selected.some((slug) => slugs.has(slug))) return false;
    }

    if (windowStart !== null) {
      const publishedAt = prompt.source.publishedAt;
      if (publishedAt === null || publishedAt < windowStart) return false;
    }

    if (terms.length > 0) {
      const hay = prompt.searchText;
      if (!terms.every((term) => hay.includes(term))) return false;
    }

    return true;
  });
}

/**
 * `null` when the collection cannot be resolved — an absent map or an unknown
 * slug — so the filter degrades to a no-op instead of matching nothing.
 */
function resolveCollectionMembers(
  members: Readonly<Record<string, readonly string[]>> | undefined,
  slug: string,
): Set<string> | null {
  if (members === undefined) return null;
  const ids = members[slug];
  if (ids === undefined) return null;
  return new Set(ids);
}

/* ------------------------------------------------------------ URL parsing */

export type SearchParamsInput =
  | string
  | URLSearchParams
  | Readonly<Record<string, string | string[] | undefined>>;

function toEntries(input: SearchParamsInput): [string, string][] {
  if (typeof input === "string") return [...new URLSearchParams(input).entries()];
  if (input instanceof URLSearchParams) return [...input.entries()];

  const entries: [string, string][] = [];
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) for (const item of value) entries.push([key, item]);
    else entries.push([key, value]);
  }
  return entries;
}

export interface ParsedPromptQuery {
  query: PromptQuery;
  /**
   * Param names present in the URL that this page cannot honour — either an
   * unknown key or a known key with an unusable value. Surfaced to the user
   * instead of being silently ignored.
   */
  unknownParams: string[];
}

export function parsePromptQuery(input: SearchParamsInput): ParsedPromptQuery {
  const query: PromptQuery = {};
  const unknown = new Set<string>();
  const facets = new Map<QueryFacetKey, string[]>();

  for (const [rawKey, rawValue] of toEntries(input)) {
    const value = rawValue.trim();

    if (rawKey === "q") {
      if (value.length > 0) query.q = value;
      continue;
    }

    if (rawKey === "collection") {
      if (value.length > 0) query.collection = value;
      continue;
    }

    if (rawKey === "window") {
      if (isTrendingWindow(value)) query.window = value;
      else unknown.add("window");
      continue;
    }

    if ((QUERY_FACET_KEYS as readonly string[]).includes(rawKey)) {
      if (value.length === 0) continue;
      const key = rawKey as QueryFacetKey;
      const bucket = facets.get(key) ?? [];
      if (!bucket.includes(value)) bucket.push(value);
      facets.set(key, bucket);
      continue;
    }

    unknown.add(rawKey);
  }

  for (const key of QUERY_FACET_KEYS) {
    const values = facets.get(key);
    if (values !== undefined && values.length > 0) query[key] = values;
  }

  return { query, unknownParams: [...unknown].sort() };
}

/** Query → `withQuery` params. Empty axes are dropped so URLs stay canonical. */
export function serializePromptQuery(query: PromptQuery): Record<string, string | string[]> {
  const params: Record<string, string | string[]> = {};
  if (query.q !== undefined && query.q.trim().length > 0) params.q = query.q.trim();
  if (query.collection !== undefined && query.collection.trim().length > 0) {
    params.collection = query.collection.trim();
  }
  for (const key of QUERY_FACET_KEYS) {
    const values = query[key];
    if (values !== undefined && values.length > 0) params[key] = [...values];
  }
  if (query.window !== undefined && query.window !== "all") params.window = query.window;
  return params;
}

/** True when the query would not filter anything out. */
export function isEmptyPromptQuery(query: PromptQuery): boolean {
  return Object.keys(serializePromptQuery(query)).length === 0;
}
