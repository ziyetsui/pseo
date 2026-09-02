"use client";

import { Suspense, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";

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
import type { PromptCardVariant } from "@/features/prompt/PromptCard";
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
  /**
   * Search-box placeholder. Required, and passed straight to `SearchForm`:
   * the prototype writes a different one on every page.
   */
  searchPlaceholder: string;
  /**
   * Curated collections this page can filter by. Supplying them is what makes
   * `?collection=<slug>` work: a collection rule can match the prompt body,
   * which no facet param can express, so membership travels as an explicit id
   * list instead. Omit on a page with no collections.
   */
  collections?: readonly ExplorerCollection[];
  /**
   * Result summary wording. `hub` is the prototype's L1 `共 N 条`; `count` is
   * the L2/L3 `筛选出 N 条`. Both appear only while something is filtered.
   */
  summaryStyle?: "hub" | "count";
  /** Card anatomy for the result grid. Defaults to L1's `hub` card. */
  cardVariant?: PromptCardVariant;
  resultsHeading?: string;
  resultsHeadingId?: string;
  /** Accessible name of the (heading-less) filter block. */
  filterLabel?: string;
  searchInputId?: string;
  facetIdPrefix?: string;
  /** How many result cards get eager media. */
  priorityCount?: number;
  className?: string;
}

/** The membership data `?collection=` needs, serialized by the page. */
export interface ExplorerCollection {
  slug: string;
  title: string;
  promptIds: readonly string[];
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

  // The raw, as-parsed query (still carrying `window` when present) is handed
  // down as-is: `ExplorerView` is the one place that decides which parts of it
  // count as an active filter versus which parts merely need to survive into
  // outgoing links.
  return <ExplorerView {...props} query={parsed.query} unknownParams={parsed.unknownParams} />;
}

interface ExplorerViewProps extends PromptExplorerProps {
  /** As-parsed query, including `window` when the URL carried a valid one. */
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
  searchPlaceholder,
  collections = [],
  summaryStyle = "hub",
  cardVariant,
  resultsHeading = "筛选结果",
  resultsHeadingId = "prompt-explorer-results",
  filterLabel = "筛选",
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

  // `window` selects a trending tab, not a browse filter: releasing it here
  // keeps this surface from hiding the whole browse section just because a
  // trending window happens to be selected. It is restored below (`linkQuery`)
  // for every outgoing href so switching tabs survives a search or a filter
  // change instead of being silently dropped.
  const activeQuery: PromptQuery = { ...query, window: undefined };

  // A facet value this vocabulary has never heard of (`model=does-not-exist`)
  // would otherwise filter the set down to nothing. Stripped here so it is
  // genuinely ignored — reported, never silently applied as a dead-end filter.
  // A `collection` slug this page has no members for is stripped for the same
  // reason.
  const selectedCollection =
    activeQuery.collection === undefined
      ? undefined
      : collections.find((entry) => entry.slug === activeQuery.collection);
  const filterQuery = stripUnknownFacetValues(
    { ...activeQuery, collection: selectedCollection?.slug },
    facetGroups,
  );
  const linkQuery: PromptQuery = { ...filterQuery, window: query.window };
  // "The URL claims a filter", not "a filter survived validation": a query that
  // named only unknown values still opens the result region, where the warning
  // and the recovery link live, rather than silently dropping the reader back
  // into the browse view as if they had asked for nothing.
  const active = !isEmptyPromptQuery(activeQuery);

  const collectionMembers = Object.fromEntries(
    collections.map((entry) => [entry.slug, entry.promptIds]),
  );

  const results = active ? applyPromptQuery(prompts, filterQuery, { collectionMembers }) : [...prompts];
  const liveGroups = recountFacets(prompts, visibleGroups, filterQuery, collectionMembers);
  const applied = buildAppliedFilters(facetGroups, filterQuery, selectedCollection);
  const unknownValues = [
    ...unknownFacetValues(facetGroups, activeQuery),
    ...(activeQuery.collection !== undefined && selectedCollection === undefined
      ? [`collection=${activeQuery.collection}`]
      : []),
  ];
  const showSummary = active || unknownParams.length > 0 || unknownValues.length > 0;

