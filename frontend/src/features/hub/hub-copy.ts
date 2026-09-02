import type { PromptSummary } from "@/lib/content/types";

import { queryHref } from "@/features/search/query-links";

/**
 * Hub copy and links whose wording depends on the current data.
 *
 * This module used to also hold the 镜头与运动 band's measured sentence
 * (`N 成提示词带镜头语言——…`) and the two functions behind it. That band was a
 * duplicate of the 镜头·技法 chip row and has been deleted; the sentence was
 * rendered by nothing else, and no other surface displays that share, so it
 * was removed rather than left as an unused export.
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
