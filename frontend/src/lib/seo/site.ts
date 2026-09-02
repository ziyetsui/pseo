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
  /** Locale-prefixed path, e.g. `/zh-CN/prompts`. */
  path: string;
  /**
   * Locales for which this exact page really exists. Defaults to every published
   * locale. Pass a narrower list (or `[]`) when a translation is missing — a
   * missing translation must never be advertised as an alternate.
   */
  availableLocales?: readonly Locale[];
  /**
   * Keep the page out of the index but still let crawlers follow its links —
   * `nofollow` would strand the canonical pages a noindexed page links to.
   */
  noindex?: boolean;
}

export function buildMetadata({
  locale,
  title,
  description,
  path,
  availableLocales = PUBLISHED_LOCALES,
  noindex = false,
}: BuildMetadataInput): Metadata {
  const canonical = absoluteUrl(path);

  // Only real, published locales get an hreflang entry. With a single locale
  // this is just the self-reference; `en` is not published and never appears.
  const languageEntries = availableLocales
    .filter((candidate) => PUBLISHED_LOCALES.includes(candidate))
    .map((candidate) => [candidate, absoluteUrl(path)] as const);

  const languages =
    languageEntries.length > 0 ? Object.fromEntries(languageEntries) : undefined;

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
      card: "summary_large_image",
      title,
      description,
    },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
  };
}
