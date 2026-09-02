import Link from "next/link";

import { ChipLink } from "@/components/ui/Chip";
import { Panel } from "@/components/ui/Panel";
import type { AppliedFilter, PromptQuery } from "@/lib/content/types";

import { queryHref, removeFilter } from "./query-links";

export interface ActiveFiltersProps {
  /** Page the filters apply to. */
  basePath: string;
  /** The query currently reflected in the URL. */
  query: PromptQuery;
  /** Result count for this query, computed by the repository from real data. */
  total: number;
  /** Human-readable filters, straight from `PromptListResult.appliedFilters`. */
  appliedFilters: readonly AppliedFilter[];
  /** Param names the page could not honour, from `parsePromptQuery`. */
  unknownParams?: readonly string[];
  className?: string;
}

/**
 * The "what is filtered right now" bar: a live result count, one removal link
 * per applied condition, a reset link, and a visible, recoverable warning when
 * the URL carried params this page does not understand — they are reported,
 * never silently dropped.
 */
export function ActiveFilters({
  basePath,
  query,
  total,
  appliedFilters,
  unknownParams = [],
  className,
}: ActiveFiltersProps) {
  return (
    <div className={className ?? "flex flex-col gap-3"}>
      <p role="status" className="text-sm font-bold">
        共 {total} 条
      </p>

      {appliedFilters.length === 0 ? null : (
        <div className="flex flex-wrap items-center gap-2">
          {appliedFilters.map((filter) => (
            <ChipLink
              key={`${filter.key}:${filter.value}`}
              href={queryHref(basePath, removeFilter(query, filter))}
              aria-label={`移除筛选：${filter.label}`}
              label={
                <>
                  {filter.label}
                  <span aria-hidden="true"> ✕</span>
                </>
              }
              active
            />
          ))}
          <Link
            href={basePath}
            className="inline-flex min-h-11 items-center text-sm font-bold underline"
          >
            清除全部筛选
          </Link>
        </div>
      )}

      {unknownParams.length === 0 ? null : (
        <Panel tone="warning" className="flex flex-col items-start gap-2">
          <p>
            未知参数 {unknownParams.join("、")} 已被忽略，它们不属于本页的筛选条件。
          </p>
          <Link
            href={queryHref(basePath, query)}
            className="inline-flex min-h-11 items-center font-bold underline"
          >
            使用可识别的筛选条件重新打开
          </Link>
        </Panel>
      )}
    </div>
  );
}
