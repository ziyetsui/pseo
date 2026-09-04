import type { Axis, Catalog, Filters, Prompt } from "./types";

export const axes = ["model", "useCase", "technique", "style", "subject"] as const;
const fields = { model: "models", useCase: "useCases", technique: "techniques", style: "styles", subject: "subjects" } as const;

export function promptHref(locale: string, slug: string): string {
  return `/${encodeURIComponent(locale)}/prompts/${encodeURIComponent(slug)}`;
}

export function modelHref(locale: string, slug: string): string {
  return `/${encodeURIComponent(locale)}/prompts/models/${encodeURIComponent(slug)}`;
}

/** Task card and footer destination; ordinary useCase filters stay on L1. */
export function taskHref(locale: string, slug: string): string {
  return `/${encodeURIComponent(locale)}/prompts/use-cases/${encodeURIComponent(slug)}`;
}

/** Style card and footer destination; ordinary style filters stay on L1. */
export function styleHref(locale: string, slug: string): string {
  return `/${encodeURIComponent(locale)}/prompts/styles/${encodeURIComponent(slug)}`;
}

export function subjectHref(locale: string, slug: string): string {
  return `/${encodeURIComponent(locale)}/prompts/subjects/${encodeURIComponent(slug)}`;
}

export function filterHref(locale: string, key: Axis | "creator" | "collection" | "contentType", value: string): string {
  return `/${encodeURIComponent(locale)}/prompts?${new URLSearchParams({ [key]: value }).toString()}`;
}

export function filtersFromParams(params: URLSearchParams): Filters {
  const result: Filters = {};
  for (const key of [...axes, "contentType", "creator"] as const) {
    const values = params.getAll(key).filter(Boolean);
    if (values.length) result[key] = values;
  }
  const query = params.get("q")?.trim();
  if (query) result.q = query;
  const collection = params.get("collection");
  if (collection) result.collection = collection;
  const sort = params.get("sort");
  if (sort === "newest" || sort === "value" || sort === "trending" || sort === "relevance") result.sort = sort;
  const window = params.get("window");
  if (window === "7d" || window === "30d" || window === "all") result.window = window;
  return result;
}

/** Same-axis OR and cross-axis AND, matching the public read API. */
export function filterPrompts(catalog: Catalog, filters: Filters = {}): Prompt[] {
  const query = filters.q?.trim().toLocaleLowerCase();
  const collection = filters.collection ? catalog.collections.find((item) => item.slug === filters.collection) : null;
  const epoch = catalog.observedAt ? Date.parse(catalog.observedAt) : NaN;
  const results = catalog.prompts.filter((prompt) => {
    if (query && !(prompt.ranking?.searchText ?? [prompt.title, prompt.summary, prompt.prompt, prompt.handle, ...axes.flatMap((axis) => prompt[fields[axis]].flatMap((ref) => [ref.label, ref.slug]))].join(" ").toLocaleLowerCase()).includes(query)) return false;
    if (filters.contentType?.length && !filters.contentType.includes(prompt.kind)) return false;
    if (filters.creator?.length && (!prompt.creatorRef || !filters.creator.some((creator) => creator === prompt.creatorRef?.id || creator === prompt.creatorRef?.slug))) return false;
    if (filters.collection && (!collection || !collection.promptIds.includes(prompt.id))) return false;
    for (const axis of axes) {
      if (filters[axis]?.length && !prompt[fields[axis]].some((ref) => filters[axis]?.includes(ref.slug) || filters[axis]?.includes(ref.id))) return false;
    }
    if (filters.window && filters.window !== "all" && Number.isFinite(epoch)) {
      const observedAt = prompt.ranking?.metricsObservedAt ?? prompt.source.observedAt;
      const observed = observedAt ? Date.parse(observedAt) : NaN;
      if (!Number.isFinite(observed) || observed < epoch - (filters.window === "7d" ? 7 : 30) * 86400000) return false;
    }
    return true;
  });
  const byDate = (a: Prompt, b: Prompt) => (b.publishedAt ? Date.parse(b.publishedAt) : 0) - (a.publishedAt ? Date.parse(a.publishedAt) : 0);
  const value = (prompt: Prompt) => prompt.ranking?.value ?? (prompt.likes ?? 0) + (prompt.saves ?? 0) * 2;
  if (filters.sort === "newest") results.sort((a, b) => byDate(a, b) || a.id.localeCompare(b.id));
  if (filters.sort === "value" || filters.sort === "trending") results.sort((a, b) => value(b) - value(a) || byDate(a, b) || a.id.localeCompare(b.id));
  if (catalog.mode === "public-api" && (!filters.sort || filters.sort === "relevance") && query) results.sort((a, b) => {
    const occurrences = (prompt: Prompt) => (prompt.ranking?.searchText.split(query).length ?? 1) - 1;
    return occurrences(b) - occurrences(a) || value(b) - value(a) || a.id.localeCompare(b.id);
  });
  return results;
}

/** Replaces every literal token; never truncates the copied prompt. */
export function fillVariables(prompt: string, values: Record<string, string>): string {
  return Object.entries(values).reduce((text, [token, value]) => value ? text.split(token).join(value) : text, prompt);
}
