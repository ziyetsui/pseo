import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Rail } from "@/components/ui/Rail";

function setup() {
  render(
    <Rail label="精选提示词">
      <p>第一项</p>
      <p>第二项</p>
      <p>第三项</p>
    </Rail>,
  );

  const scroller = screen.getByRole("list");
  const scrollBy = vi.fn();
  Object.defineProperty(scroller, "clientWidth", { value: 600, configurable: true });
  Object.defineProperty(scroller, "scrollBy", { value: scrollBy, configurable: true });
  const firstItem = scroller.firstElementChild;
  if (firstItem !== null) {
    Object.defineProperty(firstItem, "offsetWidth", { value: 300, configurable: true });
  }
  return { scroller, scrollBy };
}

describe("Rail", () => {
  it("exposes a labelled region and named scroll buttons", () => {
    setup();
    expect(screen.getByRole("region", { name: "精选提示词" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "向左滚动" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "向右滚动" })).toBeInTheDocument();
  });

  it("keeps the scroll container reachable by keyboard", () => {
    const { scroller } = setup();
    expect(scroller).toHaveAttribute("tabindex", "0");
  });

  it("scrolls one item forward on ArrowRight and back on ArrowLeft", async () => {
    const { scroller, scrollBy } = setup();
    scroller.focus();

    await userEvent.keyboard("{ArrowRight}");
    expect(scrollBy).toHaveBeenCalledWith(expect.objectContaining({ left: 300 }));

    scrollBy.mockClear();
    await userEvent.keyboard("{ArrowLeft}");
    expect(scrollBy).toHaveBeenCalledWith(expect.objectContaining({ left: -300 }));
  });

  it("scrolls a full container width when the buttons are used", async () => {
    const { scrollBy } = setup();
    await userEvent.click(screen.getByRole("button", { name: "向右滚动" }));
    expect(scrollBy).toHaveBeenCalledWith(expect.objectContaining({ left: 600 }));
  });

  it("renders every child as its own snap item", () => {
    setup();
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });

  it("scrolls instantly instead of animating when the visitor prefers reduced motion", async () => {
    const matchMedia = vi.fn().mockReturnValue({ matches: true });
    vi.stubGlobal("matchMedia", matchMedia);

    const { scrollBy } = setup();
    await userEvent.click(screen.getByRole("button", { name: "向右滚动" }));

    expect(matchMedia).toHaveBeenCalledWith("(prefers-reduced-motion: reduce)");
    expect(scrollBy).toHaveBeenCalledWith(expect.objectContaining({ behavior: "auto" }));

    vi.unstubAllGlobals();
  });
});
