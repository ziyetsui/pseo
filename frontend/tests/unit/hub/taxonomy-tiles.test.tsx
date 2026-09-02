import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TaxonomyTiles } from "@/features/hub/TaxonomyTiles";
import type { TaxonomyWithCount } from "@/lib/content/types";

const BASE = "/zh-CN/prompts";

function term(overrides: Partial<TaxonomyWithCount> = {}): TaxonomyWithCount {
  return {
    id: "useCase:fashion",
    axis: "useCase",
    slug: "fashion",
    label: "Fashion",
    labelZh: "时尚",
    aliases: [],
    href: null,
    wireframeDeclaredCount: 162,
    count: 4,
    highValueCount: 1,
    ...overrides,
  };
}

describe("TaxonomyTiles", () => {
  it("links a term without a page of its own to the pre-filtered hub", () => {
    render(<TaxonomyTiles basePath={BASE} axis="useCase" terms={[term()]} />);

    // The tile carries the prototype's English value, not `labelZh`.
    expect(screen.getByRole("link", { name: /Fashion/ })).toHaveAttribute(
      "href",
      `${BASE}?useCase=fashion`,
    );
    expect(screen.queryByText("时尚")).not.toBeInTheDocument();
  });

  it("links a model that has a real page to that page", () => {
    render(
      <TaxonomyTiles
        basePath={BASE}
        axis="model"
        terms={[
          term({
            id: "model:nano-banana-pro",
            axis: "model",
            slug: "nano-banana-pro",
            label: "Nano Banana Pro",
            labelZh: null,
            href: "/zh-CN/prompts/models/nano-banana-pro",
            count: 6,
          }),
        ]}
      />,
    );

    expect(screen.getByRole("link", { name: /Nano Banana Pro/ })).toHaveAttribute(
      "href",
      "/zh-CN/prompts/models/nano-banana-pro",
    );
  });

  it("renders the count from the data, never the prototype's declared number", () => {
    const { container } = render(<TaxonomyTiles basePath={BASE} axis="useCase" terms={[term()]} />);

    // The number and its unit are now two elements — display-scale figure over a
    // caption — but the tile still reads `4 条提示词`, word for word.
    expect(container.textContent).toContain("4 条提示词");
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText(/条提示词/)).toBeInTheDocument();
    expect(screen.queryByText(/162/)).not.toBeInTheDocument();
  });

  it("sets the count in display type with tabular numerals", () => {
    render(<TaxonomyTiles basePath={BASE} axis="useCase" terms={[term()]} />);

    const figure = screen.getByText("4");
    expect(figure.className).toContain("tabular-nums");
    expect(figure.className).toMatch(/text-(3|4|5)xl/);
    expect(figure.className).toContain("font-black");
  });

  it("spans the highest-count tile across two columns on wide viewports only", () => {
    const { container } = render(
      <TaxonomyTiles
        basePath={BASE}
        axis="useCase"
        terms={[
          term({ count: 9 }),
          term({ id: "useCase:beauty", slug: "beauty", label: "Beauty", count: 3 }),
        ]}
      />,
    );

    const cells = [...container.querySelectorAll("li")];
    expect(cells[0]?.className).toContain("lg:col-span-2");
    // No unprefixed span: mobile keeps one tile per row. And no span for the rest.
    expect(cells[0]?.className).not.toMatch(/(^|\s)col-span-2/);
    expect(cells[1]?.className).not.toContain("col-span-2");
  });

  it("leaves every tile in one cell when the first is not the group's biggest", () => {
    const { container } = render(
      <TaxonomyTiles
        basePath={BASE}
        axis="useCase"
        terms={[
          term({ count: 2 }),
          term({ id: "useCase:beauty", slug: "beauty", label: "Beauty", count: 8 }),
        ]}
      />,
    );

    for (const cell of container.querySelectorAll("li")) {
      expect(cell.className).not.toContain("col-span-2");
    }
  });

  it("paints the proportion bar in the accent the section was given", () => {
    const { container } = render(
      <TaxonomyTiles basePath={BASE} axis="technique" accent="blue" terms={[term()]} />,
    );

    const fill = container.querySelector("span[style]");
    expect(fill?.className).toContain("bg-accent-blue");
    expect(fill?.className).not.toContain("bg-accent-red");
    // The bar stays decorative: the number beside it is the accessible fact.
    expect(fill?.closest("[aria-hidden='true']")).not.toBeNull();
  });

  it("falls back to an empty state instead of an empty list", () => {
    render(<TaxonomyTiles basePath={BASE} axis="style" terms={[]} />);

    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(document.querySelector('[data-state="empty"]')).not.toBeNull();
  });

  it("links to a term's own href whenever it has one, regardless of axis", () => {
    // `href` is only ever populated for a term with a real page in this phase;
    // trusting it directly (instead of also checking `axis === "model"`)
    // means a future axis gaining a real page needs no change here.
    render(
      <TaxonomyTiles
        basePath={BASE}
        axis="useCase"
        terms={[term({ href: "/zh-CN/prompts/use-cases/fashion" })]}
      />,
    );

    expect(screen.getByRole("link", { name: /Fashion/ })).toHaveAttribute(
      "href",
      "/zh-CN/prompts/use-cases/fashion",
    );
  });

  it("caps how many tiles it renders when asked", () => {
    render(
      <TaxonomyTiles
        basePath={BASE}
        axis="useCase"
        limit={1}
        terms={[term(), term({ id: "useCase:beauty", slug: "beauty", labelZh: "美妆", count: 3 })]}
      />,
    );

    expect(screen.getAllByRole("listitem")).toHaveLength(1);
  });
});
