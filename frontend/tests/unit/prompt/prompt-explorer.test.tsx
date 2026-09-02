import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { FacetGroup, PromptSummary } from "@/lib/content/types";

import { makePromptSummary, makeTaxonomy } from "../support/prompt-fixtures";

/**
 * The explorer reads its whole state from the URL, so every test drives it by
 * setting the search string a mocked `useSearchParams` hands back.
 */
let search = "";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(search),
  usePathname: () => "/zh-CN/prompts",
}));

const { PromptExplorer } = await import("@/features/prompt/PromptExplorer");

const BASE = "/zh-CN/prompts";

const seedance = makeTaxonomy({
  id: "model:seedance",
  axis: "model",
  slug: "seedance",
  label: "Seedance",
  href: "/zh-CN/prompts/models/seedance",
});
const kling = makeTaxonomy({
  id: "model:kling",
  axis: "model",
  slug: "kling",
  label: "Kling",
  href: "/zh-CN/prompts/models/kling",
});
const cinematic = makeTaxonomy({
  id: "style:cinematic",
  axis: "style",
  slug: "cinematic",
  label: "Cinematic",
  labelZh: "电影感",
});
const realistic = makeTaxonomy({
  id: "style:realistic",
  axis: "style",
  slug: "realistic",
  label: "Photorealistic",
  labelZh: "写实",
});

const prompts: PromptSummary[] = [
  makePromptSummary({
    id: "a",
    slug: "glass-cube-city",
    href: "/zh-CN/prompts/glass-cube-city",
    title: "玻璃立方城市",
    models: [seedance],
    styles: [cinematic],
    searchText: "玻璃立方城市 glass cube seedance cinematic",
  }),
  makePromptSummary({
    id: "b",
    slug: "neon-street",
    href: "/zh-CN/prompts/neon-street",
    title: "霓虹街道",
    models: [kling],
    styles: [cinematic],
    searchText: "霓虹街道 neon street kling cinematic",
  }),
  makePromptSummary({
    id: "c",
    slug: "studio-portrait",
    href: "/zh-CN/prompts/studio-portrait",
    title: "白色影棚人像",
    models: [seedance],
    styles: [realistic],
    searchText: "白色影棚人像 studio portrait seedance photorealistic",
  }),
];

const facetGroups: FacetGroup[] = [
  {
    key: "model",
    axis: "model",
    label: "模型",
    options: [
      { slug: "seedance", label: "Seedance", count: 2, selected: false },
      { slug: "kling", label: "Kling", count: 1, selected: false },
    ],
  },
  {
    key: "useCase",
    axis: "useCase",
    label: "任务",
    options: [{ slug: "poster", label: "海报", count: 3, selected: false }],
  },
  {
    key: "technique",
    axis: "technique",
    label: "技法",
    options: [],
  },
  {
    key: "style",
    axis: "style",
    label: "风格",
    options: [
      { slug: "cinematic", label: "电影感", count: 2, selected: false },
      { slug: "realistic", label: "写实", count: 1, selected: false },
    ],
  },
  {
    key: "subject",
    axis: "subject",
    label: "主体",
    options: [],
  },
];

function renderExplorer() {
  return render(
    <PromptExplorer
      locale="zh-CN"
      basePath={BASE}
      prompts={prompts}
      facetGroups={facetGroups}
      facetAxes={["model", "useCase", "technique", "style"]}
      browse={<p data-testid="browse-body">浏览区内容</p>}
    />,
  );
}

function browseRegion() {
  return screen.getByTestId("prompt-explorer-browse");
}

function resultCards() {
  return screen.queryAllByRole("article");
}

beforeEach(() => {
  search = "";
});

