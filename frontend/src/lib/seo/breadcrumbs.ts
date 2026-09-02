import type { Locale, PromptSummary } from "@/lib/content/types";
import { modelPage, promptDetail, promptsHome, promptsImage } from "@/lib/i18n/routes";

import type { BreadcrumbItem } from "./json-ld";

/**
 * The one place a breadcrumb trail is built.
 *
 * Each page feeds BOTH its visible `<Breadcrumb>` and its `BreadcrumbList`
 * JSON-LD from the array this returns, so the two can never disagree, and every
 * trail matches the prototype's:
 *
 * - L1 hub — no trail at all (the prototype renders none).
 * - L2 gallery — `提示词库 / 图片`.
 * - L3 model — `提示词库 / 图片 / 模型 / {model}`, where `模型` is the
 *   prototype's `/prompts/models` index. That index does not ship in this
 *   phase, so the step keeps its place in the hierarchy with `path: null` and
 *   is rendered as plain text rather than as a link to a missing route
 *   (global constraint 5).
 * - L4 detail — `首页 / {first model that has a page, else 图片} / {title}`.
 */
export type BreadcrumbTrailInput =
  | { page: "hub"; locale: Locale }
  | { page: "gallery"; locale: Locale }
  | { page: "model"; locale: Locale; model: { slug: string; label: string } }
  | { page: "promptDetail"; locale: Locale; prompt: PromptSummary };

export function buildBreadcrumbTrail(input: BreadcrumbTrailInput): readonly BreadcrumbItem[] {
  const { locale } = input;

  switch (input.page) {
    case "hub":
      return [];

    case "gallery":
      return [
        { name: "提示词库", path: promptsHome(locale) },
        { name: "图片", path: promptsImage(locale) },
      ];

    case "model":
      return [
        { name: "提示词库", path: promptsHome(locale) },
        { name: "图片", path: promptsImage(locale) },
        { name: "模型", path: null },
        { name: input.model.label, path: modelPage(locale, input.model.slug) },
      ];

    case "promptDetail": {
      const prompt = input.prompt;
      const model = prompt.models.find((term) => term.href !== null);
      const middle: BreadcrumbItem =
        model !== undefined && model.href !== null
          ? { name: model.label, path: model.href }
          : { name: "图片", path: promptsImage(locale) };

      return [
        { name: "首页", path: promptsHome(locale) },
        middle,
        { name: prompt.title, path: promptDetail(locale, prompt.slug) },
      ];
    }
  }
}
