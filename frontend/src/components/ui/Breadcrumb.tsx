import Link from "next/link";

import type { BreadcrumbItem } from "@/lib/seo/json-ld";

import { cx } from "./class-names";

export interface BreadcrumbProps {
  /**
   * Same array shape as `breadcrumbList()` in `lib/seo/json-ld`, so a page can
   * feed the visible trail and the `BreadcrumbList` JSON-LD from one source and
   * they cannot drift apart.
   */
  items: readonly BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav aria-label="面包屑" className={cx("text-sm font-bold", className)}>
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${index}-${item.path ?? item.name}`} className="flex items-center gap-2">
              {index === 0 ? null : (
                <span aria-hidden="true" className="text-foreground/60">
                  /
                </span>
              )}
              {isLast ? (
                <span aria-current="page" className="underline decoration-accent-red decoration-2">
                  {item.name}
                </span>
              ) : item.path === null ? (
                // A hierarchy level with no page in this phase. It keeps its
                // position in the trail but is never a link — a `#` or a link
                // into an unbuilt route would both be lies (global constraint 5).
                <span className="text-foreground/70">{item.name}</span>
              ) : (
                <Link
                  href={item.path}
                  className="inline-flex min-h-11 min-w-11 items-center justify-center px-1 underline"
                >
                  {item.name}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
