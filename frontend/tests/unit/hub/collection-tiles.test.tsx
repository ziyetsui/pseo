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

  it("writes the prototype's `副标题 · N 条` on one line", () => {
    render(<CollectionTiles basePath={BASE} collections={[axisCollection]} />);
    expect(screen.getByText("镜头控制 × 电影质感 · 5 条")).toBeInTheDocument();
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
