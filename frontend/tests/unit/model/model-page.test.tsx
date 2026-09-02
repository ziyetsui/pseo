import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { formatCreatorHandle, getContentRepository } from "@/lib/content";
import type { PromptSummary } from "@/lib/content/types";

/**
 * Assembly test for the L3 model route. It stands in for the build-time check
 * that `out/zh-CN/prompts/models/nano-banana-pro.html` carries the H1 and real
 * detail links: the page component is rendered exactly as the server renders
 * it, with an empty URL, so what is asserted here is the browse HTML a crawler
 * or a JavaScript-less reader receives.
 */
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(""),
  usePathname: () => "/zh-CN/prompts/models/nano-banana-pro",
  notFound: () => {
    throw new Error("notFound() called");
  },
}));

const { default: ModelPage, generateMetadata, generateStaticParams, dynamicParams } = await import(
  "@/app/[locale]/prompts/models/[modelSlug]/page"
);

const SLUG = "nano-banana-pro";

async function renderPage(modelSlug = SLUG) {
  return render(await ModelPage({ params: Promise.resolve({ locale: "zh-CN", modelSlug }) }));
}

describe("L3 model page", () => {
  it("renders exactly one H1 naming the model", async () => {
    const model = await getContentRepository().getModel("zh-CN", SLUG);
    await renderPage();

    const headings = screen.getAllByRole("heading", { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent(`${model?.label} 提示词`);
  });

  it("renders the dynamic summary, the missing official link and the snapshot date", async () => {
    const repository = getContentRepository();
    const [model, snapshot] = await Promise.all([
      repository.getModel("zh-CN", SLUG),
      repository.getSnapshot(),
    ]);
    await renderPage();

    expect(screen.getByText(model?.summary ?? "—")).toBeInTheDocument();
    expect(screen.getByText("官方链接暂未收录")).toBeInTheDocument();
    expect(screen.getByText(`数据快照 ${snapshot.observedAt}`)).toBeInTheDocument();
  });

  it("shows the derived capabilities / inputs / outputs / limitations, limitations included", async () => {
    const model = await getContentRepository().getModel("zh-CN", SLUG);
    const { container } = await renderPage();

    const spec = screen.getByRole("region", { name: "能力 / 输入 / 输出 / 限制" });
    for (const title of ["能力", "输入", "输出", "限制"]) {
      expect(within(spec).getByRole("heading", { name: title, level: 3 })).toBeInTheDocument();
    }
    for (const limitation of model?.limitations ?? []) {
      expect(within(spec).getByText(limitation)).toBeInTheDocument();
    }
    expect((model?.limitations ?? []).length).toBeGreaterThan(0);
    expect(container.textContent).toContain("由收录 Prompt 派生");
  });

  it("renders the three prototype generate controls as explained, disabled buttons", async () => {
    await renderPage();

    for (const label of ["设置", "参考图", "生成"]) {
      const button = screen.getByRole("button", { name: label });
      expect(button).toHaveAttribute("aria-disabled", "true");

      const describedBy = button.getAttribute("aria-describedby");
      expect(describedBy).not.toBeNull();
      const reason = document.getElementById(describedBy ?? "");
      expect(reason?.textContent).toContain("生成功能尚未接入，本页仅提供 Prompt 复制");
    }
  });

  it("lists every prompt of this model, with a real detail link for each", async () => {
    const { items } = await getContentRepository().listModelPrompts("zh-CN", SLUG);
    const { container } = await renderPage();

    const all = screen.getByRole("region", { name: "全部提示词" });
    expect(within(all).getAllByRole("article")).toHaveLength(items.length);
    for (const prompt of items) {
      expect(container.querySelector(`a[href="${prompt.href}"]`)).not.toBeNull();
    }
  });

  it("orders 近期热门 by highValue, then valueScore, then likes, capped at six", async () => {
    const { items } = await getContentRepository().listModelPrompts("zh-CN", SLUG);
    const expected = [...items]
      .sort((a, b) => {
        if (a.metrics.highValue !== b.metrics.highValue) return a.metrics.highValue ? -1 : 1;
        const av = a.metrics.valueScore;
        const bv = b.metrics.valueScore;
        if (av !== bv) {
          if (av === null) return 1;
          if (bv === null) return -1;
          return bv - av;
        }
        return (b.metrics.likes ?? 0) - (a.metrics.likes ?? 0);
      })
      .slice(0, 6);

    await renderPage();
    const trending = screen.getByRole("region", { name: "近期热门" });
    const titles = within(trending)
      .getAllByRole("heading", { level: 3 })
      .map((node) => node.textContent);

    expect(titles).toEqual(expected.map((prompt) => prompt.title));
  });

  it("shows creator counts computed from this model's prompts only", async () => {
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

  it("renders the variables rail only when this model has prompts with variables", async () => {
    const withVariables = await getContentRepository().listPromptsWithVariables("zh-CN", SLUG);
    expect(withVariables.length).toBeGreaterThan(0);

    await renderPage();
    const rail = screen.getByRole("region", { name: "带变量的提示词" });
    expect(within(rail).getAllByRole("article")).toHaveLength(withVariables.length);
  });

  it("never renders a prototype-declared count or a placeholder href", async () => {
    const { container } = await renderPage();

    const chrome = [
      container.querySelector("h1"),
      screen.getByRole("region", { name: "关于这个模型" }),
      screen.getByRole("region", { name: "能力 / 输入 / 输出 / 限制" }),
    ]
      .map((node) => node?.textContent ?? "")
      .join(" ");
    for (const declared of ["136", "46 条热门", "47 位创作者"]) {
      expect(chrome).not.toContain(declared);
    }
    // The prototype's declared library size for this model must not appear
    // anywhere on the page, not just in the chrome.
    expect(container.textContent).not.toContain("136");

    for (const node of container.querySelectorAll("a[href]")) {
      expect(node.getAttribute("href")).not.toBe("#");
    }
  });

  it("links up to L2 and L1 and across to the related model pages", async () => {
    const model = await getContentRepository().getModel("zh-CN", SLUG);
    const { container } = await renderPage();

    expect(container.querySelector('a[href="/zh-CN/prompts/image"]')).not.toBeNull();
    expect(container.querySelector('a[href="/zh-CN/prompts"]')).not.toBeNull();
    for (const related of model?.relatedModels ?? []) {
      if (related.href === null) continue;
      expect(container.querySelector(`a[href="${related.href}"]`)).not.toBeNull();
    }
    for (const useCase of model?.relatedUseCases ?? []) {
      expect(
        container.querySelector(`a[href="/zh-CN/prompts?useCase=${useCase.slug}"]`),
      ).not.toBeNull();
    }
  });

  it("emits a 3-item BreadcrumbList and a CollectionPage matching the rendered list", async () => {
    const { items } = await getContentRepository().listModelPrompts("zh-CN", SLUG);
    const { container } = await renderPage();

    const payloads = [...container.querySelectorAll('script[type="application/ld+json"]')].map(
      (node) => JSON.parse(node.textContent ?? "{}") as Record<string, unknown>,
    );
    const breadcrumb = payloads.find((payload) => payload["@type"] === "BreadcrumbList") as
      | { itemListElement: { name: string; item: string }[] }
      | undefined;
    expect(breadcrumb?.itemListElement).toHaveLength(3);
    expect(breadcrumb?.itemListElement.map((entry) => entry.name)).toEqual([
      "提示词库",
      "图片提示词",
      "Nano Banana Pro",
    ]);

    const collection = payloads.find((payload) => payload["@type"] === "CollectionPage");
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
