import type { Metadata } from 'next';
import type { Catalog, Prompt, Ref } from '@/lib/catalog/types';
import { siteOrigin } from '@/lib/catalog/config';
import { modelFamilyForPath } from '@/lib/catalog/model-families';
import type { SurfaceSeo } from './surface-seo';

function navigationCopy(catalog: Catalog, path: string, title: string, entity?: Ref) {
  const hub = `/${catalog.locale}/prompts`;
  const family = modelFamilyForPath(catalog, path);
  if (family) {
    const members = catalog.models.filter(model => family.memberIds.includes(model.id)).map(model => model.label);
    return { title: `${family.label} family prompts`, description: `Explore ${family.count} prompts across ${members.join(', ')}. Read full prompt text, browse available results, and visit original source posts.` };
  }
  if (entity) {
    const kind = path.includes('/models/') ? 'model' : path.includes('/styles/') ? 'style' : path.includes('/use-cases/') ? 'task' : 'subject';
    return { title: kind === 'model' ? `${entity.label} model prompts` : title, description: `Explore ${entity.count} prompts for the ${entity.label} ${kind}. Read full prompt text, browse available results, and follow links to the sources.` };
  }
  if (path === `${hub}/image` || path === `${hub}/video`) {
    const kind = path.endsWith('/video') ? 'video' : 'image';
    return { title, description: `Browse ${catalog.prompts.filter(prompt => prompt.kind === kind).length} ${kind} prompts by model, task and style. Read the full instructions and inspect available results with source credits.` };
  }
  if (path === `${hub}/models`) return { title: 'AI model families and prompts', description: 'Browse model families and their versions, then explore the prompts associated with each model.' };
  if (path === `${hub}/creators`) return { title: 'Prompt creators', description: 'Discover the creators represented in this prompt library and follow their available profile links.' };
  if (path === `/${catalog.locale}/blog`) return { title: 'The notebook', description: 'Published articles and notes from Prompt Library. Browse the available writing and its credited sources.' };
  return { title: 'Image and video prompts', description: `Explore ${catalog.prompts.length} prompts by model, task and style. Read original instructions, inspect available results, and follow links to their sources.` };
}

export function siteMetadata(catalog: Catalog, path: string, title: string, prompt?: Prompt, entity?: Ref, surface?: SurfaceSeo | null): Metadata {
  const visual = catalog.mode === 'visual-fixture';
  const origin = visual ? undefined : siteOrigin();
  const seo = prompt?.seo ?? entity?.seo;
  // The locale entry is a navigation alias, not another independently qualified hub.
  const canonicalPath = path === `/${catalog.locale}` ? `/${catalog.locale}/prompts` : path;
  const canonical = surface?.canonicalUrl ?? seo?.canonicalUrl ?? (origin ? new URL(canonicalPath, origin).href : undefined);
  if (!visual && canonical && new URL(canonical).origin !== origin) throw new Error('Canonical origin differs from FRONTEND_SITE_URL');
  const copy = prompt ? { title, description: prompt.summary || title } : navigationCopy(catalog, path, title, entity);
  const resolvedTitle = !visual && seo?.title ? seo.title : `${copy.title} · Prompt Library`;
  const description = seo?.description || copy.description;
  const robots = surface?.robots ?? seo?.robots;
  return {
    title: resolvedTitle, description,
    robots: visual ? { index: false, follow: false } : { index: robots?.split(',').some(value => value.trim() === 'index') ?? false, follow: !robots?.split(',').some(value => value.trim() === 'nofollow') },
    alternates: {
      canonical: visual ? undefined : canonical,
      languages: visual ? undefined : surface?.hreflang ?? seo?.hreflang,
    },
    openGraph: { title: resolvedTitle, description, ...(visual ? {} : { url: canonical }), type: 'website', ...(prompt?.img ? { images: [{ url: prompt.img }] } : {}) },
    twitter: { card: prompt?.img ? 'summary_large_image' : 'summary', title: resolvedTitle, description },
  };
}
