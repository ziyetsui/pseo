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

const {
  PromptExplorer,
  ExplorerFacets,
  ExplorerNotices,
  ExplorerResults,
  ExplorerSearch,
  ExplorerSummary,
} = await import("@/features/prompt/PromptExplorer");

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

const collections = [
  { slug: "template-prompts", title: "模板提示词合集", promptIds: ["a", "c"] },
];

/**
 * The L1 arrangement: unlabelled filter block, then the summary line, then the
 * result region. `slots` lets a test swap in the L2/L3 placement instead.
 */
function renderExplorer(
  overrides: Record<string, unknown> = {},
  slots: { summaryStyle?: "hub" | "count"; emptyMessage?: string; facetHeading?: string } = {},
) {
  return render(
    <PromptExplorer
      locale="zh-CN"
      basePath={BASE}
      prompts={prompts}
      facetGroups={facetGroups}
      facetAxes={["model", "useCase", "technique", "style"]}
      collections={collections}
      {...overrides}
    >
      <div role="group" aria-label="筛选" className="flex flex-col gap-6">
        <ExplorerSearch placeholder="搜索提示词、模型、风格、镜头语言、创作者…" />
        <ExplorerFacets idPrefix="explorer-facet" heading={slots.facetHeading} />
        <ExplorerNotices />
      </div>
      <ExplorerSummary style={slots.summaryStyle ?? "hub"} />
      <ExplorerResults
        heading="筛选结果"
        emptyMessage={slots.emptyMessage}
        browse={<p data-testid="browse-body">浏览区内容</p>}
      />
    </PromptExplorer>,
  );
}

// Visibility (not existence) is what matters here: the wrapper around
// `browse` carries no `data-testid` in production markup (finding #8), so
// tests read the browse child's own visibility, which reflects the `hidden`
// attribute on its ancestor exactly as reliably.
function browseRegion() {
  return screen.getByTestId("browse-body");
}

function resultCards() {
  return screen.queryAllByRole("article");
}

/**
 * The one status region that reports the result count. Every result card has
 * its own unrelated copy-feedback status region, so they are filtered out.
 */
function countRegion(): HTMLElement {
  const regions = screen
    .getAllByRole("status")
    .filter((node) => /条/.test(node.textContent ?? ""));
  expect(regions).toHaveLength(1);
  return regions[0] as HTMLElement;
}

beforeEach(() => {
  search = "";
});

