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

  it("shows prompts, likes and bookmarks aggregated from the data, as one micro label", () => {
    const { container } = render(<CreatorTiles creators={[creator({ likes: 1476, bookmarks: 507 })]} />);

    // Same line as before, in the same order, set as the label it always read
    // as — the identity of this tile is the avatar, not a display-scale figure.
    expect(container.textContent).toContain("3 条提示词 · 1,476 赞 · 507 藏");
    const stats = screen.getByText("3 条提示词 · 1,476 赞 · 507 藏");
    expect(stats.className).toContain("tracking-micro");
    expect(stats.className).toContain("tabular-nums");
    // The prototype's own declared per-creator figures stay out of the render.
    expect(screen.queryByText(/78 条/)).not.toBeInTheDocument();
  });

  it("uses the creator's own picture when the data has one", () => {
    const src = "https://pbs.twimg.com/profile_images/1906739239183630336/907a7JTU_normal.jpg";
    const { container } = render(<CreatorTiles creators={[creator({ avatarUrl: src })]} />);

    const image = container.querySelector("img");
    expect(image).toHaveAttribute("src", src);
    expect(image).toHaveAttribute("width", "28");
    expect(image).toHaveAttribute("height", "28");
    // Decoration: the handle it stands for is written immediately beside it, so
    // the link's accessible name gains nothing from a second copy of it.
    expect(image).toHaveAttribute("alt", "");
    expect(screen.getByRole("link", { name: /@higgsfield_ai/ })).toBeInTheDocument();
  });

  it("falls back to the first character of the handle when there is no picture", () => {
    const { container } = render(<CreatorTiles creators={[creator({ avatarUrl: null })]} />);

    expect(container.querySelector("img")).toBeNull();
    const fallback = screen.getByText("H");
    expect(fallback).toHaveAttribute("aria-hidden", "true");
    // Fully round, never the reference's 8px corner.
    expect(fallback.className).toContain("rounded-pill");
  });

  it("truncates the handle rather than letting it make one tile taller", () => {
    render(<CreatorTiles creators={[creator()]} />);

    const handle = screen.getByText("@higgsfield_ai");
    expect(handle.className).toContain("truncate");
    expect(handle.className).toContain("group-hover:text-accent-red");
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
  });

  it("gives the busiest creator the full row only when the tiles then fill it", () => {
    const many = (n: number) =>
      Array.from({ length: n }, (_, index) =>
        creator({ id: `creator:${index}`, handle: `h${index}`, count: index === 0 ? 9 : 1 }),
      );

    // Three creators two-up: the lead's two cells make four, which is two full
    // rows. Two creators already fill one row, so the lead stays a normal tile
    // rather than pushing the second onto a row of its own.
    const led = render(<CreatorTiles creators={many(3)} />);
    expect(led.container.querySelector("li")?.className).toMatch(/(^|\s)col-span-2/);
    led.unmount();

    const even = render(<CreatorTiles creators={many(2)} />);
    for (const cell of even.container.querySelectorAll("li")) {
      expect(cell.className).not.toContain("col-span-");
    }
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
