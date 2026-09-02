import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Section } from "@/components/ui/Section";
import { ArticleList } from "@/features/blog/ArticleList";
import { CategoryLinks, type CategoryWithCount } from "@/features/blog/CategoryLinks";
import { getContentRepository } from "@/lib/content";
import { PUBLISHED_LOCALES, isPublishedLocale } from "@/lib/i18n/config";
import { blogCategory, blogHome, localeHome } from "@/lib/i18n/routes";
import { JsonLd, breadcrumbList, type BreadcrumbItem } from "@/lib/seo/json-ld";
import { absoluteUrl, buildMetadata } from "@/lib/seo/site";

export const dynamicParams = false;

/** Only categories that actually hold at least one article get a page. */
export async function generateStaticParams() {
  const repository = getContentRepository();
  const params: { locale: string; slug: string }[] = [];
  for (const locale of PUBLISHED_LOCALES) {
    const categories = await repository.listArticleCategories(locale);
    for (const category of categories) {
      const articles = await repository.listArticles(locale, category.slug);
      if (articles.length === 0) continue;
      params.push({ locale, slug: category.slug });
    }
  }
  return params;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isPublishedLocale(locale)) notFound();

  const repository = getContentRepository();
  const category = await repository.getArticleCategory(locale, slug);
  if (category === null) notFound();
  const articles = await repository.listArticles(locale, slug);
  if (articles.length === 0) notFound();

  return buildMetadata({
    locale,
    title: `${category.label}｜Blog 分类`,
    description: category.description,
    paths: { [locale]: blogCategory(locale, category.slug) },
  });
}

export default async function BlogCategoryPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isPublishedLocale(locale)) notFound();

  const repository = getContentRepository();
  const category = await repository.getArticleCategory(locale, slug);
  if (category === null) notFound();

  const [articles, allArticles, categories] = await Promise.all([
    repository.listArticles(locale, slug),
    repository.listArticles(locale),
    repository.listArticleCategories(locale),
  ]);
  // Empty categories are never generated, so reaching one is a 404, not an
  // empty page that would be indexed as thin content.
  if (articles.length === 0) notFound();

  const categoriesWithCount: CategoryWithCount[] = categories
    .map((entry) => ({
      category: entry,
      count: allArticles.filter((article) => article.category.slug === entry.slug).length,
    }))
    .filter((entry) => entry.count > 0);

  const canonical = absoluteUrl(blogCategory(locale, category.slug));
  const trail: BreadcrumbItem[] = [
    { name: "首页", path: localeHome(locale) },
    { name: "Blog", path: blogHome(locale) },
    { name: category.label, path: blogCategory(locale, category.slug) },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 md:px-8 md:py-16">
      <JsonLd data={breadcrumbList(trail)} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: category.label,
          description: category.description,
          url: canonical,
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
      <h1 className="mt-6 text-4xl font-black tracking-tighter uppercase md:text-6xl">
        {category.label}
      </h1>
      <p className="mt-6 max-w-prose text-lg font-medium">{category.description}</p>

      <Section id="category-articles" title="本分类文章">
        <ArticleList articles={articles} />
      </Section>

      <Section id="category-all" title="全部分类" moreHref={blogHome(locale)} moreLabel="回到 Blog">
        <CategoryLinks categories={categoriesWithCount} activeSlug={category.slug} />
      </Section>
    </div>
  );
}
