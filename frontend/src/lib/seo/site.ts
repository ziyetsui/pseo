import type { Metadata } from "next";

import { OPEN_GRAPH_LOCALE, PUBLISHED_LOCALES, type Locale } from "@/lib/i18n/config";

/**
 * Placeholder origin used until a real domain is configured. It is deliberately
 * an unresolvable `.invalid` host so a misconfigured deploy is obvious in the
 * emitted canonical rather than silently pointing at someone else's site.
 */
export const FALLBACK_SITE_URL = "https://example.invalid";

export const SITE_NAME = "提示词库";

export function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!configured) return FALLBACK_SITE_URL;
  return configured.replace(/\/+$/, "");
}

export function absoluteUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${getSiteUrl()}${normalized}`;
}

export interface BuildMetadataInput {
  locale: Locale;
  title: string;
  description: string;
  /**
   * Locale-prefixed path for every locale where this exact page exists, e.g.
   * `{ "zh-CN": "/zh-CN/prompts" }`. The entry for `locale` becomes the
   * canonical URL and must be present. Only entries whose key is a published
   * locale are ever advertised as hreflang alternates, so a missing
   * translation (an absent key) or an unpublished locale (a key not in
   * `PUBLISHED_LOCALES`) can never be advertised as one — `en` must never
   * appear here until it is published.
   */
  paths: Partial<Record<Locale, string>>;
  /**
   * Keep the page out of the index but still let crawlers follow its links —
   * `nofollow` would strand the canonical pages a noindexed page links to.
   */
  noindex?: boolean;
  /**
   * Test seam: which locales count as "published" when deciding hreflang
   * alternates. Production callers should never pass this — it defaults to
   * the real `PUBLISHED_LOCALES` — but it lets tests exercise the two-locale
   * and filtering behaviour without a second locale actually being published.
   */
  publishedLocales?: readonly Locale[];
}

export function buildMetadata({
  locale,
  title,
  description,
  paths,
  noindex = false,
  publishedLocales = PUBLISHED_LOCALES,
}: BuildMetadataInput): Metadata {
  const currentPath = paths[locale];
  if (currentPath === undefined) {
    throw new Error(`buildMetadata: no path supplied for the current locale "${locale}"`);
  }
  const canonical = absoluteUrl(currentPath);

  // Only real, published locales get an hreflang entry, and only when a path
  // was actually supplied for them. A lone self-reference carries no
  // information, so `languages` is omitted entirely unless there are at
  // least two real alternates.
  const languageEntries = publishedLocales
    .filter((candidate) => paths[candidate] !== undefined)
    .map((candidate) => [candidate, absoluteUrl(paths[candidate] as string)] as const);

  const languages =
    languageEntries.length >= 2 ? Object.fromEntries(languageEntries) : undefined;

  return {
    title,
    description,
    alternates: {
      canonical,
      ...(languages ? { languages } : {}),
    },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title,
      description,
      url: canonical,
      locale: OPEN_GRAPH_LOCALE[locale],
    },
    twitter: {
      // No image is supplied by any page yet — "summary" is honest about that;
      // switch to "summary_large_image" once a page provides og:image.
      card: "summary",
      title,
      description,
    },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
  };
}
