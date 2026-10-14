import { uiText } from '@/lib/i18n/text';
import type { Locale, Prompt } from "@/lib/catalog/types";

export function generationLabel(kind: Prompt["kind"] | undefined, locale: Locale = 'en'): string {
  if (kind === "image") return uiText(locale, "Generate image");
  if (kind === "video") return uiText(locale, "Generate video");
  return uiText(locale, "Generate");
}
