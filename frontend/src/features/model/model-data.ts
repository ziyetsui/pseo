import type { Creator, PromptSummary } from "@/lib/content/types";

/**
 * Pure derivations for the L3 model page. Everything here is computed from the
 * prompts the repository returned for THIS model, so no number on the page can
 * be a library-wide figure or a prototype-declared one.
 *
 * `EDITORIAL_STATUS_LABEL` and `outputLabel` used to live here too. They
 * existed only for the 能力 / 输入 / 输出 / 限制 panel, which was a second
 * printing of the chip block and the breadcrumb and has been deleted, so they
 * went with it rather than staying as an unused vocabulary.
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
