import type { Metadata } from "next";
import Link from "next/link";

import { SiteShell } from "@/components/layout/SiteShell";
import { getContentRepository } from "@/lib/content";
import { DEFAULT_LOCALE } from "@/lib/i18n/config";
import { blogHome, promptsHome, promptsImage } from "@/lib/i18n/routes";

export const metadata: Metadata = {
  title: "页面不存在",
  // No explicit `robots` here: Next.js already emits its own
  // `<meta name="robots" content="noindex">` for the static `/404` page
  // unconditionally (see NonIndex in next/dist/server/app-render/app-render.js).
  // Adding our own `noindex` directive on top produced two robots tags with
  // the same effective meaning — one is enough, so we defer to Next's.
};

/**
 * Recovery routes offered in the page body. The shell's navigation already
 * carries them, but a 404 is exactly the moment a reader should not have to go
 * hunting in the header — so the three real destinations that exist in this
 * phase are repeated inline. Every href comes from the route builder; routes
 * that do not exist yet (video, use cases, styles, creators) are absent rather
 * than rendered as dead links.
 */
const DESTINATIONS = [
  {
    href: promptsHome(DEFAULT_LOCALE),
    label: "提示词库",
    description: "按模型、用途、技巧与风格浏览全部提示词。",
    className: "bg-accent-blue text-surface",
  },
  {
    href: promptsImage(DEFAULT_LOCALE),
    label: "图片提示词",
    description: "图片方向的提示词合集与筛选入口。",
    className: "bg-accent-red text-surface",
  },
  {
    href: blogHome(DEFAULT_LOCALE),
    label: "Blog",
    description: "变量替换、来源与版权等说明性文章。",
    className: "bg-accent-yellow text-foreground",
  },
] as const;

export default async function NotFound() {
  const snapshot = await getContentRepository().getSnapshot();

  return (
    <SiteShell locale={DEFAULT_LOCALE} snapshotDate={snapshot.observedAt}>
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

        <nav aria-label="可前往的页面" className="mt-10">
          <ul className="grid gap-4 md:grid-cols-3">
            {DESTINATIONS.map((destination) => (
              <li key={destination.href}>
                <Link
                  href={destination.href}
                  className={`flex min-h-11 flex-col gap-2 border-2 border-foreground p-4 shadow-hard-md transition duration-200 ease-out hover:-translate-y-1 md:border-4 ${destination.className}`}
                >
                  <span className="text-lg font-black tracking-tighter uppercase">
                    {destination.label}
                  </span>
                  <span className="text-sm font-medium">{destination.description}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </SiteShell>
  );
}
