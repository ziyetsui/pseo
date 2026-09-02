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
    render(<TaxonomyTiles basePath={BASE} axis="useCase" terms={[term()]} />);

    expect(screen.getByText("4 条提示词")).toBeInTheDocument();
    expect(screen.queryByText(/162/)).not.toBeInTheDocument();
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
