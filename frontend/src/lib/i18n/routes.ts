import type { Locale } from "./config";

/**
 * The only place internal hrefs are constructed. Every link in the app must come
 * from one of these builders so that a route rename is a single-file change and
 * so no page can ship a `#` placeholder href.
 */

export type QueryValue = string | number | readonly string[] | null | undefined;
export type QueryParams = Readonly<Record<string, QueryValue>>;

function segment(value: string, name: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new Error(`Route builder received an empty ${name}; refusing to emit a broken href.`);
  }
  return encodeURIComponent(trimmed);
}

export function localeHome(locale: Locale): string {
  return `/${locale}`;
}

export function promptsHome(locale: Locale): string {
  return `/${locale}/prompts`;
}

export function promptsImage(locale: Locale): string {
  return `/${locale}/prompts/image`;
}

export function modelPage(locale: Locale, modelSlug: string): string {
  return `/${locale}/prompts/models/${segment(modelSlug, "model slug")}`;
}

export function promptDetail(locale: Locale, promptSlug: string): string {
  return `/${locale}/prompts/${segment(promptSlug, "prompt slug")}`;
}

/**
 * Serializes filter/search state onto a path. Keys are emitted in alphabetical
 * order so the same state always yields the same URL (stable canonical, stable
 * browser history, comparable in tests). Empty values are dropped rather than
 * serialized as `key=`.
 */
export function withQuery(path: string, params: QueryParams): string {
  const basePath = path.split("?")[0] ?? path;
  const search = new URLSearchParams();

  for (const key of Object.keys(params).sort()) {
    const value = params[key];
    if (value === null || value === undefined) continue;

    if (typeof value === "number") {
      if (!Number.isFinite(value)) continue;
      search.append(key, String(value));
      continue;
    }

    if (typeof value === "string") {
      if (value.trim().length === 0) continue;
      search.append(key, value);
      continue;
    }

    for (const entry of value) {
      if (typeof entry !== "string" || entry.trim().length === 0) continue;
      search.append(key, entry);
    }
  }

  const serialized = search.toString();
  return serialized.length > 0 ? `${basePath}?${serialized}` : basePath;
}
