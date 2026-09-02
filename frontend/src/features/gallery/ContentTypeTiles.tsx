import Link from "next/link";

import { cardClassName } from "@/components/ui/Card";
import { StateBlock } from "@/components/ui/StateBlock";
import type { TaxonomyWithCount } from "@/lib/content/types";

import { termLabel } from "./image-prompts";

export interface ContentTypeTilesProps {
  /** `listTaxonomies(locale, "contentType")` — counts are library-wide. */
  types: readonly TaxonomyWithCount[];
  /** The type this page publishes; its tile is marked as the current page. */
  currentSlug: string;
  emptyMessage?: string;
  className?: string;
}

/**
 * The "other content types" band.
 *
 * Only a type whose repository term carries an `href` becomes a link — in this
 * phase that is the image gallery itself. Video and unlabelled prompts are real
 * content in the data set, so their counts are shown honestly, but their pages
 * do not exist yet and are therefore rendered as plain text with a visible
 * note rather than as links to `/prompts/video`.
 */
export function ContentTypeTiles({
  types,
  currentSlug,
  emptyMessage = "当前收录里还没有内容类型标注。",
  className,
}: ContentTypeTilesProps) {
  if (types.length === 0) return <StateBlock variant="empty" message={emptyMessage} />;

  const max = types.reduce((best, type) => Math.max(best, type.count), 0);

  return (
    <ul className={className ?? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3"}>
      {types.map((type) => {
        const label = termLabel(type);
        const share = max === 0 ? 0 : Math.round((type.count / max) * 100);
        const body = (
          <>
            <h3 className="text-base font-black tracking-tight md:text-lg">{label}</h3>
            {/* Prototype tile line: `N 条 · N 条热门`. */}
            <p className="text-sm font-medium">
              {type.count} 条 · {type.highValueCount} 条热门
            </p>
            <span
              aria-hidden="true"
              className="mt-auto block h-3 border-2 border-foreground bg-surface"
            >
              <span className="block h-full bg-accent-red" style={{ width: `${share}%` }} />
            </span>
          </>
        );

        return (
          <li key={type.id} className="flex">
            {type.href === null ? (
              <div
                data-content-type={type.slug}
                className="flex w-full flex-col gap-2 border-2 border-foreground bg-muted p-4 md:border-4"
              >
                {body}
                <p className="mt-auto text-xs font-bold tracking-wider uppercase">
                  {type.slug === "unknown" ? "未标注类型，不会生成独立页面" : "该类型页面尚未发布"}
                </p>
              </div>
            ) : (
              <Link
                href={type.href}
                data-content-type={type.slug}
                aria-current={type.slug === currentSlug ? "page" : undefined}
                className={cardClassName("w-full gap-2 p-4 no-underline")}
              >
                {body}
                <p className="mt-auto text-xs font-bold tracking-wider uppercase">
                  {type.slug === currentSlug ? "当前页面" : "查看该类型 →"}
                </p>
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}
