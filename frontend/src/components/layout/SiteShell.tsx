import type { Locale } from "@/lib/i18n/config";

import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

export interface SiteShellProps {
  locale: Locale;
  children: React.ReactNode;
  /** See `SiteFooterProps.snapshotDate`. */
  snapshotDate?: string | null;
}

/**
 * The shared page shell: skip link, header, `<main id="main">`, footer. Every
 * route — including `not-found.tsx`, which sits outside `[locale]/layout.tsx`
 * — renders through this component so the skip link and landmark structure
 * never has to be hand-duplicated.
 */
export function SiteShell({ locale, children, snapshotDate }: SiteShellProps) {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:flex focus:min-h-11 focus:items-center focus:border-2 focus:border-foreground focus:bg-accent-yellow focus:px-4 focus:font-bold"
      >
        跳到主内容
      </a>
      <SiteHeader locale={locale} />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter locale={locale} snapshotDate={snapshotDate} />
    </div>
  );
}
