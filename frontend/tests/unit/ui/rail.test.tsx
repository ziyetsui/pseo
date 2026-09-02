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

  it("leaves room on all four sides for what its cards draw outside themselves", () => {
    // `overflow-x-auto` forces `overflow-y` to `auto` too, so the scroller
    // clips on every side: with only `pb-2` it cut the focus ring off every
    // card in it, the hover shadow, the travel of a pressed card, and the last
    // card's shadow. The leading edge gives its room back with a matching
    // negative margin so the rail still starts flush with the page gutter.
    const { scroller } = setup();
    for (const utility of ["pt-1", "pl-1", "pr-4", "pb-4", "-ml-1"]) {
      expect(scroller.className).toContain(utility);
    }
    expect(scroller.className).not.toContain("pb-2");
  });

  it("gives the arrows a chrome elevation, a fill hover and a full-collapse press", () => {
    setup();
    const arrow = screen.getByRole("button", { name: "向左滚动" });
    expect(arrow.className).toContain("shadow-hard-sm");
    // 3px -> 4px on hover was one pixel on a 44px control: a repaint for
    // nothing. Chrome's hover reply is its fill.
    expect(arrow.className).not.toContain("hover:shadow-hard-md");
    expect(arrow.className).toContain("hover:bg-muted");
    // The press is role-sized: an arrow is chrome, so it takes the smallest
    // step on the ladder. (Under `bauhaus` the same role travels 3px, exactly
    // the offset it collapses — see `tests/unit/ui/interaction.test.ts`.)
    expect(arrow.className).toContain("press-flatten");
    expect(arrow.className).toContain("active:scale-[0.96]");
    expect(arrow.className).not.toContain("outline");
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
