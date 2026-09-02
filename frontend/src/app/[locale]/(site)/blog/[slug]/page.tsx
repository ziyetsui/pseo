import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Section } from "@/components/ui/Section";
import { StateBlock } from "@/components/ui/StateBlock";
import { ArticleBody } from "@/features/blog/ArticleBody";
import { ArticleList } from "@/features/blog/ArticleList";
import { ArticleMeta } from "@/features/blog/ArticleMeta";
import { FixtureNotice } from "@/features/blog/FixtureNotice";
import { ShareArticle } from "@/features/blog/ShareArticle";
import { getContentRepository } from "@/lib/content";
import { PUBLISHED_LOCALES, isPublishedLocale } from "@/lib/i18n/config";
import { blogArticle, blogHome, localeHome } from "@/lib/i18n/routes";
import { JsonLd, breadcrumbList, type BreadcrumbItem } from "@/lib/seo/json-ld";
import { SITE_NAME, absoluteUrl, buildMetadata } from "@/lib/seo/site";

export const dynamicParams = false;

const EXTERNAL_URL = /^https?:\/\//;

/**
 * `absoluteUrl` always prefixes the configured site origin, which would
 * double up a URL that is already absolute (an external author profile or
 * source). Route-builder hrefs are site-relative, so only those need it.
 */
function toAbsolute(url: string): string {
  return EXTERNAL_URL.test(url) ? url : absoluteUrl(url);
}

export async function generateStaticParams() {
  const repository = getContentRepository();
  const params: { locale: string; slug: string }[] = [];
  for (const locale of PUBLISHED_LOCALES) {
    const articles = await repository.listArticles(locale);
    for (const article of articles) params.push({ locale, slug: article.slug });
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
  const article = await getContentRepository().getArticle(locale, slug);
  if (article === null) notFound();

  return buildMetadata({
    locale,
    title: article.title,
    description: article.excerpt,
    paths: { [locale]: blogArticle(locale, article.slug) },
  });
}

export default async function BlogArticlePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isPublishedLocale(locale)) notFound();

  const repository = getContentRepository();
  const article = await repository.getArticle(locale, slug);
  if (article === null) notFound();

  // Related = the rest of this category; if the category has nothing else,
  // fall back to the newest articles from anywhere. Never padded with filler.
  const sameCategory = (await repository.listArticles(locale, article.category.slug)).filter(
    (candidate) => candidate.id !== article.id,
  );
  const isSameCategoryRelated = sameCategory.length > 0;
  const related = isSameCategoryRelated
    ? sameCategory
    : (await repository.listArticles(locale)).filter((candidate) => candidate.id !== article.id);
  // The heading must be honest about what is actually listed: "相关文章" only
  // holds when every item shares this article's category; the cross-category
  // fallback is labelled "最新文章" instead.
  const relatedTitle = isSameCategoryRelated ? "相关文章" : "最新文章";

  const canonical = absoluteUrl(blogArticle(locale, article.slug));
  const trail: BreadcrumbItem[] = [
    { name: "首页", path: localeHome(locale) },
    { name: "Blog", path: blogHome(locale) },
    { name: article.category.label, path: article.category.href },
    { name: article.title, path: blogArticle(locale, article.slug) },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 md:px-8 md:py-16">
      <JsonLd data={breadcrumbList(trail)} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: article.title,
          description: article.excerpt,
          // Emitted only because the byline itself renders visibly in
          // `ArticleMeta` below — structured data never claims more than the
          // page shows.
          author: {
            "@type": "Person",
            name: article.author.name,
            ...(article.author.url !== null ? { url: toAbsolute(article.author.url) } : {}),
          },
          datePublished: article.publishedAt,
          dateModified: article.updatedAt,
          inLanguage: locale,
          articleSection: article.category.label,
          url: canonical,
          mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
          publisher: { "@type": "Organization", name: SITE_NAME },
          ...(article.sources.length > 0
            ? { citation: article.sources.map((source) => toAbsolute(source.url)) }
            : {}),
        }}
      />

      <Breadcrumb items={trail} />

      <article className="mt-6">
        {article.isFixture ? <FixtureNotice className="max-w-prose" /> : null}
        <h1 className="mt-6 max-w-prose text-3xl font-black tracking-tighter md:text-5xl">
          {article.title}
        </h1>
        <p className="mt-5 max-w-prose text-lg font-medium">{article.excerpt}</p>
        <ArticleMeta article={article} showUpdated className="mt-5" />
        <ArticleBody paragraphs={article.paragraphs} className="mt-8" />
      </article>

      <Section id="article-sources" title="来源与引用" description="本文依据的站内资料。">
        {article.sources.length === 0 ? (
          <StateBlock
            variant="empty"
            message="本文没有登记引用来源：内容层目前不为这篇文章记录来源字段，因此这里不列出任何链接，而不是显示一份虚构的参考文献。"
            className="max-w-prose"
          />
        ) : (
          <ul className="flex max-w-prose flex-col gap-3">
            {article.sources.map((source, index) => (
              <li key={index} className="border-2 border-foreground p-4 text-sm font-medium">
                {EXTERNAL_URL.test(source.url) ? (
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener nofollow"
                    className="underline decoration-accent-blue decoration-2"
                  >
                    {source.label}
                    <span className="sr-only">（外部链接，新窗口打开）</span>
                  </a>
                ) : (
                  <Link href={source.url} className="underline decoration-accent-blue decoration-2">
                    {source.label}
                  </Link>
                )}
                {source.publishedAt === null ? null : (
                  <span className="ml-2 text-xs font-bold text-foreground/70">
                    发布于 <time dateTime={source.publishedAt}>{source.publishedAt}</time>
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section id="article-share" title="分享" description="复制本文链接。">
        <ShareArticle url={canonical} />
      </Section>

      <Section
        id="article-related"
        title={relatedTitle}
        moreHref={blogHome(locale)}
        moreLabel="查看全部文章"
      >
        <ArticleList articles={related} emptyMessage="暂时没有其他文章可以推荐。" />
      </Section>
    </div>
  );
}
