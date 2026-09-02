import { notFound } from "next/navigation";

import { SiteShell } from "@/components/layout/SiteShell";
import { getContentRepository } from "@/lib/content";
import { isPublishedLocale } from "@/lib/i18n/config";

/**
 * Shell for the gallery group (currently the L2 image gallery).
 *
 * The prototype gives every page its own header/footer state, and a layout
 * cannot receive props from the page below it — so the shell variants are
 * expressed as route groups instead: this one marks 图片 as the current nav
 * entry and renders the prototype's three-line compact foot.
 *
 * The group adds no path segment, so `/zh-CN/prompts/image` is unchanged.
 */
export default async function GalleryLayout({
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
    <SiteShell
      locale={locale}
      snapshotDate={snapshot.observedAt}
      currentNav="image"
      footerVariant="compact"
    >
      {children}
    </SiteShell>
  );
}
