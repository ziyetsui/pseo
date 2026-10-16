import type { ReactNode } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import "@/styles/globals.css";
import { siteIcons } from '@/site/icons';
import {dataMode} from '@/lib/catalog/config';

/** X's video CDN rejects cross-site Referer headers; images already omit them per element. */
export function generateMetadata(): Metadata {
  return { title: "Prompt Library", description: "Original prompts, their results, and the people who wrote them.", icons: siteIcons, ...(dataMode() === 'git-beta' ? { referrer: 'no-referrer' as const } : {}) };
}

/** Explicit bilingual beta; legacy prototype UI remains a separate English scope. */
export default async function LocaleLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (locale !== "en" && locale !== "zh-CN") notFound();
  return <html lang={locale}><body lang={dataMode()==='git-beta'?locale:'en'}>{children}</body></html>;
}
