import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { getContentRepository } from "@/lib/content";
import type { PromptSummary, TaxonomyWithCount } from "@/lib/content/types";
import { modelRailMoreLabel } from "@/features/gallery/image-prompts";

/**
 * Assembly test for the L2 image gallery. It stands in for the build-time
 * check on `out/zh-CN/prompts/image.html`: the page component is rendered the
 * way the server renders it, with an empty URL, so everything asserted here is
 * content a crawler or a JavaScript-less reader actually receives.
 *
 * Every expected number is recomputed from the repository inside the test —
 * never written as a literal — so a fixture change moves both sides together
 * and a hardcoded count in the page would fail immediately.
 */
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(""),
  usePathname: () => "/zh-CN/prompts/image",
  notFound: () => {
    throw new Error("notFound() called");
  },
}));

const { default: ImageGalleryPage, generateMetadata } = await import(
  "@/app/[locale]/prompts/image/page"
);

const repository = getContentRepository();

async function imageSubset(): Promise<PromptSummary[]> {
  const { items } = await repository.listPrompts("zh-CN");
  return items.filter((prompt) => prompt.contentType.slug === "image");
}

/**
 * Model terms that actually carry image prompts, counted over the subset —
 * plus each model's `totalCount` across every content type, computed from the
 * unfiltered prompt list. The model page (a rail's "查看全部" destination)
 * lists that wider set, so `count` and `totalCount` disagree for a model that
 * also has non-image prompts (e.g. seedance, which has plenty of video ones).
 */
async function imageModels(): Promise<
  { term: TaxonomyWithCount; count: number; highValueCount: number; totalCount: number }[]
> {
  const { items } = await repository.listPrompts("zh-CN");
  const subset = items.filter((prompt) => prompt.contentType.slug === "image");
  const models = await repository.listTaxonomies("zh-CN", "model");
  return models
    .map((term) => {
      const matched = subset.filter((prompt) =>
        prompt.models.some((m) => m.slug === term.slug),
      );
      return {
        term,
        count: matched.length,
        // Both tile numbers must be scoped to the same (image) subset.
        highValueCount: matched.filter((prompt) => prompt.metrics.highValue).length,
        totalCount: items.filter((prompt) => prompt.models.some((m) => m.slug === term.slug)).length,
      };
    })
    .filter((entry) => entry.count > 0);
}

/**
 * The models that get their own rail: href-bearing, top 3 by image count, ties
 * broken by slug — mirrors `topRailedModels` in `features/gallery/image-prompts`
 * without importing test expectations from the implementation itself.
 */
function railedModels<T extends { term: TaxonomyWithCount; count: number }>(models: T[]): T[] {
  return models
    .filter((entry) => entry.term.href !== null)
    .sort((a, b) => b.count - a.count || a.term.slug.localeCompare(b.term.slug))
    .slice(0, 3);
}

async function renderPage() {
  return render(await ImageGalleryPage({ params: Promise.resolve({ locale: "zh-CN" }) }));
}

function definitionValue(container: HTMLElement, label: string): string {
  const terms = [...container.querySelectorAll("dt")];
  const term = terms.find((node) => node.textContent?.trim() === label);
  expect(term, `no <dt> labelled ${label}`).toBeDefined();
  const value = term?.nextElementSibling;
  expect(value?.tagName).toBe("DD");
  return value?.textContent?.trim() ?? "";
}

