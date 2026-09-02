import Link from "next/link";
import type { ReactNode } from "react";

import { cx } from "./class-names";
import { dividerClassName } from "./dividers";

export interface SectionProps {
  /** Id of the `<h2>`; the section is labelled by it. Must be unique per page. */
  id: string;
  title: string;
  description?: string;
  /** Real route from `lib/i18n/routes` — never a `#` placeholder. */
  moreHref?: string;
  moreLabel?: string;
  /**
   * Decoration beside the heading, on the same baseline as the `查看全部` link
   * — the hub's ghost band numeral is the only user of it so far.
   *
   * It gets its own flex cell rather than floating over the header, so it can
   * never land on top of a description at any width, and it is the caller's
   * job to keep it out of the accessibility tree: a marker is never the label
   * for anything, because the `<h2>` right beside it already is.
   *
   * `marker` and `moreHref` share the cell; a section that wants both would be
   * asking two things of one slot, so pass one.
   */
  marker?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * A titled content band. Owns the page's `<h2>` so the components inside it
 * (cards, state blocks, rails) never have to invent headings of their own and
 * the heading levels stay continuous.
 */
export function Section({
  id,
  title,
  description,
  moreHref,
  moreLabel = "查看全部",
  marker,
  children,
  className,
}: SectionProps) {
  return (
    <section aria-labelledby={id} className={cx("mt-10 first:mt-0 md:mt-14", className)}>
      <div
        className={cx(
          "flex flex-wrap items-end justify-between gap-4 pb-3",
          dividerClassName("card", "bottom", { desktopThick: true }),
        )}
      >
        <div>
          <h2 id={id} className="text-2xl font-black tracking-tighter uppercase md:text-3xl">
            {title}
          </h2>
          {description === undefined ? null : (
            <p className="mt-2 max-w-prose text-base font-medium">{description}</p>
          )}
        </div>
        {marker}
        {moreHref === undefined ? null : (
          <Link
            href={moreHref}
            className="inline-flex min-h-11 min-w-11 items-center justify-center px-1 text-sm font-bold tracking-wider uppercase underline"
          >
            {moreLabel}
          </Link>
        )}
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}
