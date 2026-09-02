import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { getContentRepository } from "@/lib/content";
import type { PromptSummary, TaxonomyWithCount } from "@/lib/content/types";

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

/** Model terms that actually carry image prompts, counted over the subset. */
async function imageModels(): Promise<{ term: TaxonomyWithCount; count: number }[]> {
  const subset = await imageSubset();
  const models = await repository.listTaxonomies("zh-CN", "model");
  return models
    .map((term) => ({
      term,
      count: subset.filter((prompt) => prompt.models.some((m) => m.slug === term.slug)).length,
    }))
    .filter((entry) => entry.count > 0);
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

    for (const { term, count } of models) {
      const tile = region.querySelector(`[data-model-tile="${term.slug}"]`);
      expect(tile).not.toBeNull();
      expect(tile?.textContent).toContain(`${count} 条图片提示词`);
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

  it("gives every model with a page and image prompts its own rail with a real 查看全部 link", async () => {
    const models = (await imageModels()).filter((entry) => entry.term.href !== null);
    expect(models.length).toBeGreaterThan(0);
    const { container } = await renderPage();

    for (const { term, count } of models) {
      const label = term.labelZh ?? term.label;
      const rail = within(container).getByRole("region", { name: `${label} 图片提示词` });
      const heading = within(container).getByRole("heading", {
        level: 3,
        name: `${label} 图片提示词`,
      });
      expect(heading).toBeInTheDocument();

      const more = container.querySelector(`a[data-model-more="${term.slug}"]`);
      expect(more?.getAttribute("href")).toBe(term.href);
      expect(more?.textContent).toContain(`查看全部 ${count} 条`);

      const shown = rail.querySelectorAll("article").length;
      expect(shown).toBeGreaterThan(0);
      expect(shown).toBeLessThanOrEqual(count);
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

  it("emits a two-item BreadcrumbList and an ItemList that matches the visible rails", async () => {
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
    expect(crumbs.itemListElement).toHaveLength(2);
    expect(crumbs.itemListElement[1]?.item).toBe("https://example.invalid/zh-CN/prompts/image");

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
