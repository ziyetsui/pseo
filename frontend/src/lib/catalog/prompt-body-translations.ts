import { createHash } from 'node:crypto';
import { placeholderTokens } from './placeholders';
import type { Prompt } from './types';

export type PromptBodyTranslations = Record<string, { sourceHash: string; text: string }>;

/** Preserve execution structure while allowing string leaves to be translated. */
function jsonContract(value: unknown): unknown {
  if (typeof value === 'string') return { type: 'string' };
  if (Array.isArray(value)) return { type: 'array', items: value.map(jsonContract) };
  if (value !== null && typeof value === 'object') return { type: 'object', entries: Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, jsonContract(item)]) };
  return { type: typeof value, value };
}

/** Server-side projection only; source records stay immutable. */
export function translatedPromptBody(prompt: Prompt, translations: PromptBodyTranslations): Pick<Prompt, 'prompt' | 'language' | 'originalPrompt' | 'originalLanguage'> {
  const entry = translations[prompt.id];
  const expectedHash = `sha256:${createHash('sha256').update(prompt.prompt, 'utf8').digest('hex')}`;
  if (!entry || entry.sourceHash !== expectedHash || !entry.text?.trim()) throw new Error(`Missing or stale Chinese prompt translation: ${prompt.id}`);
  const tokens = (text: string) => placeholderTokens(text).sort().map(token => [token, text.split(token).length - 1]);
  if (JSON.stringify(tokens(entry.text)) !== JSON.stringify(tokens(prompt.prompt))) throw new Error(`Changed placeholders in Chinese prompt translation: ${prompt.id}`);
  let sourceJson = false;
  try { JSON.parse(prompt.prompt); sourceJson = true; } catch { /* Source prose remains prose. */ }
  if (sourceJson) {
    try {
      if (JSON.stringify(jsonContract(JSON.parse(entry.text))) !== JSON.stringify(jsonContract(JSON.parse(prompt.prompt)))) throw new Error('Changed JSON structure');
    } catch { throw new Error(`Invalid JSON contract in Chinese prompt translation: ${prompt.id}`); }
  }
  return entry.text === prompt.prompt ? { prompt: prompt.prompt, language: 'zh-CN', ...(prompt.language !== 'zh-CN' ? { originalLanguage: prompt.language } : {}) } : { prompt: entry.text, language: 'zh-CN', originalPrompt: prompt.prompt, originalLanguage: prompt.language };
}
