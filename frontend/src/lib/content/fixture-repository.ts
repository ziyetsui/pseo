import {
  WIREFRAME_COLLECTIONS,
  WIREFRAME_CREATORS,
  WIREFRAME_MODELS,
  WIREFRAME_PROMPTS,
  WIREFRAME_SNAPSHOT,
  WIREFRAME_TAXONOMIES,
} from "@/data/wireframe";
import { modelPage, promptDetail, promptsImage } from "@/lib/i18n/routes";

import { applyPromptQuery, buildPromptSearchText, facetAxis, promptTaxonomies, resolveWindowStart } from "./query";
import type { ContentRepository } from "./repository";
import {
  ASSUMED_MEDIA_HEIGHT,
  ASSUMED_MEDIA_WIDTH,
  QUERY_FACET_KEYS,
  type AppliedFilter,
  type Collection,
  type CollectionWithCount,
  type Creator,
  type CreatorWithCount,
  type FacetGroup,
  type Locale,
  type Media,
  type ModelDetail,
  type ModelEditorialBlock,
  type PromptDetail,
  type PromptListResult,
  type PromptQuery,
  type PromptSummary,
  type QueryFacetKey,
  type RelatedGroups,
  type Snapshot,
  type Taxonomy,
  type TaxonomyAxis,
  type TaxonomyWithCount,
  type TrendingResult,
  type TrendingWindow,
  type WireframeModelRecord,
  type WireframePromptRecord,
  type WireframeTaxonomyRecord,
} from "./types";
import { extractVariables } from "./variables";

/**
 * The wireframe-fixture implementation of `ContentRepository`. This is the ONLY
 * module allowed to import `@/data/wireframe`.
 *
 * Every number a page can render is derived here from the current fixture. The
 * prototype's declared figures (982 / 324 / 136 / 162 …) survive only as
 * `wireframeDeclared*` metadata and are never returned as an achieved count.
 */

const EXCERPT_LENGTH = 160;
const PREVIEW_LENGTH = 240;
const RELATED_LIMIT = 4;

export interface ContentRepositoryData {
  prompts: readonly WireframePromptRecord[];
  taxonomies: readonly WireframeTaxonomyRecord[];
  creators: readonly Creator[];
  models: readonly WireframeModelRecord[];
  collections: readonly Collection[];
  snapshot: Snapshot;
}

const WIREFRAME_DATA: ContentRepositoryData = {
  prompts: WIREFRAME_PROMPTS,
  taxonomies: WIREFRAME_TAXONOMIES,
  creators: WIREFRAME_CREATORS,
  models: WIREFRAME_MODELS,
  collections: WIREFRAME_COLLECTIONS,
  snapshot: WIREFRAME_SNAPSHOT,
};

const FACET_LABEL: Record<QueryFacetKey, string> = {
  model: "模型",
  useCase: "任务",
  technique: "技法",
  style: "风格",
  subject: "主体",
};

const WINDOW_LABEL: Record<TrendingWindow, string> = {
  "7d": "近 7 天",
  "30d": "近 30 天",
  all: "全部",
};

const TAXONOMY_FIELD: Record<QueryFacetKey, keyof WireframePromptRecord> = {
  model: "modelSlugs",
  useCase: "useCaseSlugs",
  technique: "techniqueSlugs",
  style: "styleSlugs",
  subject: "subjectSlugs",
};

