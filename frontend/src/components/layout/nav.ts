import type { Locale } from "@/lib/i18n/config";
import { promptsHome, promptsImage } from "@/lib/i18n/routes";

/**
 * Stable identity for a nav entry, used by pages to mark the current one with
 * `aria-current="page"` without matching on labels or hrefs.
 */
export type NavKey =
  | "home"
  | "image"
  | "video"
  | "models"
  | "useCases"
  | "styles"
  | "creators";

export interface NavItem {
  key: NavKey;
  label: string;
  /**
   * `null` for a destination the prototype links but this phase does not build.
   * Those entries render as plain text carrying `note`, never as a link or a
   * `#` placeholder (global constraint 5).
   */
  href: string | null;
  note?: string;
}

/** Suffix shown next to a nav entry whose page is not published yet. */
export const COMING_SOON_NOTE = "（即将推出）";

/**
 * Primary navigation: the prototype's L2/L3 site nav
 * (`首页 图片 视频 模型 用例 风格 创作者`).
 *
 * Only 首页 (L1) and 图片 (L2) have routes in this phase. 视频, 用例, 风格 and
 * 创作者 have no page at all; 模型 in the prototype points at the
 * `/prompts/models` index, which this phase also does not build — an individual
 * model page exists, but it is not that index, so linking 模型 there would
 * misrepresent the destination. All five are therefore rendered as non-link
 * text with `（即将推出）`.
 */
export function getPrimaryNav(locale: Locale): NavItem[] {
  return [
    { key: "home", label: "首页", href: promptsHome(locale) },
    { key: "image", label: "图片", href: promptsImage(locale) },
    { key: "video", label: "视频", href: null, note: COMING_SOON_NOTE },
    { key: "models", label: "模型", href: null, note: COMING_SOON_NOTE },
    { key: "useCases", label: "用例", href: null, note: COMING_SOON_NOTE },
    { key: "styles", label: "风格", href: null, note: COMING_SOON_NOTE },
    { key: "creators", label: "创作者", href: null, note: COMING_SOON_NOTE },
  ];
}
