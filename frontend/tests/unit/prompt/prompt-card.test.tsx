import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PromptCard } from "@/features/prompt/PromptCard";

import { OBSERVED_AT, makeMetrics, makePromptSummary, makeSource } from "../support/prompt-fixtures";

describe("PromptCard", () => {
  it("links the title to the real detail route", () => {
    render(<PromptCard prompt={makePromptSummary()} locale="zh-CN" />);
    const heading = screen.getByRole("heading", { level: 3 });
    expect(within(heading).getByRole("link")).toHaveAttribute(
      "href",
      "/zh-CN/prompts/glass-cube-city",
    );
  });

  it("links a taxonomy term with its own page to that page, others to a filtered L1", () => {
    render(<PromptCard prompt={makePromptSummary()} locale="zh-CN" />);
    expect(screen.getByRole("link", { name: /Seedance/ })).toHaveAttribute(
      "href",
      "/zh-CN/prompts/models/seedance",
    );
    expect(screen.getByRole("link", { name: /海报/ })).toHaveAttribute(
      "href",
      "/zh-CN/prompts?useCase=poster",
    );
  });

  it("opens the creator and the source post as external links", () => {
    render(<PromptCard prompt={makePromptSummary()} locale="zh-CN" />);
    const creator = screen.getByRole("link", { name: /@azed_ai/ });
    expect(creator).toHaveAttribute("href", "https://x.com/azed_ai");
    expect(creator).toHaveAttribute("rel", expect.stringContaining("noopener"));
    expect(creator).toHaveAttribute("rel", expect.stringContaining("nofollow"));
    expect(creator).toHaveAttribute("target", "_blank");

    expect(screen.getByRole("link", { name: /原帖/ })).toHaveAttribute(
      "href",
      "https://x.com/azed_ai/status/1",
    );
  });

  it("states when the publish date is not recorded", () => {
    render(
      <PromptCard
        prompt={makePromptSummary({ source: makeSource({ publishedAt: null }) })}
        locale="zh-CN"
      />,
    );
    expect(screen.getByText("日期未收录")).toBeInTheDocument();
  });

  it("shows the observation date from the data, never a hard-coded one", () => {
    render(
      <PromptCard
        prompt={makePromptSummary({ metrics: makeMetrics({ observedAt: "2027-01-02" }) })}
        locale="zh-CN"
      />,
    );
    expect(screen.getByText(/2027-01-02/)).toBeInTheDocument();
    expect(screen.queryByText(new RegExp(OBSERVED_AT))).not.toBeInTheDocument();
  });

  it("renders missing metrics as — instead of 0", () => {
    render(
      <PromptCard
        prompt={makePromptSummary({ metrics: makeMetrics({ likes: null, bookmarks: null }) })}
        locale="zh-CN"
      />,
    );
    const metrics = screen.getByTestId("prompt-card-metrics");
    expect(metrics).toHaveTextContent("—");
    expect(metrics).not.toHaveTextContent("0");
  });

  it("keeps the prompt text in the server HTML and lets the copy button target it", () => {
    const { container } = render(<PromptCard prompt={makePromptSummary()} locale="zh-CN" />);
    const pre = container.querySelector("pre");
    expect(pre).not.toBeNull();
    expect(pre).toHaveTextContent("A tiny city inside a glass cube");
    expect(pre?.id.length).toBeGreaterThan(0);
  });

  it("says it only copies the preview until a full text is supplied", () => {
    const { unmount } = render(<PromptCard prompt={makePromptSummary()} locale="zh-CN" />);
    expect(screen.getByRole("button", { name: "复制预览" })).toBeInTheDocument();
    unmount();

    render(<PromptCard prompt={makePromptSummary()} locale="zh-CN" copyText="full text" />);
    expect(screen.getByRole("button", { name: "复制提示词" })).toBeInTheDocument();
  });

  it("renders no media block when the prompt has none", () => {
    render(<PromptCard prompt={makePromptSummary({ media: [] })} locale="zh-CN" />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
