import type { Metadata } from "next";
import Link from "next/link";

import { isPublishedLocale } from "@/lib/i18n/config";
import { promptsHome } from "@/lib/i18n/routes";
import { buildMetadata } from "@/lib/seo/site";
import { notFound } from "next/navigation";

const TITLE = "提示词库";
const DESCRIPTION = "本站入口，进入提示词库浏览按模型、用途与风格整理的图片提示词。";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isPublishedLocale(locale)) notFound();
  // The locale root forwards to L1, so it declares L1 as its canonical.
  return buildMetadata({ locale, title: TITLE, description: DESCRIPTION, path: promptsHome(locale) });
}

export default async function LocaleIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isPublishedLocale(locale)) notFound();
  const target = promptsHome(locale);

  return (
    <>
      {/* Static export has no server redirect; a 0s meta refresh plus a real
          link keeps the hop working with and without JavaScript. */}
      <meta httpEquiv="refresh" content={`0;url=${target}`} />
      <div className="mx-auto max-w-7xl px-4 py-16 md:px-8 md:py-24">
        <h1 className="text-4xl font-black tracking-tighter uppercase md:text-6xl">{TITLE}</h1>
        <p className="mt-6 max-w-prose text-lg font-medium">正在前往提示词库。</p>
        <p className="mt-6">
          <Link
            href={target}
            className="inline-flex min-h-11 items-center border-2 border-foreground bg-accent-red px-6 text-base font-bold tracking-wider text-surface uppercase shadow-hard-md md:border-4"
          >
            立即进入提示词库
          </Link>
        </p>
      </div>
    </>
  );
}
