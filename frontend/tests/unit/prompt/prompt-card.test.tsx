import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

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

  it("keeps the FULL prompt text (not the truncated preview) in the server HTML", () => {
    const prompt = makePromptSummary();
    const { container } = render(<PromptCard prompt={prompt} locale="zh-CN" />);
    const pre = container.querySelector("pre");
    expect(pre).not.toBeNull();
    // `promptText` is deliberately longer than `promptPreview` in the fixture;
    // its tail only shows up if the card fed `promptText`, not the preview.
    expect(prompt.promptText).not.toEqual(prompt.promptPreview);
    expect(pre).toHaveTextContent(prompt.promptText);
    expect(pre?.id.length).toBeGreaterThan(0);
  });

  it("always labels the copy button 复制提示词 and copies the full promptText, never a preview", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
      writable: true,
    });

    const prompt = makePromptSummary();
    render(<PromptCard prompt={prompt} locale="zh-CN" />);
    const button = screen.getByRole("button", { name: "复制提示词" });
    await userEvent.click(button);

    expect(writeText).toHaveBeenCalledWith(prompt.promptText);

    Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true });
  });

  it("lets a page override the <pre> id prefix so two renders of the same prompt don't collide", () => {
    const prompt = makePromptSummary();
    const { container } = render(
      <PromptCard prompt={prompt} locale="zh-CN" idPrefix="featured-prompt-text" />,
    );
    const pre = container.querySelector("pre");
    expect(pre?.id).toBe(`featured-prompt-text-${prompt.id}`);
  });

  it("renders no media block when the prompt has none", () => {
    render(<PromptCard prompt={makePromptSummary({ media: [] })} locale="zh-CN" />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
