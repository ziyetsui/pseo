import Link from "next/link";

import type { Locale } from "@/lib/i18n/config";
import { promptsHome } from "@/lib/i18n/routes";
import { SITE_NAME } from "@/lib/seo/site";

import { BrandMark } from "./BrandMark";
import { MobileNav } from "./MobileNav";
import { getPrimaryNav } from "./nav";

export function SiteHeader({ locale }: { locale: Locale }) {
  const items = getPrimaryNav(locale);

  return (
    <header className="relative border-b-2 border-foreground bg-surface md:border-b-4">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-8 md:py-4">
        <Link
          href={promptsHome(locale)}
          className="flex min-h-11 items-center gap-3 text-lg font-black tracking-tighter uppercase md:text-xl"
        >
          <BrandMark />
          <span>{SITE_NAME}</span>
        </Link>

        <nav aria-label="主导航" className="hidden md:block">
          <ul className="flex items-center gap-6">
            {items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex min-h-11 items-center text-sm font-bold tracking-wider uppercase"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {/*
            Language control placeholder. Only zh-CN is published, so the control
            is genuinely disabled and says so instead of pretending to switch.
          */}
          <button
            type="button"
            disabled
            aria-describedby="locale-availability"
            className="min-h-11 border-2 border-foreground bg-muted px-3 text-sm font-bold tracking-widest uppercase"
          >
            {locale}
          </button>
          <p id="locale-availability" className="max-w-28 text-xs leading-snug font-medium">
            更多语言尚未发布
          </p>
        </div>

        <MobileNav items={items} />
      </div>
    </header>
  );
}
