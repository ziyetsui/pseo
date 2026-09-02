/**
 * Single source of truth for locales.
 *
 * Only `zh-CN` exists as real, reviewed content in this phase. An `en` locale is
 * planned but NOT published: it must never appear in routes, hreflang alternates
 * or copy until real translations are merged. Adding a locale here is the only
 * supported way to publish one.
 */
export const SUPPORTED_LOCALES = ["zh-CN"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "zh-CN";

/**
 * Locales whose pages are actually generated and indexable. Kept separate from
 * SUPPORTED_LOCALES so a locale can be developed behind the scenes before it is
 * announced in `generateStaticParams`, sitemaps or hreflang.
 */
export const PUBLISHED_LOCALES: readonly Locale[] = SUPPORTED_LOCALES;

/** BCP 47 locale → Open Graph `og:locale` form. */
export const OPEN_GRAPH_LOCALE: Record<Locale, string> = {
  "zh-CN": "zh_CN",
};

/** Human-readable label shown in the (currently single-entry) language control. */
export const LOCALE_LABEL: Record<Locale, string> = {
  "zh-CN": "简体中文",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export function isPublishedLocale(value: unknown): value is Locale {
  return isLocale(value) && PUBLISHED_LOCALES.includes(value);
}
