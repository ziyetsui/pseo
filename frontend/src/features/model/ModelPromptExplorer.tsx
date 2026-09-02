"use client";

import { Suspense, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";

import { StateBlockLink } from "@/components/ui/StateBlock";

import { ALL_PROMPTS_ID } from "./model-anchors";
import {
  applyPromptQuery,
  isEmptyPromptQuery,
  parsePromptQuery,
  promptTaxonomies,
} from "@/lib/content/query";
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

import { ModelSection } from "./ModelSection";

/**
 * The L3 page's filter surface.
 *
 * `features/prompt/PromptExplorer` renders search box, facets, results and
 * browse content as one fixed stack. The L3 prototype splits them across the
 * page — the search box sits in the hero genbox, the `筛选出 N 条` counter under
 * it, and the three facet axes live inside the 全部提示词 section head — so this
 * page composes the same primitives (`SearchForm`, `FacetChips`,
 * `ActiveFilters`, `PromptResults`, `query-links`) in the prototype's layout
 * instead. Everything else about the contract is identical: URL is state, no
 * JavaScript is required to browse, unknown params are reported rather than
 * swallowed. See the report's "Requested shared-file changes" for the slot API
 * that would let this collapse back into `PromptExplorer`.
 *
 * Only the query-dependent parts live on the client. The hero copy, the
 * trending grid, the unfiltered card grid and everything below it are
 * server-rendered nodes handed in as slots, so the exported HTML carries the
 * full listing for crawlers and for readers without JavaScript.
 */


export interface ModelPromptExplorerProps {
  locale: Locale;
  /** Page the URL state lives on — `modelPage(locale, slug)`. */
  basePath: string;
  /** Every prompt of this model, unfiltered. */
  prompts: readonly PromptSummary[];
  /** Facet vocabulary for the unfiltered set; counts are recomputed here. */
  facetGroups: readonly FacetGroup[];
  /** Which axes get chips, in the prototype's order. */
  facetAxes: readonly QueryFacetKey[];
  /**
   * Per-page axis names. The repository calls the `useCase` axis 任务 (the L1
   * prototype's word); the L3 prototype writes 用例 over the same chips.
   */
  axisLabels?: Partial<Record<QueryFacetKey, string>>;
  searchPlaceholder: string;
  /** Hero heading block: `<h1>` + lede. */
  hero: ReactNode;
  /** The three disabled prototype controls, rendered inside the genbox. */
  generateControls: ReactNode;
  /** Sections between the hero and 全部提示词 (近期热门). */
  beforeAllPrompts: ReactNode;
  /** The unfiltered card grid, shown whenever nothing is filtered. */
  allPromptsGrid: ReactNode;
  /** Everything after 全部提示词, in the prototype's order. */
  afterAllPrompts: ReactNode;
}

export function ModelPromptExplorer(props: ModelPromptExplorerProps) {
  return (
    <Suspense fallback={<ExplorerView {...props} query={{}} unknownParams={[]} />}>
      <ExplorerFromUrl {...props} />
    </Suspense>
  );
}

function ExplorerFromUrl(props: ModelPromptExplorerProps) {
  const searchParams = useSearchParams();
  const parsed = parsePromptQuery(searchParams.toString());
  return <ExplorerView {...props} query={parsed.query} unknownParams={parsed.unknownParams} />;
}

interface ExplorerViewProps extends ModelPromptExplorerProps {
  query: PromptQuery;
  unknownParams: readonly string[];
}

function ExplorerView({
  locale,
  basePath,
  prompts,
  facetGroups,
  facetAxes,
  axisLabels = {},
  searchPlaceholder,
  hero,
  generateControls,
  beforeAllPrompts,
  allPromptsGrid,
  afterAllPrompts,
  query,
  unknownParams,
}: ExplorerViewProps) {
  const visibleGroups = facetAxes.flatMap((key) => {
    const group = facetGroups.find((candidate) => candidate.key === key);
    if (group === undefined) return [];
    const label = axisLabels[key];
    return [label === undefined ? group : { ...group, label }];
  });

  // `window` belongs to the trending tabs, not to this page's browse filter.
  // `collection` is an L1 concept: this page hands no membership data down, so
  // it is dropped here and reported below rather than silently applied as a
  // filter that would quietly match everything.
  const activeQuery: PromptQuery = { ...query, window: undefined, collection: undefined };
  const filterQuery = stripUnknownFacetValues(activeQuery, facetGroups);
  const linkQuery: PromptQuery = { ...filterQuery, window: query.window };
  // "The URL claims a filter", not "a filter survived validation": a query that
  // named only unknown values still opens the result region, where the warning
  // and the recovery links live.
  const active = !isEmptyPromptQuery(activeQuery);

  const results = active ? applyPromptQuery(prompts, filterQuery) : [...prompts];
  const liveGroups = recountFacets(prompts, visibleGroups, filterQuery);
  const applied = buildAppliedFilters(facetGroups, visibleGroups, filterQuery);
  const unknownValues = [
    ...unknownFacetValues(facetGroups, activeQuery),
    ...(query.collection === undefined ? [] : [`collection=${query.collection}`]),
  ];
  const showFilterBar = active || unknownParams.length > 0 || unknownValues.length > 0;

  return (
    <div className="flex flex-col">
      <header className="mt-6 text-center">
        {hero}

        <div className="mx-auto mt-8 max-w-2xl border-2 border-foreground bg-surface p-4 text-start md:border-4">
          <SearchForm
            basePath={basePath}
            query={linkQuery}
            placeholder={searchPlaceholder}
            inputId="model-search"
            label="搜索本模型的提示词"
          />
          {generateControls}
        </div>

        {/*
          The prototype's `#resultcount` genhint: empty while nothing is
          filtered, `筛选出 N 条` once something is. Mounted unconditionally so
          assistive tech stays attached to one live region.
        */}
        <p role="status" aria-live="polite" className="mt-4 text-sm font-bold">
          {active ? `筛选出 ${results.length} 条` : ""}
        </p>
      </header>

      {beforeAllPrompts}

      <ModelSection
        id={ALL_PROMPTS_ID}
        title="全部提示词"
        end={<span className="font-mono tabular-nums">共 {prompts.length} 条</span>}
      >
        <FacetChips
          basePath={basePath}
          query={linkQuery}
          groups={liveGroups}
          idPrefix="model-facet"
          className="grid gap-6 md:grid-cols-3"
        />

        {showFilterBar ? (
          <div className="mt-6">
            <ActiveFilters
              basePath={basePath}
              query={linkQuery}
              total={results.length}
              appliedFilters={applied}
              unknownParams={unknownParams}
              unknownValues={unknownValues}
              showTotal={false}
            />
          </div>
        ) : null}

        <div className="mt-6">
          {active ? (
            <PromptResults
              prompts={results}
              locale={locale}
              variant="compact"
              priorityCount={3}
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
          ) : (
            allPromptsGrid
          )}
        </div>
      </ModelSection>

      {afterAllPrompts}
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
 * is released while every OTHER axis (and the search term) stays applied — the
 * same rule the repository's server-side facet builder uses.
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

/**
 * Human-readable filters. Axis names come from the page's own vocabulary
 * (`用例`, not the repository's `任务`) so a removal chip reads the same as the
 * facet heading it came from.
 */
function buildAppliedFilters(
  groups: readonly FacetGroup[],
  labelled: readonly FacetGroup[],
  query: PromptQuery,
): AppliedFilter[] {
  const applied: AppliedFilter[] = [];

  const q = query.q?.trim();
  if (q !== undefined && q.length > 0) {
    applied.push({ key: "q", value: q, label: `关键词「${q}」` });
  }

  for (const key of QUERY_FACET_KEYS) {
    const group = groups.find((candidate) => candidate.key === key);
    const axisLabel = labelled.find((candidate) => candidate.key === key)?.label ?? group?.label;
    for (const slug of facetValues(query, key)) {
      const option = group?.options.find((candidate) => candidate.slug === slug);
      applied.push({
        key,
        value: slug,
        label: `${axisLabel ?? key}：${option?.label ?? slug}`,
      });
    }
  }

  return applied;
}

/**
 * Facet values naming a term this data set has never heard of. Reported as
 * `key=value` so the reader is told which filter was dropped rather than
 * silently getting an empty page.
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
 * Drops the values `unknownFacetValues` flagged, so the query filters by
 * nothing on that axis instead of legitimately matching zero prompts. This is
 * what makes an unknown value genuinely ignored rather than merely reported.
 */
function stripUnknownFacetValues(query: PromptQuery, groups: readonly FacetGroup[]): PromptQuery {
  let result = query;
  for (const key of QUERY_FACET_KEYS) {
    const group = groups.find((candidate) => candidate.key === key);
    const values = facetValues(query, key);
    if (values.length === 0) continue;
    const known =
      group === undefined
        ? []
        : values.filter((slug) => group.options.some((option) => option.slug === slug));
    if (known.length !== values.length) result = setFacet(result, key, known);
  }
  return result;
}
