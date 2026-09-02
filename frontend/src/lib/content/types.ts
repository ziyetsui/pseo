import type { Locale } from "@/lib/i18n/config";

/**
 * The content domain. Two families of types live here:
 *
 * 1. **Domain types** (`PromptSummary`, `ModelDetail`, …) — what pages consume
 *    through `ContentRepository`. They carry ready-to-render `href`s built by
 *    `lib/i18n/routes`.
 * 2. **Wireframe record types** (`Wireframe*Record`) — the shape of the
 *    generated fixture under `src/data/wireframe/`. They store *slugs*, never
 *    hrefs, so that route construction stays in one place, and they keep the
 *    prototype's declared-but-unverified numbers in `wireframeDeclared*` fields
 *    that must never reach a rendering path.
 */

export type { Locale };

/* ------------------------------------------------------------------ media */

export type MediaKind = "image" | "video";

/**
 * The prototype embeds thumbnail URLs but no intrinsic dimensions. We ship a
 * fixed 16:9 placeholder box so `<img>` always has width/height (no CLS) and
 * flag it so nobody mistakes it for measured data.
 */
export const ASSUMED_MEDIA_WIDTH = 640;
export const ASSUMED_MEDIA_HEIGHT = 360;

export interface Media {
  id: string;
  kind: MediaKind;
  src: string;
  /**
   * Candidate sources for the same picture, widest-last (`… 680w, … 1200w,
   * … 2048w`). X serves one photo at several sizes behind a `name` query
   * parameter, and the prototype pinned the smallest usable one; publishing
   * the ladder lets the browser pick per slot and per device pixel ratio.
   * `null` whenever the host has no size ladder we can state truthfully.
   */
  srcSet: string | null;
  alt: string;
  width: number;
  height: number;
  /** Prototype media badge, e.g. `视频 14s` / `PHOTO · ×2`. `null` when absent. */
  label: string | null;
  durationSeconds: number | null;
  /** 1-based position inside the source post's media list. */
  index: number;
  /** How many media items the source post has, per the prototype badge. */
  total: number;
  dimensionsSource: "assumed";
}

/* ----------------------------------------------------------------- source */

export interface Source {
  platform: "x";
  url: string;
  sourceId: string;
  handle: string;
  creatorId: string;
  publishedAt: string | null;
}

/* ---------------------------------------------------------------- metrics */

export interface Metrics {
  /** Snapshot date every number below was observed on. */
  observedAt: string;
  likes: number | null;
  bookmarks: number | null;
  views: number | null;
  reposts: number | null;
  replies: number | null;
  quotes: number | null;
  valueScore: number | null;
  highValue: boolean;
}

/* --------------------------------------------------------------- taxonomy */

export type TaxonomyAxis =
  | "model"
  | "useCase"
  | "technique"
  | "style"
  | "subject"
  | "contentType";

export const TAXONOMY_AXES: readonly TaxonomyAxis[] = [
  "model",
  "useCase",
  "technique",
  "style",
  "subject",
  "contentType",
] as const;

export type ContentTypeSlug = "image" | "video" | "unknown";

export interface Taxonomy {
  id: string;
  axis: TaxonomyAxis;
  slug: string;
  /**
   * Canonical English value, exactly as the prototype writes it on chips,
   * tiles and card tags (`Fashion`, `Camera movement / shot language`).
   */
  label: string;
  /**
   * Chinese value, for the surfaces the prototype itself writes in Chinese:
   * the L1 footer columns, the L2 其他类型 tiles and 相关 用例 columns, and the
   * L4 detail page. `null` when the prototype never wrote one.
   */
  labelZh: string | null;
  /**
   * Other label variants seen across the four prototype pages, in the order
   * they were first met (e.g. `超写实` for `Photorealistic`). Carried so a page
   * can render the exact wording ITS prototype used without a hard-coded map.
   */
  aliases: readonly string[];
  /** Non-null only for axes/terms that have a real page in this phase. */
  href: string | null;
  /** Prototype-declared library-wide count. Metadata only — never rendered. */
  wireframeDeclaredCount: number | null;
}

