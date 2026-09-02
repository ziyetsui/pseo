import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { extractVariables, formatCreatorHandle, getContentRepository } from "@/lib/content";
import type { PromptSummary } from "@/lib/content/types";

/**
 * Assembly test for the L3 model route. It stands in for the build-time check
 * that `out/zh-CN/prompts/models/nano-banana-pro.html` carries the H1, the
 * prototype's module order and real detail links: the page component is
 * rendered exactly as the server renders it, with an empty URL, so what is
 * asserted here is the browse HTML a crawler or a JavaScript-less reader
 * receives.
 */
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(""),
  usePathname: () => "/zh-CN/prompts/models/nano-banana-pro",
  notFound: () => {
    throw new Error("notFound() called");
  },
}));

const { default: ModelPage, generateMetadata, generateStaticParams, dynamicParams } = await import(
  "@/app/[locale]/(site)/prompts/models/[modelSlug]/page"
);

const SLUG = "nano-banana-pro";

async function renderPage(modelSlug = SLUG) {
  return render(await ModelPage({ params: Promise.resolve({ locale: "zh-CN", modelSlug }) }));
}

function sectionHeadings(container: HTMLElement): string[] {
  return [...container.querySelectorAll("section[aria-labelledby]")].map((node) => {
    const id = node.getAttribute("aria-labelledby") ?? "";
    return container.querySelector(`#${CSS.escape(id)}`)?.textContent ?? "";
  });
}

