import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { getContentRepository } from "@/lib/content";
import { applyPromptQuery } from "@/lib/content/query";

/**
 * The filtered state of the L3 page, rendered as the client sees it after
 * hydration on a URL that carries a facet. Static export cannot read search
 * params on the server, so this is the only place the swap from browse content
 * to results can be exercised.
 */
const search = vi.hoisted(() => ({ value: "" }));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(search.value),
  usePathname: () => "/zh-CN/prompts/models/nano-banana-pro",
  notFound: () => {
    throw new Error("notFound() called");
  },
}));

const { default: ModelPage } = await import(
  "@/app/[locale]/(site)/prompts/models/[modelSlug]/page"
);

const SLUG = "nano-banana-pro";

async function renderWith(query: string) {
  search.value = query;
  return render(await ModelPage({ params: Promise.resolve({ locale: "zh-CN", modelSlug: SLUG }) }));
}

describe("L3 model page — filtered", () => {
  it("announces 筛选出 N 条 and swaps 全部提示词 for the matching cards", async () => {
    const { items } = await getContentRepository().listModelPrompts("zh-CN", SLUG);
    const expected = applyPromptQuery(items, { style: ["photorealistic"] });
    expect(expected.length).toBeGreaterThan(0);
    expect(expected.length).toBeLessThan(items.length);

    const { container } = await renderWith("style=photorealistic");

    const status = container.querySelector('header p[role="status"]');
    expect(status?.textContent).toBe(`筛选出 ${expected.length} 条`);

    const all = screen.getByRole("region", { name: "全部提示词" });
    expect(within(all).getAllByRole("article")).toHaveLength(expected.length);
    // The unfiltered total stays in the section head, as in the prototype.
    expect(all.textContent).toContain(`共 ${items.length} 条`);
    // A removal link for the one active condition, named with the page's own
    // axis vocabulary.
    expect(within(all).getByRole("link", { name: /移除筛选：风格/ })).toBeInTheDocument();
  });

  it("explains a no-result combination and offers a way back", async () => {
    const { container } = await renderWith("q=zzzzz-no-such-prompt-text");

    const all = screen.getByRole("region", { name: "全部提示词" });
    expect(all.textContent).toContain("没有同时满足这些条件的提示词");
    expect(within(all).getAllByRole("link", { name: "清除全部筛选" }).length).toBeGreaterThan(0);
    expect(container.querySelector('header p[role="status"]')?.textContent).toBe("筛选出 0 条");
  });

  it("reports an unknown facet value instead of silently emptying the page", async () => {
    const { items } = await getContentRepository().listModelPrompts("zh-CN", SLUG);
    await renderWith("style=does-not-exist");

    const all = screen.getByRole("region", { name: "全部提示词" });
    expect(all.textContent).toContain("以下筛选值不存在，已被忽略：style=does-not-exist");
    // Ignored means ignored: the whole set is still listed.
    expect(within(all).getAllByRole("article")).toHaveLength(items.length);
  });

  it("reports an unknown query param rather than dropping it in silence", async () => {
    await renderWith("sort=whatever");

    const all = screen.getByRole("region", { name: "全部提示词" });
    expect(all.textContent).toContain("未知参数 sort");
  });
});
