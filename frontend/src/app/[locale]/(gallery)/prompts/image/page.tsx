import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { COMING_SOON_NOTE } from "@/components/layout/nav";
import { getServerContentRepository } from "@/lib/content/server";
import type { Locale, QueryFacetKey } from "@/lib/content/types";
import { isPublishedLocale } from "@/lib/i18n/config";
import { localeHome, promptsImage } from "@/lib/i18n/routes";
import { buildBreadcrumbTrail } from "@/lib/seo/breadcrumbs";
import { JsonLd, breadcrumbList } from "@/lib/seo/json-ld";
import { SITE_NAME, absoluteUrl, buildMetadata } from "@/lib/seo/site";
import { GalleryBrowse } from "@/features/gallery/GalleryBrowse";
import { GalleryStatline } from "@/features/gallery/GalleryStatline";
import {
  countTermsWithin,
  findTermByLabel,
  galleryDescription,
  galleryLede,
  galleryStats,
  planGalleryRails,
  selectImagePrompts,
  topRailedModels,
} from "@/features/gallery/image-prompts";
import {
  ExplorerFacets,
  ExplorerNotices,
  ExplorerResults,
  ExplorerSearch,
  ExplorerSummary,
  PromptExplorer,
} from "@/features/prompt/PromptExplorer";

const TITLE = "图片提示词";

/**
 * The prototype's subject rail is keyed on the subject term whose English
 * label is exactly this. The slug is looked up from the taxonomy rather than
 * written down, so a re-slugified fixture moves the page with it.
 */
const PORTRAIT_SUBJECT_LABEL = "Person / portrait";

/** Cards per rail, shared with the JSON-LD ItemList so the two cannot drift. */
const RAIL_LIMIT = 3;

/**
 * How many models get their own rail (h3 + `PromptRail`), capped by
 * image-prompt count (ties broken by slug — see `topRailedModels`).
 * `ModelTiles` still shows every model in the image subset regardless of this
 * cap; only the rail band and the JSON-LD ItemList respect it.
 */
const MODEL_RAIL_LIMIT = 3;

/** How many entries the 相关 band's 模型 and 用例 columns list. */
const RELATED_COLUMN_LIMIT = 3;

/** The three facet axes the prototype's 按标签浏览 block offers on this page. */
const GALLERY_FACET_AXES = ["useCase", "style", "subject"] as const;

/**
 * The prototype calls the use-case axis 任务 on L1 and 用例 on this page. The
 * repository ships one label per axis (L1's), so the gallery renames its own
 * copy of the group through the explorer's `axisLabels` prop rather than
 * changing the shared vocabulary — slugs, counts and URL contract untouched.
 */
const GALLERY_FACET_LABELS: Partial<Record<QueryFacetKey, string>> = { useCase: "用例" };

/** How many image prompts this build publishes — the metadata's only number. */
async function imageTotal(locale: Locale): Promise<number> {
  const { items } = await (await getServerContentRepository()).listPrompts(locale);
  return selectImagePrompts(items).length;
}

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
    // The prototype's own meta description, with its declared 324 replaced by
    // the number of prompts this build actually publishes.
    description: galleryDescription(await imageTotal(locale)),
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

  const repository = await getServerContentRepository();
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
  // asc. `ModelTiles` uses this in full; the rail band and the 相关 band cap it.
  const models = countTermsWithin(modelTerms, imagePrompts, "model");
  const railedModels = topRailedModels(models, MODEL_RAIL_LIMIT);
  const useCases = countTermsWithin(useCaseTerms, imagePrompts, "useCase");
  const subjects = countTermsWithin(subjectTerms, imagePrompts, "subject");
  const portraitSubject = findTermByLabel(subjects, PORTRAIT_SUBJECT_LABEL);

  const crumbs = buildBreadcrumbTrail({ page: "gallery", locale });
  const description = galleryDescription(stats.total);

  // The ItemList mirrors the rails the exported HTML renders: the featured rail
  // plus each railed model's rail. It reads the SAME plan `GalleryBrowse`
  // renders from, so it can neither enumerate a card the page does not draw nor
  // miss one it does — and since a prompt is now drawn once per page, the plan
  // is already free of duplicates and no second de-duplication is needed here.
  const rails = planGalleryRails({
    featured,
    imagePrompts,
    railedModels,
    portraitSubject,
    railLimit: RAIL_LIMIT,
  });
  const railed = [...rails.featured, ...rails.modelRails.flatMap((rail) => rail.prompts)];
  const itemListElement = railed.map((prompt, index) => ({
    "@type": "ListItem",
    position: index + 1,
    url: absoluteUrl(prompt.href),
    name: prompt.title,
  }));

  const collectionPage = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: TITLE,
    description,
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

      {/*
        The prototype's hero holds the search box and the `#resultcount` line,
        and the facet block is a separate `按标签浏览` section below it — so the
        explorer wraps the whole page body and each piece is placed where that
        page puts it, rather than in one welded stack.
      */}
      <PromptExplorer
        locale={locale}
        basePath={basePath}
        prompts={imagePrompts}
        facetGroups={list.facets}
        facetAxes={GALLERY_FACET_AXES}
        axisLabels={GALLERY_FACET_LABELS}
        className="flex flex-col gap-10"
      >
        <header className="mt-6">
          <div className="max-w-3xl">
            <h1 className="text-4xl font-black tracking-tighter uppercase md:text-6xl">{TITLE}</h1>
            <p className="mt-6 text-lg font-medium">{galleryLede(stats.total)}</p>
            <GalleryStatline stats={stats} observedAt={snapshot.observedAt} className="mt-6" />
          </div>

          <ExplorerSearch placeholder="搜索图片提示词…" className="mt-6 flex flex-wrap items-end gap-3" />

          {/*
            The prototype puts a `视频提示词（479）→` button next to the search
            box. `/prompts/video` does not exist in this phase, so the entry keeps
            its place as plain text with the same note the nav uses, and carries
            no count it could not honestly source (global constraint 5).
          */}
          <p data-video-teaser className="mt-4 text-sm font-bold tracking-wider uppercase">
            视频提示词{COMING_SOON_NOTE}
          </p>

          {/* `#resultcount`: in the hero, after the search box. */}
          <ExplorerSummary style="count" className="mt-4 text-sm font-bold" />
        </header>

        <ExplorerFacets
          heading="按标签浏览"
          headingId="gallery-facets"
          axisHeadingLevel="h3"
          idPrefix="explorer-facet"
          className="grid gap-6 md:grid-cols-3"
        />

        <ExplorerNotices />

        <ExplorerResults
          cardVariant="compact"
          observedAt={snapshot.observedAt}
          browse={
            <GalleryBrowse
              locale={locale}
              basePath={basePath}
              featured={featured}
              imagePrompts={imagePrompts}
              models={models}
              railedModels={railedModels}
              contentTypes={contentTypes}
              portraitSubject={portraitSubject}
              relatedModels={models.slice(0, RELATED_COLUMN_LIMIT)}
              relatedUseCases={useCases.slice(0, RELATED_COLUMN_LIMIT)}
              railLimit={RAIL_LIMIT}
            />
          }
        />
      </PromptExplorer>
    </div>
  );
}
