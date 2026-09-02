import { render, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { getContentRepository } from "@/lib/content";

/**
 * One rule, pinned in both directions.
 *
 * The prototype writes taxonomy VALUES in English everywhere it lists them for
 * filtering or browsing — facet chips, browse tiles and card tags on L1, L2 and
 * L3 alike (`Fashion`, `Beauty`, `Photorealistic`,
 * `Camera movement / shot language`). It writes AXIS NAMES in Chinese
 * (模型 / 任务 / 技法 / 风格 on L1; 用例 / 风格 / 主体 on L2 and L3), and it keeps
 * Chinese for the surfaces that are Chinese prose: the L1 footer columns, the
 * L2 其他类型 tiles and 相关 用例 column, and the L4 detail page's chips.
 *
 * Before this suite the three list pages mixed the two — `美妆` next to
 * `Web & motion design` in the same chip row, and `Beauty` on the tile right
 * below it. This test fails if that ever comes back, and equally if someone
 * "fixes" the Chinese surfaces into English.
 */

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(""),
  usePathname: () => "/zh-CN/prompts",
  notFound: () => {
    throw new Error("notFound() called");
  },
}));

const { default: PromptsPage } = await import("@/app/[locale]/(hub)/prompts/page");
const { default: ImageGalleryPage } = await import(
  "@/app/[locale]/(gallery)/prompts/image/page"
);
const { default: ModelPage } = await import(
  "@/app/[locale]/(site)/prompts/models/[modelSlug]/page"
);

const CJK = /[\u3400-\u9fff\uf900-\ufaff]/;

/** Axis names, which stay Chinese, keyed by the page that writes them. */
const AXIS_NAMES: Record<string, readonly string[]> = {
  L1: ["模型", "任务", "技法", "风格"],
  L2: ["用例", "风格", "主体"],
  L3: ["用例", "风格", "主体"],
};

const PAGES: readonly [string, () => Promise<React.ReactElement>][] = [
  ["L1", () => PromptsPage({ params: Promise.resolve({ locale: "zh-CN" }) })],
  ["L2", () => ImageGalleryPage({ params: Promise.resolve({ locale: "zh-CN" }) })],
  [
    "L3",
    () => ModelPage({ params: Promise.resolve({ locale: "zh-CN", modelSlug: "nano-banana-pro" }) }),
  ],
];

const FILTERABLE = ["model", "useCase", "technique", "style", "subject"] as const;

/** Chip text without its trailing count, e.g. `Fashion 12` → `Fashion`. */
function chipValue(node: Element): string {
  return (node.textContent ?? "").replace(/\d[\d,.]*\s*$/, "").trim();
}

/**
 * Every value a chip or tile is allowed to print (`label`), and every value it
 * must NOT print because the same term already has a canonical one
 * (`labelZh`, where the two differ).
 */
async function vocabulary() {
  const repository = getContentRepository();
  const allowed = new Set<string>();
  const forbidden = new Set<string>();
  for (const axis of FILTERABLE) {
    for (const term of await repository.listTaxonomies("zh-CN", axis)) {
      allowed.add(term.label);
      if (term.labelZh !== null && term.labelZh !== term.label) forbidden.add(term.labelZh);
    }
  }
  return { allowed, forbidden };
}

describe.each(PAGES)("%s facet chips speak one language", (page, renderPage) => {
  it("names every axis in Chinese and every value with the term's canonical label", async () => {
    const { allowed, forbidden } = await vocabulary();
    const { container } = render(await renderPage());

    const axes = AXIS_NAMES[page] ?? [];
    expect(axes.length).toBeGreaterThan(0);

    for (const axis of axes) {
      const group = within(container).getAllByRole("group", { name: axis })[0];
      expect(group, `${page} is missing the ${axis} axis`).toBeDefined();

      const chips = within(group as HTMLElement).getAllByRole("link");
      expect(chips.length).toBeGreaterThan(0);
      for (const chip of chips) {
        const value = chipValue(chip);
        expect(forbidden.has(value), `${page} ${axis} chip "${value}" uses labelZh`).toBe(false);
        expect(allowed.has(value), `${page} ${axis} chip "${value}" is not a taxonomy label`).toBe(
          true,
        );
      }
    }
  });
});

describe("taxonomy label sources", () => {
  it("keeps one canonical value per filterable term — English wherever the wireframe has one", async () => {
    const repository = getContentRepository();
    const chineseOnly: string[] = [];
    for (const axis of FILTERABLE) {
      for (const term of await repository.listTaxonomies("zh-CN", axis)) {
        if (!CJK.test(term.label)) continue;
        // A Chinese `label` is only honest when the wireframe never wrote an
        // English one for that term — inventing a translation would be data
        // the prototype does not contain (AGENTS.md §1).
        expect(term.labelZh, `${axis}:${term.slug}`).toBe(term.label);
        chineseOnly.push(`${axis}:${term.slug}`);
      }
    }
    // Exactly one such term today: 微缩摄影, which only the L4 page names.
    expect(chineseOnly).toEqual(["technique:miniature-photography"]);
  });

  it("keeps the Chinese vocabulary the prototype's Chinese surfaces need", async () => {
    const repository = getContentRepository();
    // The L2 其他类型 tiles print these verbatim (图片 / 视频 / 未标注类型).
    const contentTypes = await repository.listTaxonomies("zh-CN", "contentType");
    expect(contentTypes.length).toBeGreaterThan(0);
    for (const term of contentTypes) {
      expect(term.labelZh).not.toBeNull();
      expect(CJK.test(term.labelZh ?? "")).toBe(true);
    }

    // The L1 footer's 按风格 column writes 写实风提示词; the L4 kicker writes the
    // Chinese alias 超写实 for the same term. Both come from data, not literals.
    const styles = await repository.listTaxonomies("zh-CN", "style");
    const photorealistic = styles.find((term) => term.slug === "photorealistic");
    expect(photorealistic?.labelZh).toBe("写实风");
    expect(photorealistic?.aliases).toContain("超写实");
  });
});
