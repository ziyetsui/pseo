import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SearchForm } from "@/features/search/SearchForm";

const BASE = "/zh-CN/prompts";
const PLACEHOLDER = "搜索提示词、模型、风格、镜头语言、创作者…";

function hidden(container: HTMLElement, name: string): string[] {
  return [...container.querySelectorAll(`input[type="hidden"][name="${name}"]`)].map((node) =>
    node.getAttribute("value") ?? "",
  );
}

describe("SearchForm", () => {
  it("is a GET search form pointed at the current path", () => {
    const { container } = render(
      <SearchForm basePath={BASE} query={{}} placeholder={PLACEHOLDER} />,
    );
    const form = screen.getByRole("search");
    expect(form).toHaveAttribute("method", "get");
    expect(form).toHaveAttribute("action", BASE);
    expect(container.querySelector('input[name="q"]')).toHaveAttribute("type", "search");
  });

  it("labels the input and pre-fills the current term", () => {
    render(<SearchForm basePath={BASE} query={{ q: "glass cube" }} placeholder={PLACEHOLDER} />);
    expect(screen.getByLabelText("搜索提示词")).toHaveValue("glass cube");
  });

  it("uses the placeholder the page supplied, so each page keeps its own prompt", () => {
    render(<SearchForm basePath={BASE} query={{}} placeholder="搜索图片提示词…" />);
    expect(screen.getByLabelText("搜索提示词")).toHaveAttribute(
      "placeholder",
      "搜索图片提示词…",
    );
  });

  it("keeps every other active param as a hidden input so a GET submit preserves facets", () => {
    const { container } = render(
      <SearchForm
        basePath={BASE}
        placeholder={PLACEHOLDER}
        query={{
          q: "cat",
          model: ["seedance", "kling"],
          style: ["realistic"],
          window: "7d",
          collection: "template-prompts",
        }}
      />,
    );

    expect(hidden(container, "model")).toEqual(["seedance", "kling"]);
    expect(hidden(container, "style")).toEqual(["realistic"]);
    expect(hidden(container, "window")).toEqual(["7d"]);
    expect(hidden(container, "collection")).toEqual(["template-prompts"]);
    // `q` is owned by the visible input, never duplicated as a hidden one.
    expect(hidden(container, "q")).toEqual([]);
  });

  it("puts the submit control inside the field's own frame as a solid colour block", () => {
    const { container } = render(
      <SearchForm basePath={BASE} query={{}} placeholder={PLACEHOLDER} />,
    );

    const input = container.querySelector('input[name="q"]');
    const submit = screen.getByRole("button", { name: "搜索" });
    expect(submit).toHaveAttribute("type", "submit");
    // Flush against the input: same parent, and that parent is the bordered
    // field — not a button floating beside it.
    expect(submit.parentElement).toBe(input?.parentElement);
    expect(submit.parentElement).toHaveClass("border-2", "md:border-4");
    expect(submit).toHaveClass("bg-accent-red");
    // Still a 44×44 target.
    expect(submit).toHaveClass("min-h-11", "min-w-11");
  });

  it.each([
    ["something is active", { q: "cat" }],
    ["nothing is active", {}],
  ])("always offers 重置 back to the unfiltered path — %s", (_name, query) => {
    render(<SearchForm basePath={BASE} query={query} placeholder={PLACEHOLDER} />);
    expect(screen.getByRole("link", { name: "重置" })).toHaveAttribute("href", BASE);
  });
});
