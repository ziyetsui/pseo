import type { Locator, Page } from "@playwright/test";

/**
 * The route contract these end-to-end tests drive, written out literally.
 *
 * Deliberately NOT imported from `src/lib/i18n/routes.ts`: an e2e suite that
 * derives its expectations from the same builder the app uses would still pass
 * if that builder started emitting the wrong paths. These strings are the
 * spec's copy of the contract from `global-constraints.md` §5.
 */
export const ROUTES = {
  l1: "/zh-CN/prompts",
  l2: "/zh-CN/prompts/image",
  l3: "/zh-CN/prompts/models/nano-banana-pro",
  /** The golden prompt: the one detail page with a `[COUNTRY]` variable. */
  l4: "/zh-CN/prompts/country-miniature-stamp-poster",
  blog: "/zh-CN/blog",
  blogArticle: "/zh-CN/blog/stamp-poster-case-study",
  notFound: "/404.html",
  missing: "/zh-CN/prompts/does-not-exist",
} as const;

/** The four content levels, in the order a reader walks them. */
export const LEVELS = [
  { key: "l1", label: "L1 提示词库", path: ROUTES.l1 },
  { key: "l2", label: "L2 图片提示词", path: ROUTES.l2 },
  { key: "l3", label: "L3 模型页", path: ROUTES.l3 },
  { key: "l4", label: "L4 提示词详情", path: ROUTES.l4 },
] as const;

/**
 * The explorer's single result-count live region. Every list page mounts
 * exactly one `role="status"` with this copy; other status regions on the page
 * (the copy buttons') never carry it, so the text is the discriminator.
 */
export function resultStatus(page: Page): Locator {
  return page.getByRole("status").filter({ hasText: /找到 \d+ 条提示词/ });
}

/** Parses `找到 N 条提示词` into `N`. */
export async function resultCount(page: Page): Promise<number> {
  const text = (await resultStatus(page).innerText()).trim();
  const match = /找到 (\d+) 条提示词/.exec(text);
  if (match?.[1] === undefined) throw new Error(`Unparseable result status: ${text}`);
  return Number(match[1]);
}

/** The facet chip row for one axis, e.g. `model`. */
export function facetGroup(page: Page, axis: string): Locator {
  return page.locator(`[role="group"][aria-labelledby="explorer-facet-${axis}"]`);
}

/**
 * Index of the chip inside `group` whose href would ADD `axis=value`.
 *
 * Chips reorder by count after every click, and slugs are prefixes of one
 * another (`nano-banana` / `nano-banana-pro`), so neither position nor a
 * substring match on the href is stable. Reading every href and parsing its
 * query in one pass is; the returned index is used against the same DOM.
 */
export async function chipIndexAdding(
  group: Locator,
  axis: string,
  value: string,
): Promise<number> {
  const hrefs = await group
    .locator("a")
    .evaluateAll((elements) => elements.map((element) => element.getAttribute("href") ?? ""));
  return hrefs.findIndex((href) => {
    const search = href.split("?")[1] ?? "";
    return new URLSearchParams(search).getAll(axis).includes(value);
  });
}

/** Every value this axis currently offers a chip for, in render order. */
export async function facetValues(group: Locator, axis: string): Promise<string[]> {
  const hrefs = await group
    .locator("a")
    .evaluateAll((elements) => elements.map((element) => element.getAttribute("href") ?? ""));
  const values: string[] = [];
  for (const href of hrefs) {
    for (const value of new URLSearchParams(href.split("?")[1] ?? "").getAll(axis)) {
      if (!values.includes(value)) values.push(value);
    }
  }
  return values;
}

/** Path + search of the page's current URL, dropping the origin. */
export function currentPath(page: Page): string {
  const url = new URL(page.url());
  return `${url.pathname}${url.search}`;
}
