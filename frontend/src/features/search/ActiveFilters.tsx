import Link from "next/link";

import { ChipLink } from "@/components/ui/Chip";
import { Panel } from "@/components/ui/Panel";
import { cx } from "@/components/ui/class-names";
import { pressClassName, transitionClassName } from "@/components/ui/hover";
import type { AppliedFilter, PromptQuery } from "@/lib/content/types";

import { queryHref, removeFilter } from "./query-links";

/**
 * The two plain-text links in this bar (reset, and the recovery link in the
 * warning panel) carry no border, no shadow and no fill, so a press has nothing
 * to collapse and nothing to move against — the `band` press is the one that
 * fits: it fills the row for the length of the tap. On touch, where there is no
 * hover at all, this is the only feedback either link gives between the tap and
 * the re-render. `fill` is the transition channel because the fill is the only
 * property that moves; a bare `transition` would also animate `outline-color`
 * and fade the focus ring in from the link's own text colour.
 */
const TEXT_ACTION = cx(
  "inline-flex min-h-11 min-w-11 items-center justify-center px-1 font-bold underline",
  transitionClassName("fill"),
  pressClassName("band"),
);

export interface ActiveFiltersProps {
  /** Page the filters apply to. */
  basePath: string;
  /**
   * The query currently reflected in the URL, with any unknown facet values
   * already stripped by the caller — every href built below (removal links,
   * the reset link, the recovery link) is derived from this, so none of them
   * can point back at an unrecoverable value.
   */
  query: PromptQuery;
  /** Result count for this query, computed by the repository from real data. */
  total: number;
  /** Human-readable filters, straight from `PromptListResult.appliedFilters`. */
  appliedFilters: readonly AppliedFilter[];
  /** Param names the page could not honour, from `parsePromptQuery`. */
  unknownParams?: readonly string[];
  /**
   * Facet values that do not exist in this page's vocabulary (e.g.
   * `"model=does-not-exist"`), one entry per bad value. These are a different
   * failure than an unknown param name: the key is real but the value isn't,
   * so they get their own truthful copy instead of being folded into the
   * "unknown params" message. The caller must already have stripped them out
   * of `query`/`appliedFilters` before they are applied.
   */
  unknownValues?: readonly string[];
  /**
   * Whether to render the "共 N 条" total. Defaults to `true`. Set `false`
   * when the caller already announces the result count elsewhere (e.g. a
   * `PromptExplorer` that owns its own permanently-mounted live region), so
   * the count is not announced twice.
   */
  showTotal?: boolean;
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
  unknownValues = [],
  showTotal = true,
  className,
}: ActiveFiltersProps) {
  const hasUnknown = unknownParams.length > 0 || unknownValues.length > 0;

  return (
    <div className={className ?? "flex flex-col gap-3"}>
      {showTotal ? (
        <p role="status" className="text-sm font-bold">
          共 {total} 条
        </p>
      ) : null}

      {appliedFilters.length === 0 ? null : (
        <div className="flex flex-wrap items-center gap-2">
          {appliedFilters.map((filter) => (
            <ChipLink
              key={`${filter.key}:${filter.value}`}
              href={queryHref(basePath, removeFilter(query, filter))}
              // Same reason as the facet chips: removing a filter must not
              // also move the page. See `FacetChips`.
              scroll={false}
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
          {/* Clears every facet/search filter but keeps `window` (which trending
              tab is active, if any) — `query.window` is `undefined` for a
              caller that never passed one, so this collapses to `basePath`
              exactly as before. */}
          <Link
            href={queryHref(basePath, { window: query.window })}
            scroll={false}
            className={cx(TEXT_ACTION, "text-sm")}
          >
            清除全部筛选
          </Link>
        </div>
      )}

      {hasUnknown ? (
        <Panel tone="warning" className="flex flex-col items-start gap-2">
          {unknownParams.length === 0 ? null : (
            <p>未知参数 {unknownParams.join("、")} 已被忽略，它们不属于本页的筛选条件。</p>
          )}
          {unknownValues.length === 0 ? null : (
            <p>以下筛选值不存在，已被忽略：{unknownValues.join("、")}</p>
          )}
          {/* `query` already has the bad values/keys stripped, so this never
              re-opens the same broken state — it recovers into whatever the
              rest of the query still validly describes. */}
          <Link href={queryHref(basePath, query)} scroll={false} className={TEXT_ACTION}>
            使用可识别的筛选条件重新打开
          </Link>
        </Panel>
      ) : null}
    </div>
  );
}
