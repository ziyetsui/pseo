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
};

const regexCollection: CollectionWithCount = {
  id: "collection:template-prompts",
  slug: "template-prompts",
  title: "模板提示词合集",
  subtitle: "带占位变量，替换即用",
  rule: { type: "regex", pattern: "\\[[A-Z]+\\]" },
  count: 7,
  sampleIds: [],
};

describe("CollectionTiles", () => {
  it("turns an axis rule into a real filtered hub link with every condition ANDed", () => {
    render(<CollectionTiles basePath={BASE} collections={[axisCollection]} />);

    expect(screen.getByRole("link", { name: /电影感镜头合集/ })).toHaveAttribute(
      "href",
      `${BASE}?style=cinematic&technique=camera-movement-shot-language`,
    );
  });

  it("shows the count computed from the data", () => {
    render(<CollectionTiles basePath={BASE} collections={[axisCollection]} />);
    expect(screen.getByText("5 条提示词")).toBeInTheDocument();
  });

  it("does not fake a link for a rule the URL contract cannot express", () => {
    render(<CollectionTiles basePath={BASE} collections={[regexCollection]} />);

    expect(screen.queryByRole("link", { name: /模板提示词合集/ })).not.toBeInTheDocument();
    expect(screen.getByText(/模板提示词合集/)).toBeInTheDocument();
    expect(screen.getByText(/暂不支持/)).toBeInTheDocument();
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
