import { render, screen } from "@testing-library/react";
import Link from "next/link";
import { describe, expect, it } from "vitest";

import { PromptResults } from "@/features/search/PromptResults";

import { makePromptSummary } from "../support/prompt-fixtures";

describe("PromptResults", () => {
  it("renders one list item per prompt", () => {
    render(
      <PromptResults
        locale="zh-CN"
        prompts={[
          makePromptSummary(),
          makePromptSummary({ id: "prompt-2", slug: "b", href: "/zh-CN/prompts/b", title: "B" }),
        ]}
      />,
    );
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("falls back to a no-results state that can host the removal links", () => {
    render(
      <PromptResults locale="zh-CN" prompts={[]}>
        <Link href="/zh-CN/prompts">清除全部筛选</Link>
      </PromptResults>,
    );

    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(screen.getByText(/没有/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "清除全部筛选" })).toBeInTheDocument();
  });
});
