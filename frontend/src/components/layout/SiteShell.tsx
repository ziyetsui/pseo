import type { Locale } from "@/lib/i18n/config";

import { SiteFooter, type FooterColumn, type FooterLinkItem } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";
import type { NavKey } from "./nav";

export interface SiteShellProps {
  locale: Locale;
  children: React.ReactNode;
  /** See `SiteFooterProps.snapshotDate`. */
  snapshotDate?: string | null;
  /** Marks the matching primary nav entry `aria-current="page"`. */
  currentNav?: NavKey;
  /** See `SiteFooterProps.variant` — defaults to the compact L2/L3/L4 foot. */
  footerVariant?: "full" | "compact";
  /** Columns for the L1 (`full`) footer, built by the page. */
  footerColumns?: readonly FooterColumn[];
  /** Inline link row for the compact footer (the prototype's L4 foot). */
  footerLinks?: readonly FooterLinkItem[];
}

/**
 * The shared page shell: skip link, header, `<main id="main">`, footer. Every
 * route — including `not-found.tsx`, which sits outside `[locale]/layout.tsx`
 * — renders through this component so the skip link and landmark structure
 * never has to be hand-duplicated.
 *
 * There is no theme attribute: the site has one visual system, defined once in
 * `styles/globals.css`.
 *
 * The colour scheme is a separate question and stays a three-state one. Nothing
 * is stamped here, so `:root { color-scheme: light dark }` follows the
 * operating system; `styles/globals.css` pins the scheme when a
 * `data-color-scheme="light|dark"` appears anywhere under `:root`, which is a
 * reader's preference rather than a second theme.
 */
export function SiteShell({
  locale,
  children,
  snapshotDate,
  currentNav,
  footerVariant,
  footerColumns,
  footerLinks,
}: SiteShellProps) {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:flex focus:min-h-11 focus:items-center focus:border-2 focus:border-foreground focus:bg-accent-yellow focus:px-4 focus:font-bold"
      >
        跳到主内容
      </a>
      <SiteHeader locale={locale} currentNav={currentNav} />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter
        variant={footerVariant}
        columns={footerColumns}
        links={footerLinks}
        snapshotDate={snapshotDate}
      />
    </div>
  );
}
