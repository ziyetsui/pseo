import { notFound } from "next/navigation";

import { SiteShell } from "@/components/layout/SiteShell";
import { getServerContentRepository } from "@/lib/content/server";
import { isPublishedLocale } from "@/lib/i18n/config";

/**
 * Shell for the pages the prototype gives no nav entry of its own: the model
 * page (L3), the prompt detail page (L4) and the `/{locale}` transit page.
 * They all wear the prototype's compact three-item footer and mark no
 * primary nav item as current — `currentNav` is deliberately not passed, which
 * is how `SiteHeader` expresses "none of them" (the prototype's L3 marks 模型,
 * but that entry is unlinked text this phase, so nothing can carry
 * `aria-current="page"`).
 *
 * Route groups exist because `SiteShell`'s per-page props (footer variant,
 * current nav) cannot travel from a page up into a layout. See
 * `.superpowers/sdd/parallel-protocol.md` (Wave B addendum): `[locale]/layout.tsx`
 * is the locale guard only, and each group layout renders its own shell.
 */
export default async function SiteGroupLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isPublishedLocale(locale)) notFound();
  const snapshot = await (await getServerContentRepository()).getSnapshot();

  return (
    <SiteShell locale={locale} snapshotDate={snapshot.observedAt} footerVariant="compact">
      {children}
    </SiteShell>
  );
}
