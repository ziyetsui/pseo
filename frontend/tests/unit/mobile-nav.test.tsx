import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { MobileNav } from "@/components/layout/MobileNav";
import type { NavItem } from "@/components/layout/nav";

const items: NavItem[] = [
  { key: "home", href: "/zh-CN/prompts", label: "首页" },
  { key: "image", href: "/zh-CN/prompts/image", label: "图片" },
  { key: "video", href: null, label: "视频", note: "（即将推出）" },
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

  it("renders every routed nav item as a real link once opened", async () => {
    render(<MobileNav items={items} />);
    await userEvent.click(toggle());

    expect(screen.getByRole("link", { name: "首页" })).toHaveAttribute("href", "/zh-CN/prompts");
    expect(screen.getByRole("link", { name: "图片" })).toHaveAttribute(
      "href",
      "/zh-CN/prompts/image",
    );
  });

  it("renders an unbuilt destination as plain text with its reason, never a link", async () => {
    render(<MobileNav items={items} />);
    await userEvent.click(toggle());

    expect(screen.queryByRole("link", { name: /视频/ })).not.toBeInTheDocument();
    expect(screen.getByText("视频")).toBeInTheDocument();
    expect(screen.getByText("（即将推出）")).toBeInTheDocument();
  });

  it("marks the current page in the panel", async () => {
    render(<MobileNav items={items} currentNav="image" />);
    await userEvent.click(toggle());

    expect(screen.getByRole("link", { name: "图片" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "首页" })).not.toHaveAttribute("aria-current");
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