  // `共 N 条` (L1) / `筛选出 N 条` (L2/L3), prefixed with the collection name
  // when the reader arrived through a 精选合集 tile — exactly as the prototype's
  // `合集名 · 共 N 条`.
  const countText = summaryStyle === "hub" ? `共 ${results.length} 条` : `筛选出 ${results.length} 条`;
  const summaryText = active
    ? selectedCollection === undefined
      ? countText
      : `${selectedCollection.title} · ${countText}`
    : "";

  return (
    <div className={className ?? "flex flex-col gap-8"}>
      {/* No heading: the prototype's filter block is an unlabelled region
          with `aria-label="筛选"`, and its axis labels are plain `<b>` text
          rather than headings. */}
      <div aria-label={filterLabel} role="group">
        <div className="flex flex-col gap-6">
          <SearchForm
            basePath={basePath}
            query={linkQuery}
            placeholder={searchPlaceholder}
            inputId={searchInputId}
          />

          <FacetChips
            basePath={basePath}
            query={linkQuery}
            groups={liveGroups}
            idPrefix={facetIdPrefix}
          />

          {showSummary ? (
            <ActiveFilters
              basePath={basePath}
              query={linkQuery}
              total={results.length}
              appliedFilters={applied}
              unknownParams={unknownParams}
              unknownValues={unknownValues}
              showTotal={false}
            />
          ) : null}
        </div>
      </div>

      {/*
        Exactly one result-count live region for the whole explorer, mounted
        unconditionally (empty in the browse state) so assistive tech is
        always attached to it rather than to a node that pops in and out —
        `ActiveFilters` above is told `showTotal={false}` so the count is
        never announced twice.
      */}
      <p role="status" aria-live="polite" className="text-sm font-bold">
        {summaryText}
      </p>

      {active ? (
        <section aria-labelledby={resultsHeadingId}>
          <div className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-foreground pb-3 md:border-b-4">
            <h2
              id={resultsHeadingId}
              className="text-2xl font-black tracking-tighter uppercase md:text-3xl"
            >
              {resultsHeading}
            </h2>
          </div>

          <div className="mt-6">
            <PromptResults
              prompts={results}
              locale={locale}
              variant={cardVariant}
              priorityCount={priorityCount}
              emptyMessage={noResultsMessage(applied)}
            >
              {applied.map((filter) => (
                <StateBlockLink
                  key={`${filter.key}:${filter.value}`}
                  href={queryHref(basePath, removeFilter(linkQuery, filter))}
                >
                  移除「{filter.label}」
                </StateBlockLink>
              ))}
              <StateBlockLink href={queryHref(basePath, { window: query.window })}>
                清除全部筛选
              </StateBlockLink>
            </PromptResults>
          </div>
        </section>
      ) : null}

      <div hidden={active}>{browse}</div>
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
  collectionMembers: Readonly<Record<string, readonly string[]>>,
): FacetGroup[] {
  return groups.map((group): FacetGroup => {
    const pool = applyPromptQuery(prompts, setFacet(query, group.key, []), { collectionMembers });
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
  collection: { slug: string; title: string } | undefined,
): AppliedFilter[] {
  const applied: AppliedFilter[] = [];

  const q = query.q?.trim();
  if (q !== undefined && q.length > 0) {
    applied.push({ key: "q", value: q, label: `关键词「${q}」` });
  }

  if (collection !== undefined) {
    applied.push({ key: "collection", value: collection.slug, label: `合集：${collection.title}` });
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

/**
 * Drops facet values `unknownFacetValues` flagged, so the query actually
 * filters by nothing on that axis instead of legitimately matching zero
 * prompts. This is what makes an unknown value genuinely "ignored" rather than
 * merely reported while still being applied.
 */
function stripUnknownFacetValues(query: PromptQuery, groups: readonly FacetGroup[]): PromptQuery {
  let result = query;
  for (const key of QUERY_FACET_KEYS) {
    const group = groups.find((candidate) => candidate.key === key);
    const values = facetValues(query, key);
    if (values.length === 0) continue;
    const known = group === undefined ? [] : values.filter((slug) => group.options.some((option) => option.slug === slug));
    if (known.length !== values.length) result = setFacet(result, key, known);
  }
  return result;
}