describe("L3 model page — hero", () => {
  it("renders exactly one H1 naming the model", async () => {
    const model = await getContentRepository().getModel("zh-CN", SLUG);
    await renderPage();

    const headings = screen.getAllByRole("heading", { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent(`${model?.label} 提示词`);
  });

  it("uses the prototype lede verbatim, with every number computed from the data", async () => {
    const repository = getContentRepository();
    const [model, { items }] = await Promise.all([
      repository.getModel("zh-CN", SLUG),
      repository.listModelPrompts("zh-CN", SLUG),
    ]);
    await renderPage();

    const lede = screen.getByText(model?.summary ?? "—");
    expect(lede).toBeInTheDocument();
    expect(lede.textContent).toMatch(
      /^\d+ 条点名该模型的真实提示词 · \d+ 条热门 · \d+ 位创作者 · 收录 /,
    );
    expect(lede.textContent).toContain(`${items.length} 条点名该模型的真实提示词`);
    // The snapshot line and the "官方链接暂未收录" line the prototype has no
    // equivalent for are gone; the footer carries the snapshot date instead.
    expect(lede.textContent).not.toContain("数据快照");
  });

  it("keeps the search box in the hero genbox with the prototype placeholder", async () => {
    const { items } = await getContentRepository().listModelPrompts("zh-CN", SLUG);
    const { container } = await renderPage();

    const hero = container.querySelector("header");
    expect(hero).not.toBeNull();

    const search = within(hero as HTMLElement).getByRole("searchbox");
    expect(search).toHaveAttribute(
      "placeholder",
      `描述你想要的画面，或搜索下方 ${items.length} 条提示词…例如：杂志感美妆人像、奢侈品静物`,
    );
  });

  it("puts the three behaviourless prototype controls in the hero, disabled and explained", async () => {
    const { container } = await renderPage();
    const hero = container.querySelector("header") as HTMLElement;

    for (const label of ["设置", "参考图", "生成"]) {
      const button = within(hero).getByRole("button", { name: label });
      expect(button).toHaveAttribute("aria-disabled", "true");

      const describedBy = button.getAttribute("aria-describedby");
      expect(describedBy).not.toBeNull();
      const reason = document.getElementById(describedBy ?? "");
      expect(reason?.textContent).toContain("生成功能尚未接入，本页仅提供 Prompt 复制");
    }

    // One shared explanation, not three copies, and no separate `<h2>` for it.
    expect(screen.getAllByText("生成功能尚未接入，本页仅提供 Prompt 复制")).toHaveLength(1);
    expect(screen.queryByRole("heading", { name: /生成/ })).toBeNull();
  });

  it("shows 筛选出 N 条 only while something is filtered", async () => {
    const { container } = await renderPage();
    const status = container.querySelector('header p[role="status"]');
    expect(status).not.toBeNull();
    expect(status?.textContent).toBe("");
  });
});

describe("L3 model page — module order and content", () => {
  it("renders the prototype's bands in the prototype's order", async () => {
    const model = await getContentRepository().getModel("zh-CN", SLUG);
    const { container } = await renderPage();

    // The 能力 / 输入 / 输出 / 限制 panel is gone: 能力 was the same 13
    // taxonomy values as the chip block ~200px above minus their counts and
    // links, 限制 was 关于这个模型's own sentence and 输出 was the breadcrumb.
    expect(sectionHeadings(container)).toEqual([
      "近期热门",
      "全部提示词",
      "带变量的提示词",
      "创作者",
      "关于这个模型",
      "相关",
      `复制这 ${model?.summary.match(/^\d+/)?.[0]} 条提示词中的任意一条`,
    ]);
  });

  it("lists the three 近期热门 prompts as rows, ranked by the shared repository rule", async () => {
    const trending = await getContentRepository().listTrending("zh-CN", "all", 3, SLUG);
    expect(trending.items).toHaveLength(3);

    await renderPage();
    const section = screen.getByRole("region", { name: "近期热门" });

    // All three are also in 全部提示词 below — this band is a 100% subset of
    // it — so they are rows, not a second set of cards. The rank is the one
    // fact the grid below does not carry, and it is the row's micro label.
    expect(within(section).queryAllByRole("article")).toHaveLength(0);
    const rows = within(section).getAllByRole("link");
    expect(rows).toHaveLength(3);
    expect(rows.map((row) => row.getAttribute("href"))).toEqual(
      trending.items.map((prompt) => prompt.href),
    );
    for (const [index, prompt] of trending.items.entries()) {
      expect(rows[index]?.textContent).toContain(prompt.title);
      expect(rows[index]?.textContent).toContain(formatCreatorHandle(prompt.creator.handle));
      expect(rows[index]?.textContent).toContain(String(index + 1).padStart(2, "0"));
    }
  });

  it("lists every prompt of this model with a real detail link, under the three facet axes", async () => {
    const { items, facets } = await getContentRepository().listModelPrompts("zh-CN", SLUG);
    const { container } = await renderPage();

    const all = screen.getByRole("region", { name: "全部提示词" });
    expect(all.textContent).toContain(`共 ${items.length} 条`);
    expect(within(all).getAllByRole("article")).toHaveLength(items.length);
    for (const prompt of items) {
      expect(container.querySelector(`a[href="${prompt.href}"]`)).not.toBeNull();
    }

    // The prototype's 用例 / 风格 / 主体 axes sit inside this section, with counts.
    for (const axis of ["用例", "风格", "主体"]) {
      expect(within(all).getByRole("group", { name: axis })).toBeInTheDocument();
    }
    const styleGroup = within(all).getByRole("group", { name: "风格" });
    const styleOptions = facets.find((group) => group.key === "style")?.options ?? [];
    expect(styleOptions.length).toBeGreaterThan(0);
    expect(within(styleGroup).getAllByRole("link").length).toBe(styleOptions.length);
    expect(styleGroup.textContent).toContain(String(styleOptions[0]?.count));
  });

  it("lists the variable-bearing prompts as rows, keeping the count pill and subline", async () => {
    const withVariables = await getContentRepository().listPromptsWithVariables("zh-CN", SLUG);
    expect(withVariables.length).toBeGreaterThan(0);

    await renderPage();
    const rail = screen.getByRole("region", { name: "带变量的提示词" });

    // Demoted for the same reason as 近期热门: every one of these prompts has
    // a card in 全部提示词. The two honest counts stay — the `N 条` pill and
    // the sentence — and each row's micro label is that prompt's own first
    // placeholder, read out of its text.
    expect(rail.textContent).toContain(`${withVariables.length} 条`);
    expect(rail.textContent).toContain(
      "这些提示词带 [COUNTRY] 一类的占位变量，替换变量即可得到一整套新画面，正文无需改动。",
    );
    expect(within(rail).queryAllByRole("article")).toHaveLength(0);
    const rows = within(rail).getAllByRole("link");
    expect(rows).toHaveLength(withVariables.length);
    for (const [index, prompt] of withVariables.entries()) {
      expect(rows[index]?.getAttribute("href")).toBe(prompt.href);
      const token = extractVariables(prompt.promptText)[0]?.token;
      expect(token).toBeDefined();
      expect(rows[index]?.textContent).toContain(token);
    }
  });

  it("shows creators as an inline list with counts from this model's prompts only", async () => {
    const { items } = await getContentRepository().listModelPrompts("zh-CN", SLUG);
    const expected = new Map<string, number>();
    for (const prompt of items) {
      expected.set(prompt.creator.handle, (expected.get(prompt.creator.handle) ?? 0) + 1);
    }

    await renderPage();
    const creators = screen.getByRole("region", { name: "创作者" });
    const entries = within(creators).getAllByRole("listitem");

    expect(entries).toHaveLength(expected.size);
    for (const [handle, count] of expected) {
      const displayHandle = formatCreatorHandle(handle);
      const entry = entries.find((node) => node.textContent?.includes(displayHandle));
      expect(entry, `missing creator ${displayHandle}`).toBeDefined();
      expect(entry?.textContent).toContain(`${count} 条提示词`);
    }
    expect(creators.textContent).not.toContain("@@");
    // The global creator count must not leak into a per-model page.
    const globalCreators = await getContentRepository().listCreators("zh-CN");
    expect(expected.size).toBeLessThan(globalCreators.length);
  });

  it("keeps 关于这个模型 and drops the spec columns it duplicated", async () => {
    const model = await getContentRepository().getModel("zh-CN", SLUG);
    await renderPage();

    const about = screen.getByRole("region", { name: "关于这个模型" });
    for (const block of model?.editorial ?? []) {
      expect(about.textContent).toContain(block.title);
      expect(about.textContent).toContain(block.body);
    }
    expect((model?.editorial ?? []).map((block) => block.title)).toEqual([
      "收录情况",
      "页面范围",
      "使用建议",
    ]);

    // The four derived spec columns that used to follow this section are gone.
    // `ModelDetail` still carries the data — it is honest and unchanged — the
    // page just stops printing it a second time.
    expect(
      screen.queryByRole("region", { name: /能力 \/ 输入 \/ 输出 \/ 限制/ }),
    ).toBeNull();
    expect((model?.limitations ?? []).length).toBeGreaterThan(0);
    for (const limitation of model?.limitations ?? []) {
      // 限制 said what 关于这个模型 already says, so the sentence is not
      // reprinted anywhere on the page.
      expect(screen.queryByText(limitation)).toBeNull();
    }
    for (const capability of model?.capabilities ?? []) {
      // Every 能力 value is a taxonomy term the chip block above carries WITH
      // its count and its link, so the count-free copy is not printed twice.
      expect(within(about).queryByText(capability)).toBeNull();
    }
  });

  it("renders the four 相关 columns with the prototype's labels", async () => {
    const model = await getContentRepository().getModel("zh-CN", SLUG);
    const { container } = await renderPage();

    const related = screen.getByRole("region", { name: "相关" });
    expect(
      within(related)
        .getAllByRole("heading", { level: 3 })
        .map((node) => node.textContent),
    ).toEqual(["上级", "其他模型", "按用例", "创作者"]);

    expect(within(related).getByRole("link", { name: "图片提示词" })).toBeInTheDocument();
    expect(within(related).getByRole("link", { name: "提示词库首页" })).toBeInTheDocument();
    for (const term of model?.relatedModels ?? []) {
      if (term.href === null) continue;
      expect(container.querySelector(`a[href="${term.href}"]`)).not.toBeNull();
      expect(related.textContent).toContain(term.label);
    }
    for (const useCase of model?.relatedUseCases ?? []) {
      expect(
        container.querySelector(`a[href="/zh-CN/prompts?useCase=${useCase.slug}"]`),
      ).not.toBeNull();
    }
    // `/prompts/creators` does not ship this phase: text, never a dead link.
    expect(related.textContent).toContain("全部创作者（即将推出）");
    expect(within(related).queryByRole("link", { name: /全部创作者/ })).toBeNull();

    // A dense text index, demoted from boxes to hairline rows: 44px targets,
    // the lightest divider tier, and no card frame or shadow anywhere in it.
    const rows = [...related.querySelectorAll("li > a, li > span")];
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.className).toContain("min-h-11");
      expect(row.className).not.toContain("shadow-hard");
      expect(row.className).not.toContain("border-2 border-foreground");
    }
  });

  it("closes with the prototype CTA pointing back at 全部提示词", async () => {
    const { items } = await getContentRepository().listModelPrompts("zh-CN", SLUG);
    const { container } = await renderPage();

    expect(
      screen.getByRole("heading", {
        level: 2,
        name: `复制这 ${items.length} 条提示词中的任意一条`,
      }),
    ).toBeInTheDocument();
    expect(container.textContent).toContain("主动作是复制，每张卡片都能一键跳转原帖。");

    const back = screen.getByRole("link", { name: "回到提示词列表" });
    expect(back).toHaveAttribute("href", "#all-prompts");
    expect(container.querySelector("#all-prompts")).not.toBeNull();
  });
});

