import type { Catalog, Prompt, Ref } from '@/lib/catalog/types';
import type { ArticleDetail } from '@/site/articles';

export function StructuredData({ catalog, path, prompt, model, article }: { catalog: Catalog; path: string; prompt?: Prompt; model?: Ref; article?: ArticleDetail }) {
  if (catalog.mode !== 'public-api') return null;
  const canonical = article?.seo.canonicalUrl ?? prompt?.seo.canonicalUrl ?? model?.seo?.canonicalUrl;
  const origin = canonical ? new URL(canonical).origin : process.env.FRONTEND_SITE_URL;
  if (!origin) return null;
  const name = article?.summary.title ?? prompt?.title ?? (model ? `${model.label} prompts` : 'Prompt Library');
  const breadcrumbs = [{ '@type': 'ListItem', position: 1, name: 'Prompt Library', item: new URL(`/${catalog.locale}/prompts`, origin).href }];
  if (prompt?.models[0]) breadcrumbs.push({ '@type': 'ListItem', position: 2, name: prompt.models[0].label, item: new URL(prompt.models[0].href, origin).href });
  if (path !== `/${catalog.locale}/prompts`) breadcrumbs.push({ '@type': 'ListItem', position: breadcrumbs.length + 1, name, item: new URL(path, origin).href });
  const graph: Record<string, unknown>[] = [{ '@type': 'BreadcrumbList', itemListElement: breadcrumbs }];
  if (prompt) graph.push({ '@type': 'CreativeWork', name: prompt.title, text: prompt.prompt, inLanguage: prompt.language, url: canonical, ...(prompt.source.url ? { isBasedOn: prompt.source.url } : {}), ...(prompt.handle ? { author: { '@type': 'Person', name: prompt.handle } } : {}) });
  if (article) graph.push({ '@type': 'Article', headline: article.summary.title, description: article.summary.excerpt, inLanguage: article.summary.locale, datePublished: article.summary.publishedAt, dateModified: article.summary.updatedAt, author: { '@type': 'Person', name: article.summary.author.name }, url: canonical, ...(article.summary.cover ? { image: article.summary.cover.url } : {}) });
  const json = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replaceAll('<', '\\u003c');
  return <script type="application/ld+json">{json}</script>;
}
