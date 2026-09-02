import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CollectionTiles } from "@/features/hub/CollectionTiles";
import type { CollectionWithCount } from "@/lib/content/types";

const BASE = "/zh-CN/prompts";

const axisCollection: CollectionWithCount = {
  id: "collection:cinematic-camera",
  slug: "cinematic-camera",
  title: "电影感镜头合集",
  subtitle: "镜头控制 × 电影质感",
  rule: {
    type: "axis-all",
    conditions: [
      { axis: "technique", value: "camera-movement-shot-language" },
      { axis: "style", value: "cinematic" },
    ],
  },
  count: 5,
  sampleIds: [],
  promptIds: [],
};

const sameAxisTwiceCollection: CollectionWithCount = {
  id: "collection:two-models",
  slug: "two-models",
  title: "双模型合集",
  subtitle: "同一条提示词同时用了两个模型",
  rule: {
    type: "axis-all",
    conditions: [
      { axis: "model", value: "seedance" },
      { axis: "model", value: "kling" },
    ],
  },
  count: 2,
  sampleIds: [],
  promptIds: [],
};

const regexCollection: CollectionWithCount = {
  id: "collection:template-prompts",
  slug: "template-prompts",
  title: "模板提示词合集",
  subtitle: "带占位变量，替换即用",
  rule: { type: "regex", pattern: "\\[[A-Z]+\\]" },
  count: 7,
  sampleIds: [],
  promptIds: [],
};

describe("CollectionTiles", () => {
  it("links every collection to ?collection=<slug> on the hub", () => {
    render(<CollectionTiles basePath={BASE} collections={[axisCollection]} />);

    expect(screen.getByRole("link", { name: /电影感镜头合集/ })).toHaveAttribute(
      "href",
      `${BASE}?collection=cinematic-camera`,
    );
  });

  it("keeps the prototype's subtitle and count, the count set as a micro label", () => {
    const { container } = render(<CollectionTiles basePath={BASE} collections={[axisCollection]} />);

    // The prototype's single `副标题 · N 条` line becomes a subtitle plus a
    // count; every word of it survives, only its weight changes. On a spine
    // card the display tier belongs to the title, so the count is the label it
    // always read as rather than the tile's figure.
    expect(screen.getByText("镜头控制 × 电影质感")).toBeInTheDocument();
    expect(container.textContent).toContain("5 条");
    const count = screen.getByText("5 条");
    expect(count.className).toContain("tracking-micro");
    expect(count.className).toContain("tabular-nums");
  });

  it("draws the band's accent as a 38px spine rather than as the only signal", () => {
    const { container } = render(
      <CollectionTiles basePath={BASE} accent="blue" collections={[axisCollection]} />,
    );

    const spine = [...container.querySelectorAll('span[aria-hidden="true"]')].find((node) =>
      node.className.includes("w-9.5"),
    );
    expect(spine).toBeDefined();
    expect(spine?.className).toContain("bg-accent-blue");
    // It carries no text: the heading beside it says what the card is.
    expect(spine?.textContent).toBe("");
    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent("电影感镜头合集");
  });

  it("sets the title in the display tier and lets it answer the card's hover", () => {
    render(<CollectionTiles basePath={BASE} collections={[axisCollection]} />);

    const title = screen.getByRole("heading", { level: 3, name: "电影感镜头合集" });
    // Display tier: clamped to two lines, so the title can never push the rest
    // of the card down however long the collection is called.
    expect(title.className).toContain("line-clamp-2");
    expect(title.className).toContain("text-2xl");
    // Hover expression 2 — the colour change rides the card's own `group`.
    expect(title.className).toContain("group-hover:text-accent-red");
    expect(title.className).toContain("duration-200");
  });

  it.each([
    ["a body-regex rule", regexCollection, "模板提示词合集"],
    ["two conditions on one axis", sameAxisTwiceCollection, "双模型合集"],
  ])(
    "still links a collection whose rule no facet query can express (%s)",
    (_name, collection, title) => {
      // Membership travels as an explicit id list through `?collection=`, so a
      // rule the facet contract cannot express no longer costs the reader the
      // affordance — nor does it require faking an equivalent facet query.
      render(<CollectionTiles basePath={BASE} collections={[collection]} />);

      expect(screen.getByRole("link", { name: new RegExp(title) })).toHaveAttribute(
        "href",
        `${BASE}?collection=${collection.slug}`,
      );
      expect(screen.queryByText(/暂不支持/)).not.toBeInTheDocument();
    },
  );

  it("sizes the proportion bar against the library total when given one", () => {
    const { container } = render(
      <CollectionTiles basePath={BASE} collections={[axisCollection]} total={20} />,
    );
    const bar = container.querySelector("span[style]");
    expect(bar).toHaveStyle({ width: "25%" });
  });

  it("never emits a placeholder href", () => {
    render(<CollectionTiles basePath={BASE} collections={[axisCollection, regexCollection]} />);

    for (const link of screen.getAllByRole("link")) {
      expect(link.getAttribute("href")).not.toBe("#");
    }
  });

  it("falls back to an empty state when there is nothing to show", () => {
    render(<CollectionTiles basePath={BASE} collections={[]} />);
    expect(document.querySelector('[data-state="empty"]')).not.toBeNull();
  });
});
