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
