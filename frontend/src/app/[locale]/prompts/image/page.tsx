import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { getContentRepository } from "@/lib/content";
import { isPublishedLocale } from "@/lib/i18n/config";
import { localeHome, promptsHome, promptsImage } from "@/lib/i18n/routes";
import { JsonLd, breadcrumbList, type BreadcrumbItem } from "@/lib/seo/json-ld";
import { SITE_NAME, absoluteUrl, buildMetadata } from "@/lib/seo/site";
import { GalleryBrowse } from "@/features/gallery/GalleryBrowse";
import { GalleryStatline } from "@/features/gallery/GalleryStatline";
import {
  countTermsWithin,
  findTermByLabel,
  galleryStats,
  promptsForTerm,
  selectImagePrompts,
  topRailedModels,
} from "@/features/gallery/image-prompts";
import { PromptExplorer } from "@/features/prompt/PromptExplorer";

const TITLE = "图片提示词";
const DESCRIPTION =
  "按模型、任务、风格和主体浏览图片提示词，每条都标注原作者与原帖出处，找到后一键复制。";

/**
 * The breadcrumb's own last-step label. Deliberately shorter than `TITLE`
 * (used for the H1 and metadata) so the trail reads 首页 › 提示词库 › 图片,
 * matching the other L2/L3/L4 breadcrumb trails' one-or-two-character last
 * step rather than repeating the full page title.
 */
const BREADCRUMB_LABEL = "图片";

/**
 * The prototype's portrait rail is keyed on the subject term whose English
 * label is exactly this. The slug is looked up from the taxonomy rather than
 * written down, so a re-slugified fixture moves the page with it.
 */
const PORTRAIT_SUBJECT_LABEL = "Person / portrait";

/** Cards per rail, shared with the JSON-LD ItemList so the two cannot drift. */
const RAIL_LIMIT = 6;

/**
 * How many models get their own "browse by model" rail (tiles + h3 + rail),
 * capped by image-prompt count (ties broken by slug — see `topRailedModels`).
 * `ModelTiles` still shows every model in the image subset regardless of this
 * cap; only the rail band and the JSON-LD ItemList respect it.
 */
const MODEL_RAIL_LIMIT = 3;

/** How many tasks the related-links band lists. */
const RELATED_USE_CASE_LIMIT = 3;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isPublishedLocale(locale)) notFound();
  return buildMetadata({
    locale,
    title: TITLE,
    description: DESCRIPTION,
    paths: { [locale]: promptsImage(locale) },
  });
}

export default async function ImageGalleryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isPublishedLocale(locale)) notFound();

  const repository = getContentRepository();
  const basePath = promptsImage(locale);

  const [snapshot, list, featuredAll, modelTerms, useCaseTerms, subjectTerms, contentTypes] =
    await Promise.all([
      repository.getSnapshot(),
      repository.listPrompts(locale),
      repository.listFeatured(locale, "l2"),
      repository.listTaxonomies(locale, "model"),
      repository.listTaxonomies(locale, "useCase"),
      repository.listTaxonomies(locale, "subject"),
      repository.listTaxonomies(locale, "contentType"),
    ]);

  // `PromptQuery` has no contentType axis, so the narrowing happens here, once.
  const imagePrompts = selectImagePrompts(list.items);
  const featured = selectImagePrompts(featuredAll);

  const stats = galleryStats(imagePrompts);
  // ALL models present in the subset (with count>0), sorted count desc / slug
  // asc. `ModelTiles` and the related-links band use this in full.
  const models = countTermsWithin(modelTerms, imagePrompts, "model");
  // Only the top MODEL_RAIL_LIMIT of those get their own tiles-row rail; see
  // `topRailedModels` for why the cap exists and how ties are broken.
  const railedModels = topRailedModels(models, MODEL_RAIL_LIMIT);
  const useCases = countTermsWithin(useCaseTerms, imagePrompts, "useCase");
  const subjects = countTermsWithin(subjectTerms, imagePrompts, "subject");
  const portraitSubject = findTermByLabel(subjects, PORTRAIT_SUBJECT_LABEL);

  const crumbs: BreadcrumbItem[] = [
    { name: "首页", path: localeHome(locale) },
    { name: "提示词库", path: promptsHome(locale) },
    { name: BREADCRUMB_LABEL, path: basePath },
  ];

  // The ItemList mirrors the rails the exported HTML renders: the featured rail
  // plus each railed model's rail, capped by the same RAIL_LIMIT the browse
  // view uses. It must never enumerate more than what is actually railed.
  const railed = [
    ...featured,
    ...railedModels.flatMap((model) =>
      model.href === null ? [] : promptsForTerm(imagePrompts, "model", model.slug).slice(0, RAIL_LIMIT),
    ),
  ];
  const seen = new Set<string>();
  const itemListElement = railed.flatMap((prompt) => {
    if (seen.has(prompt.id)) return [];
    seen.add(prompt.id);
    return [
      {
        "@type": "ListItem",
        position: seen.size,
        url: absoluteUrl(prompt.href),
        name: prompt.title,
      },
    ];
  });

  const collectionPage = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: TITLE,
    description: DESCRIPTION,
    url: absoluteUrl(basePath),
    inLanguage: locale,
    isPartOf: { "@type": "WebSite", name: SITE_NAME, url: absoluteUrl(localeHome(locale)) },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: itemListElement.length,
      itemListElement,
    },
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-8 md:py-14">
      <JsonLd data={breadcrumbList(crumbs)} />
      <JsonLd data={collectionPage} />

      <Breadcrumb items={crumbs} />

      <header className="mt-6 max-w-3xl">
        <h1 className="text-4xl font-black tracking-tighter uppercase md:text-6xl">{TITLE}</h1>
        <p className="mt-6 text-lg font-medium">{DESCRIPTION}</p>
        <GalleryStatline stats={stats} observedAt={snapshot.observedAt} className="mt-6" />
      </header>

      <div className="mt-10">
        <PromptExplorer
          locale={locale}
          basePath={basePath}
          prompts={imagePrompts}
          facetGroups={list.facets}
          facetAxes={["useCase", "style", "subject", "model"]}
          browse={
            <GalleryBrowse
              locale={locale}
              basePath={basePath}
              observedAt={snapshot.observedAt}
              featured={featured}
              imagePrompts={imagePrompts}
              allPrompts={list.items}
              models={models}
              railedModels={railedModels}
              contentTypes={contentTypes}
              portraitSubject={portraitSubject}
              topUseCases={useCases.slice(0, RELATED_USE_CASE_LIMIT)}
              railLimit={RAIL_LIMIT}
            />
          }
        />
      </div>
    </div>
  );
}
