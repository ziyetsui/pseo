import type { Catalog, Prompt } from '@/lib/catalog/types';

/* What "value" and "heat" are allowed to mean here, and nothing else:
   - saves and likes are observed source metrics and survive into the public read model
     (public.ts maps metrics.bookmarks -> saves), so a first screen built on them is implementable.
   - score and highValue exist only in the visual fixture (public.ts sets score: null,
     highValue: false), so no direction below encodes them.
   - views is null on 34 of 35 records. Not shown.
   - There is one observation date for the whole snapshot, so nothing here says "trending now";
     the superlative available is "most saved", stated against the snapshot date. */
export type Kind = 'image' | 'video';
export type KindRow = { kind: Kind; label: string; href: string; prompts: Prompt[]; saves: number; likes: number };

export const sum = (rows: Prompt[], key: 'saves' | 'likes') => rows.reduce((total, p) => total + (p[key] ?? 0), 0);
export const n = (value: number) => value.toLocaleString('en-US');
export const plural = (count: number, one: string, many = `${one}s`) => `${n(count)} ${count === 1 ? one : many}`;

export function kindRows(catalog: Catalog): KindRow[] {
  return ([['image', 'Images'], ['video', 'Videos']] as const).map(([kind, label]) => {
    const prompts = catalog.prompts.filter(p => p.kind === kind);
    return { kind, label, href: `http://127.0.0.1:3000/${catalog.locale}/prompts/${kind}`, prompts, saves: sum(prompts, 'saves'), likes: sum(prompts, 'likes') };
  });
}
/* Neither deck reaches these: kind is unknown, so they are in no category and no L2. */
export const unclassified = (catalog: Catalog) => catalog.prompts.filter(p => p.kind !== 'image' && p.kind !== 'video');

export type TaskRow = { slug: string; label: string; prompts: Prompt[] };
export function taskRows(catalog: Catalog): TaskRow[] {
  const rows: TaskRow[] = catalog.useCases.map(ref => ({ slug: ref.slug, label: ref.label, prompts: catalog.prompts.filter(p => p.useCases.some(r => r.slug === ref.slug)) }))
    .filter(row => row.prompts.length);
  const loose = catalog.prompts.filter(p => !p.useCases.length);
  if (loose.length) rows.push({ slug: '', label: 'No task named', prompts: loose });
  return rows.sort((a, b) => sum(b.prompts, 'saves') - sum(a.prompts, 'saves'));
}
export const cell = (row: TaskRow, kind: Kind) => row.prompts.filter(p => p.kind === kind);

/* Saves run 6 to 6,127 in this snapshot — a 1,021× spread. A linear ramp or a linear area would
   put every row but the top one at the bottom step, so both encodings go through a square root
   and say so in their legend. */
export const ramp = (value: number, peak: number) => 4 + Math.sqrt(value / peak) * 12;
export const side = (value: number, peak: number) => Math.sqrt(value / peak);
export const saveRate = (row: { saves: number; likes: number }) => row.likes ? row.saves / row.likes : 0;
export const topSaved = (prompts: Prompt[], count: number) => [...prompts].sort((a, b) => (b.saves ?? 0) - (a.saves ?? 0)).slice(0, count);
export const taskFilterHref = (catalog: Catalog, kind: Kind, slug: string) =>
  `http://127.0.0.1:3000/${catalog.locale}/prompts/${kind}${slug ? `?useCase=${encodeURIComponent(slug)}` : ''}`;
