import entries from '@/data/localized-case-copy.json';
import type {Locale} from '@/lib/catalog/types';

const copy: Record<string, Record<Locale, string>> = entries;
/** Site-authored display translations; never used for prompt text or variable values. */
export function caseCopy(value: string, locale: Locale): string {
  if (!value) return value;
  const translated = copy[value]?.[locale];
  if (!translated?.trim()) throw new Error(`Missing ${locale} case display translation: ${value}`);
  return translated;
}
export function caseSearchLabels(title: string, summary: string): string[] {
  return [...new Set([title, summary, ...(['zh-CN','en'] as const).flatMap(locale=>[caseCopy(title,locale),caseCopy(summary,locale)])])];
}
