import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { PromptText } from "@/features/prompt/PromptText";

const TEXT = "A tiny city inside a glass cube, isometric";

describe("PromptText", () => {
  it("renders the whole text inside a pre with the given id", () => {
    const { container } = render(<PromptText id="p1" text={TEXT} expandable={false} />);
    const pre = container.querySelector("pre#p1");
    expect(pre).not.toBeNull();
    expect(pre).toHaveTextContent(TEXT);
  });

  it("makes the scrollable pre a named keyboard stop", () => {
    const { container } = render(<PromptText id="p1" text={TEXT} expandable={false} />);
    const pre = container.querySelector("pre#p1");
    // axe `scrollable-region-focusable`: a region a mouse can scroll must be
    // focusable. The explicit role is what makes `aria-label` legal here.
    expect(pre).toHaveAttribute("tabindex", "0");
    expect(pre).toHaveAttribute("role", "group");
    expect(pre).toHaveAttribute("aria-label", "提示词原文");
    expect(screen.getByRole("group", { name: "提示词原文" })).toBe(pre);
  });

  it("accepts an overridden accessible name", () => {
    render(<PromptText id="p1" text={TEXT} expandable={false} label="替换后的提示词" />);
    expect(screen.getByRole("group", { name: "替换后的提示词" })).toBeInTheDocument();
  });

  it("collapses by default and toggles data-expanded without removing the text", async () => {
    const { container } = render(<PromptText id="p1" text={TEXT} />);
    const region = container.querySelector("[data-expanded]");
    expect(region).toHaveAttribute("data-expanded", "false");

    const toggle = screen.getByRole("button", { name: "展开全文" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).toHaveAttribute("aria-controls", "p1");

    await userEvent.click(toggle);
    expect(container.querySelector("[data-expanded]")).toHaveAttribute("data-expanded", "true");
    expect(screen.getByRole("button", { name: "收起" })).toBeInTheDocument();
    expect(container.querySelector("pre#p1")).toHaveTextContent(TEXT);
  });

  it("has no toggle when it is not expandable", () => {
    render(<PromptText id="p1" text={TEXT} expandable={false} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
