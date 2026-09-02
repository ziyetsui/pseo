import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { getContentRepository } from "@/lib/content";
import type { TrendingWindow } from "@/lib/content/types";
import { isPublishedLocale } from "@/lib/i18n/config";
import { localeHome, promptsHome } from "@/lib/i18n/routes";
import { JsonLd, breadcrumbList, collectionPage, type BreadcrumbItem } from "@/lib/seo/json-ld";
import { SITE_NAME, absoluteUrl, buildMetadata } from "@/lib/seo/site";
import { PromptHubBrowse } from "@/features/hub/PromptHubBrowse";
import { PromptExplorer } from "@/features/prompt/PromptExplorer";
import type { TrendingWindowPanel } from "@/features/prompt/TrendingTabs";

const TITLE = "提示词库";
const DESCRIPTION =
  "来自 X 创作者的真实提示词，每条标注作者与原帖出处。按任务、镜头技法、模型或风格浏览，找到后一键复制。";

/** Trending windows shown as tabs, in the order the tablist renders them. */
const TRENDING_WINDOWS: readonly { window: TrendingWindow; label: string }[] = [
  { window: "7d", label: "近 7 天" },
  { window: "30d", label: "近 30 天" },
  { window: "all", label: "全部时段" },
];

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

  const repository = getContentRepository();
  const basePath = promptsHome(locale);

  const [snapshot, list, featuredList, trending, useCases, techniques, models, styles, collections, creators] =
    await Promise.all([
      repository.getSnapshot(),
      repository.listPrompts(locale),
      repository.listFeatured(locale, "l1"),
      Promise.all(
        TRENDING_WINDOWS.map(async ({ window, label }): Promise<TrendingWindowPanel> => {
          const result = await repository.listTrending(locale, window, TRENDING_LIMIT);
          return { window, label, items: result.items, note: result.note, windowStart: result.windowStart };
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
  // The featured prompt already has its own copy target above; excluding its
  // id from every trending window keeps it from being rendered a second time
  // in the list below. Window sizes are left honest — a dropped slot is not
  // backfilled with another prompt.
  const trendingWithoutFeatured =
    featured === null
      ? trending
      : trending.map((panel) => ({
          ...panel,
          items: panel.items.filter((item) => item.id !== featured.id),
        }));
  const trendingAll = trendingWithoutFeatured.find((panel) => panel.window === "all");

  const crumbs: BreadcrumbItem[] = [
    { name: "首页", path: localeHome(locale) },
    { name: TITLE, path: basePath },
  ];

  // The ItemList mirrors exactly what the exported HTML shows above the fold:
  // the featured prompt plus the default (all-time) trending panel (already
  // excluding the featured id, so nothing is double-counted here either).
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
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-8 md:py-14">
      <JsonLd data={breadcrumbList(crumbs)} />
      <JsonLd data={collectionPageJsonLd} />

      <Breadcrumb items={crumbs} />

      <header className="mt-6 max-w-3xl">
        <h1 className="text-4xl font-black tracking-tighter uppercase md:text-6xl">
          {list.total} 条提示词，复制即用
        </h1>
        <p className="mt-6 text-lg font-medium">{DESCRIPTION}</p>
        <p className="mt-3 text-sm font-medium">
          互动数据观测于 {snapshot.observedAt}，数量与热度均按当前收录内容计算。
        </p>
      </header>

      <div className="mt-10">
        <PromptExplorer
          locale={locale}
          basePath={basePath}
          prompts={list.items}
          facetGroups={list.facets}
          facetAxes={["model", "useCase", "technique", "style"]}
          searchPlaceholder="搜索提示词、模型、风格、镜头语言、创作者…"
          summaryStyle="hub"
          browse={
            <PromptHubBrowse
              locale={locale}
              basePath={basePath}
              observedAt={snapshot.observedAt}
              featured={featured}
              trendingWindows={trendingWithoutFeatured}
              useCases={useCases}
              techniques={techniques}
              models={models}
              styles={styles}
              collections={collections}
              creators={creators}
            />
          }
        />
      </div>
    </div>
  );
}
