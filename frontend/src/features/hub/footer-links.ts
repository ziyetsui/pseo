import type { FooterColumn, FooterLinkItem } from "@/components/layout/SiteFooter";
import type { Locale, QueryFacetKey, TaxonomyWithCount } from "@/lib/content/types";
import { promptsHome } from "@/lib/i18n/routes";

import { queryHref, setFacet } from "@/features/search/query-links";

/**
 * Builds the prototype's five L1 footer columns from real taxonomy data.
 *
 * The footer component itself stays free of repository calls: the page fetches
 * `listTaxonomies` for the four axes and hands the result here, and this module
 * turns terms into hrefs — model terms into their own page when one exists,
 * everything else into an L1 URL pre-filtered on that single term, both through
 * the same `queryHref` + `setFacet` pair every other filter link uses.
 *
 * Which terms appear: the prototype's own picks first, in its order, and only
 * when the current data actually has them; the column is then topped up from
 * the remaining terms (already count-sorted by the repository) so it keeps the
 * prototype's item count without inventing entries. A slug the data does not
 * have is simply absent — never rendered from the prototype's declared list.
 */

/** Prototype `按模型` column: `Seedance 提示词` … */
const MODEL_SLUGS = ["seedance", "nano-banana", "higgsfield-soul", "gpt-image", "kling"] as const;
/** Prototype `按任务` column: `时尚提示词` … */
const USE_CASE_SLUGS = ["fashion", "beauty", "advertising", "food-beverage", "automotive"] as const;
/** Prototype `镜头与技法` column: `镜头运动提示词` … */
const TECHNIQUE_SLUGS = [
  "camera-movement-shot-language",
  "transition-morph-match-cut",
  "image-to-video",
  "multi-shot-storyboard",
] as const;
/** Prototype `按风格` column: `电影感提示词` … */
const STYLE_SLUGS = ["cinematic", "photorealistic", "luxury", "retro-vintage"] as const;

/**
 * The prototype's `资源` column. None of the three has a page in this phase, so
 * all three are non-link text with the same note the primary nav uses.
 */
const RESOURCE_ITEMS: readonly FooterLinkItem[] = [
  { label: "提示词详情页", href: null, note: "（即将推出）" },
  { label: "全部合集", href: null, note: "（即将推出）" },
  { label: "全部创作者", href: null, note: "（即将推出）" },
];

export interface FooterTaxonomyInput {
  models: readonly TaxonomyWithCount[];
  useCases: readonly TaxonomyWithCount[];
  techniques: readonly TaxonomyWithCount[];
  styles: readonly TaxonomyWithCount[];
}

export function buildFooterColumns(
  locale: Locale,
  terms: FooterTaxonomyInput,
): FooterColumn[] {
  const base = promptsHome(locale);

  return [
    {
      title: "按模型",
      items: pick(terms.models, MODEL_SLUGS).map((term) => ({
        // Prototype label: the model's English name plus a space, e.g.
        // `Seedance 提示词`.
        label: `${term.label} 提示词`,
        // A model with a real L3 page goes there; otherwise the filtered hub.
        href: term.href ?? queryHref(base, setFacet({}, "model", [term.slug])),
      })),
    },
    { title: "按任务", items: filterColumn(base, terms.useCases, USE_CASE_SLUGS, "useCase") },
    { title: "镜头与技法", items: filterColumn(base, terms.techniques, TECHNIQUE_SLUGS, "technique") },
    { title: "按风格", items: filterColumn(base, terms.styles, STYLE_SLUGS, "style") },
    { title: "资源", items: RESOURCE_ITEMS },
  ];
}

/**
 * The Chinese-labelled axes: `时尚提示词`, `镜头运动提示词`, `电影感提示词` —
 * `labelZh` with no separating space, exactly as the prototype writes them.
 *
 * A term with no translation falls back to the English label *plus a space*
 * (`Lip sync / dialogue 提示词`), matching how the prototype sets its English
 * `按模型` column (`Seedance 提示词`). Without the space the entry reads as one
 * run-on word, which is the only thing the prototype never writes.
 */
function filterColumn(
  base: string,
  terms: readonly TaxonomyWithCount[],
  preferred: readonly string[],
  axis: QueryFacetKey,
): FooterLinkItem[] {
  return pick(terms, preferred).map((term) => ({
    label: term.labelZh === null ? `${term.label} 提示词` : `${term.labelZh}提示词`,
    href: queryHref(base, setFacet({}, axis, [term.slug])),
  }));
}

/** Prototype slugs first (in its order), then the rest, capped at its count. */
function pick(
  terms: readonly TaxonomyWithCount[],
  preferred: readonly string[],
): TaxonomyWithCount[] {
  const bySlug = new Map(terms.map((term) => [term.slug, term]));
  const chosen: TaxonomyWithCount[] = [];
  const taken = new Set<string>();

  for (const slug of preferred) {
    const term = bySlug.get(slug);
    if (term === undefined) continue;
    chosen.push(term);
    taken.add(slug);
  }
  for (const term of terms) {
    if (chosen.length >= preferred.length) break;
    if (taken.has(term.slug)) continue;
    chosen.push(term);
    taken.add(term.slug);
  }
  return chosen;
}
