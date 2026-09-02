import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PromptDetailView } from "@/features/prompt-detail/PromptDetailView";
import { promptBreadcrumbs } from "@/features/prompt-detail/breadcrumbs";
import {
  formatCreatorHandle,
  getContentRepository,
  type Locale,
  type PromptDetail,
} from "@/lib/content";
import { PUBLISHED_LOCALES, isPublishedLocale } from "@/lib/i18n/config";
import { promptDetail } from "@/lib/i18n/routes";
import { JsonLd, breadcrumbList } from "@/lib/seo/json-ld";
import { absoluteUrl, buildMetadata } from "@/lib/seo/site";

/** Static export: only the slugs generated below exist. Anything else is a 404. */
export const dynamicParams = false;

export async function generateStaticParams() {
  const repository = getContentRepository();
  const params: { locale: Locale; promptSlug: string }[] = [];
  for (const locale of PUBLISHED_LOCALES) {
    const { items } = await repository.listPrompts(locale);
    for (const prompt of items) params.push({ locale, promptSlug: prompt.slug });
  }
  return params;
}

type PageParams = Promise<{ locale: string; promptSlug: string }>;

async function load(params: PageParams): Promise<{ locale: Locale; prompt: PromptDetail }> {
  const { locale, promptSlug } = await params;
  if (!isPublishedLocale(locale)) notFound();
  const prompt = await getContentRepository().getPromptBySlug(locale, promptSlug);
  if (prompt === null) notFound();
  return { locale, prompt };
}

export async function generateMetadata({ params }: { params: PageParams }): Promise<Metadata> {
  const { locale, prompt } = await load(params);
  // Built from `prompt.localeVariants` (filtered to "ready") rather than
  // hand-listing locales, so a translation that hasn't actually shipped can
  // never be advertised as an hreflang alternate. The current locale is
  // guaranteed present regardless of what the fixture says, since we are
  // rendering it right now.
  const paths: Partial<Record<Locale, string>> = Object.fromEntries(
    prompt.localeVariants
      .filter((variant) => variant.status === "ready")
      .map((variant) => [variant.locale, promptDetail(variant.locale, variant.slug)] as const),
  );
  paths[locale] = promptDetail(locale, prompt.slug);

  return buildMetadata({
    locale,
    title: prompt.title,
    description: prompt.summary ?? prompt.excerpt,
    paths,
  });
}

export default async function PromptDetailPage({ params }: { params: PageParams }) {
  const { locale, prompt } = await load(params);
  const related = await getContentRepository().getRelated(locale, prompt.id);
  const breadcrumbs = promptBreadcrumbs(locale, prompt);

  const creativeWork = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: prompt.title,
    description: prompt.summary ?? prompt.excerpt,
    text: prompt.promptText,
    inLanguage: prompt.promptLanguage,
    author: {
      "@type": "Person",
      name: formatCreatorHandle(prompt.source.handle),
      url: prompt.creator.url,
    },
    ...(prompt.source.publishedAt === null ? {} : { datePublished: prompt.source.publishedAt }),
    isBasedOn: prompt.source.url,
    ...(prompt.media.length === 0 ? {} : { image: prompt.media.map((item) => item.src) }),
    url: absoluteUrl(promptDetail(locale, prompt.slug)),
  };

  return (
    <>
      <JsonLd data={breadcrumbList(breadcrumbs)} />
      <JsonLd data={creativeWork} />
      <PromptDetailView
        prompt={prompt}
        locale={locale}
        related={related}
        breadcrumbs={breadcrumbs}
      />
    </>
  );
}
