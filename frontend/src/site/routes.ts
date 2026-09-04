import type { Catalog, Ref } from '@/lib/catalog/types';
import { styleHref, subjectHref, taskHref } from '@/lib/catalog/query';
import { modelFamilies } from '@/lib/catalog/model-families';

export function catalogPaths(catalog: Catalog): string[] {
  const hub = `/${catalog.locale}/prompts`;
  const hrefs = [hub, `/${catalog.locale}`, `${hub}/image`, `${hub}/video`, `${hub}/models`, `${hub}/creators`, `/${catalog.locale}/blog`, ...catalog.prompts.map(prompt => prompt.href), ...catalog.models.map(model => model.href), ...catalog.useCases.map(task => taskHref(catalog.locale, task.slug)), ...catalog.styles.map(style => styleHref(catalog.locale, style.slug)), ...[...catalog.useCases, ...catalog.styles, ...catalog.subjects, ...catalog.techniques].map(ref => ref.href)];
  hrefs.push(...catalog.subjects.map(subject => subjectHref(catalog.locale, subject.slug)));
  hrefs.push(...modelFamilies(catalog).map(family => family.href));
  return [...new Set(hrefs.filter(href => (href === `/${catalog.locale}` || href.startsWith(`/${catalog.locale}/`)) && !href.includes('?') && !href.includes('#')))];
}

export function taskForPath(catalog: Catalog, path: string): Ref | null {
  return catalog.useCases.find(task => taskHref(catalog.locale, task.slug) === path) ?? null;
}

export function styleForPath(catalog: Catalog, path: string): Ref | null {
  return catalog.styles.find(style => styleHref(catalog.locale, style.slug) === path) ?? null;
}

export function categoryForPath(catalog: Catalog, path: string): { ref: Ref; subset: Catalog } | null {
  const axes = ['useCases', 'styles', 'subjects', 'techniques'] as const;
  for (const axis of axes) {
    const ref = catalog[axis].find(value => value.href === path || axis === 'subjects' && subjectHref(catalog.locale, value.slug) === path);
    if (ref) return { ref, subset: { ...catalog, prompts: catalog.prompts.filter(prompt => prompt[axis].some(value => value.id === ref.id)) } };
  }
  return null;
}
