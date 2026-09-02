"use client";

import { Suspense, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";

import { Section } from "@/components/ui/Section";
import { StateBlockLink } from "@/components/ui/StateBlock";
import { applyPromptQuery, isEmptyPromptQuery, parsePromptQuery, promptTaxonomies } from "@/lib/content/query";
import {
  QUERY_FACET_KEYS,
  type AppliedFilter,
  type FacetGroup,
  type FacetOption,
  type Locale,
  type PromptQuery,
  type PromptSummary,
  type QueryFacetKey,
} from "@/lib/content/types";
import { ActiveFilters } from "@/features/search/ActiveFilters";
import { FacetChips } from "@/features/search/FacetChips";
import { PromptResults } from "@/features/search/PromptResults";
import { SearchForm } from "@/features/search/SearchForm";
import { facetValues, queryHref, removeFilter, setFacet } from "@/features/search/query-links";

/**
 * The one client filter surface, shared by every list page (L1 hub, L2 gallery,
 * L3 model page).
 *
 * Static export cannot read search params on the server, so the page renders
 * its full unfiltered browse content and hands it here as `browse`. The
 * explorer reads the URL with `useSearchParams` and swaps to a result region
 * once the reader actually filters something. `browse` is ALSO the Suspense
 * fallback, which is what a statically exported page emits: the shipped HTML
 * therefore always contains the real browse content — crawlers and readers
 * without JavaScript never see a spinner where the listing should be.
 *
 * The `window` param deliberately does not filter here: it belongs to the
 * trending tabs, and treating it as a filter would blank the browse view the
 * moment someone switched trending windows.
 */

export interface PromptExplorerProps {
  locale: Locale;
  /** Page the URL state lives on, e.g. `promptsHome(locale)`. */
  basePath: string;
  /** The complete, UNFILTERED set this surface may show. */
  prompts: readonly PromptSummary[];
  /**
   * Facet vocabulary for every axis (typically `PromptListResult.facets` for
   * the unfiltered set). Counts here are only a starting point — they are
   * recomputed against the other axes' current selection on every render.
   */
  facetGroups: readonly FacetGroup[];
  /** Which axes get chips. Defaults to every axis in `facetGroups`. */
  facetAxes?: readonly QueryFacetKey[];
  /** Server-rendered browse sections, shown while nothing is filtered. */
  browse: ReactNode;
  resultsHeading?: string;
  resultsHeadingId?: string;
  filterHeading?: string;
  filterHeadingId?: string;
  searchInputId?: string;
  facetIdPrefix?: string;
  /** How many result cards get eager media. */
  priorityCount?: number;
  className?: string;
}

export function PromptExplorer(props: PromptExplorerProps) {
  return (
    <Suspense fallback={<ExplorerView {...props} query={{}} unknownParams={[]} />}>
      <ExplorerFromUrl {...props} />
    </Suspense>
  );
}

function ExplorerFromUrl(props: PromptExplorerProps) {
  const searchParams = useSearchParams();
  const parsed = parsePromptQuery(searchParams.toString());
  const query: PromptQuery = { ...parsed.query, window: undefined };

  return <ExplorerView {...props} query={query} unknownParams={parsed.unknownParams} />;
}

interface ExplorerViewProps extends PromptExplorerProps {
  query: PromptQuery;
  unknownParams: readonly string[];
}

function ExplorerView({
  locale,
  basePath,
  prompts,
  facetGroups,
  facetAxes,
  browse,
  resultsHeading = "筛选结果",
  resultsHeadingId = "prompt-explorer-results",
  filterHeading = "搜索与筛选",
  filterHeadingId = "prompt-explorer-filters",
  searchInputId,
  facetIdPrefix = "explorer-facet",
  priorityCount = 3,
  className,
  query,
  unknownParams,
}: ExplorerViewProps) {
  const axes = facetAxes ?? facetGroups.map((group) => group.key);
  const visibleGroups = axes.flatMap((key) => {
    const group = facetGroups.find((candidate) => candidate.key === key);
    return group === undefined ? [] : [group];
  });

  const active = !isEmptyPromptQuery(query);
  const results = active ? applyPromptQuery(prompts, query) : [...prompts];
  const liveGroups = recountFacets(prompts, visibleGroups, query);
  const applied = buildAppliedFilters(facetGroups, query);
  const unknown = [...unknownParams, ...unknownFacetValues(facetGroups, query)].sort();
  const showSummary = active || unknown.length > 0;

  return (
    <div className={className ?? "flex flex-col gap-8"}>
      {/* The filter surface owns an <h2> so that FacetChips' per-axis <h3>
          headings never follow the page <h1> with a level skipped. */}
      <Section id={filterHeadingId} title={filterHeading}>
        <div className="flex flex-col gap-6">
          <SearchForm basePath={basePath} query={query} inputId={searchInputId} />

          <FacetChips
            basePath={basePath}
            query={query}
            groups={liveGroups}
            idPrefix={facetIdPrefix}
          />

          {showSummary ? (
            <ActiveFilters
              basePath={basePath}
              query={query}
              total={results.length}
              appliedFilters={applied}
              unknownParams={unknown}
            />
          ) : null}
        </div>
      </Section>

      {active ? (
        <section aria-labelledby={resultsHeadingId}>
          <div className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-foreground pb-3 md:border-b-4">
            <h2
              id={resultsHeadingId}
              className="text-2xl font-black tracking-tighter uppercase md:text-3xl"
            >
              {resultsHeading}
            </h2>
            <p role="status" aria-live="polite" className="text-sm font-bold">
              找到 {results.length} 条提示词
            </p>
          </div>

          <div className="mt-6">
            <PromptResults
              prompts={results}
              locale={locale}
              priorityCount={priorityCount}
              emptyMessage={noResultsMessage(applied)}
            >
              {applied.map((filter) => (
                <StateBlockLink
                  key={`${filter.key}:${filter.value}`}
                  href={queryHref(basePath, removeFilter(query, filter))}
                >
                  移除「{filter.label}」
                </StateBlockLink>
              ))}
              <StateBlockLink href={basePath}>清除全部筛选</StateBlockLink>
            </PromptResults>
          </div>
        </section>
      ) : null}

      <div data-testid="prompt-explorer-browse" hidden={active}>
        {browse}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- helpers */

function noResultsMessage(applied: readonly AppliedFilter[]): string {
  if (applied.length === 0) return "这里还没有提示词。";
  return `没有同时满足这些条件的提示词：${applied.map((filter) => filter.label).join("、")}。可以逐个移除条件，或清除全部筛选。`;
}

/**
 * Counts answer "what would I get if I picked this?", so the axis being counted
 * is released while every OTHER axis (and the search term) stays applied. This
 * mirrors the repository's server-side facet builder exactly.
 */
function recountFacets(
  prompts: readonly PromptSummary[],
  groups: readonly FacetGroup[],
  query: PromptQuery,
): FacetGroup[] {
  return groups.map((group): FacetGroup => {
    const pool = applyPromptQuery(prompts, setFacet(query, group.key, []));
    const selected = new Set(facetValues(query, group.key));

    const counts = new Map<string, number>();
    for (const prompt of pool) {
      for (const term of promptTaxonomies(prompt, group.key)) {
        counts.set(term.slug, (counts.get(term.slug) ?? 0) + 1);
      }
    }

    const options: FacetOption[] = group.options
      .map((option) => ({
        ...option,
        count: counts.get(option.slug) ?? 0,
        selected: selected.has(option.slug),
      }))
      // A selected value must stay visible even at zero, otherwise there is no
      // way to take it off again.
      .filter((option) => option.count > 0 || option.selected)
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

    for (const slug of selected) {
      if (options.some((option) => option.slug === slug)) continue;
      options.push({ slug, label: slug, count: 0, selected: true });
    }

    return { ...group, options };
  });
}

function buildAppliedFilters(
  groups: readonly FacetGroup[],
  query: PromptQuery,
): AppliedFilter[] {
  const applied: AppliedFilter[] = [];

  const q = query.q?.trim();
  if (q !== undefined && q.length > 0) {
    applied.push({ key: "q", value: q, label: `关键词「${q}」` });
  }

  for (const key of QUERY_FACET_KEYS) {
    const group = groups.find((candidate) => candidate.key === key);
    for (const slug of facetValues(query, key)) {
      const option = group?.options.find((candidate) => candidate.slug === slug);
      applied.push({
        key,
        value: slug,
        label: `${group?.label ?? key}：${option?.label ?? slug}`,
      });
    }
  }

  return applied;
}

/**
 * Facet values naming a term this data set has never heard of. Reported as
 * `key=value`, the same shape the repository uses, so the reader is told which
 * filter was dropped rather than silently getting an empty page.
 */
function unknownFacetValues(groups: readonly FacetGroup[], query: PromptQuery): string[] {
  const unknown: string[] = [];
  for (const key of QUERY_FACET_KEYS) {
    const group = groups.find((candidate) => candidate.key === key);
    if (group === undefined) continue;
    for (const slug of facetValues(query, key)) {
      if (!group.options.some((option) => option.slug === slug)) unknown.push(`${key}=${slug}`);
    }
  }
  return unknown;
}
