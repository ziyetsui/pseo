import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { getContentRepository, type Locale, type ModelDetail } from "@/lib/content";
import type { PromptSummary } from "@/lib/content/types";
import { PUBLISHED_LOCALES, isPublishedLocale } from "@/lib/i18n/config";
import { modelPage, promptsHome, promptsImage } from "@/lib/i18n/routes";
import { JsonLd, breadcrumbList, type BreadcrumbItem } from "@/lib/seo/json-ld";
import { SITE_NAME, absoluteUrl, buildMetadata } from "@/lib/seo/site";
import { ModelBrowse } from "@/features/model/ModelBrowse";
import { ModelGenerateControls } from "@/features/model/ModelGenerateControls";
import { ModelIdentity } from "@/features/model/ModelIdentity";
import { ModelSpecPanels } from "@/features/model/ModelSpecPanels";
import { PromptExplorer } from "@/features/prompt/PromptExplorer";

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

function crumbsFor(locale: Locale, model: ModelDetail): BreadcrumbItem[] {
  return [
    { name: "提示词库", path: promptsHome(locale) },
    { name: "图片提示词", path: promptsImage(locale) },
    { name: model.label, path: modelPage(locale, model.slug) },
  ];
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
  const [snapshot, list, promptsWithVariables] = await Promise.all([
    repository.getSnapshot(),
    repository.listModelPrompts(locale, model.slug),
    repository.listPromptsWithVariables(locale, model.slug),
  ]);

  const crumbs = crumbsFor(locale, model);
  const collectionPage = collectionPageJsonLd(locale, model, basePath, list.items);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-8 md:py-14">
      <JsonLd data={breadcrumbList(crumbs)} />
      <JsonLd data={collectionPage} />

      <Breadcrumb items={crumbs} />

      <ModelIdentity model={model} observedAt={snapshot.observedAt} />

      <div className="mt-10">
        <ModelSpecPanels model={model} />
        <ModelGenerateControls />
      </div>

      <div className="mt-12">
        <PromptExplorer
          locale={locale}
          basePath={basePath}
          prompts={list.items}
          facetGroups={list.facets}
          facetAxes={["useCase", "style", "subject"]}
          filterHeading="在本模型内搜索与筛选"
          filterHeadingId="model-filters"
          searchInputId="model-search"
          facetIdPrefix="model-facet"
          resultsHeadingId="model-results"
          browse={
            <ModelBrowse
              locale={locale}
              model={model}
              prompts={list.items}
              promptsWithVariables={promptsWithVariables}
              observedAt={snapshot.observedAt}
            />
          }
        />
      </div>
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
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${model.label} 提示词`,
    description: model.summary,
    url: absoluteUrl(basePath),
    inLanguage: locale,
    isPartOf: { "@type": "WebSite", name: SITE_NAME, url: absoluteUrl(promptsHome(locale)) },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: prompts.length,
      itemListElement: prompts.map((prompt, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: absoluteUrl(prompt.href),
        name: prompt.title,
      })),
    },
  };
}
