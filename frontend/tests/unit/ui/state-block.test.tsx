import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { StateBlock } from "@/components/ui/StateBlock";

describe("StateBlock", () => {
  it("marks the loading variant busy and announces 加载中", () => {
    const { container } = render(<StateBlock variant="loading" />);
    const busy = container.querySelector('[aria-busy="true"]');
    expect(busy).not.toBeNull();
    expect(screen.getByText("加载中")).toBeInTheDocument();
  });

  it("renders a message paragraph and no heading for every variant", () => {
    for (const variant of ["empty", "no-results", "error", "unavailable"] as const) {
      const { container, unmount } = render(<StateBlock variant={variant} />);
      expect(container.querySelector("p")).not.toBeNull();
      expect(container.querySelector("h1, h2, h3, h4, h5, h6")).toBeNull();
      unmount();
    }
  });

  it("uses the supplied message", () => {
    render(<StateBlock variant="no-results" message="没有符合条件的提示词" />);
    expect(screen.getByText("没有符合条件的提示词")).toBeInTheDocument();
  });

  it("calls onRetry when the retry button is pressed", async () => {
    const onRetry = vi.fn();
    render(<StateBlock variant="error" onRetry={onRetry} />);

    await userEvent.click(screen.getByRole("button", { name: "重试" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("renders a retry link when given a href instead of a handler", () => {
    render(<StateBlock variant="error" retryHref="/zh-CN/prompts" />);
    expect(screen.getByRole("link", { name: "重试" })).toHaveAttribute("href", "/zh-CN/prompts");
  });
});
