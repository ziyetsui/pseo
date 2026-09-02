import type { Locale } from "@/lib/i18n/config";
import { blogHome, modelPage, promptsHome, promptsImage } from "@/lib/i18n/routes";

export interface NavItem {
  href: string;
  label: string;
}

/** Featured model page (L3) linked from the primary navigation. */
export const FEATURED_MODEL_SLUG = "nano-banana-pro";

/**
 * Primary navigation. Every entry points at a route that exists in this build —
 * aggregation pages that are not implemented yet (video, use cases, styles,
 * creators) are deliberately absent rather than rendered as `#` placeholders.
 */
export function getPrimaryNav(locale: Locale): NavItem[] {
  return [
    { href: promptsHome(locale), label: "提示词" },
    { href: promptsImage(locale), label: "图片提示词" },
    { href: modelPage(locale, FEATURED_MODEL_SLUG), label: "模型" },
    { href: blogHome(locale), label: "Blog" },
  ];
}
