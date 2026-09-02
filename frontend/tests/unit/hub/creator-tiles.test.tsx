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

  it("shows the count computed from the data, not the prototype's declared one", () => {
    render(<CreatorTiles creators={[creator()]} />);

    expect(screen.getByText(/3 条提示词/)).toBeInTheDocument();
    expect(screen.queryByText(/78/)).not.toBeInTheDocument();
    expect(screen.queryByText(/12,533/)).not.toBeInTheDocument();
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
