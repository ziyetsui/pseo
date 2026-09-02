import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ActiveFilters } from "@/features/search/ActiveFilters";
import type { AppliedFilter } from "@/lib/content/types";

const BASE = "/zh-CN/prompts";

const applied: AppliedFilter[] = [
  { key: "q", value: "cat", label: "关键词「cat」" },
  { key: "model", value: "seedance", label: "模型：Seedance" },
  { key: "model", value: "kling", label: "模型：Kling" },
  { key: "style", value: "realistic", label: "风格：写实" },
];

describe("ActiveFilters", () => {
  it("announces the result count", () => {
    render(<ActiveFilters basePath={BASE} query={{}} total={12} appliedFilters={[]} />);
    expect(screen.getByRole("status")).toHaveTextContent("共 12 条");
  });

  it("gives every active filter its own removal link", () => {
    render(
      <ActiveFilters
        basePath={BASE}
        query={{ q: "cat", model: ["seedance", "kling"], style: ["realistic"] }}
        total={3}
        appliedFilters={applied}
      />,
    );

    expect(screen.getByRole("link", { name: "移除筛选：模型：Seedance" })).toHaveAttribute(
      "href",
      "/zh-CN/prompts?model=kling&q=cat&style=realistic",
    );
    expect(screen.getByRole("link", { name: "移除筛选：关键词「cat」" })).toHaveAttribute(
      "href",
      "/zh-CN/prompts?model=seedance&model=kling&style=realistic",
    );
    expect(screen.getByRole("link", { name: "移除筛选：风格：写实" })).toHaveAttribute(
      "href",
      "/zh-CN/prompts?model=seedance&model=kling&q=cat",
    );
  });

  it("offers a reset link only while something is applied", () => {
    const { unmount } = render(
      <ActiveFilters
        basePath={BASE}
        query={{ q: "cat" }}
        total={3}
        appliedFilters={[applied[0] as AppliedFilter]}
      />,
    );
    expect(screen.getByRole("link", { name: "清除全部筛选" })).toHaveAttribute("href", BASE);
    unmount();

    render(<ActiveFilters basePath={BASE} query={{}} total={3} appliedFilters={[]} />);
    expect(screen.queryByRole("link", { name: "清除全部筛选" })).not.toBeInTheDocument();
  });

  it("surfaces unknown params instead of ignoring them silently", () => {
    render(
      <ActiveFilters
        basePath={BASE}
        query={{ q: "cat" }}
        total={3}
        appliedFilters={[applied[0] as AppliedFilter]}
        unknownParams={["sort", "page"]}
      />,
    );

    expect(screen.getByText(/未知参数/)).toHaveTextContent("未知参数 sort、page 已被忽略");
    expect(screen.getByRole("link", { name: "使用可识别的筛选条件重新打开" })).toHaveAttribute(
      "href",
      "/zh-CN/prompts?q=cat",
    );
  });

  it("says nothing about unknown params when there are none", () => {
    render(<ActiveFilters basePath={BASE} query={{}} total={3} appliedFilters={[]} />);
    expect(screen.queryByText(/未知参数/)).not.toBeInTheDocument();
  });
});
