import Link from "next/link";

import { LOCALE_LABEL, type Locale } from "@/lib/i18n/config";
import { promptsHome } from "@/lib/i18n/routes";
import { SITE_NAME } from "@/lib/seo/site";

import { BrandMark } from "./BrandMark";
import { MobileNav } from "./MobileNav";
import { getPrimaryNav, type NavKey } from "./nav";

export interface SiteHeaderProps {
  locale: Locale;
  /**
   * Which primary nav entry this page IS. That entry is marked
   * `aria-current="page"`, as in the prototype's L2/L3 nav.
   */
  currentNav?: NavKey;
}

export function SiteHeader({ locale, currentNav }: SiteHeaderProps) {
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
              <li key={item.key}>
                {item.href === null ? (
                  // No route in this phase: plain text plus the reason, never a
                  // link and never `#` (global constraint 5).
                  <span className="flex min-h-11 items-center text-sm font-bold tracking-wider text-foreground/60 uppercase">
                    {item.label}
                    {item.note === undefined ? null : (
                      <span className="ml-1 text-xs normal-case">{item.note}</span>
                    )}
                  </span>
                ) : (
                  <Link
                    href={item.href}
                    aria-current={item.key === currentNav ? "page" : undefined}
                    className="flex min-h-11 items-center text-sm font-bold tracking-wider uppercase aria-[current=page]:underline aria-[current=page]:decoration-accent-red aria-[current=page]:decoration-4"
                  >
                    {item.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {/*
            Language control placeholder. Only zh-CN is published. We use
            `aria-disabled` (not the `disabled` attribute) so the button stays
            focusable and its `aria-describedby` explanation is announced by
            screen readers; a plain `disabled` button is removed from the
            accessibility tree and would silently drop that explanation. It
            still does nothing on click — there is no handler wired up, and it
            is not a submit button in a form.
          */}
          <button
            type="button"
            aria-disabled="true"
            aria-describedby="locale-availability"
            className="flex min-h-11 min-w-11 items-center justify-center border-2 border-foreground bg-muted px-3 text-sm font-bold tracking-widest uppercase"
          >
            {LOCALE_LABEL[locale]} ({locale})
          </button>
          <p id="locale-availability" className="max-w-28 text-xs leading-snug font-medium">
            更多语言尚未发布
          </p>
        </div>

        <MobileNav items={items} currentNav={currentNav} />
      </div>
    </header>
  );
}