describe("L2 image gallery page", () => {
  it("renders exactly one H1", async () => {
    await renderPage();
    const headings = screen.getAllByRole("heading", { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent("图片提示词");
  });

  it("renders a 首页 › 提示词库 › 图片 breadcrumb trail", async () => {
    const { container } = await renderPage();
    const nav = within(container).getByRole("navigation", { name: "面包屑" });
    expect(nav.textContent?.replace(/\s+/g, "")).toBe("首页/提示词库/图片");
    const home = within(nav).getByRole("link", { name: "首页" });
    expect(home.getAttribute("href")).toBe("/zh-CN");
    const hub = within(nav).getByRole("link", { name: "提示词库" });
    expect(hub.getAttribute("href")).toBe("/zh-CN/prompts");
  });

  it("derives every statline number from the repository", async () => {
    const subset = await imageSubset();
    const snapshot = await repository.getSnapshot();
    const { container } = await renderPage();

    const hero = container.querySelector("header");
    expect(hero).not.toBeNull();
    const stats = hero as HTMLElement;

    const expectedHighValue = subset.filter((prompt) => prompt.metrics.highValue).length;
    const expectedCreators = new Set(subset.map((prompt) => prompt.creator.id)).size;
    const dates = subset
      .map((prompt) => prompt.source.publishedAt)
      .filter((date): date is string => date !== null)
      .sort();
    const expectedLatest = dates.at(-1) ?? "日期未收录";

    expect(definitionValue(stats, "收录条数")).toBe(`${subset.length} 条`);
    expect(definitionValue(stats, "热门提示词")).toBe(`${expectedHighValue} 条`);
    expect(definitionValue(stats, "创作者")).toBe(`${expectedCreators} 位`);
    expect(definitionValue(stats, "最新收录")).toBe(expectedLatest);

    // Interaction figures must always be dated (global constraint 4).
    expect(stats.textContent).toContain(snapshot.observedAt);
    // The prototype's declared library size must never be rendered as a fact.
    expect(stats.textContent).not.toContain("324");
  });

  it("only shows image prompts, never a video one", async () => {
    const { items } = await repository.listPrompts("zh-CN");
    const nonImage = items.filter((prompt) => prompt.contentType.slug !== "image");
    expect(nonImage.length).toBeGreaterThan(0);

    const { container } = await renderPage();
    const detailHrefs = new Set(
      [...container.querySelectorAll("a[href]")].map((node) => node.getAttribute("href")),
    );
    for (const prompt of nonImage) {
      expect(detailHrefs.has(prompt.href)).toBe(false);
    }
  });

  it("renders one model tile per model present in the image subset, counted over the subset", async () => {
    const models = await imageModels();
    const { container } = await renderPage();

    const region = within(container).getByRole("region", { name: "按模型浏览" });
    const tiles = [...region.querySelectorAll("[data-model-tile]")];
    expect(tiles.map((node) => node.getAttribute("data-model-tile")).sort()).toEqual(
      models.map((entry) => entry.term.slug).sort(),
    );

    for (const { term, count, highValueCount } of models) {
      const tile = region.querySelector(`[data-model-tile="${term.slug}"]`);
      expect(tile).not.toBeNull();
      expect(tile?.textContent).toContain(`${count} 条 · ${highValueCount} 条热门`);
    }
  });

  it("links only the model tiles whose taxonomy carries a real page", async () => {
    const models = await imageModels();
    const { container } = await renderPage();
    const region = within(container).getByRole("region", { name: "按模型浏览" });

    for (const { term } of models) {
      const tile = region.querySelector(`[data-model-tile="${term.slug}"]`) as HTMLElement;
      const link = tile.tagName === "A" ? tile : tile.querySelector("a");

      if (term.href === null) {
        expect(link).toBeNull();
        expect(tile.textContent).toContain("模型页尚未发布");
      } else {
        expect(link).not.toBeNull();
        expect(link?.getAttribute("href")).toBe(term.href);
      }
    }
  });

  it("caps the model rail band at the top 3 models by image count, tie-broken by slug", async () => {
    const models = await imageModels();
    const railed = railedModels(models);
    // The fixture has more than 3 models with image prompts, so this actually
    // exercises the cap rather than vacuously passing.
    expect(models.filter((entry) => entry.term.href !== null).length).toBeGreaterThan(3);
    expect(railed).toHaveLength(3);

    const { container } = await renderPage();

    for (const { term, count } of railed) {
      const label = term.labelZh ?? term.label;
      const rail = within(container).getByRole("region", { name: `${label} 图片提示词` });
      const heading = within(container).getByRole("heading", {
        level: 3,
        name: `${label} 图片提示词`,
      });
      expect(heading).toBeInTheDocument();

      const shown = rail.querySelectorAll("article").length;
      expect(shown).toBeGreaterThan(0);
      expect(shown).toBeLessThanOrEqual(count);
    }

    // Every model beyond the top 3 still gets a browse tile (finding 1:
    // ModelTiles shows ALL models) but never its own rail region.
    const excluded = models.filter(
      (entry) => !railed.some((r) => r.term.slug === entry.term.slug),
    );
    expect(excluded.length).toBeGreaterThan(0);
    for (const { term } of excluded) {
      const label = term.labelZh ?? term.label;
      expect(
        within(container).queryByRole("region", { name: `${label} 图片提示词` }),
      ).toBeNull();
    }
  });

  it("gives each railed model a 查看全部 link into its own model page, scope-neutral unless the counts truly match", async () => {
    const railed = railedModels(await imageModels());
    const { container } = await renderPage();

    for (const { term, count, totalCount } of railed) {
      const more = container.querySelector(`a[data-model-more="${term.slug}"]`);
      expect(more?.getAttribute("href")).toBe(term.href);
      // The model page lists every content type for the model, not just
      // images, so the label only claims a count when the two scopes agree.
      expect(more?.textContent).toBe(modelRailMoreLabel(count, totalCount));
    }
  });

  it("gives no misleading count when a model's image count differs from its total (e.g. seedance)", async () => {
    const models = await imageModels();
    const seedance = models.find((entry) => entry.term.slug === "seedance");
    expect(seedance).toBeDefined();
    // Sanity check on the fixture itself: seedance must actually be a model
    // with far more total prompts (mostly video) than image ones, otherwise
    // this test would not exercise the differing-count branch at all.
    expect(seedance?.count).not.toBe(seedance?.totalCount);

    const label = modelRailMoreLabel(seedance!.count, seedance!.totalCount);
    expect(label).toBe("进入模型页 →");
    expect(label).not.toMatch(/\d/);
  });

  it("lists every href-bearing model in the related-links band, not just the railed top 3", async () => {
    const models = await imageModels();
    const linkable = models.filter((entry) => entry.term.href !== null);
    expect(linkable.length).toBeGreaterThan(3);

    const { container } = await renderPage();
    const region = within(container).getByRole("region", { name: "相关页面" });

    for (const { term } of linkable) {
      const label = term.labelZh ?? term.label;
      const link = within(region).getByRole("link", { name: `${label} 模型页` });
      expect(link.getAttribute("href")).toBe(term.href);
    }
  });

  it("drops the image-only count from related use-case links, which point at L1 across all content types", async () => {
    const { container } = await renderPage();
    const links = [...container.querySelectorAll("a[data-usecase-more]")];
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      expect(link.textContent).not.toMatch(/\d/);
      expect(link.textContent?.trim().endsWith("提示词")).toBe(true);
    }
  });

  it("renders a Person / portrait rail that links back to this page filtered by subject", async () => {
    const subset = await imageSubset();
    const subjects = await repository.listTaxonomies("zh-CN", "subject");
    const person = subjects.find((term) => term.label === "Person / portrait");
    expect(person).toBeDefined();
    const expected = subset.filter((prompt) =>
      prompt.subjects.some((term) => term.slug === person?.slug),
    );
    expect(expected.length).toBeGreaterThan(0);

    const { container } = await renderPage();
    const more = container.querySelector("a[data-subject-more]");
    expect(more?.getAttribute("href")).toBe(`/zh-CN/prompts/image?subject=${person?.slug}`);
  });

  it("links only the published content type and marks the rest as unreleased", async () => {
    const types = await repository.listTaxonomies("zh-CN", "contentType");
    expect(types.length).toBeGreaterThan(1);
    const { container } = await renderPage();

    const region = within(container).getByRole("region", { name: "其他类型" });
    for (const term of types) {
      const tile = region.querySelector(`[data-content-type="${term.slug}"]`) as HTMLElement;
      expect(tile, `no tile for ${term.slug}`).not.toBeNull();
      expect(tile.textContent).toContain(`${term.count} 条`);

      const link = tile.tagName === "A" ? tile : tile.querySelector("a");
      if (term.slug === "image") {
        expect(link?.getAttribute("href")).toBe("/zh-CN/prompts/image");
      } else if (term.slug === "unknown") {
        // Unlabelled data, not a real page that simply hasn't shipped yet —
        // a different, more honest explanation (finding 6).
        expect(link).toBeNull();
        expect(tile.textContent).toContain("未标注类型，不会生成独立页面");
      } else {
        expect(link).toBeNull();
        expect(tile.textContent).toContain("尚未发布");
      }
    }

    // Routes that do not exist in this phase are never linked.
    for (const node of container.querySelectorAll("a[href]")) {
      expect(node.getAttribute("href")).not.toContain("/prompts/video");
    }
  });

  it("never emits a placeholder href", async () => {
    const { container } = await renderPage();
    for (const node of container.querySelectorAll("a[href]")) {
      expect(node.getAttribute("href")).not.toBe("#");
    }
  });

  it("emits a three-item BreadcrumbList (首页 › 提示词库 › 图片) and an ItemList that matches the visible rails", async () => {
    const { container } = await renderPage();

    const payloads = [...container.querySelectorAll('script[type="application/ld+json"]')].map(
      (node) => JSON.parse(node.textContent ?? "{}") as Record<string, unknown>,
    );
    const types = payloads.map((payload) => payload["@type"]);
    expect(types).toContain("BreadcrumbList");
    expect(types).toContain("CollectionPage");

    const crumbs = payloads.find((payload) => payload["@type"] === "BreadcrumbList") as {
      itemListElement: { name: string; item: string }[];
    };
    expect(crumbs.itemListElement).toHaveLength(3);
    expect(crumbs.itemListElement[0]?.name).toBe("首页");
    expect(crumbs.itemListElement[0]?.item).toBe("https://example.invalid/zh-CN");
    expect(crumbs.itemListElement[1]?.name).toBe("提示词库");
    expect(crumbs.itemListElement[2]?.item).toBe("https://example.invalid/zh-CN/prompts/image");

    const collection = payloads.find((payload) => payload["@type"] === "CollectionPage");
    const itemList = collection?.mainEntity as {
      "@type": string;
      numberOfItems: number;
      itemListElement: { url: string; name: string }[];
    };
    expect(itemList["@type"]).toBe("ItemList");
    expect(itemList.numberOfItems).toBe(itemList.itemListElement.length);
    expect(itemList.numberOfItems).toBeGreaterThan(0);

    // Every listed URL is a prompt link the page actually renders.
    for (const item of itemList.itemListElement) {
      const path = new URL(item.url).pathname;
      expect(container.querySelector(`a[href="${path}"]`)).not.toBeNull();
    }
  });

  it("closes with a CTA into the model that holds the most image prompts", async () => {
    const models = (await imageModels())
      .filter((entry) => entry.term.href !== null)
      .sort((a, b) => b.count - a.count || a.term.slug.localeCompare(b.term.slug));
    const top = models[0];
    expect(top).toBeDefined();

    const { container } = await renderPage();
    const cta = container.querySelector("a[data-gallery-cta]");
    expect(cta?.getAttribute("href")).toBe(top?.term.href);
  });

  it("declares a canonical and no fake hreflang alternates", async () => {
    const metadata = await generateMetadata({ params: Promise.resolve({ locale: "zh-CN" }) });
    expect(metadata.alternates?.canonical).toBe("https://example.invalid/zh-CN/prompts/image");
    expect(metadata.alternates?.languages).toBeUndefined();
  });
});
