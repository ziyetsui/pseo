import type { Prompt } from '@/lib/catalog/types';

export const GENERATION_ORIGIN = 'https://app.ancher.ai';
export type GenerationKind = Prompt['kind'] | 'website';
const websiteTasks = new Set(['website', 'web-design', 'web-development', 'web-motion-design']);

/** A website's output type is independent of its image/video preview. */
export function generationKind(prompt: Pick<Prompt, 'kind' | 'useCases'>): GenerationKind {
  return prompt.useCases.some(task => websiteTasks.has(task.slug)) ? 'website' : prompt.kind;
}

/** Preserve the full prompt, including Unicode, JSON, whitespace and URL punctuation. */
export function generationHref(prompt: string, kind?: GenerationKind): string {
  const url = new URL('/', GENERATION_ORIGIN);
  const instruction = kind === 'image' ? '创建一张关于的图片' : kind === 'website' ? '创建一个关于的 HTML 网页' : '';
  url.searchParams.set('prompts', instruction ? instruction + (prompt ? `\n\n${prompt}` : '') : prompt);
  return url.href;
}