export interface TaxonomyWithCount extends Taxonomy {
  /** Number of prompts in the current fixture carrying this term. */
  count: number;
  /**
   * How many of those prompts are flagged `metrics.highValue`. The prototype's
   * L2 tiles read `N 条 · N 条热门`; this is the second number, computed from
   * the same set `count` was computed from.
   */
  highValueCount: number;
}

export interface WireframeTaxonomyRecord {
  id: string;
  axis: TaxonomyAxis;
  slug: string;
  label: string;
  labelZh: string | null;
  /** Raw label variants seen across the four prototype pages. */
  aliases: string[];
  wireframeDeclaredCount: number | null;
  /** Which prototype pages declared or used this term. */
  appearsOn: PageId[];
}

/* --------------------------------------------------------------- creators */

export interface Creator {
  id: string;
  handle: string;
  url: string;
  avatarUrl: string | null;
  followers: number | null;
  wireframeDeclaredPromptCount: number | null;
  wireframeDeclaredLikes: number | null;
  wireframeDeclaredBookmarks: number | null;
}

export interface CreatorWithCount extends Creator {
  count: number;
  /**
   * Sum of `metrics.likes` / `metrics.bookmarks` across this creator's prompts,
   * or `null` when not one of them recorded that metric — a creator whose posts
   * all lack the number must not be shown as having zero (AGENTS.md §1).
   * Prompts with a `null` metric are skipped, never counted as 0.
   */
  likes: number | null;
  bookmarks: number | null;
}

/* -------------------------------------------------------------- variables */

export interface PromptVariable {
  token: string;
  label: string;
  options: string[];
  defaultValue: string;
  /**
   * The record-specific sentence explaining what this variable drives, as the
   * source page writes it (the L4 prototype's `varnote`). `null` when the
   * record has none — the detail page then falls back to a sentence generated
   * from the counted occurrences, which says nothing this data cannot back.
   */
  note: string | null;
}

export interface ExtractedVariable {
  token: string;
  count: number;
}

export interface PromptStep {
  order: number;
  title: string;
  body: string;
}

/* ---------------------------------------------------------------- prompts */

export type PageId = "l1" | "l2" | "l3" | "l4";
export type FeaturedSurface = "l1" | "l2";

export interface PromptSummary {
  id: string;
  slug: string;
  href: string;
  locale: Locale;
  title: string;
  excerpt: string;
  /**
   * The full, whitespace-normalized prompt text — never truncated. Any surface
   * that copies the prompt (the card's copy button, the detail page) MUST read
   * this field, never `promptPreview`, so copy always matches the source of
   * truth even when the visible clamp is shorter (PRD: 复制必须使用完整值).
   */
  promptText: string;
  /** Truncated (240 chars) rendering of `promptText`, for compact display only. */
  promptPreview: string;
  /**
   * Lower-cased, whitespace-normalized free-text haystack: title + FULL prompt
   * text (not `promptPreview`, which is truncated to 240 chars for display) +
   * creator handle + every matched taxonomy's label/slug/labelZh. Built once by
   * `buildPromptSearchText` (`lib/content/query.ts`) in the repository's view
   * builder; `applyPromptQuery` matches `q` against this, never against
   * `promptPreview`, so a term past the 240-char cut-off still matches.
   */
  searchText: string;
  contentType: Taxonomy;
  models: Taxonomy[];
  useCases: Taxonomy[];
  techniques: Taxonomy[];
  styles: Taxonomy[];
  subjects: Taxonomy[];
  creator: Creator;
  source: Source;
  metrics: Metrics;
  media: Media[];
  appearsOn: PageId[];
  hasVariables: boolean;
  featuredOn: FeaturedSurface[];
}

export interface PromptParameter {
  label: string;
  value: string;
}

export interface PromptVariation {
  title: string;
  variableValue: string;
  media: Media | null;
  status: "pending";
}

