import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CreatorTiles } from "@/features/hub/CreatorTiles";
import type { CreatorWithCount } from "@/lib/content/types";

function creator(overrides: Partial<CreatorWithCount> = {}): CreatorWithCount {
  return {
    id: "creator:higgsfield_ai",
    handle: "higgsfield_ai",
    url: "https://x.com/higgsfield_ai",
    avatarUrl: null,
    followers: null,
    wireframeDeclaredPromptCount: 78,
    wireframeDeclaredLikes: 12533,
    wireframeDeclaredBookmarks: 4409,
    count: 3,
    likes: 12533,
    bookmarks: 4409,
    ...overrides,
  };
}

describe("CreatorTiles", () => {
  it("links each creator to their profile as a safe external link", () => {
    render(<CreatorTiles creators={[creator()]} />);

    const link = screen.getByRole("link", { name: /higgsfield_ai/ });
    expect(link).toHaveAttribute("href", "https://x.com/higgsfield_ai");
    expect(link).toHaveAttribute("rel", "noopener nofollow");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it.each(["higgsfield_ai", "@higgsfield_ai"])(
    "renders %s with exactly one leading @",
    (handle) => {
      const { container } = render(<CreatorTiles creators={[creator({ handle })]} />);

      expect(screen.getByRole("link", { name: /@higgsfield_ai/ })).toBeInTheDocument();
      expect(container.textContent).not.toContain("@@higgsfield_ai");
    },
  );

  it("shows prompts, likes and bookmarks aggregated from the data", () => {
    const { container } = render(<CreatorTiles creators={[creator({ likes: 1476, bookmarks: 507 })]} />);

    // Same line as before, re-weighted: the count is the tile's figure and the
    // rest of the line is its caption.
    expect(container.textContent).toContain("3 条提示词 · 1,476 赞 · 507 藏");
    expect(screen.getByText("3").className).toContain("tabular-nums");
    // The prototype's own declared per-creator figures stay out of the render.
    expect(screen.queryByText(/78 条/)).not.toBeInTheDocument();
  });

  it("shows — rather than 0 for a creator whose posts never exposed a metric", () => {
    const { container } = render(<CreatorTiles creators={[creator({ likes: null, bookmarks: null })]} />);

    expect(container.textContent).toContain("3 条提示词 · — 赞 · — 藏");
    expect(screen.queryByText(/0 赞/)).not.toBeInTheDocument();
  });

  it("reads as a member of the tile family: figure, caption and an accent bar", () => {
    const { container } = render(
      <CreatorTiles
        accent="yellow"
        creators={[creator(), creator({ id: "creator:azed_ai", handle: "azed_ai", count: 1 })]}
      />,
    );

    const bars = [...container.querySelectorAll("span[style]")];
    expect(bars).toHaveLength(2);
    expect(bars[0]?.className).toContain("bg-accent-yellow");
    // Relative to the group's own maximum, and decorative only.
    expect(bars[0]).toHaveStyle({ width: "100%" });
    expect(bars[1]).toHaveStyle({ width: "33%" });
    expect(bars[0]?.closest("[aria-hidden='true']")).not.toBeNull();
    // The busiest creator leads the band.
    expect(container.querySelectorAll("li")[0]?.className).toContain("lg:col-span-2");
  });

  it("caps the list when asked", () => {
    render(
      <CreatorTiles
        limit={1}
        creators={[creator(), creator({ id: "creator:azed_ai", handle: "azed_ai", url: "https://x.com/azed_ai", count: 2 })]}
      />,
    );

    expect(screen.getAllByRole("listitem")).toHaveLength(1);
  });

  it("falls back to an empty state", () => {
    render(<CreatorTiles creators={[]} />);
    expect(document.querySelector('[data-state="empty"]')).not.toBeNull();
  });
});
