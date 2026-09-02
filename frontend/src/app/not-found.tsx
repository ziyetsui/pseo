import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { DEFAULT_LOCALE } from "@/lib/i18n/config";
import { promptsHome } from "@/lib/i18n/routes";

export const metadata: Metadata = {
  title: "页面不存在",
  // Not indexable, but crawlers should still follow the recovery links.
  robots: { index: false, follow: true },
};

export default function NotFound() {
  const target = promptsHome(DEFAULT_LOCALE);

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader locale={DEFAULT_LOCALE} />
      <main id="main" className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-16 md:px-8 md:py-24">
          <p
            aria-hidden="true"
            className="inline-block border-2 border-foreground bg-accent-yellow px-4 py-1 text-sm font-bold tracking-widest uppercase shadow-hard-sm md:border-4"
          >
            404
          </p>
          <h1 className="mt-6 text-4xl font-black tracking-tighter uppercase md:text-6xl">
            页面不存在
          </h1>
          <p className="mt-6 max-w-prose text-lg font-medium">
            这个地址没有对应的内容。可能链接已过期，或者该页面尚未发布。
          </p>
          <p className="mt-8">
            <Link
              href={target}
              className="inline-flex min-h-11 items-center border-2 border-foreground bg-accent-blue px-6 text-base font-bold tracking-wider text-surface uppercase shadow-hard-md md:border-4"
            >
              回到提示词库
            </Link>
          </p>
        </div>
      </main>
      <SiteFooter locale={DEFAULT_LOCALE} />
    </div>
  );
}
