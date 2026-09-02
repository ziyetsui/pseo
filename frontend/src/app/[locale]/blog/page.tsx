import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Section } from "@/components/ui/Section";
import { StateBlock } from "@/components/ui/StateBlock";
import { ArticleCard } from "@/features/blog/ArticleCard";
import { ArticleList } from "@/features/blog/ArticleList";
import { CategoryLinks, type CategoryWithCount } from "@/features/blog/CategoryLinks";
import { getContentRepository } from "@/lib/content";
import { PUBLISHED_LOCALES, isPublishedLocale } from "@/lib/i18n/config";
import { blogHome, localeHome } from "@/lib/i18n/routes";
import { JsonLd, breadcrumbList, type BreadcrumbItem } from "@/lib/seo/json-ld";
import { absoluteUrl, buildMetadata } from "@/lib/seo/site";

/** Static export: only the locales below exist; anything else is a 404. */
export const dynamicParams = false;

const TITLE = "Blog";
const DESCRIPTION =
  "关于提示词怎么写、怎么改、来源与版权怎么处理的说明性文章，与提示词库的条目互相印证。";

export async function generateStaticParams() {
  return PUBLISHED_LOCALES.map((locale) => ({ locale }));
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
    description: DESCRIPTION,
    paths: { [locale]: blogHome(locale) },
  });
}

export default async function BlogIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isPublishedLocale(locale)) notFound();

  const repository = getContentRepository();
  const [articles, categories] = await Promise.all([
    repository.listArticles(locale),
    repository.listArticleCategories(locale),
  ]);

  // Counts are derived from the articles actually present — never declared.
  const categoriesWithCount: CategoryWithCount[] = categories.map((category) => ({
    category,
    count: articles.filter((article) => article.category.slug === category.slug).length,
  }));

  const featured = articles[0];
  const trail: BreadcrumbItem[] = [
    { name: "首页", path: localeHome(locale) },
    { name: TITLE, path: blogHome(locale) },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 md:px-8 md:py-16">
      <JsonLd data={breadcrumbList(trail)} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: TITLE,
          description: DESCRIPTION,
          url: absoluteUrl(blogHome(locale)),
          inLanguage: locale,
          mainEntity: {
            "@type": "ItemList",
            numberOfItems: articles.length,
            itemListElement: articles.map((article, index) => ({
              "@type": "ListItem",
              position: index + 1,
              name: article.title,
              url: absoluteUrl(article.href),
            })),
          },
        }}
      />

      <Breadcrumb items={trail} />
      <h1 className="mt-6 text-4xl font-black tracking-tighter uppercase md:text-6xl">{TITLE}</h1>
      <p className="mt-6 max-w-prose text-lg font-medium">{DESCRIPTION}</p>
      <p className="mt-3 max-w-prose text-sm font-medium text-foreground/70">
        RSS 订阅将在后续阶段提供。
      </p>

      {featured === undefined ? (
        <div className="mt-12">
          <StateBlock variant="empty" message="Blog 还没有发布文章。" />
        </div>
      ) : (
        <>
          <Section
            id="blog-featured"
            title="精选文章"
            description="当前最值得先读的一篇。"
          >
            <ArticleCard article={featured} featured />
          </Section>

          <Section id="blog-categories" title="文章分类" description="按主题浏览全部文章。">
            <CategoryLinks categories={categoriesWithCount} />
          </Section>

          <Section id="blog-latest" title="最新文章">
            <ArticleList articles={articles} emptyMessage="Blog 还没有发布文章。" />
          </Section>
        </>
      )}
    </div>
  );
}