export interface LocaleVariantRef {
  locale: Locale;
  slug: string;
  href: string;
  status: "ready" | "missing";
}

export interface RelatedGroups {
  sameSeries: PromptSummary[];
  sameModel: PromptSummary[];
  sameUseCase: PromptSummary[];
  sameCreator: PromptSummary[];
}

export interface PromptDetail extends PromptSummary {
  promptLanguage: "en";
  /** Editorial abstract. Only the L4 golden record has one in the prototype. */
  summary: string | null;
  variables: PromptVariable[];
  steps: PromptStep[];
  requiredInputs: string[];
  optionalInputs: string[];
  parameters: PromptParameter[];
  variations: PromptVariation[];
  relatedGroups: RelatedGroups;
  localeVariants: LocaleVariantRef[];
}

/* ------------------------------------------------- generated prompt record */

export interface WireframeMediaRecord {
  id: string;
  kind: MediaKind;
  src: string;
  /** See `Media.srcSet`. Built by the extractor, never hand-written. */
  srcSet: string | null;
  alt: string;
  label: string | null;
  durationSeconds: number | null;
  index: number;
  total: number;
}

export interface WireframePromptRecord {
  id: string;
  slug: string;
  /** `"wireframe-slug"` when L2/L3 supplied the slug, `"derived"` otherwise. */
  slugSource: "wireframe-slug" | "derived" | "curated";
  title: string;
  summary: string | null;
  promptText: string;
  contentType: ContentTypeSlug;
  contentTypeReason: string;
  modelSlugs: string[];
  useCaseSlugs: string[];
  techniqueSlugs: string[];
  styleSlugs: string[];
  subjectSlugs: string[];
  creatorId: string;
  handle: string;
  sourceUrl: string;
  publishedAt: string | null;
  likes: number | null;
  bookmarks: number | null;
  views: number | null;
  reposts: number | null;
  replies: number | null;
  quotes: number | null;
  /** True when likes/bookmarks came from an abbreviated `3.8K`-style label. */
  metricsRounded: boolean;
  valueScore: number | null;
  highValue: boolean;
  media: WireframeMediaRecord[];
  appearsOn: PageId[];
  featuredOn: FeaturedSurface[];
  variables: PromptVariable[];
  steps: PromptStep[];
  requiredInputs: string[];
  optionalInputs: string[];
  parameters: PromptParameter[];
  variations: PromptVariation[];
}

/* ----------------------------------------------------------------- models */

export interface ModelEditorialBlock {
  title: string;
  body: string;
}

export interface ModelDetail {
  id: string;
  slug: string;
  label: string;
  href: string;
  summary: string;
  capabilities: string[];
  inputs: string[];
  outputs: string[];
  limitations: string[];
  editorial: ModelEditorialBlock[];
  editorialStatus: "derived-from-fixture";
  officialUrl: null;
  relatedModels: Taxonomy[];
  relatedUseCases: Taxonomy[];
}

export interface WireframeModelRecord {
  slug: string;
  label: string;
  /** The prototype linked a real model page for this slug. */
  wireframeHasPage: boolean;
  wireframeDeclaredPromptCount: number | null;
  wireframeDeclaredHotCount: number | null;
  /** Related models the prototype itself linked, in its own order. */
  declaredRelatedModelSlugs: string[];
  /** Related use cases the prototype itself linked, in its own order. */
  declaredRelatedUseCaseSlugs: string[];
}

/* ------------------------------------------------------------ collections */

export type CollectionRule =
  | { type: "axis-all"; conditions: { axis: TaxonomyAxis; value: string }[] }
  | { type: "regex"; pattern: string };

export interface Collection {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  rule: CollectionRule;
}

export interface CollectionWithCount extends Collection {
  count: number;
  sampleIds: string[];
  /**
   * Every member's prompt id, in repository order. This is what makes a
   * collection filterable from the client: `?collection=<slug>` cannot be
   * expressed as facet params (some rules match the prompt body), so the page
   * hands these ids to `PromptExplorer`, which feeds them to
   * `applyPromptQuery`'s `collectionMembers` option.
   */
  promptIds: string[];
}

