import Link from "next/link";

import type { Locale } from "@/lib/i18n/config";

import { getPrimaryNav } from "./nav";

export interface SiteFooterProps {
  locale: Locale;
  /**
   * Observation date of the underlying data snapshot. Supplied by the content
   * repository once it exists (task 2); `null` until then, and rendered as an
   * explicit "not connected yet" state rather than a plausible-looking date.
   */
  snapshotDate?: string | null;
}

export function SiteFooter({ locale, snapshotDate = null }: SiteFooterProps) {
  const items = getPrimaryNav(locale);

  return (
    <footer
      data-surface="inverse"
      className="mt-16 border-t-2 border-foreground bg-foreground text-surface md:border-t-4"
    >
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 md:grid-cols-2 md:px-8 md:py-14">
        <nav aria-labelledby="footer-nav-heading">
          <h2
            id="footer-nav-heading"
            className="text-xs font-bold tracking-widest text-accent-yellow uppercase"
          >
            站内导航
          </h2>
          <ul className="mt-4 flex flex-col gap-1">
            {items.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="flex min-h-11 items-center font-medium underline">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <section aria-labelledby="footer-source-heading" className="text-sm leading-relaxed">
          <h2
            id="footer-source-heading"
            className="text-xs font-bold tracking-widest text-accent-yellow uppercase"
          >
            来源与版权
          </h2>
          <p className="mt-4 font-medium">提示词版权归原作者所有，本站注明出处。</p>
          <p className="mt-2 font-medium">
            数据快照日期：
            {snapshotDate ?? "尚未接入内容仓库"}
          </p>
          <p className="mt-2 font-medium">RSS 订阅与更多语言为后续版本能力，本版本尚未提供。</p>
        </section>
      </div>
    </footer>
  );
}
