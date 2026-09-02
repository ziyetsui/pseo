import { promptTaxonomies } from "@/lib/content/query";
import type { PromptSummary, QueryFacetKey, TaxonomyWithCount } from "@/lib/content/types";

/**
 * Local narrowing helpers for the L2 image gallery.
 *
 * `PromptQuery` has no `contentType` axis (see `lib/content/types.ts`: the URL
 * contract is `q` + model/useCase/technique/style/subject + window), so the
 * repository cannot be asked for "image prompts only". This module does that
 * one narrowing in a single place, on top of the data the repository already
 * returned — no second data source, no second filtering implementation.
 *
 * Every count a page renders is recomputed here from the narrowed subset. The
 * prototype's declared library-wide figures (324 images, 479 videos …) survive
 * only as `wireframeDeclaredCount` metadata and never reach a rendering path.
 */

/** Slug of the content type this page publishes. Matches `ContentTypeSlug`. */
export const IMAGE_CONTENT_TYPE_SLUG = "image";

export function selectImagePrompts(prompts: readonly PromptSummary[]): PromptSummary[] {
  return prompts.filter((prompt) => prompt.contentType.slug === IMAGE_CONTENT_TYPE_SLUG);
}

export interface GalleryStats {
  /** Prompts in the subset. */
  total: number;
  /** How many the source data flagged as high value. */
  highValueCount: number;
  /** Distinct creators behind them. */
  creatorCount: number;
  /** How many carry a publication date at all. */
  datedCount: number;
  /** Latest known publication date, or `null` when none is recorded. */
  latestPublishedAt: string | null;
}

export function galleryStats(prompts: readonly PromptSummary[]): GalleryStats {
  const dates = prompts
    .map((prompt) => prompt.source.publishedAt)
    .filter((date): date is string => date !== null)
    // ISO `YYYY-MM-DD` sorts lexically, so no Date parsing (and no timezone) is
    // involved in picking the most recent one.
    .sort();

  return {
    total: prompts.length,
    highValueCount: prompts.filter((prompt) => prompt.metrics.highValue).length,
    creatorCount: new Set(prompts.map((prompt) => prompt.creator.id)).size,
    datedCount: dates.length,
    latestPublishedAt: dates.at(-1) ?? null,
  };
}

/** Prompts in `prompts` carrying `slug` on `axis`. */
export function promptsForTerm(
  prompts: readonly PromptSummary[],
  axis: QueryFacetKey,
  slug: string,
): PromptSummary[] {
  return prompts.filter((prompt) =>
    promptTaxonomies(prompt, axis).some((term) => term.slug === slug),
  );
}

/**
 * Re-counts taxonomy terms against a subset and drops the ones the subset never
 * uses. The incoming `count` (library-wide) is replaced, never carried over.
 * Ordering is count desc, then slug, so the same data always yields the same
 * page.
 */
export function countTermsWithin(
  terms: readonly TaxonomyWithCount[],
  prompts: readonly PromptSummary[],
  axis: QueryFacetKey,
): TaxonomyWithCount[] {
  return terms
    .map((term) => ({ ...term, count: promptsForTerm(prompts, axis, term.slug).length }))
    .filter((term) => term.count > 0)
    .sort((a, b) => b.count - a.count || a.slug.localeCompare(b.slug));
}

/** The taxonomy term whose English label matches, e.g. `Person / portrait`. */
export function findTermByLabel(
  terms: readonly TaxonomyWithCount[],
  label: string,
): TaxonomyWithCount | null {
  return terms.find((term) => term.label === label) ?? null;
}

/**
 * The models that get their own "browse by model" rail (tiles + h3 + rail),
 * capped to the top `limit` by image-prompt count.
 *
 * `models` must already be sorted count desc, slug asc (what `countTermsWithin`
 * returns) so the cap is deterministic under a tie. Only a model with a real
 * page (`href !== null`) can be railed — there is nowhere for its "查看全部"
 * link to go otherwise. `ModelTiles` is unaffected by this cap: it keeps
 * rendering every model in the image subset, railed or not.
 */
export function topRailedModels(
  models: readonly TaxonomyWithCount[],
  limit: number,
): TaxonomyWithCount[] {
  return models.filter((model) => model.href !== null).slice(0, limit);
}

/**
 * Label for a model rail's "see everything" link, which always points at the
 * model's own page (`/prompts/models/<slug>`) — a page that lists every
 * content type for that model, not only images.
 *
 * Because the destination's scope is wider than this rail's, the label is
 * scope-neutral ("进入模型页 →") rather than claiming an image-only count. Only
 * when the model's image-prompt count equals its total prompt count (all
 * content types) does the model page show exactly what the rail promised, and
 * only then do we append the count.
 */
export function modelRailMoreLabel(imageCount: number, totalCount: number): string {
  return imageCount === totalCount ? `进入模型页（共 ${totalCount} 条）→` : "进入模型页 →";
}

export function termLabel(term: { label: string; labelZh: string | null }): string {
  return term.labelZh ?? term.label;
}
