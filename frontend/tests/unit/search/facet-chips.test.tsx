import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FacetChips } from "@/features/search/FacetChips";
import type { PromptQuery } from "@/lib/content/types";

import { makeFacetGroups } from "../support/prompt-fixtures";

const BASE = "/zh-CN/prompts";

function renderChips(query: PromptQuery) {
  return render(<FacetChips basePath={BASE} query={query} groups={makeFacetGroups()} />);
}

describe("FacetChips", () => {
  it("adds a value on the same axis while keeping the other axis and q", () => {
    renderChips({ q: "cat", model: ["seedance"], style: [] });
    expect(screen.getByRole("link", { name: /Kling/ })).toHaveAttribute(
      "href",
      "/zh-CN/prompts?model=seedance&model=kling&q=cat",
    );
  });

  it("removes an already-selected value from its own axis", () => {
    renderChips({ q: "cat", model: ["seedance"] });
    expect(screen.getByRole("link", { name: /Seedance/ })).toHaveAttribute(
      "href",
      "/zh-CN/prompts?q=cat",
    );
  });

  it("preserves other axes when toggling a different axis", () => {
    renderChips({ q: "cat", model: ["seedance"] });
    expect(screen.getByRole("link", { name: /写实/ })).toHaveAttribute(
      "href",
      "/zh-CN/prompts?model=seedance&q=cat&style=realistic",
    );
  });

  it("marks the selected chip with aria-current and a non-colour indicator", () => {
    renderChips({ model: ["seedance"] });
    const active = screen.getByRole("link", { name: /Seedance/ });
    expect(active).toHaveAttribute("aria-current", "true");
    expect(active).toHaveTextContent("✓");

    expect(screen.getByRole("link", { name: /Kling/ })).not.toHaveAttribute("aria-current");
  });

  it("shows the count that came from props", () => {
    renderChips({});
    expect(screen.getByRole("link", { name: /Kling/ })).toHaveTextContent("2");
  });

  it("labels every facet group", () => {
    renderChips({});
    expect(screen.getByRole("group", { name: "模型" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "风格" })).toBeInTheDocument();
  });

  it("gives each axis a band edge in its own colour, hidden from assistive tech", () => {
    renderChips({});

    for (const [axis, accent] of [
      ["模型", "bg-accent-red"],
      ["风格", "bg-foreground"],
    ] as const) {
      const band = screen.getByRole("group", { name: axis });
      const edge = band.querySelector('[aria-hidden="true"]');
      expect(edge, `${axis} has no colour edge`).not.toBeNull();
      expect(edge).toHaveClass(accent);
      // Decoration only: the axis is still named in text inside the band.
      expect(edge).toHaveTextContent("");
      expect(band).toHaveTextContent(axis);
    }
  });

  it("keeps the axis name as plain text by default and as an h3 when the page asks", () => {
    const { rerender } = renderChips({});
    expect(screen.queryByRole("heading", { name: "模型" })).toBeNull();

    rerender(
      <FacetChips basePath={BASE} query={{}} groups={makeFacetGroups()} headingLevel="h3" />,
    );
    expect(screen.getByRole("heading", { level: 3, name: "模型" })).toBeInTheDocument();
  });
});
