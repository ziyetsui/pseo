import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type {
  CollectionWithCount,
  CreatorWithCount,
  PromptSummary,
  TaxonomyWithCount,
} from "@/lib/content/types";

import { makePromptSummary } from "../support/prompt-fixtures";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(""),
  usePathname: () => "/zh-CN/prompts",
}));

const { PromptHubBrowse } = await import("@/features/hub/PromptHubBrowse");

const BASE = "/zh-CN/prompts";
const OBSERVED_AT = "2026-08-20";

/**
 * Section id → the `<h2>` that labels its region, for `getByRole("region")`.
 *
 * Three bands are absent on purpose: 按任务浏览 / 镜头与运动 / 按风格浏览
 * printed the same 18 taxonomy values, with the same counts, pointing at the
 * same `?useCase=` / `?technique=` / `?style=` URLs as the facet chip rows
 * above them, and have been deleted.
 */
const HEADING_BY_ID: Record<string, string> = {
  models: "按模型浏览",
  collections: "精选合集",
  creators: "创作者",
};

/** The band headings this component must NOT render any more. */
const DELETED_BANDS = ["按任务浏览", "镜头与运动", "按风格浏览"];

function taxonomy(overrides: Partial<TaxonomyWithCount>): TaxonomyWithCount {
  return {
    id: "useCase:fashion",
    axis: "useCase",
    slug: "fashion",
    label: "Fashion",
    labelZh: "时尚",
    aliases: [],
    href: null,
    wireframeDeclaredCount: null,
    count: 2,
    highValueCount: 1,
    ...overrides,
  };
}

const featured = makePromptSummary({
  id: "featured-1",
  slug: "one-take-space-cafe",
  href: "/zh-CN/prompts/one-take-space-cafe",
  title: "一镜到底：从深空到街边咖啡馆",
});

const trendingItem = makePromptSummary({
  id: "trending-1",
  slug: "neon-street",
  href: "/zh-CN/prompts/neon-street",
  title: "霓虹街道",
});

function makeCollection(index: number): CollectionWithCount {
  return {
    id: `collection:c${index}`,
    slug: `c${index}`,
    title: `合集 ${index}`,
    subtitle: `副标题 ${index}`,
    rule: { type: "axis-all", conditions: [{ axis: "useCase", value: "advertising" }] },
    count: 3,
    sampleIds: [],
    promptIds: [],
  };
}

const collections: CollectionWithCount[] = Array.from({ length: 8 }, (_, index) =>
  makeCollection(index),
);

const creators: CreatorWithCount[] = [
  {
    id: "creator:azed_ai",
    handle: "azed_ai",
    url: "https://x.com/azed_ai",
    avatarUrl: null,
    followers: null,
    wireframeDeclaredPromptCount: null,
    wireframeDeclaredLikes: null,
    wireframeDeclaredBookmarks: null,
    count: 2,
    likes: 128,
    bookmarks: 44,
  },
];

function manyCreators(count: number): CreatorWithCount[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `creator:handle-${index}`,
    handle: `handle_${index}`,
    url: `https://x.com/handle_${index}`,
    avatarUrl: null,
    followers: null,
    wireframeDeclaredPromptCount: null,
    wireframeDeclaredLikes: null,
    wireframeDeclaredBookmarks: null,
    count: 1,
    likes: null,
    bookmarks: null,
  }));
}

/** Nine models, as the fixture has — one more than the old `taxonomyLimit`. */
const models: TaxonomyWithCount[] = Array.from({ length: 9 }, (_, index) =>
  taxonomy({
    id: `model:m${index}`,
    axis: "model",
    slug: `m${index}`,
    label: `Model ${index}`,
    labelZh: null,
    href: `/zh-CN/prompts/models/m${index}`,
    count: 9 - index,
  }),
);

function renderBrowse(
  featuredPrompt: PromptSummary | null = featured,
  creatorsOverride: readonly CreatorWithCount[] = creators,
) {
  return render(
    <PromptHubBrowse
      locale="zh-CN"
      basePath={BASE}
      observedAt={OBSERVED_AT}
      featured={featuredPrompt}
      trendingWindows={[
        { window: "all", label: "全部", items: [trendingItem], note: null, windowStart: null },
      ]}
      models={models}
      collections={collections}
      creators={creatorsOverride}
    />,
  );
}

