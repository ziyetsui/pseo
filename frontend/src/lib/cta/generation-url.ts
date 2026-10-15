export const GENERATION_ORIGIN = 'https://app.ancher.ai';
/** Preserve the full prompt, including Unicode, JSON, whitespace and URL punctuation. */
export function generationHref(prompt: string): string {
  const url = new URL('/', GENERATION_ORIGIN);
  url.searchParams.set('prompts', prompt);
  return url.href;
}
