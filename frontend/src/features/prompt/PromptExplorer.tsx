"use client";

import { Suspense, createContext, useContext, type ReactNode } from "react";
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
import { MetricsSnapshotNote } from "@/features/prompt/MetricsSnapshotNote";
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
 * `PromptExplorer` owns the state and nothing else: it parses the URL, applies
 * the query, recounts the facets and publishes the result through context. The
 * page then arranges the four visible pieces — `ExplorerSearch`,
 * `ExplorerFacets`, `ExplorerNotices`, `ExplorerSummary`, `ExplorerResults` —
 * in ITS prototype's order, interleaved with its own server-rendered sections.
 * That is why L3 no longer needs a forked copy of this component: the three
 * pages differ only in where the pieces sit, not in what they do.
 *
 * Static export cannot read search params on the server, so the shipped HTML is
 * the Suspense fallback: the same children rendered with an empty query, i.e.
 * the full unfiltered browse content. Crawlers and readers without JavaScript
 * never see a spinner where the listing should be.
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
  /** Which axes get chips, in order. Defaults to every axis in `facetGroups`. */
  facetAxes?: readonly QueryFacetKey[];
  /**
   * Per-page axis names. The repository calls the `useCase` axis 任务 (the L1
   * prototype's word); the L2 and L3 prototypes write 用例 over the same chips.
   * Slugs, counts and the URL contract are untouched.
   */
  axisLabels?: Partial<Record<QueryFacetKey, string>>;
  /**
   * Curated collections this page can filter by. Supplying them is what makes
   * `?collection=<slug>` work: a collection rule can match the prompt body,
   * which no facet param can express, so membership travels as an explicit id
   * list instead. Omit on a page with no collections.
   */
  collections?: readonly ExplorerCollection[];
  className?: string;
  /** The page's own layout, with the explorer pieces placed inside it. */
  children: ReactNode;
}

/** The membership data `?collection=` needs, serialized by the page. */
export interface ExplorerCollection {
  slug: string;
  title: string;
  promptIds: readonly string[];
}

interface ExplorerState {
  locale: Locale;
  basePath: string;
  /** Query for every outgoing href: validated, with `window` preserved. */
  linkQuery: PromptQuery;
  /** Facet groups with live counts and this page's axis names. */
  groups: readonly FacetGroup[];
  /** What the current query selects — the whole set while nothing is filtered. */
  results: readonly PromptSummary[];
  applied: readonly AppliedFilter[];
  unknownParams: readonly string[];
  unknownValues: readonly string[];
  /** True once the URL claims a filter, valid or not. */
  active: boolean;
  /** Collection the reader arrived through, for the summary line. */
  collectionTitle: string | null;
  /** Trending window to preserve in the reset link. */
  window: PromptQuery["window"];
}

const ExplorerContext = createContext<ExplorerState | null>(null);

function useExplorer(): ExplorerState {
  const state = useContext(ExplorerContext);
  if (state === null) {
    throw new Error("Explorer pieces must be rendered inside <PromptExplorer>.");
  }
  return state;
}

export function PromptExplorer(props: PromptExplorerProps) {
  return (
    <Suspense fallback={<ExplorerProvider {...props} query={{}} unknownParams={[]} />}>
      <ExplorerFromUrl {...props} />
    </Suspense>
  );
}

function ExplorerFromUrl(props: PromptExplorerProps) {
  const searchParams = useSearchParams();
  const parsed = parsePromptQuery(searchParams.toString());

  // The raw, as-parsed query (still carrying `window` when present) is handed
  // down as-is: `ExplorerProvider` is the one place that decides which parts of
  // it count as an active filter versus which parts merely need to survive into
  // outgoing links.
  return <ExplorerProvider {...props} query={parsed.query} unknownParams={parsed.unknownParams} />;
}

interface ExplorerProviderProps extends PromptExplorerProps {
  /** As-parsed query, including `window` when the URL carried a valid one. */
  query: PromptQuery;
  unknownParams: readonly string[];
}