/* --------------------------------------------------------------- articles */

export interface ArticleCategory {
  id: string;
  slug: string;
  label: string;
  href: string;
  description: string;
}

/**
 * Who wrote the piece. `url` is `null` when there is nowhere honest to link
 * (e.g. the fixture editorial byline); when present it is either a
 * site-relative href built by an `lib/i18n/routes` builder or an absolute
 * `https://` URL to an external profile.
 */
export interface ArticleAuthor {
  name: string;
  url: string | null;
}

/**
 * One piece of external or in-repo evidence the article is based on. `url` is
 * always a real, dereferenceable href — a site-relative route-builder path or
 * an absolute URL — never a placeholder.
 */
export interface ArticleSource {
  label: string;
  url: string;
  publishedAt: string | null;
}

export interface ArticleSummary {
  id: string;
  slug: string;
  href: string;
  locale: Locale;
  title: string;
  excerpt: string;
  category: ArticleCategory;
  author: ArticleAuthor;
  publishedAt: string;
  updatedAt: string;
  readingMinutes: number;
  isFixture: true;
}

export interface ArticleDetail extends ArticleSummary {
  paragraphs: string[];
  sources: ArticleSource[];
}

/**
 * A source that points at a page this app itself renders. The repository
 * resolves `kind` + slug into a real href via the same `lib/i18n/routes`
 * builders every other internal link uses, so the raw fixture record never
 * stores a hand-built path string.
 */
export type WireframeArticleSourceRecord =
  | { kind: "promptDetail"; promptSlug: string; label: string; publishedAt: string | null }
  | { kind: "promptsHome"; label: string; publishedAt: string | null };

export interface WireframeArticleRecord {
  id: string;
  slug: string;
  categorySlug: string;
  title: string;
  excerpt: string;
  paragraphs: string[];
  author: ArticleAuthor;
  sources: WireframeArticleSourceRecord[];
  publishedAt: string;
  updatedAt: string;
  isFixture: true;
}

export interface WireframeArticleCategoryRecord {
  id: string;
  slug: string;
  label: string;
  description: string;
}

/* --------------------------------------------------------------- snapshot */

export interface Snapshot {
  observedAt: "2026-08-20";
  indexVersion: "wireframe-flow-proto";
  source: "docs/wireframes/flow-proto.html";
}

/* ------------------------------------------------------------------ query */

export type TrendingWindow = "7d" | "30d" | "all";

export interface PromptQuery {
  q?: string;
  model?: readonly string[];
  useCase?: readonly string[];
  technique?: readonly string[];
  style?: readonly string[];
  subject?: readonly string[];
  window?: TrendingWindow;
  /**
   * Slug of a curated collection (`?collection=cinematic-camera`). Unlike the
   * facet axes this is not a taxonomy term: membership is an explicit id list
   * the page supplies, because a collection rule can be a body regex with no
   * query equivalent. `applyPromptQuery` resolves it through
   * `ApplyPromptQueryOptions.collectionMembers`.
   */
  collection?: string;
}

/** Query axes that map 1:1 onto a taxonomy axis and a URL search param. */
export const QUERY_FACET_KEYS = ["model", "useCase", "technique", "style", "subject"] as const;
export type QueryFacetKey = (typeof QUERY_FACET_KEYS)[number];

export interface AppliedFilter {
  key: QueryFacetKey | "q" | "window" | "collection";
  value: string;
  label: string;
}

export interface FacetOption {
  slug: string;
  label: string;
  count: number;
  selected: boolean;
}

export interface FacetGroup {
  key: QueryFacetKey;
  axis: TaxonomyAxis;
  label: string;
  options: FacetOption[];
}

export interface PromptListResult {
  items: PromptSummary[];
  total: number;
  facets: FacetGroup[];
  appliedFilters: AppliedFilter[];
  unknownParams: string[];
}

export interface TrendingResult {
  items: PromptSummary[];
  note: string | null;
  windowStart: string | null;
}
