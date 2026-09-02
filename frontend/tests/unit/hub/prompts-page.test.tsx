import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { getContentRepository } from "@/lib/content";

/**
 * Assembly test for the L1 route. It stands in for the build-time check that
 * `out/zh-CN/prompts.html` carries the H1, the featured prompt and real detail
 * links: the page component is rendered exactly as the server would render it,
 * with the URL empty, so what is asserted here is the browse HTML a crawler or
 * a JavaScript-less reader receives.
 */
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(""),
  usePathname: () => "/zh-CN/prompts",
  notFound: () => {
    throw new Error("notFound() called");
  },
}));

const { default: PromptsPage, generateMetadata } = await import(
  "@/app/[locale]/(hub)/prompts/page"
);

async function renderPage() {
  return render(await PromptsPage({ params: Promise.resolve({ locale: "zh-CN" }) }));
}

describe("L1 prompt hub page", () => {
  it("renders the prototype's two-line H1 with a count from the repository", async () => {
    const { total } = await getContentRepository().listPrompts("zh-CN");
    await renderPage();

    const headings = screen.getAllByRole("heading", { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]?.textContent).toBe(`${total} 条 Higgsfield 提示词复制即用`);
    expect(headings[0]?.querySelector("br")).not.toBeNull();
    // The prototype's declared library size must never be rendered as a fact.
    expect(headings[0]?.textContent).not.toContain("982");
  });

  it("quotes the prototype's dek verbatim and adds no extra hero line", async () => {
    await renderPage();

    expect(
      screen.getByText(
        "来自 X 创作者的真实提示词，每条注明作者与出处。按任务、镜头语言、模型或风格浏览，找到后一键复制。",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/数量与热度均按当前收录内容计算/)).toBeNull();
  });

  it("renders the in-page anchors above the hero, one per surviving band", async () => {
    const { container } = await renderPage();

    const anchorNav = screen.getByRole("navigation", { name: "页内导航" });
    expect(within(anchorNav).getAllByRole("link").map((node) => node.getAttribute("href"))).toEqual([
      "#models",
      "#collections",
      "#creators",
    ]);
    // `check:static` rule 3: every fragment must resolve in the same document.
    for (const link of within(anchorNav).getAllByRole("link")) {
      const id = (link.getAttribute("href") ?? "").slice(1);
      expect(container.querySelector(`#${id}`)).not.toBeNull();
    }
  });

  it("renders no breadcrumb and no BreadcrumbList payload", async () => {
    const { container } = await renderPage();

    expect(screen.queryByRole("navigation", { name: "面包屑" })).toBeNull();
    const types = [...container.querySelectorAll('script[type="application/ld+json"]')].map(
      (node) => (JSON.parse(node.textContent ?? "{}") as { "@type"?: string })["@type"],
    );
    expect(types).not.toContain("BreadcrumbList");
    expect(types).toContain("CollectionPage");
  });

  it("carries no 搜索与筛选 heading — the prototype's filter block has none", async () => {
    await renderPage();

    expect(screen.queryByText("搜索与筛选")).toBeNull();
    expect(screen.getByRole("searchbox")).toHaveAttribute(
      "placeholder",
      "搜索提示词、模型、风格、镜头语言、创作者…",
    );
    expect(screen.getByRole("link", { name: "重置" })).toBeInTheDocument();
  });

  it("lays out the prototype's four facet rows in order", async () => {
    await renderPage();

    const filters = screen.getByRole("group", { name: "筛选" });
    const rows = [...filters.querySelectorAll('[role="group"]')].map((node) => {
      const labelId = node.getAttribute("aria-labelledby") ?? "";
      return filters.querySelector(`#${labelId}`)?.textContent;
    });
    expect(rows).toEqual(["模型", "任务", "技法", "风格"]);
  });

  it("server-renders the featured prompt and the full six-slot trending grid", async () => {
    const repository = getContentRepository();
    const [featured] = await repository.listFeatured("zh-CN", "l1");
    const trending = await repository.listTrending("zh-CN", "all", 6);
    await renderPage();

    expect(featured).toBeDefined();
    const featuredSection = screen.getByRole("region", { name: "本期精选" });
    expect(
      within(featuredSection).getByRole("heading", { name: featured?.title, level: 3 }),
    ).toBeInTheDocument();

    // The prototype does NOT drop the featured prompt from the trending grid:
    // the window keeps all six slots.
    const panel = screen.getByRole("tabpanel");
    expect(within(panel).getAllByRole("article").length).toBe(trending.items.length);
    expect(trending.items.length).toBe(6);
  });

  it("labels the trending tabs as the prototype does, with 全部 selected", async () => {
    await renderPage();

    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((tab) => tab.textContent)).toEqual(["近 7 天", "近 30 天", "全部"]);
    expect(tabs[2]).toHaveAttribute("aria-selected", "true");
  });

  it("renders each browse module at the prototype's size", async () => {
    await renderPage();

    expect(
      within(screen.getByRole("region", { name: "精选合集" })).getAllByRole("listitem"),
    ).toHaveLength(6);
    expect(
      within(screen.getByRole("region", { name: "创作者" })).getAllByRole("listitem"),
    ).toHaveLength(7);
  });

  it("drops the three bands that repeated the facet chip rows", async () => {
    await renderPage();

    // Their 18 tiles carried the same values, the same counts and the same
    // `?useCase=` / `?technique=` / `?style=` hrefs as the chips ~300px above,
    // which filter in place instead of navigating away. The chip rows are
    // asserted above ("lays out the prototype's four facet rows in order") and
    // are unchanged, so nothing was lost with the bands.
    for (const name of ["按任务浏览", "镜头与运动", "按风格浏览"]) {
      expect(screen.queryByRole("region", { name })).toBeNull();
    }
    expect(screen.queryByText(/成提示词带镜头语言/)).toBeNull();
  });

  it("gives every model with prompts a tile, so no model page hides behind a cap", async () => {
    const models = await getContentRepository().listTaxonomies("zh-CN", "model");
    await renderPage();

    const section = screen.getByRole("region", { name: "按模型浏览" });
    const links = within(section).getAllByRole("link");
    expect(models.length).toBeGreaterThan(8);
    expect(links).toHaveLength(models.length);
    expect(links.map((node) => node.textContent)).toEqual(
      expect.arrayContaining(models.map((model) => expect.stringContaining(model.label))),
    );
  });

  it("links the closing CTA at the whole-library result state", async () => {
    await renderPage();

    const section = screen.getByRole("region", { name: "找到合适的提示词，直接开始" });
    expect(within(section).getByRole("link", { name: "浏览全部提示词" })).toHaveAttribute(
      "href",
      "/zh-CN/prompts?collection=all",
    );
  });

  it("links to at least one prompt detail page", async () => {
    const { container } = await renderPage();

    const details = [...container.querySelectorAll('a[href^="/zh-CN/prompts/"]')].filter(
      (node) => !/\/prompts\/(image|models)(\/|$)/.test(node.getAttribute("href") ?? ""),
    );
    expect(details.length).toBeGreaterThan(0);
  });

  it("never emits a placeholder href", async () => {
    const { container } = await renderPage();

    for (const node of container.querySelectorAll("a[href]")) {
      expect(node.getAttribute("href")).not.toBe("#");
    }
  });

  it("emits CollectionPage JSON-LD that matches the visible list", async () => {
    const { container } = await renderPage();

    const payloads = [...container.querySelectorAll('script[type="application/ld+json"]')].map(
      (node) => JSON.parse(node.textContent ?? "{}") as { "@type"?: string; mainEntity?: unknown },
    );

    const collection = payloads.find((payload) => payload["@type"] === "CollectionPage");
    const itemList = collection?.mainEntity as {
      "@type": string;
      numberOfItems: number;
      itemListElement: { url: string; name: string }[];
    };
    expect(itemList["@type"]).toBe("ItemList");
    expect(itemList.numberOfItems).toBe(itemList.itemListElement.length);
    expect(itemList.numberOfItems).toBeGreaterThan(0);

    // Every listed URL is a prompt actually rendered on this page.
    for (const item of itemList.itemListElement) {
      const path = new URL(item.url).pathname;
      expect(container.querySelector(`a[href="${path}"]`)).not.toBeNull();
    }
  });

  it("declares a canonical and no fake hreflang alternates", async () => {
    const metadata = await generateMetadata({ params: Promise.resolve({ locale: "zh-CN" }) });

    expect(metadata.title).toEqual({ absolute: "提示词库" });
    expect(metadata.alternates?.canonical).toBe("https://example.invalid/zh-CN/prompts");
    expect(metadata.alternates?.languages).toBeUndefined();
  });
});
