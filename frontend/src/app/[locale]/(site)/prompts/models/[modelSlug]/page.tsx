import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { getContentRepository, type Locale, type ModelDetail } from "@/lib/content";
import type { PromptSummary } from "@/lib/content/types";
import { PUBLISHED_LOCALES, isPublishedLocale } from "@/lib/i18n/config";
import { localeHome, modelPage } from "@/lib/i18n/routes";
import { buildBreadcrumbTrail } from "@/lib/seo/breadcrumbs";
import { JsonLd, breadcrumbList, collectionPage } from "@/lib/seo/json-ld";
import { SITE_NAME, absoluteUrl, buildMetadata } from "@/lib/seo/site";
import { ModelBrowse, TRENDING_LIMIT } from "@/features/model/ModelBrowse";

/** Static export: only the slugs generated below exist. Anything else is a 404. */
export const dynamicParams = false;

/**
 * One page per model that actually has prompts. `listTaxonomies("model")`
 * already drops terms with a zero count, and `getModel` returns `null` for a
 * model with no prompts, so the two together are the exact set of slugs
 * `ModelDetail` exists for — no curated list to drift.
 */
export async function generateStaticParams() {
  const repository = getContentRepository();
  const params: { locale: Locale; modelSlug: string }[] = [];

  for (const locale of PUBLISHED_LOCALES) {
    const models = await repository.listTaxonomies(locale, "model");
    for (const model of models) {
      const detail = await repository.getModel(locale, model.slug);
      if (detail === null) continue;
      params.push({ locale, modelSlug: model.slug });
    }
  }

  return params;
}

type PageParams = Promise<{ locale: string; modelSlug: string }>;

async function load(params: PageParams): Promise<{ locale: Locale; model: ModelDetail }> {
  const { locale, modelSlug } = await params;
  if (!isPublishedLocale(locale)) notFound();
  const model = await getContentRepository().getModel(locale, modelSlug);
  if (model === null) notFound();
  return { locale, model };
}

export async function generateMetadata({ params }: { params: PageParams }): Promise<Metadata> {
  const { locale, model } = await load(params);
  return buildMetadata({
    locale,
    title: `${model.label} 提示词`,
    description: model.summary,
    paths: { [locale]: modelPage(locale, model.slug) },
  });
}

export default async function ModelPage({ params }: { params: PageParams }) {
  const { locale, model } = await load(params);

  const repository = getContentRepository();
  const basePath = modelPage(locale, model.slug);
  const [list, promptsWithVariables, trending] = await Promise.all([
    repository.listModelPrompts(locale, model.slug),
    repository.listPromptsWithVariables(locale, model.slug),
    // The shared ranking + top-up rule, narrowed to this model. The prototype's
    // 近期热门 band shows three cards and carries no window switcher, so the
    // whole history is ranked rather than a 7d/30d slice.
    repository.listTrending(locale, "all", TRENDING_LIMIT, model.slug),
  ]);

  const crumbs = buildBreadcrumbTrail({ page: "model", locale, model });

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-8 md:py-14">
      <JsonLd data={breadcrumbList(crumbs)} />
      <JsonLd data={collectionPageJsonLd(locale, model, basePath, list.items)} />

      <Breadcrumb items={crumbs} />

      <ModelBrowse
        locale={locale}
        model={model}
        basePath={basePath}
        prompts={list.items}
        facetGroups={list.facets}
        trending={trending.items}
        trendingNote={trending.note}
        promptsWithVariables={promptsWithVariables}
      />
    </div>
  );
}

/**
 * The ItemList mirrors what the exported HTML actually shows: every prompt of
 * this model, each of which has a rendered card and link in 全部提示词.
 */
function collectionPageJsonLd(
  locale: Locale,
  model: ModelDetail,
  basePath: string,
  prompts: readonly PromptSummary[],
) {
  return {
    ...collectionPage({
      name: `${model.label} 提示词`,
      description: model.summary,
      url: absoluteUrl(basePath),
      itemUrls: prompts.map((prompt) => ({
        url: absoluteUrl(prompt.href),
        name: prompt.title,
      })),
    }),
    inLanguage: locale,
    isPartOf: { "@type": "WebSite" as const, name: SITE_NAME, url: absoluteUrl(localeHome(locale)) },
  };
}
