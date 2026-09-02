import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { MobileNav } from "@/components/layout/MobileNav";

const items = [
  { href: "/zh-CN/prompts", label: "提示词" },
  { href: "/zh-CN/blog", label: "Blog" },
];

function toggle() {
  return screen.getByRole("button", { name: /菜单|关闭/ });
}

describe("MobileNav", () => {
  it("starts collapsed and hides the panel from the accessibility tree", () => {
    render(<MobileNav items={items} />);
    expect(toggle()).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("navigation", { name: "移动端主导航" })).not.toBeInTheDocument();
  });

  it("points aria-controls at the panel it toggles", async () => {
    render(<MobileNav items={items} />);
    await userEvent.click(toggle());

    const panel = screen.getByRole("navigation", { name: "移动端主导航" });
    expect(toggle()).toHaveAttribute("aria-controls", panel.id);
    expect(toggle()).toHaveAttribute("aria-expanded", "true");
  });

  it("renders every nav item as a real link once opened", async () => {
    render(<MobileNav items={items} />);
    await userEvent.click(toggle());

    expect(screen.getByRole("link", { name: "提示词" })).toHaveAttribute(
      "href",
      "/zh-CN/prompts",
    );
    expect(screen.getByRole("link", { name: "Blog" })).toHaveAttribute("href", "/zh-CN/blog");
  });

  it("closes on Escape and moves focus back to the toggle", async () => {
    render(<MobileNav items={items} />);
    await userEvent.click(toggle());
    await userEvent.keyboard("{Escape}");

    expect(toggle()).toHaveAttribute("aria-expanded", "false");
    expect(toggle()).toHaveFocus();
  });

  it("closes again when the toggle is activated from the keyboard", async () => {
    render(<MobileNav items={items} />);
    await userEvent.tab();
    await userEvent.keyboard("{Enter}");
    expect(toggle()).toHaveAttribute("aria-expanded", "true");

    await userEvent.keyboard("{Enter}");
    expect(toggle()).toHaveAttribute("aria-expanded", "false");
  });
});
