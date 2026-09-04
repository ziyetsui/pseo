import type { Catalog, Prompt, Ref } from '@/lib/catalog/types';

/** One row of the browse band: a task, the prompts filed under it, and what they are made of. */
export type TaskRow = { ref: Ref; prompts: Prompt[]; images: number; videos: number; models: Ref[]; shots: Prompt[] };

const byCount = (a: { count: number; label: string }, b: { count: number; label: string }) => b.count - a.count || a.label.localeCompare(b.label);

export function taskRows(catalog: Catalog): TaskRow[] {
  return catalog.useCases.map(ref => {
    const prompts = catalog.prompts.filter(p => p.useCases.some(r => r.slug === ref.slug));
    const models = new Map<string, Ref>();
    prompts.forEach(p => p.models.forEach(r => models.set(r.slug, { ...r, count: (models.get(r.slug)?.count ?? 0) + 1 })));
    return {
      ref, prompts,
      images: prompts.filter(p => p.kind === 'image').length,
      videos: prompts.filter(p => p.kind === 'video').length,
      models: [...models.values()].sort(byCount),
      shots: prompts.filter(p => p.img),
    };
  }).filter(row => row.prompts.length).sort((a, b) => byCount(a.ref, b.ref));
}

/** Columns of the plate. Every model that any task names, most-used first. */
export function modelColumns(catalog: Catalog): Ref[] {
  const models = new Map<string, Ref>();
  for (const prompt of catalog.prompts) for (const ref of prompt.models) models.set(ref.slug, { ...ref, count: (models.get(ref.slug)?.count ?? 0) + 1 });
  return [...models.values()].sort(byCount);
}

export const cell = (row: TaskRow, modelSlug: string) => row.prompts.filter(p => p.models.some(r => r.slug === modelSlug)).length;
/** Prompts no task describes. Real, unreachable from this band, and worth printing rather than hiding. */
export const unfiled = (catalog: Catalog) => catalog.prompts.filter(p => !p.useCases.length);
/** The task page this band exists to reach, with the plate's second axis carried across. */
export const taskHref = (ref: Ref, modelSlug?: string) => modelSlug ? `${ref.href}?model=${encodeURIComponent(modelSlug)}` : ref.href;
export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** "10 images · 3 videos", and never "0 image, 0 video": Automotive's one record is neither. */
export function splitLabel(row: TaskRow): string {
  const parts: string[] = [];
  if (row.images) parts.push(plural(row.images, 'image'));
  if (row.videos) parts.push(plural(row.videos, 'video'));
  const rest = row.prompts.length - row.images - row.videos;
  if (rest) parts.push(`${rest} uncategorised`);
  return parts.join(' · ');
}
