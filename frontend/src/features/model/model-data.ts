import type { Creator, ModelDetail, PromptSummary } from "@/lib/content/types";

/**
 * Pure derivations for the L3 model page. Everything here is computed from the
 * prompts the repository returned for THIS model, so no number on the page can
 * be a library-wide figure or a prototype-declared one.
 */

export interface ModelCreator extends Creator {
  /** How many of this model's prompts this person wrote. */
  count: number;
}

/** Creators of the given prompts, most prolific first. */
export function modelCreators(prompts: readonly PromptSummary[]): ModelCreator[] {
  const byId = new Map<string, ModelCreator>();
  for (const prompt of prompts) {
    const found = byId.get(prompt.creator.id);
    if (found === undefined) byId.set(prompt.creator.id, { ...prompt.creator, count: 1 });
    else found.count += 1;
  }
  return [...byId.values()].sort((a, b) => b.count - a.count || a.handle.localeCompare(b.handle));
}

/**
 * "近期热门" for one model. `listTrending` is library-wide and takes no model
 * filter, so the ranking is applied to the model's own subset here:
 * high-value first, then value score, then likes. Nulls always sort last —
 * a missing score must never outrank a measured one.
 */
export function modelTrending(prompts: readonly PromptSummary[], limit: number): PromptSummary[] {
  return [...prompts].sort(byTrendingRank).slice(0, limit);
}

function byTrendingRank(a: PromptSummary, b: PromptSummary): number {
  if (a.metrics.highValue !== b.metrics.highValue) return a.metrics.highValue ? -1 : 1;

  const av = a.metrics.valueScore;
  const bv = b.metrics.valueScore;
  if (av !== bv) {
    if (av === null) return 1;
    if (bv === null) return -1;
    return bv - av;
  }

  return (b.metrics.likes ?? 0) - (a.metrics.likes ?? 0);
}

/** Where the four spec columns come from, said in the page's language. */
export const EDITORIAL_STATUS_LABEL: Record<ModelDetail["editorialStatus"], string> = {
  "derived-from-fixture": "由收录 Prompt 派生",
};

/** Content-type slugs the `outputs` column carries, rendered in zh-CN. */
const OUTPUT_LABEL: Record<string, string> = {
  image: "图片",
  video: "视频",
};

export function outputLabel(slug: string): string {
  return OUTPUT_LABEL[slug] ?? slug;
}
