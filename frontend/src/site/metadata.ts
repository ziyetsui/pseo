import { interfaceLocale, text, promptCount, caseCount } from '@/lib/i18n/text';
import { websiteEntries, websitePrompts } from '@/lib/catalog/website';
import { websiteViewForPath, websiteViews } from '@/lib/catalog/website-views';
import type { Metadata } from 'next';
import type { Catalog, Prompt, Ref } from '@/lib/catalog/types';
import { siteOrigin } from '@/lib/catalog/config';
import { modelFamilyForPath } from '@/lib/catalog/model-families';
import type { SurfaceSeo } from './surface-seo';

function navigationCopy(catalog: Catalog, path: string, title: string, entity?: Ref) {
  const hub = `/${catalog.locale}/prompts`;
  if (path === `${hub}/library-index` && catalog.mode === 'git-beta') return {title:'Library index',description:'Explore every published prompt, Website case and graph view in the library by medium, purpose, model and technology.'};
  const website = catalog.websites?.find(item => item.href === path);
  if (website) return { title: website.title, description: website.summary || 'Explore this website case, its preview and original source.' };
  const view = websiteViewForPath(catalog, path);
  if (view) return { title: `${view.label} · Website cases`, description: `Explore ${view.count} website cases in this ${view.axis === 'all' ? 'complete collection' : view.axis === 'use-case' ? 'purpose' : view.axis === 'tool' ? 'technology' : 'model'} view, with source credits, previews and available project links.` };
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
  if (path === `${hub}/website` && catalog.mode === 'git-beta') return { title: 'Website views', description: `Explore ${websiteEntries(catalog).length} website cases across ${websiteViews(catalog).length} views by purpose, model and technology.` };
  if (path === `${hub}/website`) return { title: 'Website prompts', description: `Explore ${websitePrompts(catalog).length} website prompts with source credits, models and full instructions.` };
  if (path === `${hub}/models`) return { title: 'AI model families and prompts', description: 'Browse model families and their versions, then explore the prompts associated with each model.' };
  if (path === `${hub}/creators`) return { title: 'Prompt creators', description: 'Discover the creators represented in this prompt library and follow their available profile links.' };
  if (path === `/${catalog.locale}/blog`) return { title: 'The notebook', description: 'Published articles and notes from Prompt Library. Browse the available writing and its credited sources.' };
  return { title: 'Image and video prompts', description: `Explore ${catalog.prompts.length} prompts by model, task and style. Read original instructions, inspect available results, and follow links to their sources.` };
}

export function siteMetadata(catalog: Catalog, path: string, title: string, prompt?: Prompt, entity?: Ref, surface?: SurfaceSeo | null): Metadata {
  const visual = catalog.mode !== 'public-api';
  const origin = visual ? undefined : siteOrigin();
  const seo = prompt?.seo ?? entity?.seo;
  // The locale entry is a navigation alias, not another independently qualified hub.
  const canonicalPath = path === `/${catalog.locale}` ? `/${catalog.locale}/prompts` : path;
  const canonical = surface?.canonicalUrl ?? seo?.canonicalUrl ?? (origin ? new URL(canonicalPath, origin).href : undefined);
  if (!visual && canonical && new URL(canonical).origin !== origin) throw new Error('Canonical origin differs from FRONTEND_SITE_URL');
  let copy = prompt ? { title, description: prompt.summary || title } : navigationCopy(catalog, path, title, entity);
  if (interfaceLocale(catalog) === 'zh-CN' && !prompt) {
    const hub = `/${catalog.locale}/prompts`, view = websiteViewForPath(catalog, path);
    const website = catalog.websites?.find(item => item.href === path);
    const family = modelFamilyForPath(catalog, path);
    if (website) copy = { title: website.title, description: website.summary || '查看此网站案例的预览和原始来源。' };
    else if (view) copy = { title: `${view.label} · 网站案例`, description: `探索此分类中的 ${caseCount('zh-CN', view.count)}，查看来源署名、预览与可用的项目链接。` };
    else if (family) copy = { title: `${family.label} 系列提示词`, description: `探索 ${family.label} 系列的 ${promptCount('zh-CN', family.count)}，阅读完整正文、查看结果并访问原始来源。` };
    else if (entity) copy = { title: `${entity.label}提示词`, description: `探索 ${entity.label} 的 ${promptCount('zh-CN', entity.count)}，阅读完整正文、查看结果并访问来源。` };
    else if (path === `${hub}/library-index`) copy = { title: '提示词库目录', description: '按媒介、用途、模型和技术浏览全部提示词、网站案例和分类。' };
    else if (path === `${hub}/website`) copy = { title: '网站分类', description: `按用途、模型和技术探索 ${websiteEntries(catalog).length} 个网站案例与 ${websiteViews(catalog).length} 个分类。` };
    else if (path === `${hub}/image` || path === `${hub}/video`) { const kind = path.endsWith('/video') ? 'video' : 'image'; copy = { title: `${kind === 'image' ? '图片' : '视频'}提示词`, description: `按模型、任务和风格浏览 ${promptCount('zh-CN', catalog.prompts.filter(item => item.kind === kind).length)}，阅读完整正文与来源署名。` }; }
    else if (path === `${hub}/models`) copy = { title: 'AI 模型系列与提示词', description: '浏览模型系列及其版本，探索每个模型的提示词。' };
    else if (path === `${hub}/creators`) copy = { title: '提示词创作者', description: '发现提示词库中的创作者，访问其公开主页。' };
    else if (path === `/${catalog.locale}/blog`) copy = { title: '笔记', description: '提示词库发布的文章与笔记，保留原始来源署名。' };
    else copy = { title: '图片与视频提示词', description: `按模型、任务和风格探索 ${promptCount('zh-CN', catalog.prompts.length)}，阅读原始指令、查看结果并访问来源。` };
  }
  const resolvedTitle = !visual && seo?.title ? seo.title : `${copy.title} · ${text(interfaceLocale(catalog), 'Prompt Library', '提示词库')}`;
  const description = seo?.description || copy.description;
  const robots = path === `/${catalog.locale}/prompts/website` ? 'noindex,nofollow' : surface?.robots ?? seo?.robots;
  return {
    title: resolvedTitle, description,
    robots: visual ? { index: false, follow: false } : { index: robots?.split(',').some(value => value.trim() === 'index') ?? false, follow: !robots?.split(',').some(value => value.trim() === 'nofollow') },
    alternates: {
      canonical: visual ? undefined : canonical,
      languages: visual ? undefined : surface?.hreflang ?? seo?.hreflang,
    },
    openGraph: { title: resolvedTitle, description, ...(visual ? {} : { url: canonical }), type: 'website', ...(prompt?.img ? { images: [{ url: catalog.mode === 'git-beta' && prompt.img.startsWith('/') ? new URL(prompt.img, 'https://beta.ancher.site').href : prompt.img }] } : {}) },
    twitter: { card: prompt?.img ? 'summary_large_image' : 'summary', title: resolvedTitle, description },
  };
}