describe("L3 model page — trail, structured data, honesty", () => {
  it("renders the four-step breadcrumb with 模型 as a non-link level", async () => {
    const { container } = await renderPage();

    const trail = screen.getByRole("navigation", { name: "面包屑" });
    const items = within(trail).getAllByRole("listitem");
    expect(items.map((node) => node.textContent?.replace("/", "").trim())).toEqual([
      "提示词库",
      "图片",
      "模型",
      "Nano Banana Pro",
    ]);
    expect(within(trail).queryByRole("link", { name: "模型" })).toBeNull();
    expect(container.querySelector('nav[aria-label="面包屑"] a[href="/zh-CN/prompts"]')).not.toBeNull();
    expect(
      container.querySelector('nav[aria-label="面包屑"] a[href="/zh-CN/prompts/image"]'),
    ).not.toBeNull();
  });

  it("emits a 4-item BreadcrumbList and a CollectionPage matching the rendered list", async () => {
    const { items } = await getContentRepository().listModelPrompts("zh-CN", SLUG);
    const { container } = await renderPage();

    const payloads = [...container.querySelectorAll('script[type="application/ld+json"]')].map(
      (node) => JSON.parse(node.textContent ?? "{}") as Record<string, unknown>,
    );
    const breadcrumb = payloads.find((payload) => payload["@type"] === "BreadcrumbList") as
      | { itemListElement: { name: string; item?: string }[] }
      | undefined;
    expect(breadcrumb?.itemListElement).toHaveLength(4);
    expect(breadcrumb?.itemListElement.map((entry) => entry.name)).toEqual([
      "提示词库",
      "图片",
      "模型",
      "Nano Banana Pro",
    ]);
    // The 模型 index does not exist, so its ListItem carries no `item` URL.
    expect(breadcrumb?.itemListElement[2]?.item).toBeUndefined();

    const collection = payloads.find((payload) => payload["@type"] === "CollectionPage") as
      | Record<string, unknown>
      | undefined;
    expect((collection?.isPartOf as { url: string } | undefined)?.url).toBe(
      "https://example.invalid/zh-CN",
    );
    const itemList = collection?.mainEntity as {
      "@type": string;
      numberOfItems: number;
      itemListElement: { url: string }[];
    };
    expect(itemList["@type"]).toBe("ItemList");
    expect(itemList.numberOfItems).toBe(items.length);
    for (const entry of itemList.itemListElement) {
      const path = new URL(entry.url).pathname;
      expect(container.querySelector(`a[href="${path}"]`)).not.toBeNull();
    }
  });

  it("never renders a prototype-declared count or a placeholder href", async () => {
    const { container } = await renderPage();

    for (const declared of ["136", "46 条热门", "47 位创作者"]) {
      expect(container.textContent).not.toContain(declared);
    }

    for (const node of container.querySelectorAll("a[href]")) {
      expect(node.getAttribute("href")).not.toBe("#");
    }
  });

  it("declares a canonical and no fake hreflang alternates", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: "zh-CN", modelSlug: SLUG }),
    });

    expect(metadata.alternates?.canonical).toBe(
      "https://example.invalid/zh-CN/prompts/models/nano-banana-pro",
    );
    expect(metadata.alternates?.languages).toBeUndefined();
  });
});

