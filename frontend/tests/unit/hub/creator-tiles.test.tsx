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
    render(<CreatorTiles creators={[creator({ likes: 1476, bookmarks: 507 })]} />);

    expect(screen.getByText(/3 条提示词 · 1,476 赞 · 507 藏/)).toBeInTheDocument();
    // The prototype's own declared per-creator figures stay out of the render.
    expect(screen.queryByText(/78 条/)).not.toBeInTheDocument();
  });

  it("shows — rather than 0 for a creator whose posts never exposed a metric", () => {
    render(<CreatorTiles creators={[creator({ likes: null, bookmarks: null })]} />);

    expect(screen.getByText(/3 条提示词 · — 赞 · — 藏/)).toBeInTheDocument();
    expect(screen.queryByText(/0 赞/)).not.toBeInTheDocument();
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
