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
 * uses. The incoming `count` AND `highValueCount` (both library-wide) are
 * replaced, never carried over — a tile that says `N 条 · N 条热门` must have
 * both numbers scoped to the same set.
 * Ordering is count desc, then slug, so the same data always yields the same
 * page.
 */
export function countTermsWithin(
  terms: readonly TaxonomyWithCount[],
  prompts: readonly PromptSummary[],
  axis: QueryFacetKey,
): TaxonomyWithCount[] {
  return terms
    .map((term) => {
      const matched = promptsForTerm(prompts, axis, term.slug);
      return {
        ...term,
        count: matched.length,
        highValueCount: matched.filter((prompt) => prompt.metrics.highValue).length,
      };
    })
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
 * The words of the "see everything" affordance, without the arrow.
 *
 * A model tile's `ActionRow` draws its arrow with the shared `Chevron`, so it
 * needs the same sentence the rail headers use minus the `→` character. Both
 * spellings therefore come from one place and can never drift apart.
 */
export function tileActionLabel(count: number): string {
  return `查看全部 ${count} 条`;
}

/**
 * Label for a rail's "see everything" link: the prototype's
 * `查看全部 136 条 →`.
 *
 * `count` is this page's own scope — how many IMAGE prompts carry the term —
 * because that is what the rail above the link is a sample of. The model page
 * the link points at lists every content type for that model, so its own total
 * can legitimately be larger; the number here describes the rail, never the
 * destination.
 */
export function railMoreLabel(count: number): string {
  return `${tileActionLabel(count)} →`;
}

/**
 * The hero lede, verbatim from the prototype with its declared 324 replaced by
 * the number of image prompts this build actually publishes.
 */
export function galleryLede(total: number): string {
  return `${total} 条可直接复制的图片提示词，全部来自 X 创作者的公开分享，注明作者与出处。`;
}

/** The prototype's own `<meta name="description">`, count made dynamic. */
export function galleryDescription(total: number): string {
  return `${total} 条可复制的图片提示词，注明作者与出处。`;
}

export function termLabel(term: { label: string; labelZh: string | null }): string {
  return term.labelZh ?? term.label;
}

/* ------------------------------------------------------------- rail plan */

/** One model's rail: the term, its "see all" destination, the cards it shows. */
export interface GalleryModelRail {
  model: TaxonomyWithCount;
  /** The model's own L3 page. Never `null` — a model without one is not railed. */
  href: string;
  /** The cards this rail renders. Never empty: an emptied rail is dropped. */
  prompts: PromptSummary[];
}

export interface GalleryRailPlan {
  featured: PromptSummary[];
  modelRails: GalleryModelRail[];
  portrait: PromptSummary[];
}

export interface GalleryRailPlanInput {
  featured: readonly PromptSummary[];
  /** The image subset — every rail draws from this and nothing else. */
  imagePrompts: readonly PromptSummary[];
  railedModels: readonly TaxonomyWithCount[];
  portraitSubject: TaxonomyWithCount | null;
  /** Cards per model / subject rail. 精选 is not capped. */
  railLimit: number;
}

/**
 * Which prompt each rail on the gallery renders — **a prompt renders once per
 * page**.
 *
 * The page used to make 18 card renders of 11 prompts: one prompt appeared in
 * 精选, in two model rails and in the Person / portrait rail, four times, byte
 * for byte the same card. The second render's only new claim is "this prompt
 * also carries tag X", which the first render's own chip row already makes, so
 * seven of the eighteen renders were pure repetition on a page whose hero says
 * it holds 23 prompts.
 *
 * The rule here is document order: 精选 first, then each railed model, then the
 * subject rail; every rail takes the first `railLimit` prompts of its term that
 * no rail above it has already shown. Rails therefore BACKFILL rather than
 * shrink — the Person / portrait rail, all three of whose cards were repeats,
 * refills from the twelve portrait prompts nothing had shown yet and keeps its
 * three cards.
 *
 * Nothing here computes a displayed number. Every count on the page (a tile's
 * `N 条`, a rail's `查看全部 N 条`, the subject band's `15 条`) is counted from
 * the full term, not from what survived the de-duplication, so the labels keep
 * saying how many prompts exist rather than how many are drawn.
 *
 * A model rail left with nothing to show is returned not at all, so the caller
 * drops its heading and its "see all" button with it instead of rendering an
 * empty state under a name.
 */
export function planGalleryRails({
  featured,
  imagePrompts,
  railedModels,
  portraitSubject,
  railLimit,
}: GalleryRailPlanInput): GalleryRailPlan {
  const shown = new Set<string>();
  const take = (prompts: readonly PromptSummary[], limit: number | null): PromptSummary[] => {
    const picked: PromptSummary[] = [];
    for (const prompt of prompts) {
      if (limit !== null && picked.length >= limit) break;
      if (shown.has(prompt.id)) continue;
      shown.add(prompt.id);
      picked.push(prompt);
    }
    return picked;
  };

  const featuredCards = take(featured, null);

  const modelRails: GalleryModelRail[] = [];
  for (const model of railedModels) {
    // Guarded again rather than trusted: `topRailedModels` already drops a
    // model with no page, and a rail whose "see all" link has nowhere to go
    // must never be rendered.
    if (model.href === null) continue;
    const prompts = take(promptsForTerm(imagePrompts, "model", model.slug), railLimit);
    if (prompts.length === 0) continue;
    modelRails.push({ model, href: model.href, prompts });
  }

  const portrait =
    portraitSubject === null
      ? []
      : take(promptsForTerm(imagePrompts, "subject", portraitSubject.slug), railLimit);

  return { featured: featuredCards, modelRails, portrait };
}
