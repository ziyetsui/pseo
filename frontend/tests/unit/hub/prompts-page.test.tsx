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

const { default: PromptsPage, generateMetadata } = await import("@/app/[locale]/prompts/page");

async function renderPage() {
  return render(await PromptsPage({ params: Promise.resolve({ locale: "zh-CN" }) }));
}

describe("L1 prompt hub page", () => {
  it("renders exactly one H1 whose count comes from the repository", async () => {
    const { total } = await getContentRepository().listPrompts("zh-CN");
    await renderPage();

    const headings = screen.getAllByRole("heading", { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent(`${total} 条提示词，复制即用`);
    // The prototype's declared library size must never be rendered as a fact.
    expect(headings[0]?.textContent).not.toContain("982");
  });

  it("server-renders the featured prompt and the all-time trending grid", async () => {
    const repository = getContentRepository();
    const [featured] = await repository.listFeatured("zh-CN", "l1");
    const trending = await repository.listTrending("zh-CN", "all", 6);
    await renderPage();

    expect(featured).toBeDefined();
    const featuredSection = screen.getByRole("region", { name: "本期精选" });
    expect(
      within(featuredSection).getByRole("heading", { name: featured?.title, level: 3 }),
    ).toBeInTheDocument();

    const panel = screen.getByRole("tabpanel");
    expect(within(panel).getAllByRole("article").length).toBe(trending.items.length);
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

  it("emits BreadcrumbList and CollectionPage JSON-LD that matches the visible list", async () => {
    const { container } = await renderPage();

    const payloads = [...container.querySelectorAll('script[type="application/ld+json"]')].map(
      (node) => JSON.parse(node.textContent ?? "{}") as { "@type"?: string; mainEntity?: unknown },
    );
    const types = payloads.map((payload) => payload["@type"]);
    expect(types).toContain("BreadcrumbList");
    expect(types).toContain("CollectionPage");

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

    expect(metadata.alternates?.canonical).toBe("https://example.invalid/zh-CN/prompts");
    expect(metadata.alternates?.languages).toBeUndefined();
  });
});
