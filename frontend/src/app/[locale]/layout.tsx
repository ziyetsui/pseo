import { notFound } from "next/navigation";

import { SiteShell } from "@/components/layout/SiteShell";
import { getContentRepository } from "@/lib/content";
import { PUBLISHED_LOCALES, isPublishedLocale } from "@/lib/i18n/config";

/** Static export: only the locales listed below may exist as routes. */
export const dynamicParams = false;

/*
 * Why there is no route-level `loading.tsx` anywhere under `[locale]/`.
 *
 * A `loading.tsx` is a Suspense boundary. During `output: "export"` React
 * prerenders the fallback into `<main>` and flushes the real page at the end of
 * `<body>` inside `<div hidden id="S:…">`, to be swapped in by an inline
 * `$RC(...)` script. With JavaScript disabled that swap never happens, so the
 * exported HTML shows nothing but `加载中` — which breaks the indexable-first-
 * screen guarantee (global constraint 11 / AGENTS.md §6) that this whole site
 * exists for. Whether a given page flushes inline or gets parked is build-timing
 * dependent, so it cannot be relied on either.
 *
 * Nothing is fetched at request time here: every page resolves fixture data at
 * build time, so a route-level loading state buys literally nothing. Loading
 * states that a reader can actually observe live in client transitions and are
 * rendered with `StateBlock variant="loading"`. `error.tsx` stays — it is a
 * client error boundary and does not affect the prerendered HTML.
 */

export function generateStaticParams() {
  return PUBLISHED_LOCALES.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isPublishedLocale(locale)) notFound();
  const snapshot = await getContentRepository().getSnapshot();

  return (
    <SiteShell locale={locale} snapshotDate={snapshot.observedAt}>
      {children}
    </SiteShell>
  );
}
