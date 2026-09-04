import type { ReactNode } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import "@/styles/globals.css";
import { siteIcons } from '@/site/icons';

export const metadata: Metadata = { title: "Prompt Library", description: "Original prompts, their results, and the people who wrote them.", icons: siteIcons };

/** Route locale and the fixed English prototype UI are separate language scopes. */
export default async function LocaleLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (locale !== "en" && locale !== "zh-CN") notFound();
  return <html lang={locale}><body lang="en">{children}</body></html>;
}
