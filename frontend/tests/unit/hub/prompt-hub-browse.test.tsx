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

/** Section id → the `<h2>` that labels its region, for `getByRole("region")`. */
const HEADING_BY_ID: Record<string, string> = {
  tasks: "按任务浏览",
  camera: "镜头与运动",
  models: "按模型浏览",
  styles: "按风格浏览",
  collections: "精选合集",
  creators: "创作者",
};

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
      useCases={[taxonomy({})]}
      techniques={[
        taxonomy({ id: "technique:camera", axis: "technique", slug: "camera", labelZh: "镜头运动", count: 5 }),
      ]}
      models={[
        taxonomy({
          id: "model:nano-banana-pro",
          axis: "model",
          slug: "nano-banana-pro",
          label: "Nano Banana Pro",
          labelZh: null,
          href: "/zh-CN/prompts/models/nano-banana-pro",
          count: 6,
        }),
      ]}
      styles={[taxonomy({ id: "style:cinematic", axis: "style", slug: "cinematic", labelZh: "电影感", count: 4 })]}
      collections={collections}
      creators={creatorsOverride}
      cameraShareTenths={8}
      libraryTotal={35}
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
      "按任务浏览",
      "镜头与运动",
      "按模型浏览",
      "按风格浏览",
      "精选合集",
      "创作者",
      "找到合适的提示词，直接开始",
    ]);
  });

  it("gives the six anchored sections the ids AnchorNav links to", () => {
    const { container } = renderBrowse();

    for (const id of ["tasks", "camera", "models", "styles", "collections", "creators"]) {
      expect(container.querySelector(`#${id}`)).not.toBeNull();
    }
  });

  it("quotes the prototype's section descriptions, with the camera share measured", () => {
    renderBrowse();

    expect(
      screen.getByText("从要做的事情出发：广告、时尚、美妆、餐饮……"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "8 成提示词带镜头语言——推拉、环绕、跟拍、转场、分镜。这是这批提示词最有价值的部分。",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("按主题整理的提示词合集。")).toBeInTheDocument();
    expect(screen.getByText("这些提示词的原作者，点击访问其 X 主页。")).toBeInTheDocument();
    expect(screen.getByText("全部提示词免费复制，注明原作者与出处。")).toBeInTheDocument();
  });

  it("adds no description to the sections the prototype leaves bare", () => {
    renderBrowse();

    for (const name of ["本期精选", "热门提示词", "按模型浏览", "按风格浏览"]) {
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

  it("gives each browse band its own accent so the six stop reading as one grid", () => {
    renderBrowse();

    // In the prototype's band order: 按任务 / 镜头与运动 / 按模型 / 按风格 / 精选合集 / 创作者.
    const accents = Object.values(HEADING_BY_ID).map((name) => {
      const region = screen.getByRole("region", { name });
      return region.querySelector("span[style]")?.className ?? "";
    });

    for (const className of accents) {
      expect(className).toMatch(/bg-(accent-red|accent-blue|accent-yellow|foreground)/);
    }
    for (let index = 1; index < accents.length; index += 1) {
      expect(accents[index]).not.toBe(accents[index - 1]);
    }
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
