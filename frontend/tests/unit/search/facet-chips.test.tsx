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
});
