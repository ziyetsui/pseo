import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SearchForm } from "@/features/search/SearchForm";

const BASE = "/zh-CN/prompts";

function hidden(container: HTMLElement, name: string): string[] {
  return [...container.querySelectorAll(`input[type="hidden"][name="${name}"]`)].map((node) =>
    node.getAttribute("value") ?? "",
  );
}

describe("SearchForm", () => {
  it("is a GET search form pointed at the current path", () => {
    const { container } = render(<SearchForm basePath={BASE} query={{}} />);
    const form = screen.getByRole("search");
    expect(form).toHaveAttribute("method", "get");
    expect(form).toHaveAttribute("action", BASE);
    expect(container.querySelector('input[name="q"]')).toHaveAttribute("type", "search");
  });

  it("labels the input and pre-fills the current term", () => {
    render(<SearchForm basePath={BASE} query={{ q: "glass cube" }} />);
    expect(screen.getByLabelText("搜索提示词")).toHaveValue("glass cube");
  });

  it("keeps every other active param as a hidden input so a GET submit preserves facets", () => {
    const { container } = render(
      <SearchForm
        basePath={BASE}
        query={{ q: "cat", model: ["seedance", "kling"], style: ["realistic"], window: "7d" }}
      />,
    );

    expect(hidden(container, "model")).toEqual(["seedance", "kling"]);
    expect(hidden(container, "style")).toEqual(["realistic"]);
    expect(hidden(container, "window")).toEqual(["7d"]);
    // `q` is owned by the visible input, never duplicated as a hidden one.
    expect(hidden(container, "q")).toEqual([]);
  });

  it("offers a reset link back to the unfiltered path when something is active", () => {
    render(<SearchForm basePath={BASE} query={{ q: "cat" }} />);
    expect(screen.getByRole("link", { name: "重置搜索" })).toHaveAttribute("href", BASE);
  });

  it("hides the reset link when nothing is active", () => {
    render(<SearchForm basePath={BASE} query={{}} />);
    expect(screen.queryByRole("link", { name: "重置搜索" })).not.toBeInTheDocument();
  });

  it("treats an empty q as no state, not as a filter to reset", () => {
    render(<SearchForm basePath={BASE} query={{ q: "" }} />);
    expect(screen.queryByRole("link", { name: "重置搜索" })).not.toBeInTheDocument();
  });
});
