import Link from "next/link";
import type { ReactNode } from "react";

import { cx } from "./class-names";

export interface SectionProps {
  /** Id of the `<h2>`; the section is labelled by it. Must be unique per page. */
  id: string;
  title: string;
  description?: string;
  /** Real route from `lib/i18n/routes` — never a `#` placeholder. */
  moreHref?: string;
  moreLabel?: string;
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
  children,
  className,
}: SectionProps) {
  return (
    <section aria-labelledby={id} className={cx("mt-12 first:mt-0", className)}>
      <div className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-foreground pb-3 md:border-b-4">
        <div>
          <h2 id={id} className="text-2xl font-black tracking-tighter uppercase md:text-3xl">
            {title}
          </h2>
          {description === undefined ? null : (
            <p className="mt-2 max-w-prose text-sm font-medium md:text-base">{description}</p>
          )}
        </div>
        {moreHref === undefined ? null : (
          <Link
            href={moreHref}
            className="inline-flex min-h-11 items-center text-sm font-bold tracking-wider uppercase underline"
          >
            {moreLabel}
          </Link>
        )}
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}