function normalize(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function truncate(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max).trimEnd()}…`;
}

function slugsOf(record: WireframePromptRecord, key: QueryFacetKey): readonly string[] {
  return record[TAXONOMY_FIELD[key]] as readonly string[];
}

/* --------------------------------------------------------- per-locale view */

interface LocaleView {
  taxonomyById: Map<string, Taxonomy>;
  /** Collection slug → member prompt ids, resolved once per locale. */
  collectionIdsBySlug: Record<string, readonly string[]>;
  prompts: PromptSummary[];
  promptsById: Map<string, PromptSummary>;
  promptsBySlug: Map<string, PromptSummary>;
  recordsById: Map<string, WireframePromptRecord>;
  creatorsById: Map<string, Creator>;
}

function taxonomyKey(axis: TaxonomyAxis, slug: string): string {
  return `${axis}:${slug}`;
}

function buildView(
  locale: Locale,
  data: ContentRepositoryData,
  viewCache: Map<Locale, LocaleView>,
): LocaleView {
  const cached = viewCache.get(locale);
  if (cached !== undefined) return cached;

  /* Which model slugs actually have prompts — only those get a page (and an href). */
  const modelPromptCount = new Map<string, number>();
  for (const record of data.prompts) {
    for (const slug of record.modelSlugs) {
      modelPromptCount.set(slug, (modelPromptCount.get(slug) ?? 0) + 1);
    }
  }

  const taxonomyById = new Map<string, Taxonomy>();
  for (const term of data.taxonomies) {
    let href: string | null = null;
    if (term.axis === "model" && (modelPromptCount.get(term.slug) ?? 0) > 0) {
      href = modelPage(locale, term.slug);
    } else if (term.axis === "contentType" && term.slug === "image") {
      href = promptsImage(locale);
    }
    taxonomyById.set(term.id, {
      id: term.id,
      axis: term.axis,
      slug: term.slug,
      label: term.label,
      labelZh: term.labelZh,
      aliases: [...term.aliases],
      href,
      wireframeDeclaredCount: term.wireframeDeclaredCount,
    });
  }

  const creatorsById = new Map<string, Creator>(data.creators.map((c) => [c.id, { ...c }]));

  const resolve = (axis: TaxonomyAxis, slugs: readonly string[]): Taxonomy[] =>
    slugs.flatMap((slug) => {
      const term = taxonomyById.get(taxonomyKey(axis, slug));
      return term === undefined ? [] : [term];
    });

  const prompts = data.prompts.map((record): PromptSummary => {
    const creator = creatorsById.get(record.creatorId);
    if (creator === undefined) {
      throw new Error(`fixture-repository: prompt ${record.id} references unknown creator ${record.creatorId}`);
    }
    const contentType = taxonomyById.get(taxonomyKey("contentType", record.contentType));
    if (contentType === undefined) {
      throw new Error(`fixture-repository: prompt ${record.id} has unknown content type ${record.contentType}`);
    }

    const flat = normalize(record.promptText);
    const models = resolve("model", record.modelSlugs);
    const useCases = resolve("useCase", record.useCaseSlugs);
    const techniques = resolve("technique", record.techniqueSlugs);
    const styles = resolve("style", record.styleSlugs);
    const subjects = resolve("subject", record.subjectSlugs);

    return {
      id: record.id,
      slug: record.slug,
      href: promptDetail(locale, record.slug),
      locale,
      title: record.title,
      excerpt: record.summary ?? truncate(flat, EXCERPT_LENGTH),
      promptText: flat,
      promptPreview: truncate(flat, PREVIEW_LENGTH),
      // Matched against the FULL prompt text (`flat`), not the truncated
      // `promptPreview` above, so a term past the 240-char preview still matches.
      searchText: buildPromptSearchText({
        title: record.title,
        promptText: flat,
        handle: record.handle,
        taxonomies: [contentType, ...models, ...useCases, ...techniques, ...styles, ...subjects],
      }),
      contentType,
      models,
      useCases,
      techniques,
      styles,
      subjects,
      creator,
      source: {
        platform: "x",
        url: record.sourceUrl,
        sourceId: record.id,
        handle: record.handle,
        creatorId: record.creatorId,
        publishedAt: record.publishedAt,
      },
      metrics: {
        observedAt: data.snapshot.observedAt,
        likes: record.likes,
        bookmarks: record.bookmarks,
        views: record.views,
        reposts: record.reposts,
        replies: record.replies,
        quotes: record.quotes,
        valueScore: record.valueScore,
        highValue: record.highValue,
      },
      media: record.media.map(
        (item): Media => ({
          ...item,
          width: ASSUMED_MEDIA_WIDTH,
          height: ASSUMED_MEDIA_HEIGHT,
          dimensionsSource: "assumed",
        }),
      ),
      appearsOn: [...record.appearsOn],
      hasVariables: extractVariables(record.promptText).length > 0,
      featuredOn: [...record.featuredOn],
    };
  });

  const view: LocaleView = {
    taxonomyById,
    collectionIdsBySlug: {},
    prompts,
    promptsById: new Map(prompts.map((p) => [p.id, p])),
    promptsBySlug: new Map(prompts.map((p) => [p.slug, p])),
    recordsById: new Map(data.prompts.map((r) => [r.id, r])),
    creatorsById,
  };
  // Resolved after `view` exists because `collectionMembers` reads `view`.
  for (const collection of data.collections) {
    view.collectionIdsBySlug[collection.slug] = collectionMembers(collection, view).map(
      (prompt) => prompt.id,
    );
  }

  viewCache.set(locale, view);
  return view;
}

/* -------------------------------------------------------------- filtering */

function buildFacets(
  view: LocaleView,
  base: readonly PromptSummary[],
  query: PromptQuery,
  windowStart: string | null,
): FacetGroup[] {
  return QUERY_FACET_KEYS.map((key): FacetGroup => {
    // Counts answer "what would I get if I picked this?", so every OTHER axis
    // stays applied while this axis is released.
    const withoutThisAxis: PromptQuery = { ...query, [key]: undefined };
    const pool = applyPromptQuery(base, withoutThisAxis, {
      windowStart,
      collectionMembers: view.collectionIdsBySlug,
    });
    const selected = new Set(query[key] ?? []);

    const counts = new Map<string, number>();
    for (const prompt of pool) {
      for (const term of promptTaxonomies(prompt, key)) {
        counts.set(term.slug, (counts.get(term.slug) ?? 0) + 1);
      }
    }

    const options = [...counts.entries()]
      .map(([slug, count]) => {
        const term = view.taxonomyById.get(taxonomyKey(facetAxis(key), slug));
        return {
          slug,
          // The prototype writes every facet chip value in English (`Fashion`,
          // `Photorealistic`, `Camera movement / shot language`), on L1, L2 and
          // L3 alike, and the same English value on the browse tiles and card
          // tags. `labelZh` is reserved for the surfaces the prototype itself
          // writes in Chinese: the L1 footer columns, the L2 其他类型 tiles and
          // the 相关 用例 columns.
          label: term?.label ?? slug,
          count,
          selected: selected.has(slug),
        };
      })
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

    // A selected value must stay visible even when the intersection is empty,
    // otherwise the user cannot remove it.
    for (const slug of selected) {
      if (options.some((option) => option.slug === slug)) continue;
      const term = view.taxonomyById.get(taxonomyKey(facetAxis(key), slug));
      options.push({ slug, label: term?.label ?? slug, count: 0, selected: true });
    }

    return { key, axis: facetAxis(key), label: FACET_LABEL[key], options };
  });
}

function buildAppliedFilters(
  view: LocaleView,
  query: PromptQuery,
  collections: readonly Collection[],
): AppliedFilter[] {
  const applied: AppliedFilter[] = [];
  if (query.q !== undefined && query.q.trim().length > 0) {
    applied.push({ key: "q", value: query.q.trim(), label: `关键词「${query.q.trim()}」` });
  }
  for (const key of QUERY_FACET_KEYS) {
    for (const slug of query[key] ?? []) {
      const term = view.taxonomyById.get(taxonomyKey(facetAxis(key), slug));
      applied.push({
        key,
        value: slug,
        label: `${FACET_LABEL[key]}：${term?.label ?? slug}`,
      });
    }
  }
  if (query.window !== undefined && query.window !== "all") {
    applied.push({ key: "window", value: query.window, label: `时间范围：${WINDOW_LABEL[query.window]}` });
  }
  if (query.collection !== undefined) {
    const collection = collections.find((entry) => entry.slug === query.collection);
    applied.push({
      key: "collection",
      value: query.collection,
      label: `合集：${collection?.title ?? query.collection}`,
    });
  }
  return applied;
}

/**
 * Facet values that name a term this data set has never heard of. Reported as
 * `key=value` so a page can tell the user exactly which filter it dropped,
 * complementing `parsePromptQuery`'s unknown *keys*.
 */
function unknownFacetValues(view: LocaleView, query: PromptQuery): string[] {
  const unknown: string[] = [];
  for (const key of QUERY_FACET_KEYS) {
    for (const slug of query[key] ?? []) {
      if (!view.taxonomyById.has(taxonomyKey(facetAxis(key), slug))) unknown.push(`${key}=${slug}`);
    }
  }
  return unknown.sort();
}

function listWithin(
  view: LocaleView,
  base: readonly PromptSummary[],
  query: PromptQuery,
  data: ContentRepositoryData,
): PromptListResult {
  const windowStart =
    query.window === undefined ? null : resolveWindowStart(data.snapshot.observedAt, query.window);
  const options = { windowStart, collectionMembers: view.collectionIdsBySlug };
  const items = applyPromptQuery(base, query, options);
  return {
    items,
    total: items.length,
    facets: buildFacets(view, base, query, windowStart),
    appliedFilters: buildAppliedFilters(view, query, data.collections),
    unknownParams: unknownFacetValues(view, query),
  };
}

/* ----------------------------------------------------------------- models */

function trendingSort(a: PromptSummary, b: PromptSummary): number {
  const av = a.metrics.valueScore;
  const bv = b.metrics.valueScore;
  if (av !== bv) {
    if (av === null) return 1;
    if (bv === null) return -1;
    return bv - av;
  }
  return (b.metrics.likes ?? 0) - (a.metrics.likes ?? 0);
}

function modelFamily(label: string): string {
  return label.split(" ")[0] ?? label;
}

function buildModelDetail(
  view: LocaleView,
  locale: Locale,
  slug: string,
  models: readonly WireframeModelRecord[],
): ModelDetail | null {
  const record = models.find((model) => model.slug === slug);
  const term = view.taxonomyById.get(taxonomyKey("model", slug));
  if (record === undefined || term === undefined) return null;

  const prompts = view.prompts.filter((prompt) => prompt.models.some((m) => m.slug === slug));
  if (prompts.length === 0) return null;

  const creators = new Set(prompts.map((prompt) => prompt.creator.id));
  const highValueCount = prompts.filter((prompt) => prompt.metrics.highValue).length;
  const dates = prompts
    .map((prompt) => prompt.source.publishedAt)
    .filter((date): date is string => date !== null)
    .sort();

  // Prototype L3 lede, verbatim; every number is computed from the current set.
  // With no recorded publish date the coverage clause says so instead of
  // inventing a range (global constraint 4).
  const coverage =
    dates.length > 0
      ? `收录 ${dates[0]} 至 ${dates[dates.length - 1]}`
      : "收录日期未收录";
  const summary =
    `${prompts.length} 条点名该模型的真实提示词 · ${highValueCount} 条热门 · ` +
    `${creators.size} 位创作者 · ${coverage}`;

  const capabilities = [
    ...new Set(
      prompts.flatMap((prompt) =>
        [...prompt.useCases, ...prompt.styles, ...prompt.subjects].map((t) => t.labelZh ?? t.label),
      ),
    ),
  ].sort();

  const inputs = ["文本 Prompt"];
  const needsReference = prompts.some((prompt) => {
    const record_ = view.recordsById.get(prompt.id);
    if (record_ === undefined) return false;
    return (
      /@img\d|@image\d|\[INSERT/i.test(record_.promptText) ||
      /reference/i.test(record_.promptText) ||
      prompt.hasVariables
    );
  });
  if (needsReference) inputs.push("参考图 / 变量");

  const outputs = [...new Set(prompts.map((prompt) => prompt.contentType.slug))]
    .filter((slugValue) => slugValue !== "unknown")
    .sort();

  const siblings = models.filter(
    (other) =>
      other.slug !== slug &&
      modelFamily(other.label) === modelFamily(record.label) &&
      view.prompts.some((prompt) => prompt.models.some((m) => m.slug === other.slug)),
  ).map((other) => ({
    label: other.label,
    count: view.prompts.filter((prompt) => prompt.models.some((m) => m.slug === other.slug)).length,
  }));

  const editorial: ModelEditorialBlock[] = [
    {
      title: "收录情况",
      body:
        siblings.length === 0
          ? `${record.label} —— 库中有 ${prompts.length} 条提示词点名使用它。`
          : `${record.label} —— 库中有 ${prompts.length} 条提示词点名使用它，与 ${siblings
              .map((s) => `${s.label}（${s.count} 条）`)
              .join("、")} 分开统计。`,
    },
    {
      title: "页面范围",
      body: "本页展示的是谁写了这些提示词、效果如何。模型定价与功能说明请以官方渠道为准。",
    },
    {
      title: "使用建议",
      body: "怎么用：整段复制 → 只替换方括号里的变量 → 分享成品时链回原帖。",
    },
  ];

  const relatedModelSlugs =
    record.declaredRelatedModelSlugs.length > 0
      ? record.declaredRelatedModelSlugs
      : models.filter((other) => other.slug !== slug)
          .map((other) => ({
            slug: other.slug,
            count: view.prompts.filter((prompt) => prompt.models.some((m) => m.slug === other.slug)).length,
          }))
          .filter((other) => other.count > 0)
          .sort((a, b) => b.count - a.count || a.slug.localeCompare(b.slug))
          .slice(0, 2)
          .map((other) => other.slug);

  const useCaseCounts = new Map<string, number>();
  for (const prompt of prompts) {
    for (const useCase of prompt.useCases) {
      useCaseCounts.set(useCase.slug, (useCaseCounts.get(useCase.slug) ?? 0) + 1);
    }
  }
  const relatedUseCaseSlugs =
    record.declaredRelatedUseCaseSlugs.length > 0
      ? record.declaredRelatedUseCaseSlugs
      : [...useCaseCounts.entries()]
          .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
          .slice(0, 2)
          .map(([useCaseSlug]) => useCaseSlug);

  const pick = (axis: TaxonomyAxis, slugs: readonly string[]): Taxonomy[] =>
    slugs.flatMap((value) => {
      const found = view.taxonomyById.get(taxonomyKey(axis, value));
      return found === undefined ? [] : [found];
    });

  return {
    id: term.id,
    slug,
    label: record.label,
    href: modelPage(locale, slug),
    summary,
    capabilities,
    inputs,
    outputs,
    limitations: ["官方功能与定价说明尚未收录，请以官方渠道为准"],
    editorial,
    editorialStatus: "derived-from-fixture",
    officialUrl: null,
    relatedModels: pick("model", relatedModelSlugs),
    relatedUseCases: pick("useCase", relatedUseCaseSlugs),
  };
}

/* ------------------------------------------------------------ collections */

function collectionMembers(collection: Collection, view: LocaleView): PromptSummary[] {
  if (collection.rule.type === "regex") {
    const pattern = new RegExp(collection.rule.pattern);
    return view.prompts.filter((prompt) => {
      const record = view.recordsById.get(prompt.id);
      return record !== undefined && pattern.test(record.promptText);
    });
  }
  const conditions = collection.rule.conditions;
  return view.prompts.filter((prompt) => {
    const record = view.recordsById.get(prompt.id);
    if (record === undefined) return false;
    return conditions.every((condition) => {
      if (condition.axis === "contentType") return record.contentType === condition.value;
      const key = condition.axis as QueryFacetKey;
      return slugsOf(record, key).includes(condition.value);
    });
  });
}

/* ------------------------------------------------------------ repository */

export class FixtureContentRepository implements ContentRepository {
  private readonly viewCache = new Map<Locale, LocaleView>();

  constructor(private readonly data: ContentRepositoryData = WIREFRAME_DATA) {}

  private view(locale: Locale): LocaleView {
    return buildView(locale, this.data, this.viewCache);
  }

  async getSnapshot(): Promise<Snapshot> {
    return this.data.snapshot;
  }

  async listPrompts(locale: Locale, query: PromptQuery = {}): Promise<PromptListResult> {
    const view = this.view(locale);
    return listWithin(view, view.prompts, query, this.data);
  }

  async getPromptBySlug(locale: Locale, slug: string): Promise<PromptDetail | null> {
    const view = this.view(locale);
    const summary = view.promptsBySlug.get(slug);
    if (summary === undefined) return null;
    const record = view.recordsById.get(summary.id);
    if (record === undefined) return null;

    return {
      ...summary,
      promptText: record.promptText,
      promptLanguage: "en",
      summary: record.summary,
      variables: record.variables.map((variable) => ({ ...variable, options: [...variable.options] })),
      steps: record.steps.map((step) => ({ ...step })),
      requiredInputs: [...record.requiredInputs],
      optionalInputs: [...record.optionalInputs],
      parameters: record.parameters.map((parameter) => ({ ...parameter })),
      variations: record.variations.map((variation) => ({ ...variation })),
      relatedGroups: relatedFor(view, summary),
      localeVariants: [{ locale, slug: summary.slug, href: summary.href, status: "ready" }],
    };
  }

  async listFeatured(locale: Locale, surface: "l1" | "l2"): Promise<PromptSummary[]> {
    const view = this.view(locale);
    return view.prompts.filter((prompt) => prompt.featuredOn.includes(surface));
  }

  async listTrending(
    locale: Locale,
    window: TrendingWindow,
    limit: number,
    modelSlug?: string,
  ): Promise<TrendingResult> {
    const view = this.view(locale);
    const windowStart = resolveWindowStart(this.data.snapshot.observedAt, window);
    const pool =
      modelSlug === undefined
        ? view.prompts
        : view.prompts.filter((prompt) => prompt.models.some((model) => model.slug === modelSlug));
    const ranked = [...pool].sort(trendingSort);

    if (window === "all") {
      return { items: ranked.slice(0, limit), note: null, windowStart };
    }

    const inWindow = ranked.filter(
      (prompt) => prompt.source.publishedAt !== null && prompt.source.publishedAt >= (windowStart ?? ""),
    );
    // A window counts as "has enough to show" once it can fill the request (or
    // holds at least 3 — enough to look like a real rail rather than 1-2 stray
    // items); short of that we top up with the highest-scoring prompts from
    // outside the window instead of rendering an almost-empty trending rail.
    if (inWindow.length >= Math.min(3, limit)) {
      return { items: inWindow.slice(0, limit), note: null, windowStart };
    }

    const filler = ranked.filter((prompt) => !inWindow.includes(prompt)).slice(0, limit - inWindow.length);
    return {
      items: [...inWindow, ...filler],
      note: "该时段收录较少，已补充全部时段热门。",
      windowStart,
    };
  }

  async listTaxonomies(locale: Locale, axis: TaxonomyAxis): Promise<TaxonomyWithCount[]> {
    const view = this.view(locale);
    const counts = new Map<string, number>();
    const highValue = new Map<string, number>();
    for (const prompt of view.prompts) {
      const terms =
        axis === "contentType"
          ? [prompt.contentType]
          : promptTaxonomies(prompt, axis as QueryFacetKey);
      for (const term of terms) {
        counts.set(term.slug, (counts.get(term.slug) ?? 0) + 1);
        if (prompt.metrics.highValue) {
          highValue.set(term.slug, (highValue.get(term.slug) ?? 0) + 1);
        }
      }
    }

    return [...view.taxonomyById.values()]
      .filter((term) => term.axis === axis)
      .map((term) => ({
        ...term,
        count: counts.get(term.slug) ?? 0,
        highValueCount: highValue.get(term.slug) ?? 0,
      }))
      .filter((term) => term.count > 0)
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }

  async getModel(locale: Locale, slug: string): Promise<ModelDetail | null> {
    return buildModelDetail(this.view(locale), locale, slug, this.data.models);
  }

  async listModelPrompts(locale: Locale, slug: string, query: PromptQuery = {}): Promise<PromptListResult> {
    const view = this.view(locale);
    const base = view.prompts.filter((prompt) => prompt.models.some((model) => model.slug === slug));
    return listWithin(view, base, query, this.data);
  }

  async listPromptsWithVariables(locale: Locale, modelSlug?: string): Promise<PromptSummary[]> {
    const view = this.view(locale);
    return view.prompts.filter(
      (prompt) =>
        prompt.hasVariables &&
        (modelSlug === undefined || prompt.models.some((model) => model.slug === modelSlug)),
    );
  }

  async listCollections(locale: Locale): Promise<CollectionWithCount[]> {
    const view = this.view(locale);
    return this.data.collections.map((collection): CollectionWithCount => {
      const members = collectionMembers(collection, view);
      return {
        ...collection,
        rule: collection.rule,
        count: members.length,
        sampleIds: members.slice(0, 3).map((prompt) => prompt.id),
        promptIds: members.map((prompt) => prompt.id),
      };
    });
  }

  async listCreators(locale: Locale): Promise<CreatorWithCount[]> {
    const view = this.view(locale);
    const counts = new Map<string, number>();
    // `null` sums stay null: a creator whose posts never exposed a like count
    // is shown as "—", never as 0 (AGENTS.md §1). A single recorded value is
    // enough to make the sum real.
    const likes = new Map<string, number | null>();
    const bookmarks = new Map<string, number | null>();
    const add = (
      totals: Map<string, number | null>,
      id: string,
      value: number | null,
    ): void => {
      if (value === null) {
        if (!totals.has(id)) totals.set(id, null);
        return;
      }
      totals.set(id, (totals.get(id) ?? 0) + value);
    };

    for (const prompt of view.prompts) {
      const id = prompt.creator.id;
      counts.set(id, (counts.get(id) ?? 0) + 1);
      add(likes, id, prompt.metrics.likes);
      add(bookmarks, id, prompt.metrics.bookmarks);
    }

    return [...view.creatorsById.values()]
      .map((creator) => ({
        ...creator,
        count: counts.get(creator.id) ?? 0,
        likes: likes.get(creator.id) ?? null,
        bookmarks: bookmarks.get(creator.id) ?? null,
      }))
      .sort((a, b) => b.count - a.count || a.handle.localeCompare(b.handle));
  }

  async getRelated(locale: Locale, promptId: string): Promise<RelatedGroups> {
    const view = this.view(locale);
    const prompt = view.promptsById.get(promptId);
    if (prompt === undefined) {
      return { sameSeries: [], sameModel: [], sameUseCase: [], sameCreator: [] };
    }
    return relatedFor(view, prompt);
  }
}

/**
 * "同系列" has no direct counterpart in the fixture: the prototype's 同系列 grid
 * is six unrendered variations of one prompt. We approximate it with the
 * tightest real signal available — same creator AND a shared model AND a shared
 * style — and leave it empty rather than padding it with loose matches.
 */
function relatedFor(view: LocaleView, prompt: PromptSummary): RelatedGroups {
  const others = view.prompts.filter((candidate) => candidate.id !== prompt.id);
  const shares = (a: Taxonomy[], b: Taxonomy[]): boolean => {
    const slugs = new Set(b.map((term) => term.slug));
    return a.some((term) => slugs.has(term.slug));
  };

  return {
    sameSeries: others
      .filter(
        (candidate) =>
          candidate.creator.id === prompt.creator.id &&
          shares(candidate.models, prompt.models) &&
          shares(candidate.styles, prompt.styles),
      )
      .slice(0, RELATED_LIMIT),
    sameModel: others.filter((candidate) => shares(candidate.models, prompt.models)).slice(0, RELATED_LIMIT),
    sameUseCase: others
      .filter((candidate) => shares(candidate.useCases, prompt.useCases))
      .slice(0, RELATED_LIMIT),
    sameCreator: others
      .filter((candidate) => candidate.creator.id === prompt.creator.id)
      .slice(0, RELATED_LIMIT),
  };
}

let repository: ContentRepository | null = null;

export function getFixtureContentRepository(): ContentRepository {
  repository ??= new FixtureContentRepository();
  return repository;
}

/** Builds an isolated repository over one already-validated data snapshot. */
export function createDataContentRepository(data: ContentRepositoryData): ContentRepository {
  return new FixtureContentRepository(data);
}
