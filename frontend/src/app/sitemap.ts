import type { MetadataRoute } from 'next';
import { loadCatalogs } from '@/lib/catalog/server';
export const dynamic = 'force-static';
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const catalogs = await loadCatalogs();
  if (catalogs.some(catalog => catalog.mode === 'visual-fixture')) return [];
  return catalogs.flatMap(catalog => catalog.prompts.filter(prompt => prompt.seo.robots.startsWith('index') && prompt.seo.canonicalUrl).map(prompt => ({
    url: prompt.seo.canonicalUrl!, ...(prompt.publishedAt ? { lastModified: prompt.publishedAt } : {}),
  })));
}
