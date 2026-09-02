import type { Locale, PromptSummary } from "@/lib/content";
import { promptDetail, promptsHome, promptsImage } from "@/lib/i18n/routes";
import type { BreadcrumbItem } from "@/lib/seo/json-ld";

/**
 * One trail feeds both the visible `<Breadcrumb>` and the `BreadcrumbList`
 * JSON-LD, so the two can never disagree.
 *
 * The middle step is the model page of the first model that actually has one in
 * this phase; a prompt whose models have no page falls back to the image
 * gallery, which every prompt in this fixture belongs to. Terms without a real
 * page are never linked (global constraint 5).
 */
export function promptBreadcrumbs(
  locale: Locale,
  prompt: PromptSummary,
): readonly BreadcrumbItem[] {
  const model = prompt.models.find((term) => term.href !== null);
  const middle: BreadcrumbItem | null =
    model !== undefined && model.href !== null
      ? { name: model.labelZh ?? model.label, path: model.href }
      : prompt.contentType.slug === "image"
        ? { name: "图片提示词", path: promptsImage(locale) }
        : null;

  return [
    { name: "提示词库", path: promptsHome(locale) },
    ...(middle === null ? [] : [middle]),
    { name: prompt.title, path: promptDetail(locale, prompt.slug) },
  ];
}
