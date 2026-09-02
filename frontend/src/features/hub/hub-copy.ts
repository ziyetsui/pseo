import type { PromptSummary } from "@/lib/content/types";

import { queryHref } from "@/features/search/query-links";

/**
 * Hub copy and links whose wording depends on the current data.
 *
 * The prototype states figures it measured on its own (982-prompt) library —
 * `7 成提示词带镜头语言`. Those numbers may never be rendered as facts about
 * this data set (global constraint 3), so the sentence keeps its shape and
 * recomputes the number from the prompts actually on the page.
 */

/**
 * The prototype's `浏览全部提示词` button opens the result region listing the
 * whole library, headed `全部提示词 · 共 N 条`. There is no facet query that
 * says "everything", so the hub hands `PromptExplorer` one extra collection
 * whose members are every prompt; `?collection=all` then produces exactly that
 * state, through the same code path a 精选合集 tile uses.
 */
/**
 * RESERVED collection slug. `all` is synthesised here, so a curated collection
 * must never be published under it — the two would collide on the same URL and
 * the synthetic one would win.
 */
export const ALL_PROMPTS_COLLECTION_SLUG = "all";
export const ALL_PROMPTS_COLLECTION_TITLE = "全部提示词";

/** URL of the "list everything" result state on the hub. */
export function allPromptsHref(basePath: string): string {
  return queryHref(basePath, { collection: ALL_PROMPTS_COLLECTION_SLUG });
}

/**
 * The explorer collection that backs `?collection=all`. Every id is a prompt
 * this page already handed the explorer, so the state it opens is honest: the
 * complete set, counted from the set itself.
 */
export function allPromptsCollection(prompts: readonly PromptSummary[]): {
  slug: string;
  title: string;
  promptIds: readonly string[];
} {
  return {
    slug: ALL_PROMPTS_COLLECTION_SLUG,
    title: ALL_PROMPTS_COLLECTION_TITLE,
    promptIds: prompts.map((prompt) => prompt.id),
  };
}

/** How many prompts carry at least one technique (camera-language) term. */
export function countWithCameraLanguage(prompts: readonly PromptSummary[]): number {
  return prompts.filter((prompt) => prompt.techniques.length > 0).length;
}

/**
 * The share, in 成 (tenths), rounded to the nearest tenth. `null` below one
 * tenth — the prototype's sentence leads with the figure, and "0 成" would be
 * both wrong-looking and useless, so the figure is dropped instead.
 */
export function cameraShareTenths(withCameraLanguage: number, total: number): number | null {
  if (total <= 0) return null;
  const tenths = Math.round((withCameraLanguage / total) * 10);
  return tenths < 1 ? null : tenths;
}

/** 镜头与运动 sec-p, prototype wording with a measured share. */
export function cameraSectionDescription(tenths: number | null): string {
  // Prototype wording exactly (`7 成提示词带镜头语言——`), with the figure
  // measured here. `cameraShareTenths` already rounds to the nearest tenth, so
  // no hedging word is added on top of it.
  const lead = tenths === null ? "提示词里的镜头语言" : `${tenths} 成提示词带镜头语言`;
  return `${lead}——推拉、环绕、跟拍、转场、分镜。这是这批提示词最有价值的部分。`;
}