describe("PromptHubBrowse", () => {
  it("renders the prototype's section order as level-2 headings", () => {
    renderBrowse();

    const headings = screen.getAllByRole("heading", { level: 2 }).map((node) => node.textContent);
    expect(headings).toEqual([
      "本期精选",
      "热门提示词",
      "按模型浏览",
      "精选合集",
      "创作者",
      "找到合适的提示词，直接开始",
    ]);
  });

  it("no longer renders the three bands the chip rows already carried", () => {
    const { container } = renderBrowse();

    for (const heading of DELETED_BANDS) {
      expect(screen.queryByRole("heading", { name: heading })).toBeNull();
    }
    for (const id of ["tasks", "camera", "styles"]) {
      expect(container.querySelector(`#${id}`)).toBeNull();
    }
    // Their descriptions go with them; nothing else printed either sentence.
    expect(screen.queryByText("从要做的事情出发：广告、时尚、美妆、餐饮……")).toBeNull();
    expect(screen.queryByText(/成提示词带镜头语言/)).toBeNull();
  });

  it("gives the three anchored sections the ids AnchorNav links to", () => {
    const { container } = renderBrowse();

    for (const id of Object.keys(HEADING_BY_ID)) {
      expect(container.querySelector(`#${id}`)).not.toBeNull();
    }
  });

  it("lists EVERY model, so no model page is reachable only from a chip", () => {
    renderBrowse();

    // 按模型浏览 is the hub's only route to `/prompts/models/*`. It used to be
    // capped at 8 tiles, which silently hid the 9th model (Veo) even though its
    // page exists and the chip row links it. There is no cap any more.
    const section = screen.getByRole("region", { name: "按模型浏览" });
    const links = within(section).getAllByRole("link");
    expect(links).toHaveLength(models.length);
    expect(links.map((link) => link.getAttribute("href"))).toEqual(
      models.map((model) => model.href),
    );
  });

  it("quotes the prototype's section descriptions", () => {
    renderBrowse();

    expect(screen.getByText("按主题整理的提示词合集。")).toBeInTheDocument();
    expect(screen.getByText("这些提示词的原作者，点击访问其 X 主页。")).toBeInTheDocument();
    expect(screen.getByText("全部提示词免费复制，注明原作者与出处。")).toBeInTheDocument();
  });

  it("adds no description to the sections the prototype leaves bare", () => {
    renderBrowse();

    for (const name of ["本期精选", "热门提示词", "按模型浏览"]) {
      const section = screen.getByRole("region", { name });
      expect(section.textContent).not.toContain("已排除");
      expect(section.textContent).not.toContain("已建成模型页");
    }
  });

  it("renders the featured prompt as the two-column block, not a card", () => {
    renderBrowse();

    const section = screen.getByRole("region", { name: "本期精选" });
    expect(within(section).getByTestId("featured-prompt")).toBeInTheDocument();
    expect(within(section).getByRole("heading", { name: featured.title, level: 3 })).toBeInTheDocument();
    expect(section.querySelector(`#featured-${featured.id}`)).not.toBeNull();
    // The prototype shows the featured prompt in full: no expand toggle.
    expect(within(section).queryByRole("button", { name: "展开" })).toBeNull();
    expect(within(section).getByRole("button", { name: "复制提示词" })).toBeInTheDocument();
    expect(within(section).getByRole("link", { name: /查看原帖/ })).toHaveAttribute(
      "href",
      featured.source.url,
    );
  });

  it("keeps the trending grid on a different id namespace so ids stay unique", () => {
    const { container } = renderBrowse();

    expect(container.querySelector(`#trending-${trendingItem.id}`)).not.toBeNull();
    expect(container.querySelectorAll("pre[id]")).toHaveLength(2);
  });

  it("degrades to an empty state when nothing is featured", () => {
    renderBrowse(null);

    const section = screen.getByRole("region", { name: "本期精选" });
    expect(section.querySelector('[data-state="empty"]')).not.toBeNull();
  });

  it("shows the prototype's six collection tiles, each linking to its collection state", () => {
    renderBrowse();

    const section = screen.getByRole("region", { name: "精选合集" });
    const links = within(section).getAllByRole("link");
    expect(links).toHaveLength(6);
    expect(links[0]).toHaveAttribute("href", "/zh-CN/prompts?collection=c0");
    expect(section.textContent).toContain("副标题 0");
    expect(section.textContent).toContain("3 条");
  });

  it("gives each browse band its own accent so the three stop reading as one grid", () => {
    renderBrowse();

    // In page order: 按模型浏览 / 精选合集 / 创作者.
    const accents = Object.values(HEADING_BY_ID).map((name) => {
      const region = screen.getByRole("region", { name });
      // Two bands paint the accent as the tile's top edge and 精选合集 paints
      // it as the spine, so ask for the first decorative element that is
      // filled in one of the four accents rather than for a shape.
      const accented = [...region.querySelectorAll('span[aria-hidden="true"]')].find((node) =>
        /bg-(accent-red|accent-blue|accent-yellow|foreground)(\s|$)/.test(node.className),
      );
      return accented?.className ?? "";
    });

    for (const className of accents) {
      expect(className).toMatch(/bg-(accent-red|accent-blue|accent-yellow|foreground)/);
    }
    for (let index = 1; index < accents.length; index += 1) {
      expect(accents[index]).not.toBe(accents[index - 1]);
    }
  });

  it("marks each of the three browse bands with a ghost numeral, 01 through 03", () => {
    const { container } = renderBrowse();

    const numerals = [...container.querySelectorAll('span[aria-hidden="true"]')].filter((node) =>
      node.className.includes("text-foreground/10"),
    );
    expect(
      numerals.map((node) => (node as HTMLElement).style.getPropertyValue("--ghost-numeral")),
    // Renumbered when the three duplicate bands went: the numerals count the
    // bands that exist, so there is no 04 pointing at nothing.
    ).toEqual(['"01"', '"02"', '"03"']);

    // Decoration only: every band keeps its own heading, at level 2, with its
    // wording and its anchor id unchanged.
    for (const [id, heading] of Object.entries(HEADING_BY_ID)) {
      const node = screen.getByRole("heading", { level: 2, name: heading });
      expect(node).toHaveAttribute("id", id);
      expect(node.textContent).toBe(heading);
    }
    // The numerals are not part of any accessible name.
    for (const numeral of numerals) {
      expect(numeral.closest("h2")).toBeNull();
    }
  });

  it("leaves the bands that are not browse grids unnumbered", () => {
    const { container } = renderBrowse();

    const numbered = [...container.querySelectorAll("section")].filter((section) =>
      [...section.querySelectorAll('span[aria-hidden="true"]')].some((node) =>
        node.className.includes("text-foreground/10"),
      ),
    );
    expect(numbered.map((section) => section.getAttribute("aria-labelledby"))).toEqual(
      Object.keys(HEADING_BY_ID),
    );
    // 本期精选 / 热门提示词 / the CTA are bands too, and stay unmarked.
    expect(container.querySelectorAll("section").length).toBeGreaterThan(numbered.length);
  });

  it("ends with the CTA opening the whole library in the result region", () => {
    renderBrowse();

    const section = screen.getByRole("region", { name: "找到合适的提示词，直接开始" });
    expect(within(section).getByRole("link", { name: "浏览全部提示词" })).toHaveAttribute(
      "href",
      "/zh-CN/prompts?collection=all",
    );
  });

  it("emits no placeholder hrefs anywhere", () => {
    renderBrowse();

    for (const link of screen.getAllByRole("link")) {
      expect(link.getAttribute("href")).not.toBe("#");
    }
  });

  it("shows 7 creator tiles, matching the prototype", () => {
    renderBrowse(featured, manyCreators(9));

    const section = screen.getByRole("region", { name: "创作者" });
    expect(within(section).getAllByRole("listitem")).toHaveLength(7);
  });
});
