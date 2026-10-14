import type { Catalog, Prompt, Ref } from './types';

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
  return { id: 'navigation:website', slug: 'website', label: 'Website', href: `/${catalog.locale}/prompts/website`, count: websitePrompts(catalog).length };
}
