import {websiteTaskReference} from './website-taxonomy';
import type { Catalog, Prompt, Ref, WebsiteCase } from './types';

const websiteTasks = new Set(['website', 'web-design', 'web-development', 'web-motion-design']);

/** Website is a task union, independent of whether its preview is an image or video. */
export function websitePrompts(catalog: Catalog): Prompt[] {
  const found = new Map<string, Prompt>();
  for (const prompt of catalog.prompts) {
    if (prompt.useCases.some(task => websiteTasks.has(task.slug)) && !found.has(prompt.id)) found.set(prompt.id, prompt);
  }
  return [...found.values()];
}

export function websiteRef(catalog: Catalog): Ref {
  if(catalog.mode==='git-beta')return websiteTaskReference(catalog.locale,websiteEntries(catalog).length);
  return { id: 'navigation:website', slug: 'website', label: 'Website', href: `/${catalog.locale}/prompts/website`, count: websiteEntries(catalog).length };
}

/** Cases with and without supplied prompts share navigation, never a fabricated prompt body. */
export function websiteEntries(catalog: Catalog): WebsiteCase[] {
  const cases = catalog.websites ?? [];
  const ids = new Set(cases.map(item => item.id));
  const linkedPrompts = new Set(cases.map(item => item.promptHref).filter(Boolean));
  return [...cases, ...websitePrompts(catalog).filter(prompt => !ids.has(prompt.id) && !linkedPrompts.has(prompt.href)).map(prompt => ({
    id: prompt.id, slug: prompt.slug, href: prompt.href, title: prompt.title, summary: prompt.summary, searchLabels: prompt.searchLabels,
    cover: prompt.img ?? '', media:prompt.media, attribution: prompt.handle, source: prompt.source, models: prompt.models,
    useCases: prompt.useCases, tools: [], demoUrl: null, codeUrl: null, promptHref: prompt.href, relatedSources: [],
  }))];
}
