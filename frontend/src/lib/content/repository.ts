import type {
  CollectionWithCount,
  CreatorWithCount,
  Locale,
  ModelDetail,
  PromptDetail,
  PromptListResult,
  PromptQuery,
  PromptSummary,
  RelatedGroups,
  Snapshot,
  TaxonomyAxis,
  TaxonomyWithCount,
  TrendingResult,
  TrendingWindow,
} from "./types";

/**
 * The single data entry point for every page. Today it is backed by the
 * wireframe fixture; a later phase swaps in an API-backed implementation by
 * changing `getContentRepository()` alone — no page or component changes.
 *
 * Everything returns a Promise so the async call sites never have to change.
 */
export interface ContentRepository {
  /** When the interaction metrics in this data set were observed. */
  getSnapshot(): Promise<Snapshot>;

  listPrompts(locale: Locale, query?: PromptQuery): Promise<PromptListResult>;
  getPromptBySlug(locale: Locale, slug: string): Promise<PromptDetail | null>;

  /** Prompts the prototype puts in the L1 精选 slot / the L2 精选 rail. */
  listFeatured(locale: Locale, surface: "l1" | "l2"): Promise<PromptSummary[]>;

  /**
   * Trending relative to `getSnapshot().observedAt` — never to `Date.now()`.
   *
   * `modelSlug` narrows the pool to prompts naming that model before ranking,
   * so the L3 model page gets its "近期热门" rail from the same ranking and
   * top-up rules as L1 instead of re-implementing a comparator of its own.
   */
  listTrending(
    locale: Locale,
    window: TrendingWindow,
    limit: number,
    modelSlug?: string,
  ): Promise<TrendingResult>;

  /** Terms on one axis with counts computed from the current prompt set. */
  listTaxonomies(locale: Locale, axis: TaxonomyAxis): Promise<TaxonomyWithCount[]>;

  getModel(locale: Locale, slug: string): Promise<ModelDetail | null>;
  listModelPrompts(locale: Locale, slug: string, query?: PromptQuery): Promise<PromptListResult>;
  listPromptsWithVariables(locale: Locale, modelSlug?: string): Promise<PromptSummary[]>;

  listCollections(locale: Locale): Promise<CollectionWithCount[]>;
  listCreators(locale: Locale): Promise<CreatorWithCount[]>;

  getRelated(locale: Locale, promptId: string): Promise<RelatedGroups>;
}
