import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { getContentRepository } from "@/lib/content";
import type { PromptSummary, TaxonomyWithCount } from "@/lib/content/types";
import { galleryDescription, galleryLede, railMoreLabel } from "@/features/gallery/image-prompts";

/**
 * Assembly test for the L2 image gallery. It stands in for the build-time
 * check on `out/zh-CN/prompts/image.html`: the page component is rendered the
 * way the server renders it, with an empty URL, so everything asserted here is
 * content a crawler or a JavaScript-less reader actually receives.
 *
 * Wording is asserted verbatim against the prototype (`.superpowers/sdd/proto/
 * l2.html`); every number is recomputed from the repository inside the test —
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
  "@/app/[locale]/(gallery)/prompts/image/page"
);

const repository = getContentRepository();

/** Cards per rail, and models given a rail — the prototype's counts. */
const RAIL_LIMIT = 3;
const MODEL_RAIL_LIMIT = 3;

async function imageSubset(): Promise<PromptSummary[]> {
  const { items } = await repository.listPrompts("zh-CN");
  return items.filter((prompt) => prompt.contentType.slug === "image");
}

/** Model terms carrying image prompts, counted over the image subset alone. */
async function imageModels(): Promise<
  { term: TaxonomyWithCount; count: number; highValueCount: number }[]
> {
  const subset = await imageSubset();
  const models = await repository.listTaxonomies("zh-CN", "model");
  return models
    .map((term) => {
      const matched = subset.filter((prompt) => prompt.models.some((m) => m.slug === term.slug));
      return {
        term,
        count: matched.length,
        // Both tile numbers must be scoped to the same (image) subset.
        highValueCount: matched.filter((prompt) => prompt.metrics.highValue).length,
      };
    })
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.count - a.count || a.term.slug.localeCompare(b.term.slug));
}

/**
 * The models that get their own rail: href-bearing, top 3 by image count, ties
 * broken by slug — mirrors `topRailedModels` in `features/gallery/image-prompts`
 * without importing test expectations from the implementation itself.
 */
function railedModels<T extends { term: TaxonomyWithCount }>(models: T[]): T[] {
  return models.filter((entry) => entry.term.href !== null).slice(0, MODEL_RAIL_LIMIT);
}

/**
 * Which prompts each rail may render, under the page's one-card-per-prompt
 * rule: 精选 first, then each railed model, then the subject rail, each taking
 * the first `RAIL_LIMIT` prompts of its term that no rail above it already
 * showed. Mirrored here rather than imported, like `railedModels` above, so the
 * test states the rule instead of restating the implementation.
 */
async function expectedRails(): Promise<{
  featured: string[];
  modelRails: { slug: string; slugs: string[] }[];
  portrait: string[];
}> {
  const subset = await imageSubset();
  const featuredAll = await repository.listFeatured("zh-CN", "l2");
  const shown = new Set<string>();
  const take = (prompts: PromptSummary[], limit: number | null): string[] => {
    const picked: string[] = [];
    for (const prompt of prompts) {
      if (limit !== null && picked.length >= limit) break;
      if (shown.has(prompt.id)) continue;
      shown.add(prompt.id);
      picked.push(prompt.slug);
    }
    return picked;
  };

  const featured = take(
    featuredAll.filter((prompt) => prompt.contentType.slug === "image"),
    null,
  );
  const modelRails = railedModels(await imageModels())
    .map(({ term }) => ({
      slug: term.slug,
      slugs: take(
        subset.filter((prompt) => prompt.models.some((m) => m.slug === term.slug)),
        RAIL_LIMIT,
      ),
    }))
    .filter((rail) => rail.slugs.length > 0);
  const subjects = await repository.listTaxonomies("zh-CN", "subject");
  const person = subjects.find((term) => term.label === "Person / portrait");
  const portrait = take(
    subset.filter((prompt) => prompt.subjects.some((term) => term.slug === person?.slug)),
    RAIL_LIMIT,
  );

  return { featured, modelRails, portrait };
}

async function renderPage() {
  return render(await ImageGalleryPage({ params: Promise.resolve({ locale: "zh-CN" }) }));
}

