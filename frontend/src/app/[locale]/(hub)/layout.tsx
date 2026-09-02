import { notFound } from "next/navigation";

import { SiteShell } from "@/components/layout/SiteShell";
import { getContentRepository } from "@/lib/content";
import { isPublishedLocale } from "@/lib/i18n/config";
import { buildFooterColumns } from "@/features/hub/footer-links";

/**
 * Shell for the hub group (`/{locale}/prompts`).
 *
 * The prototype gives each page its own chrome: L1 marks 首页 as the current
 * nav entry and carries the five-column footer, while L2/L3/L4 use the compact
 * foot. A layout cannot receive props from a page, so the variant is decided by
 * the route group the page lives in — this file is the hub's.
 *
 * The footer columns are built here rather than inside `SiteFooter` so the
 * footer component stays free of repository calls; `buildFooterColumns` turns
 * real taxonomy terms into real hrefs (global constraint 5).
 */
export default async function HubLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isPublishedLocale(locale)) notFound();

  const repository = getContentRepository();
  const [snapshot, models, useCases, techniques, styles] = await Promise.all([
    repository.getSnapshot(),
    repository.listTaxonomies(locale, "model"),
    repository.listTaxonomies(locale, "useCase"),
    repository.listTaxonomies(locale, "technique"),
    repository.listTaxonomies(locale, "style"),
  ]);

  return (
    <SiteShell
      locale={locale}
      snapshotDate={snapshot.observedAt}
      currentNav="home"
      footerVariant="full"
      footerColumns={buildFooterColumns(locale, { models, useCases, techniques, styles })}
    >
      {children}
    </SiteShell>
  );
}
