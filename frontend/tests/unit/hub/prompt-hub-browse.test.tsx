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

function taxonomy(overrides: Partial<TaxonomyWithCount>): TaxonomyWithCount {
  return {
    id: "useCase:fashion",
    axis: "useCase",
    slug: "fashion",
    label: "Fashion",
    labelZh: "时尚",
    href: null,
    wireframeDeclaredCount: null,
    count: 2,
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

const collections: CollectionWithCount[] = [
  {
    id: "collection:advertising",
    slug: "advertising",
    title: "广告创意合集",
    subtitle: "面向投放的广告画面",
    rule: { type: "axis-all", conditions: [{ axis: "useCase", value: "advertising" }] },
    count: 3,
    sampleIds: [],
  },
];

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
  },
];

function renderBrowse(featuredPrompt: PromptSummary | null = featured) {
  return render(
    <PromptHubBrowse
      locale="zh-CN"
      basePath={BASE}
      observedAt={OBSERVED_AT}
      featured={featuredPrompt}
      trendingWindows={[
        { window: "all", label: "全部时段", items: [trendingItem], note: null, windowStart: null },
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
      creators={creators}
    />,
  );
}

describe("PromptHubBrowse", () => {
  it("renders the wireframe's section order as level-2 headings", () => {
    renderBrowse();

    const headings = screen.getAllByRole("heading", { level: 2 }).map((node) => node.textContent);
    expect(headings).toEqual([
      "本期精选",
      "热门提示词",
      "按任务浏览",
      "镜头与技法",
      "按模型浏览",
      "按风格浏览",
      "精选合集",
      "创作者",
      "找到合适的提示词，直接开始",
    ]);
  });

  it("renders the featured prompt with its own copy target id", () => {
    renderBrowse();

    const section = screen.getByRole("region", { name: "本期精选" });
    expect(within(section).getByRole("heading", { name: featured.title, level: 3 })).toBeInTheDocument();
    expect(section.querySelector(`#featured-${featured.id}`)).not.toBeNull();
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

  it("ends with a real CTA link into the image gallery", () => {
    renderBrowse();

    const section = screen.getByRole("region", { name: "找到合适的提示词，直接开始" });
    expect(within(section).getByRole("link")).toHaveAttribute("href", "/zh-CN/prompts/image");
  });

  it("emits no placeholder hrefs anywhere", () => {
    renderBrowse();

    for (const link of screen.getAllByRole("link")) {
      expect(link.getAttribute("href")).not.toBe("#");
    }
  });
});
