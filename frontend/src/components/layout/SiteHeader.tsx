import Link from "next/link";

import { GrowingUnderline } from "@/components/ui/GrowingUnderline";
import { microLabelClassName } from "@/components/ui/type-scale";
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
          // `whitespace-nowrap`: the wordmark is a name, not a paragraph — at
          // 1440 it was breaking after `HIGGSFIELD` and setting two ragged
          // lines next to a single-line nav.
          className="flex min-h-11 shrink-0 items-center gap-3 text-lg font-black tracking-tighter whitespace-nowrap uppercase md:text-xl"
        >
          <BrandMark />
          <span>{SITE_NAME}</span>
        </Link>

        {/*
          The horizontal nav starts at `xl`, not at `md`.
          Five of its eight entries carry a `（即将推出）` marker that is wider
          than the label it qualifies, so the row needs ~630px of its own.
          Below 1280 that no longer fits beside the wordmark and the language
          control, and the previous `md` breakpoint paid for it by wrapping
          every single label into two ragged lines from 768 all the way to
          1440. The disclosure menu below carries exactly the same items —
          markers included — at every width under `xl`.
        */}
        <nav aria-label="主导航" className="hidden min-w-0 xl:block">
          {/*
            `items-baseline`: five of the eight entries are a label with an
            annotation stacked under it, so centring the boxes would set their
            labels a few pixels higher than the plain ones. Aligning on the
            first baseline instead puts every label on one line.
          */}
          {/*
            `gap-4`, down from `gap-6`: opening the five `（即将推出）` markers to
            `--tracking-micro` widens each of them by ~12px, and the marker —
            not the two-character label above it — is what sets each entry's
            width. Seven gaps give back the ~57px the tracking costs, so the
            row is no wider than it was and still fits the 1216px of content
            the `max-w-7xl` container allows at 1280 and at 1440 alike. The gap
            is NOT restored at a larger breakpoint: the container is capped at
            1280, so there is never more room than this.
          */}
          <ul className="flex items-baseline gap-4">
            {items.map((item) => (
              <li key={item.key} className="flex">
                {item.href === null ? (
                  // No route in this phase: plain text plus the reason, never a
                  // link and never `#` (global constraint 5). The reason sits on
                  // its own line under the label so the label itself is never
                  // broken across lines and the marker reads as an annotation
                  // rather than as part of the destination's name.
                  <span className="flex min-h-11 flex-col justify-center text-sm leading-tight font-bold tracking-wider whitespace-nowrap text-foreground/60 uppercase">
                    {item.label}
                    {item.note === undefined ? null : (
                      // The marker is metadata about the destination, so it
                      // sits on the micro label tier — the same tier the
                      // language control and the footer's markers use.
                      <span className={microLabelClassName()}>{item.note}</span>
                    )}
                  </span>
                ) : (
                  // `group` + `no-underline`: the nav's hover reply is the bar
                  // growing under the label (hover expression ④), not the
                  // document-wide hover underline, which would draw a second
                  // line at a different offset over the same word. The
                  // `aria-current` rule is a heavier 4px red underline and
                  // outranks `no-underline` on specificity, so the page a
                  // reader is on still says so without hovering — and says it
                  // with a line, not with colour alone.
                  <Link
                    href={item.href}
                    aria-current={item.key === currentNav ? "page" : undefined}
                    className="group flex min-h-11 items-center text-sm font-bold tracking-wider whitespace-nowrap uppercase no-underline aria-[current=page]:underline aria-[current=page]:decoration-accent-red aria-[current=page]:decoration-4"
                  >
                    <GrowingUnderline>{item.label}</GrowingUnderline>
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>

        <div className="hidden shrink-0 items-center gap-3 xl:flex">
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
            className={microLabelClassName(
              "flex min-h-11 min-w-11 items-center justify-center border-2 border-foreground bg-muted px-3 whitespace-nowrap",
            )}
          >
            {LOCALE_LABEL[locale]} ({locale})
          </button>
          {/*
            Visually hidden below `xl`, where the whole language control is
            hidden anyway; `max-w-20` lets it set as two short lines inside the
            header's own height instead of widening the row (CLAUDE.md §7
            forbids a horizontal scroll between 320 and 1440). `sr-only` takes
            it out of the flow without taking it away from the
            `aria-describedby` that explains the disabled button.
          */}
          <p
            id="locale-availability"
            className={microLabelClassName("sr-only xl:not-sr-only xl:max-w-20 xl:leading-snug")}
          >
            更多语言尚未发布
          </p>
        </div>

        <MobileNav items={items} currentNav={currentNav} />
      </div>
    </header>
  );
}