function ExplorerProvider({
  locale,
  basePath,
  prompts,
  facetGroups,
  facetAxes,
  axisLabels = {},
  collections = [],
  className,
  children,
  query,
  unknownParams,
}: ExplorerProviderProps) {
  const axes = facetAxes ?? facetGroups.map((group) => group.key);
  const visibleGroups = axes.flatMap((key) => {
    const group = facetGroups.find((candidate) => candidate.key === key);
    if (group === undefined) return [];
    const label = axisLabels[key];
    return [label === undefined ? group : { ...group, label }];
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
  const applied = buildAppliedFilters(facetGroups, visibleGroups, filterQuery, selectedCollection);
  const unknownValues = [
    ...unknownFacetValues(facetGroups, activeQuery),
    ...(activeQuery.collection !== undefined && selectedCollection === undefined
      ? [`collection=${activeQuery.collection}`]
      : []),
  ];

  const state: ExplorerState = {
    locale,
    basePath,
    linkQuery,
    groups: liveGroups,
    results,
    applied,
    unknownParams,
    unknownValues,
    active,
    collectionTitle: selectedCollection?.title ?? null,
    window: query.window,
  };

  return (
    <ExplorerContext.Provider value={state}>
      <div className={className ?? "flex flex-col gap-8"}>{children}</div>
    </ExplorerContext.Provider>
  );
}

/* ------------------------------------------------------------------ slots */

export interface ExplorerSearchProps {
  /**
   * Search-box placeholder. Required, and passed straight to `SearchForm`:
   * the prototype writes a different one on every page.
   */
  placeholder: string;
  label?: string;
  inputId?: string;
  className?: string;
}

/** The GET search form, wherever the page's prototype puts it. */
export function ExplorerSearch({ placeholder, label, inputId, className }: ExplorerSearchProps) {
  const { basePath, linkQuery } = useExplorer();
  return (
    <SearchForm
      basePath={basePath}
      query={linkQuery}
      placeholder={placeholder}
      label={label}
      inputId={inputId}
      className={className}
    />
  );
}

export interface ExplorerFacetsProps {
  /**
   * Renders a real `<h2>` above the facet block — the L2 prototype's
   * `按标签浏览` section heading. Omitted on L1, whose prototype has an
   * unlabelled `.facets` block with no heading at all.
   */
  heading?: string;
  headingId?: string;
  /**
   * Accessible name when there is no `heading`. The L1 prototype's block is
   * `<div class="facets" aria-label="筛选">`. `null` renders the chips with no
   * wrapper at all — L3's prototype puts them straight under the section head
   * of 全部提示词, which already names them.
   */
  label?: string | null;
  /**
   * `h3` promotes each axis name to a heading, as the L2/L3 prototypes do
   * inside a section that already has an `<h2>`. `none` (the default) keeps
   * L1's plain `<b>`-style label, since L1 has no `<h2>` to nest under.
   */
  axisHeadingLevel?: "none" | "h3";
  idPrefix?: string;
  className?: string;
}

/** The facet chip block. */
export function ExplorerFacets({
  heading,
  headingId = "explorer-filters",
  label = "筛选",
  axisHeadingLevel = "none",
  idPrefix = "explorer-facet",
  className,
}: ExplorerFacetsProps) {
  const { basePath, linkQuery, groups } = useExplorer();

  const chips = (
    <FacetChips
      basePath={basePath}
      query={linkQuery}
      groups={groups}
      idPrefix={idPrefix}
      headingLevel={axisHeadingLevel}
      className={className}
    />
  );

  if (heading === undefined) {
    // No heading: the L1 prototype's filter block is an unlabelled region with
    // `aria-label="筛选"`, and its axis labels are plain `<b>` text.
    if (label === null) return chips;
    return (
      <div aria-label={label} role="group">
        {chips}
      </div>
    );
  }

  return (
    <section aria-labelledby={headingId}>
      <h2
        id={headingId}
        className="mb-6 text-2xl font-black tracking-tighter uppercase md:text-3xl"
      >
        {heading}
      </h2>
      {chips}
    </section>
  );
}

/**
 * The removable-filter chips plus the warning panel for params or values this
 * page could not honour. Renders nothing while the URL is clean.
 */
export function ExplorerNotices({ className }: { className?: string }) {
  const { basePath, linkQuery, results, applied, unknownParams, unknownValues, active } =
    useExplorer();
  if (!active && unknownParams.length === 0 && unknownValues.length === 0) return null;

  return (
    <ActiveFilters
      basePath={basePath}
      query={linkQuery}
      total={results.length}
      appliedFilters={applied}
      unknownParams={unknownParams}
      unknownValues={unknownValues}
      showTotal={false}
      className={className}
    />
  );
}

export interface ExplorerSummaryProps {
  /**
   * Result summary wording. `hub` is the prototype's L1 `共 N 条`; `count` is
   * the L2/L3 `筛选出 N 条`. Both appear only while something is filtered.
   */
  style?: "hub" | "count";
  className?: string;
}

/**
 * The single result-count live region, mounted unconditionally (empty in the
 * browse state) so assistive tech is always attached to it rather than to a
 * node that pops in and out. `ExplorerNotices` is told `showTotal={false}` so
 * the count is never announced twice.
 */
export function ExplorerSummary({ style = "hub", className }: ExplorerSummaryProps) {
  const { results, active, collectionTitle } = useExplorer();

  // `共 N 条` (L1) / `筛选出 N 条` (L2/L3), prefixed with the collection name
  // when the reader arrived through a 精选合集 tile — exactly as the prototype's
  // `合集名 · 共 N 条`.
  const countText = style === "hub" ? `共 ${results.length} 条` : `筛选出 ${results.length} 条`;
  const text = !active ? "" : collectionTitle === null ? countText : `${collectionTitle} · ${countText}`;

  return (
    <p role="status" aria-live="polite" className={className ?? "text-sm font-bold"}>
      {text}
    </p>
  );
}

export interface ExplorerResultsProps {
  /** Server-rendered browse sections, shown while nothing is filtered. */
  browse: ReactNode;
  /**
   * Heading for the result region. Given ⇒ the results get their own
   * `<section>` + `<h2>` (L1's `筛选结果`); omitted ⇒ they replace the browse
   * grid inside the section the page already opened (L3's `全部提示词`).
   */
  heading?: string;
  headingId?: string;
  /** Card anatomy for the result grid. Defaults to L1's `hub` card. */
  cardVariant?: PromptCardVariant;
  /** How many result cards get eager media. */
  priorityCount?: number;
  /**
   * Replaces the generated no-results sentence — pass the prototype's own line
   * (L1: `没有找到匹配的提示词，换个关键词试试。`). The conditions that produced
   * the dead end are then listed underneath, so global constraint 6 still holds.
   */
  emptyMessage?: string;
  /** Snapshot date for the region's one provenance statement. */
  observedAt?: string;
  className?: string;
}

export function ExplorerResults({
  browse,
  heading,
  headingId = "prompt-explorer-results",
  cardVariant,
  priorityCount = 3,
  emptyMessage,
  observedAt,
  className,
}: ExplorerResultsProps) {
  const { locale, basePath, linkQuery, results, applied, active, window } = useExplorer();

  const generated = generatedNoResultsMessage(applied);
  const results_ = (
    <PromptResults
      prompts={results}
      locale={locale}
      variant={cardVariant}
      priorityCount={priorityCount}
      emptyMessage={emptyMessage ?? generated}
    >
      {/* The prototype's one-liner does not say WHICH conditions collided, so
          when it is used the generated sentence follows it rather than being
          replaced (global constraint 6). */}
      {emptyMessage === undefined || applied.length === 0 ? null : (
        <p className="text-sm font-medium">{generated}</p>
      )}
      {applied.map((filter) => (
        <StateBlockLink
          key={`${filter.key}:${filter.value}`}
          href={queryHref(basePath, removeFilter(linkQuery, filter))}
        >
          移除「{filter.label}」
        </StateBlockLink>
      ))}
      <StateBlockLink href={queryHref(basePath, { window })}>清除全部筛选</StateBlockLink>
    </PromptResults>
  );

  const region =
    heading === undefined ? (
      <div className={className}>
        {observedAt === undefined ? null : <MetricsSnapshotNote observedAt={observedAt} />}
        {results_}
      </div>
    ) : (
      <section aria-labelledby={headingId} className={className}>
        <div className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-foreground pb-3 md:border-b-4">
          <h2 id={headingId} className="text-2xl font-black tracking-tighter uppercase md:text-3xl">
            {heading}
          </h2>
        </div>
        <div className="mt-6">
          {observedAt === undefined ? null : <MetricsSnapshotNote observedAt={observedAt} />}
          {results_}
        </div>
      </section>
    );

  return (
    <>
      {active ? region : null}
      <div hidden={active}>{browse}</div>
    </>
  );
}

/* ----------------------------------------------------------------- helpers */

function generatedNoResultsMessage(applied: readonly AppliedFilter[]): string {
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

/**
 * Human-readable filters. Axis names come from the page's own vocabulary
 * (`用例`, not the repository's `任务`) so a removal chip reads the same as the
 * facet heading it came from.
 */
function buildAppliedFilters(
  groups: readonly FacetGroup[],
  labelled: readonly FacetGroup[],
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