function definitionValue(container: HTMLElement, label: string): string {
  const terms = [...container.querySelectorAll("dt")];
  const term = terms.find((node) => node.textContent?.trim() === label);
  expect(term, `no <dt> labelled ${label}`).toBeDefined();
  const value = term?.previousElementSibling ?? term?.nextElementSibling;
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

  it("renders the prototype's two-step breadcrumb, without a 首页 step", async () => {
    const { container } = await renderPage();
    const nav = within(container).getByRole("navigation", { name: "面包屑" });
    expect(nav.textContent?.replace(/\s+/g, "")).toBe("提示词库/图片");
    const hub = within(nav).getByRole("link", { name: "提示词库" });
    expect(hub.getAttribute("href")).toBe("/zh-CN/prompts");
    expect(within(nav).queryByRole("link", { name: "首页" })).toBeNull();
  });

  it("writes the prototype's lede verbatim, with the declared 324 replaced by the real count", async () => {
    const subset = await imageSubset();
    const { container } = await renderPage();
    const hero = container.querySelector("header") as HTMLElement;

    expect(hero.textContent).toContain(
      `${subset.length} 条可直接复制的图片提示词，全部来自 X 创作者的公开分享，注明作者与出处。`,
    );
    expect(galleryLede(subset.length)).toBe(
      `${subset.length} 条可直接复制的图片提示词，全部来自 X 创作者的公开分享，注明作者与出处。`,
    );
    expect(hero.textContent).not.toContain("324");
  });

  it("uses the prototype's statline labels and derives every number from the repository", async () => {
    const subset = await imageSubset();
    const snapshot = await repository.getSnapshot();
    const { container } = await renderPage();
    const stats = container.querySelector("header") as HTMLElement;

    const expectedHighValue = subset.filter((prompt) => prompt.metrics.highValue).length;
    const expectedCreators = new Set(subset.map((prompt) => prompt.creator.id)).size;
    const dates = subset
      .map((prompt) => prompt.source.publishedAt)
      .filter((date): date is string => date !== null)
      .sort();
    const expectedLatest = dates.at(-1) ?? "日期未收录";

    expect(definitionValue(stats, "条提示词")).toBe(String(subset.length));
    expect(definitionValue(stats, "热门")).toBe(String(expectedHighValue));
    expect(definitionValue(stats, "位创作者")).toBe(String(expectedCreators));
    expect(definitionValue(stats, "最新收录")).toBe(expectedLatest);

    // Interaction figures must always be dated (global constraint 4).
    expect(stats.textContent).toContain(snapshot.observedAt);
  });

  it("renders the prototype's 视频提示词 entry as non-link text, since that page does not exist", async () => {
    const { container } = await renderPage();
    const teaser = container.querySelector("[data-video-teaser]") as HTMLElement;
    expect(teaser.textContent).toBe("视频提示词（即将推出）");
    expect(teaser.querySelector("a")).toBeNull();
    // And no count is claimed for a set this build does not publish.
    expect(teaser.textContent).not.toMatch(/\d/);
  });

  it("offers the prototype's three facet axes — 用例 / 风格 / 主体 — and no model axis", async () => {
    const { container } = await renderPage();
    // The prototype gives this block a real `<h2>按标签浏览</h2>`, so it is a
    // labelled region rather than an anonymous group.
    const filters = within(container).getByRole("region", { name: "按标签浏览" });

    for (const axis of ["用例", "风格", "主体"]) {
      const group = within(filters).getByRole("group", { name: axis });
      expect(within(group).getAllByRole("link").length).toBeGreaterThan(0);
    }
    expect(within(filters).queryByRole("group", { name: "模型" })).toBeNull();
    // 任务 is L1's name for the same axis; L2's prototype calls it 用例.
    expect(within(filters).queryByRole("group", { name: "任务" })).toBeNull();
  });

  it("labels each facet chip with its count inside the image subset", async () => {
    const subset = await imageSubset();
    const subjects = await repository.listTaxonomies("zh-CN", "subject");
    const person = subjects.find((term) => term.label === "Person / portrait");
    expect(person).toBeDefined();
    const expected = subset.filter((prompt) =>
      prompt.subjects.some((term) => term.slug === person?.slug),
    ).length;

    const { container } = await renderPage();
    const group = within(container).getByRole("group", { name: "主体" });
    const chip = within(group)
      .getAllByRole("link")
      .find((node) => node.textContent?.includes("Person / portrait"));
    expect(chip?.textContent).toContain(String(expected));
  });

  it("titles the featured band 精选, with no invented description, and uses compact cards", async () => {
    const { container } = await renderPage();
    const region = within(container).getByRole("region", { name: "精选" });
    const heading = within(region).getByRole("heading", { level: 2, name: "精选" });
    expect(heading.textContent).toBe("精选");

    const cards = region.querySelectorAll("article");
    expect(cards.length).toBeGreaterThan(0);
    for (const card of cards) {
      expect(card.getAttribute("data-card-variant")).toBe("compact");
    }
    expect(region.textContent).not.toContain("编辑挑出的");
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

  it("renders one model tile per model in the image subset, counting 条 and stamping N 条热门", async () => {
    const models = await imageModels();
    const { container } = await renderPage();

    const region = within(container).getByRole("region", { name: "按模型浏览" });
    const tiles = [...region.querySelectorAll("[data-model-tile]")];
    expect(tiles.map((node) => node.getAttribute("data-model-tile")).sort()).toEqual(
      models.map((entry) => entry.term.slug).sort(),
    );

    for (const { term, count, highValueCount } of models) {
      const tile = region.querySelector(`[data-model-tile="${term.slug}"]`);
      // The count keeps its 条 caption; the 热门 half is the status stamp.
      expect(tile?.textContent).toContain(`${count} 条`);
      expect(tile?.textContent).toContain(`${highValueCount} 条热门`);
    }
    // The prototype has no explanatory paragraph under this heading.
    expect(region.textContent).not.toContain("数量按当前收录的图片提示词计算");
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
        expect(link?.getAttribute("href")).toBe(term.href);
      }
    }
  });

  it("rails the top models, under a heading that is only the model name", async () => {
    const models = await imageModels();
    const railed = railedModels(models);
    // The fixture has more than 3 models with image prompts, so this actually
    // exercises the cap rather than vacuously passing.
    expect(models.filter((entry) => entry.term.href !== null).length).toBeGreaterThan(
      MODEL_RAIL_LIMIT,
    );
    expect(railed).toHaveLength(MODEL_RAIL_LIMIT);

    const plan = await expectedRails();
    const { container } = await renderPage();

    for (const { slug, slugs } of plan.modelRails) {
      const term = railed.find((entry) => entry.term.slug === slug)?.term;
      const label = term?.labelZh ?? term?.label;
      // Scoped to the rail's own header row: the browse tile above carries the
      // same model name, and the prototype's rail heading is the bare name.
      const more = container.querySelector(`a[data-model-more="${slug}"]`) as HTMLElement;
      const heading = more.parentElement?.querySelector("h3");
      expect(heading?.textContent).toBe(label);

      const rail = within(container).getByRole("region", { name: `${label} 图片提示词` });
      expect(rail.querySelectorAll("article")).toHaveLength(slugs.length);
      expect(slugs.length).toBeLessThanOrEqual(RAIL_LIMIT);
    }

    // Every model beyond the top 3 still gets a browse tile but never a rail.
    const excluded = models.filter((entry) => !railed.some((r) => r.term.slug === entry.term.slug));
    expect(excluded.length).toBeGreaterThan(0);
    for (const { term } of excluded) {
      const label = term.labelZh ?? term.label;
      expect(within(container).queryByRole("region", { name: `${label} 图片提示词` })).toBeNull();
    }
  });

  it("renders each prompt exactly once, and drops a rail with nothing left to show", async () => {
    const plan = await expectedRails();
    const { container } = await renderPage();

    // The page used to make 18 card renders of 11 prompts — one prompt drawn
    // four times, byte for byte the same card. Every article on the page is now
    // a different prompt.
    const hrefs = [...container.querySelectorAll("article")].map((article) =>
      article.querySelector("a[href^='/zh-CN/prompts/']")?.getAttribute("href"),
    );
    expect(hrefs.length).toBeGreaterThan(0);
    expect(new Set(hrefs).size).toBe(hrefs.length);

    // A rail whose every prompt was already drawn above loses its heading and
    // its "see all" button with it, rather than standing empty under a name.
    const railed = railedModels(await imageModels());
    const dropped = railed.filter(
      (entry) => !plan.modelRails.some((rail) => rail.slug === entry.term.slug),
    );
    expect(dropped.length).toBeGreaterThan(0);
    for (const { term } of dropped) {
      const label = term.labelZh ?? term.label;
      expect(within(container).queryByRole("region", { name: `${label} 图片提示词` })).toBeNull();
      expect(container.querySelector(`a[data-model-more="${term.slug}"]`)).toBeNull();
      // Its model page is still reachable: the 按模型浏览 tile above links it.
      expect(container.querySelector(`a[href="${term.href}"]`)).not.toBeNull();
    }
  });

  it("gives each railed model a 查看全部 N 条 → link counted over the whole term, not the rail", async () => {
    const plan = await expectedRails();
    const models = await imageModels();
    const { container } = await renderPage();

    for (const rail of plan.modelRails) {
      const entry = models.find((model) => model.term.slug === rail.slug);
      const more = container.querySelector(`a[data-model-more="${rail.slug}"]`);
      expect(more?.getAttribute("href")).toBe(entry?.term.href);
      // The count is how many image prompts carry the model — NOT how many
      // cards survived the de-duplication under it.
      expect(more?.textContent).toBe(railMoreLabel(entry?.count ?? 0));
      expect(more?.textContent).toBe(`查看全部 ${entry?.count} 条 →`);
    }
  });

  it("renders the Person / portrait band with the prototype's heading, count pill and three cards", async () => {
    const subset = await imageSubset();
    const subjects = await repository.listTaxonomies("zh-CN", "subject");
    const person = subjects.find((term) => term.label === "Person / portrait");
    expect(person).toBeDefined();
    const expected = subset.filter((prompt) =>
      prompt.subjects.some((term) => term.slug === person?.slug),
    );
    expect(expected.length).toBeGreaterThan(0);

    const { container } = await renderPage();
    const region = within(container).getByRole("region", { name: "Person / portrait" });
    const heading = within(region).getByRole("heading", { level: 2 });
    expect(heading.textContent).toBe("Person / portrait");

    const pill = within(region).getByRole("link", { name: `${expected.length} 条` });
    expect(pill.getAttribute("href")).toBe(`/zh-CN/prompts/image?subject=${person?.slug}`);

    const rail = within(region).getByRole("region", { name: "Person / portrait 图片提示词" });
    // All three of this rail's original cards were repeats of prompts already
    // drawn above. It BACKFILLS from the portrait prompts nothing has shown
    // yet rather than shrinking, so it still holds three cards — and the pill
    // above still counts the whole term.
    expect(rail.querySelectorAll("article")).toHaveLength(Math.min(expected.length, RAIL_LIMIT));
    const plan = await expectedRails();
    expect(plan.portrait).toHaveLength(RAIL_LIMIT);
  });

  it("links only the published content type and marks the rest as unreleased", async () => {
    const types = await repository.listTaxonomies("zh-CN", "contentType");
    expect(types.length).toBeGreaterThan(1);
    const { container } = await renderPage();

    const region = within(container).getByRole("region", { name: "其他类型" });
    const rendered = [...region.querySelectorAll("[data-content-type]")].map((node) =>
      node.getAttribute("data-content-type"),
    );
    // Only content types the fixture actually carries — no declared-but-absent
    // prototype rows (mixed, 网页).
    expect(rendered.sort()).toEqual(types.map((term) => term.slug).sort());

    for (const term of types) {
      const tile = region.querySelector(`[data-content-type="${term.slug}"]`) as HTMLElement;
      expect(tile.textContent).toContain(`${term.count} 条 · ${term.highValueCount} 条热门`);

      const link = tile.tagName === "A" ? tile : tile.querySelector("a");
      if (term.slug === "image") {
        expect(link?.getAttribute("href")).toBe("/zh-CN/prompts/image");
      } else {
        expect(link).toBeNull();
        expect(tile.textContent).toMatch(/尚未发布|不会生成独立页面/);
      }
    }
  });

  it("rebuilds the 相关 band as the prototype's four columns", async () => {
    const models = await imageModels();
    const { container } = await renderPage();
    const region = within(container).getByRole("region", { name: "相关" });

    const columns = [...region.querySelectorAll("h3")].map((node) => node.textContent);
    expect(columns).toEqual(["类型", "模型", "用例", "更多"]);

    // 类型: this page is a link, the video gallery is not a page yet.
    expect(
      within(region).getByRole("link", { name: "图片提示词" }).getAttribute("href"),
    ).toBe("/zh-CN/prompts/image");
    expect(within(region).queryByRole("link", { name: /视频提示词/ })).toBeNull();
    expect(region.textContent).toContain("视频提示词（即将推出）");

    // 模型: the top three by image count, linking their real model pages.
    const topModels = models.filter((entry) => entry.term.href !== null).slice(0, 3);
    // The band is hairline rows, not cards, so the hooks sit on the label
    // inside each row's link.
    const related = [...region.querySelectorAll("[data-model-related]")];
    expect(related.map((node) => node.getAttribute("data-model-related"))).toEqual(
      models.slice(0, 3).map((entry) => entry.term.slug),
    );
    for (const { term } of topModels) {
      const label = region.querySelector(`[data-model-related="${term.slug}"]`);
      expect(label?.closest("a")?.getAttribute("href")).toBe(term.href);
      expect(label?.textContent).toBe(term.labelZh ?? term.label);
    }

    // 用例: no use-case page exists, so each links the pre-filtered library.
    const useCaseLinks = [...region.querySelectorAll("[data-usecase-more]")];
    expect(useCaseLinks.length).toBeGreaterThan(0);
    for (const label of useCaseLinks) {
      const slug = label.getAttribute("data-usecase-more");
      expect(label.closest("a")?.getAttribute("href")).toBe(`/zh-CN/prompts?useCase=${slug}`);
      expect(label.textContent).not.toMatch(/\d/);
    }

    // 更多: the library home is real, a creators index is not.
    expect(
      within(region).getByRole("link", { name: "提示词库首页" }).getAttribute("href"),
    ).toBe("/zh-CN/prompts");
    expect(within(region).queryByRole("link", { name: /全部创作者/ })).toBeNull();
    expect(region.textContent).toContain("全部创作者（即将推出）");

    // Demoted from boxes to hairline rows: every row keeps the 44px target and
    // the lightest divider tier, and no row is a card.
    const rows = [...region.querySelectorAll("li > a, li > span")];
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.className).toContain("min-h-11");
      expect(row.className).not.toContain("shadow-hard");
    }
  });

  it("closes with the prototype's CTA, pointing at the model that holds the most image prompts", async () => {
    const top = (await imageModels()).filter((entry) => entry.term.href !== null)[0];
    expect(top).toBeDefined();

    const { container } = await renderPage();
    const region = within(container).getByRole("region", { name: "复制一条提示词，改一个变量" });
    expect(region.textContent).toContain("提示词原文完整保留，每张卡片一键跳转原帖。无需注册。");

    const cta = container.querySelector("a[data-gallery-cta]");
    expect(cta?.getAttribute("href")).toBe(top?.term.href);
    expect(cta?.textContent).toBe("进入最大的模型合集 →");
  });

  it("never emits a placeholder href or a link into an unbuilt route", async () => {
    const { container } = await renderPage();
    for (const node of container.querySelectorAll("a[href]")) {
      const href = node.getAttribute("href");
      expect(href).not.toBe("#");
      expect(href).not.toContain("/prompts/video");
      expect(href).not.toContain("/prompts/creators");
      expect(href).not.toContain("/prompts/use-cases");
    }
  });

  it("emits a two-item BreadcrumbList and an ItemList matching the visible rails", async () => {
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
    expect(crumbs.itemListElement[0]?.name).toBe("提示词库");
    expect(crumbs.itemListElement[0]?.item).toBe("https://example.invalid/zh-CN/prompts");
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

  it("declares a canonical, the prototype's description and no fake hreflang alternates", async () => {
    const subset = await imageSubset();
    const metadata = await generateMetadata({ params: Promise.resolve({ locale: "zh-CN" }) });
    expect(metadata.alternates?.canonical).toBe("https://example.invalid/zh-CN/prompts/image");
    expect(metadata.alternates?.languages).toBeUndefined();
    expect(metadata.description).toBe(galleryDescription(subset.length));
    expect(metadata.description).toContain(`${subset.length} 条可复制的图片提示词`);
  });
});
