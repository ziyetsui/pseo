import { notFound } from "next/navigation";

import { SiteShell } from "@/components/layout/SiteShell";
import { PUBLISHED_LOCALES, isPublishedLocale } from "@/lib/i18n/config";

/** Static export: only the locales listed below may exist as routes. */
export const dynamicParams = false;

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

  return <SiteShell locale={locale}>{children}</SiteShell>;
}