describe("PromptExplorer", () => {
  it("shows the browse content and no results region when nothing is filtered", () => {
    renderExplorer();

    expect(browseRegion()).toBeVisible();
    expect(screen.queryByRole("heading", { name: "筛选结果", level: 2 })).not.toBeInTheDocument();
    expect(resultCards()).toHaveLength(0);
  });

  it("mounts exactly one result-count live region, empty while browsing", () => {
    renderExplorer();

    const live = screen.getByRole("status");
    expect(live).toHaveAttribute("aria-live", "polite");
    expect(live).toHaveTextContent("");
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

    // Exactly one status region announces the RESULT COUNT — no second one
    // from ActiveFilters duplicating that particular announcement. (Each
    // result card has its own unrelated copy-feedback status region; this
    // only counts ones that actually say how many results there are.)
    const countRegions = screen
      .getAllByRole("status")
      .filter((node) => /共 \d+ 条/.test(node.textContent ?? ""));
    expect(countRegions).toHaveLength(1);
    const live = countRegions[0] as HTMLElement;
    expect(live).toHaveTextContent("共 1 条");
    expect(live).toHaveAttribute("aria-live", "polite");
  });

  it("writes the summary as the prototype does per page", () => {
    search = "q=cube";
    const { unmount } = renderExplorer({}, { summaryStyle: "hub" });
    expect(countRegion()).toHaveTextContent("共 1 条");
    unmount();

    renderExplorer({}, { summaryStyle: "count" });
    expect(countRegion()).toHaveTextContent("筛选出 1 条");
  });

  it("renders a real <h2> above the facets only when the page asks for one", () => {
    const { unmount } = renderExplorer();
    expect(screen.queryByRole("heading", { name: "按标签浏览" })).not.toBeInTheDocument();
    unmount();

    renderExplorer({}, { facetHeading: "按标签浏览" });
    expect(screen.getByRole("heading", { name: "按标签浏览", level: 2 })).toBeInTheDocument();
  });

  it("uses the page's own empty-state line and still names the conditions under it", () => {
    search = "q=cube&model=kling";
    renderExplorer({}, { emptyMessage: "没有找到匹配的提示词，换个关键词试试。" });

    const noResults = document.querySelector('[data-state="no-results"]') as HTMLElement;
    expect(noResults.textContent).toContain("没有找到匹配的提示词，换个关键词试试。");
    // Global constraint 6: the conditions that produced the dead end are still
    // spelled out, and each is still removable.
    expect(noResults.textContent).toContain("关键词「cube」");
    expect(noResults.textContent).toContain("模型：Kling");
    expect(within(noResults).getByRole("link", { name: "清除全部筛选" })).toBeInTheDocument();
  });

  it("has no 搜索与筛选 heading and no per-axis headings above the facets", () => {
    renderExplorer();

    expect(screen.queryByRole("heading", { name: "搜索与筛选" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "模型" })).not.toBeInTheDocument();
    // The grouping survives as a labelled group, just not as document structure.
    expect(screen.getByRole("group", { name: "模型" })).toBeInTheDocument();
  });

  it("filters to a collection's members and names it in the summary", () => {
    search = "collection=template-prompts";
    renderExplorer();

    expect(resultCards()).toHaveLength(2);
    expect(countRegion()).toHaveTextContent("模板提示词合集 · 共 2 条");
    expect(browseRegion()).not.toBeVisible();
  });

  it("reports an unknown collection slug instead of filtering everything away", () => {
    search = "collection=does-not-exist";
    renderExplorer();

    expect(screen.getByText(/以下筛选值不存在，已被忽略/)).toHaveTextContent(
      "collection=does-not-exist",
    );
    // Stripped before filtering, exactly like an unknown facet value: the
    // reader sees the whole set plus the warning, not an empty page.
    expect(resultCards()).toHaveLength(3);
  });

  it("lets a collection filter be removed like any other condition", () => {
    search = "collection=template-prompts&model=seedance";
    renderExplorer();

    expect(resultCards()).toHaveLength(2);
    expect(screen.getByRole("link", { name: "移除筛选：合集：模板提示词合集" })).toHaveAttribute(
      "href",
      `${BASE}?model=seedance`,
    );
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

  it("strips an unknown facet value instead of applying it as a dead-end filter", () => {
    search = "model=does-not-exist";
    renderExplorer();

    // Truthful, distinct copy from the unknown-KEY warning: this is a real key
    // with a value the vocabulary doesn't know, not an unrecognised param.
    expect(screen.queryByText(/未知参数/)).not.toBeInTheDocument();
    const warning = screen.getByText(/以下筛选值不存在，已被忽略/);
    expect(warning).toHaveTextContent("model=does-not-exist");

    // The bad value is stripped before filtering, so with no other real
    // condition applied the count reflects the full unfiltered set.
    expect(resultCards()).toHaveLength(3);

    // The recovery link never re-opens the same broken URL: it omits the bad
    // value entirely rather than linking back to the current query.
    const recovery = screen.getByRole("link", { name: "使用可识别的筛选条件重新打开" });
    const href = recovery.getAttribute("href");
    expect(href).not.toBe(`${BASE}?model=does-not-exist`);
    expect(href).not.toContain("does-not-exist");
    expect(href).toBe(BASE);
  });

  it("keeps an unknown KEY and an unknown facet VALUE as separate, correctly-labelled warnings", () => {
    search = "foo=1&model=does-not-exist";
    renderExplorer();

    expect(screen.getByText(/未知参数/)).toHaveTextContent("foo");
    expect(screen.getByText(/以下筛选值不存在，已被忽略/)).toHaveTextContent("model=does-not-exist");
  });

  it("preserves the trending window in every outgoing filter href while a real filter is active", () => {
    search = "window=7d&model=seedance";
    renderExplorer();

    const form = screen.getByRole("search");
    const hiddenWindow = form.querySelector('input[type="hidden"][name="window"]');
    expect(hiddenWindow).not.toBeNull();
    expect(hiddenWindow).toHaveValue("7d");

    const klingChip = screen.getByRole("link", { name: /Kling/ });
    expect(klingChip.getAttribute("href")).toContain("window=7d");

    const remove = screen.getByRole("link", { name: "移除筛选：模型：Seedance" });
    expect(remove).toHaveAttribute("href", `${BASE}?window=7d`);

    const reset = screen.getByRole("link", { name: "清除全部筛选" });
    expect(reset).toHaveAttribute("href", `${BASE}?window=7d`);
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