describe("L3 generateStaticParams", () => {
  it("emits a page for every model that has at least one prompt", async () => {
    const params = await generateStaticParams();
    const repository = getContentRepository();
    const models = await repository.listTaxonomies("zh-CN", "model");

    const slugs = params.map((entry) => entry.modelSlug);
    expect(new Set(slugs).size).toBe(params.length);
    for (const slug of ["nano-banana-pro", "higgsfield-soul", "gpt-image-2"]) {
      expect(slugs).toContain(slug);
    }
    for (const model of models) {
      expect(slugs).toContain(model.slug);
    }
  });

  it("excludes models the data set has no prompts for", async () => {
    const params = await generateStaticParams();
    const repository = getContentRepository();
    const slugs = params.map((entry) => entry.modelSlug);

    for (const slug of ["sora", "wan"]) {
      expect(await repository.getModel("zh-CN", slug)).toBeNull();
      expect(slugs).not.toContain(slug);
    }
  });

  it("refuses slugs outside the generated set", () => {
    expect(dynamicParams).toBe(false);
  });

  it("404s on a model slug with no detail", async () => {
    await expect(
      ModelPage({ params: Promise.resolve({ locale: "zh-CN", modelSlug: "sora" }) }),
    ).rejects.toThrow("notFound() called");
    await expect(
      ModelPage({ params: Promise.resolve({ locale: "zh-CN", modelSlug: "not-a-model" }) }),
    ).rejects.toThrow("notFound() called");
    await expect(
      ModelPage({ params: Promise.resolve({ locale: "en", modelSlug: SLUG }) }),
    ).rejects.toThrow("notFound() called");
  });
});

/** Type-level guard: the page consumes `PromptSummary`, never the raw fixture. */
export type _Summary = PromptSummary;