describe("PromptExplorer", () => {
  it("shows the browse content and no results region when nothing is filtered", () => {
    renderExplorer();

    expect(browseRegion()).toBeVisible();
    expect(screen.getByTestId("browse-body")).toBeVisible();
    expect(screen.queryByRole("heading", { name: "筛选结果", level: 2 })).not.toBeInTheDocument();
    expect(resultCards()).toHaveLength(0);
  });

  it("still renders the search form and facet chips in the browse state", () => {
    renderExplorer();

    expect(screen.getByRole("search")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "模型" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "风格" })).toBeInTheDocument();
  });

  it("filters by free text, hides the browse region and announces the count", () => {
    search = "q=cube";
    renderExplorer();

    expect(resultCards()).toHaveLength(1);
    expect(screen.getByRole("heading", { name: "筛选结果", level: 2 })).toBeInTheDocument();
    expect(browseRegion()).not.toBeVisible();

    const live = screen.getByText(/找到 1 条提示词/);
    expect(live).toHaveAttribute("role", "status");
    expect(live).toHaveAttribute("aria-live", "polite");
  });

  it("ORs several values on the same axis", () => {
    search = "model=seedance&model=kling";
    renderExplorer();

    expect(resultCards()).toHaveLength(3);
  });

  it("ANDs across axes", () => {
    search = "model=seedance&style=cinematic";
    renderExplorer();

    expect(resultCards()).toHaveLength(1);
    expect(screen.getByRole("heading", { name: "玻璃立方城市" })).toBeInTheDocument();
  });

  it("ANDs the free-text term with the facets", () => {
    search = "q=cube&model=kling";
    renderExplorer();

    expect(resultCards()).toHaveLength(0);

    const noResults = document.querySelector('[data-state="no-results"]');
    expect(noResults).not.toBeNull();
    // The dead end names the conditions that produced it and offers a way out.
    expect(noResults?.textContent).toContain("关键词「cube」");
    expect(noResults?.textContent).toContain("模型：Kling");
    expect(within(noResults as HTMLElement).getByRole("link", { name: "清除全部筛选" })).toBeInTheDocument();
  });

  it("offers a link that removes exactly one filter and keeps the rest", () => {
    search = "model=seedance&style=cinematic";
    renderExplorer();

    const remove = screen.getByRole("link", { name: "移除筛选：模型：Seedance" });
    expect(remove).toHaveAttribute("href", `${BASE}?style=cinematic`);

    const reset = screen.getByRole("link", { name: "清除全部筛选" });
    expect(reset).toHaveAttribute("href", BASE);
  });

  it("ignores the trending window param instead of treating it as a filter", () => {
    search = "window=7d";
    renderExplorer();

    expect(browseRegion()).toBeVisible();
    expect(screen.queryByRole("heading", { name: "筛选结果", level: 2 })).not.toBeInTheDocument();
  });

  it("warns about unknown params instead of silently dropping them", () => {
    search = "foo=1";
    renderExplorer();

    expect(screen.getByText(/未知参数/)).toHaveTextContent("foo");
    // An unrecognised param is not a filter, so browsing still works.
    expect(browseRegion()).toBeVisible();
  });

  it("reports a facet value this data set has never heard of", () => {
    search = "model=does-not-exist";
    renderExplorer();

    expect(screen.getByText(/未知参数/)).toHaveTextContent("model=does-not-exist");
  });

  it("recomputes facet counts against the other axes' current selection", () => {
    search = "style=cinematic";
    renderExplorer();

    const models = screen.getByRole("group", { name: "模型" });
    // With 电影感 selected, each model has exactly one matching prompt.
    expect(within(models).getByRole("link", { name: /Seedance/ })).toHaveTextContent("1");
    expect(within(models).getByRole("link", { name: /Kling/ })).toHaveTextContent("1");

    // The selected axis itself is counted with that axis released.
    const styles = screen.getByRole("group", { name: "风格" });
    expect(within(styles).getByRole("link", { name: /电影感/ })).toHaveTextContent("2");
    expect(within(styles).getByRole("link", { name: /写实/ })).toHaveTextContent("1");
  });

  it("only renders the facet axes it was asked for", () => {
    renderExplorer();

    expect(screen.queryByRole("group", { name: "主体" })).not.toBeInTheDocument();
  });
});
