import Link from "next/link";

import { cardClassName, tileShellClassName } from "@/components/ui/Card";
import { StateBlock } from "@/components/ui/StateBlock";
import { cx } from "@/components/ui/class-names";
import type { TaxonomyWithCount } from "@/lib/content/types";

import { termLabel } from "./image-prompts";

export interface ModelTilesProps {
  /**
   * Model terms restricted to the image subset, with `count` already recomputed
   * over it by `countTermsWithin`.
   */
  models: readonly TaxonomyWithCount[];
  emptyMessage?: string;
  className?: string;
}

/**
 * Browse-by-model tiles for the gallery.
 *
 * A model links to its own page only when the repository gave the term a real
 * `href`. A model without one renders as plain text carrying the same count and
 * a visible explanation — never a `#` placeholder and never a link into a route
 * this phase does not ship.
 */
export function ModelTiles({
  models,
  emptyMessage = "当前收录里还没有带模型标注的图片提示词。",
  className,
}: ModelTilesProps) {
  if (models.length === 0) return <StateBlock variant="empty" message={emptyMessage} />;

  const max = models.reduce((best, model) => Math.max(best, model.count), 0);

  return (
    <ul className={className ?? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3"}>
      {models.map((model) => {
        const label = termLabel(model);
        const share = max === 0 ? 0 : Math.round((model.count / max) * 100);
        const body = (
          <>
            <h3 className="text-base font-black tracking-tight md:text-lg">{label}</h3>
            {/* Prototype tile line: `136 条 · 46 条热门`. */}
            <p className="text-sm font-medium">
              {model.count} 条 · {model.highValueCount} 条热门
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
          <li key={model.id} className="flex">
            {model.href === null ? (
              <div
                data-model-tile={model.slug}
                className={cx(
                  tileShellClassName,
                  "flex flex-col gap-2 border-2 border-foreground bg-muted p-4",
                  "md:border-4",
                )}
              >
                {body}
                <p className="mt-auto text-xs font-bold tracking-wider uppercase">
                  模型页尚未发布
                </p>
              </div>
            ) : (
              <Link
                href={model.href}
                data-model-tile={model.slug}
                className={cardClassName(cx(tileShellClassName, "gap-2 p-4 no-underline"))}
              >
                {/* The whole tile is the link, exactly as in the prototype —
                    no extra call-to-action line underneath it. */}
                {body}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}
