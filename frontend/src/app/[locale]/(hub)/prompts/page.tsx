import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getServerContentRepository } from "@/lib/content/server";
import type { TrendingWindow } from "@/lib/content/types";
import { isPublishedLocale } from "@/lib/i18n/config";
import { localeHome, promptsHome } from "@/lib/i18n/routes";
import { JsonLd, collectionPage } from "@/lib/seo/json-ld";
import { SITE_NAME, absoluteUrl, buildMetadata } from "@/lib/seo/site";
import { AnchorNav } from "@/features/hub/AnchorNav";
import { PromptHubBrowse } from "@/features/hub/PromptHubBrowse";
import {
  allPromptsCollection,
  cameraShareTenths,
  countWithCameraLanguage,
} from "@/features/hub/hub-copy";
import {
  ExplorerFacets,
  ExplorerNotices,
  ExplorerResults,
  ExplorerSearch,
  ExplorerSummary,
  PromptExplorer,
  type ExplorerCollection,
} from "@/features/prompt/PromptExplorer";
import { type TrendingWindowPanel } from "@/features/prompt/TrendingTabs";
import { TRENDING_WINDOW_LABELS } from "@/features/prompt/trending-labels";

const TITLE = "提示词库";
/** Prototype L1 dek, verbatim. */
const DESCRIPTION =
  "来自 X 创作者的真实提示词，每条注明作者与出处。按任务、镜头语言、模型或风格浏览，找到后一键复制。";

/** Trending windows shown as tabs, in the order the prototype's tablist renders them. */
const TRENDING_WINDOWS: readonly TrendingWindow[] = ["7d", "30d", "all"];

const TRENDING_LIMIT = 6;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isPublishedLocale(locale)) notFound();
  const metadata = buildMetadata({
    locale,
    title: TITLE,
    description: DESCRIPTION,
    paths: { [locale]: promptsHome(locale) },
  });
  // This route's title is also the site name. Mark it absolute so the root
  // template does not emit the redundant "提示词库 · 提示词库".
  return { ...metadata, title: { absolute: TITLE } };
}

export default async function PromptsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isPublishedLocale(locale)) notFound();

  const repository = await getServerContentRepository();
  const basePath = promptsHome(locale);

  const [snapshot, list, featuredList, trending, useCases, techniques, models, styles, collections, creators] =
    await Promise.all([
      repository.getSnapshot(),
      repository.listPrompts(locale),
      repository.listFeatured(locale, "l1"),
      Promise.all(
        TRENDING_WINDOWS.map(async (window): Promise<TrendingWindowPanel> => {
          const result = await repository.listTrending(locale, window, TRENDING_LIMIT);
          return {
            window,
            label: TRENDING_WINDOW_LABELS[window],
            items: result.items,
            note: result.note,
            windowStart: result.windowStart,
          };
        }),
      ),
      repository.listTaxonomies(locale, "useCase"),
      repository.listTaxonomies(locale, "technique"),
      repository.listTaxonomies(locale, "model"),
      repository.listTaxonomies(locale, "style"),
      repository.listCollections(locale),
      repository.listCreators(locale),
    ]);

  const featured = featuredList[0] ?? null;
  const trendingAll = trending.find((panel) => panel.window === "all");

  // Collections the explorer can filter by: the curated ones, plus the
  // synthetic "全部提示词" set the closing CTA opens.
  const explorerCollections: readonly ExplorerCollection[] = [
    ...collections.map((collection) => ({
      slug: collection.slug,
      title: collection.title,
      promptIds: collection.promptIds,
    })),
    allPromptsCollection(list.items),
  ];

  // The ItemList mirrors what the exported HTML shows above the fold: the
  // featured prompt plus the default (all-time) trending panel. The prototype
  // does not exclude the featured prompt from that panel, so it can appear in
  // both — listed once here.
  const listed = [...(featured === null ? [] : [featured]), ...(trendingAll?.items ?? [])];
  const seen = new Set<string>();
  const itemUrls = listed.flatMap((prompt) => {
    if (seen.has(prompt.id)) return [];
    seen.add(prompt.id);
    return [{ url: absoluteUrl(prompt.href), name: prompt.title }];
  });

  const collectionPageJsonLd = {
    ...collectionPage({
      name: TITLE,
      description: DESCRIPTION,
      url: absoluteUrl(basePath),
      itemUrls,
    }),
    inLanguage: locale,
    isPartOf: { "@type": "WebSite" as const, name: SITE_NAME, url: absoluteUrl(localeHome(locale)) },
  };

  return (
    <>
      {/* The prototype's L1 nav bar is a row of in-page anchors. The shared
          site header carries the cross-page nav, so the anchors live here, at
          the top of the page, pointing at the browse sections below. */}
      <AnchorNav />

      <div className="mx-auto max-w-7xl px-4 py-10 md:px-8 md:py-14">
        {/* No BreadcrumbList: the prototype's hub has no breadcrumb, and the
            trail would have a single item pointing at this page. */}
        <JsonLd data={collectionPageJsonLd} />

        <header className="mt-2 max-w-3xl">
          <h1 className="text-4xl font-black tracking-tighter uppercase md:text-6xl">
            {list.total} 条 Higgsfield 提示词
            <br />
            复制即用
          </h1>
          <p className="mt-6 text-lg font-medium">{DESCRIPTION}</p>
        </header>

        <div className="mt-10">
          <PromptExplorer
            locale={locale}
            basePath={basePath}
            prompts={list.items}
            facetGroups={list.facets}
            facetAxes={["model", "useCase", "technique", "style"]}
            collections={explorerCollections}
          >
            {/* The prototype's search row, then its `.facets` block: four
                unlabelled axis rows carrying the block's own
                `aria-label="筛选"`, and no heading of its own. */}
            <div className="flex flex-col gap-6">
              <ExplorerSearch placeholder="搜索提示词、模型、风格、镜头语言、创作者…" />
              <ExplorerFacets idPrefix="explorer-facet" />
              <ExplorerNotices />
            </div>

            <ExplorerSummary style="hub" />

            <ExplorerResults
              heading="筛选结果"
              observedAt={snapshot.observedAt}
              // The prototype's own empty-state line. The conditions that
              // produced it are listed under it by `ExplorerResults`.
              emptyMessage="没有找到匹配的提示词，换个关键词试试。"
              browse={
                <PromptHubBrowse
                  locale={locale}
                  basePath={basePath}
                  observedAt={snapshot.observedAt}
                  featured={featured}
                  trendingWindows={trending}
                  useCases={useCases}
                  techniques={techniques}
                  models={models}
                  styles={styles}
                  collections={collections}
                  creators={creators}
                  cameraShareTenths={cameraShareTenths(
                    countWithCameraLanguage(list.items),
                    list.total,
                  )}
                  libraryTotal={list.total}
                />
              }
            />
          </PromptExplorer>
        </div>
      </div>
    </>
  );
}
