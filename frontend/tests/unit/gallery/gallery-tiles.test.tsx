import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { TaxonomyWithCount } from "@/lib/content/types";
import { ContentTypeTiles } from "@/features/gallery/ContentTypeTiles";
import { ModelTiles } from "@/features/gallery/ModelTiles";
import {
  IMAGE_CONTENT_TYPE_SLUG,
  countTermsWithin,
  galleryDescription,
  galleryLede,
  galleryStats,
  promptsForTerm,
  railMoreLabel,
  selectImagePrompts,
  tileActionLabel,
  topRailedModels,
} from "@/features/gallery/image-prompts";

import { makeMetrics, makePromptSummary, makeTaxonomy } from "../support/prompt-fixtures";

/**
 * Component-level cover for branches the current fixture cannot reach: every
 * model in the extracted data happens to own a page, so the "no page yet"
 * tile is exercised here with hand-built terms instead.
 */

function term(overrides: Partial<TaxonomyWithCount>): TaxonomyWithCount {
  return { ...makeTaxonomy(), count: 0, highValueCount: 0, ...overrides };
}

describe("ModelTiles", () => {
  const published = term({
    id: "model:nano-banana-pro",
    slug: "nano-banana-pro",
    label: "Nano Banana Pro",
    href: "/zh-CN/prompts/models/nano-banana-pro",
    count: 14,
    highValueCount: 3,
  });
  const unpublished = term({
    id: "model:mystery",
    slug: "mystery",
    label: "Mystery Model",
    href: null,
    count: 2,
  });

  it("links a model that owns a page", () => {
    const { container } = render(<ModelTiles models={[published]} />);
    const tile = container.querySelector('[data-model-tile="nano-banana-pro"]');
    expect(tile?.tagName).toBe("A");
    expect(tile?.getAttribute("href")).toBe("/zh-CN/prompts/models/nano-banana-pro");
    expect(tile?.textContent).toContain("14 条");
    expect(tile?.textContent).toContain("3 条热门");
  });

  it("renders a model without a page as plain text with a visible explanation", () => {
    const { container } = render(<ModelTiles models={[published, unpublished]} />);
    const tile = container.querySelector('[data-model-tile="mystery"]') as HTMLElement;

    expect(tile.tagName).not.toBe("A");
    expect(tile.querySelector("a")).toBeNull();
    expect(tile.textContent).toContain("2 条");
    expect(tile.textContent).toContain("0 条热门");
    expect(tile.textContent).toContain("模型页尚未发布");
    expect(container.querySelectorAll("a")).toHaveLength(1);
  });

  it("falls back to an empty state instead of an empty list", () => {
    render(<ModelTiles models={[]} />);
    expect(screen.getByText("当前收录里还没有带模型标注的图片提示词。")).toBeInTheDocument();
  });

  it("wears the same tile family as the hub: display figure, accent edge, leading cell", () => {
    const { container } = render(<ModelTiles models={[published, unpublished]} />);

    expect(screen.getByText("14").className).toContain("tabular-nums");
    const edge = container.querySelector('span[aria-hidden="true"].absolute');
    expect(edge?.className).toMatch(/bg-(accent-red|accent-blue|accent-yellow|foreground)/);
    expect(container.querySelectorAll("li")[0]?.className).toContain("lg:col-span-2");
  });

  it("renders no proportion bar on either tile variant", () => {
    const { container } = render(<ModelTiles models={[published, unpublished]} />);

    // The bar was the only inline-width element on these tiles; the counts it
    // re-encoded are still printed on both.
    expect(container.querySelector("[style]")).toBeNull();
    expect(container.textContent).toContain("14");
    expect(container.textContent).toContain("2 条");
  });

  it("resolves the leading tile's span per breakpoint", () => {
    // The gallery grid is one-up, then two-up from `sm`, then three-up from
    // `lg`, and nine tiles answer the fit question differently at each: at `sm`
    // the lead's two cells make ten, five full rows; at `lg` those ten would
    // strand one tile on a fourth row, so the lead takes its second cell back.
    const models = Array.from({ length: 9 }, (_, index) =>
      term({
        id: `model:m${index}`,
        slug: `m${index}`,
        label: `M${index}`,
        href: `/zh-CN/prompts/models/m${index}`,
        count: index === 0 ? 14 : 1,
      }),
    );
    const { container } = render(<ModelTiles models={models} />);

    const lead = container.querySelector("li") as HTMLElement;
    expect(lead.className).toContain("sm:col-span-2");
    expect(lead.className).toContain("lg:col-span-1");
    // One column at the base width: every tile already fills its row, so no
    // span class is painted there at all.
    expect(lead.className).not.toMatch(/(^|\s)col-span-2/);
  });

  it("marks the model with a monogram of its own name, never a vendor logo", () => {
    const { container } = render(<ModelTiles models={[published]} />);
    const tile = container.querySelector('[data-model-tile="nano-banana-pro"]') as HTMLElement;

    // `Nano Banana Pro` → `NB`, derived from the label written beside it.
    const mark = within(tile).getByText("NB");
    expect(mark.getAttribute("aria-hidden")).toBe("true");
    // No icon library, no third-party brand asset, no image of any kind.
    expect(tile.querySelector("img")).toBeNull();
    expect(tile.querySelector("svg")).toBeNull();
  });

  it("carries the rail's own 查看全部 wording as the tile's action row", () => {
    const { container } = render(<ModelTiles models={[published, unpublished]} />);

    const linked = container.querySelector('[data-model-tile="nano-banana-pro"]') as HTMLElement;
    expect(linked.textContent).toContain(tileActionLabel(14));
    // The gap between label and arrow is the only thing that animates.
    expect(linked.innerHTML).toContain("transition-[gap]");

    // A tile that goes nowhere gets no action row — only its explanation.
    const unlinked = container.querySelector('[data-model-tile="mystery"]') as HTMLElement;
    expect(unlinked.textContent).not.toContain("查看全部");
    expect(unlinked.textContent).toContain("模型页尚未发布");
  });
});

describe("ContentTypeTiles", () => {
  const types: TaxonomyWithCount[] = [
    term({
      id: "contentType:image",
      axis: "contentType",
      slug: "image",
      label: "图片",
      labelZh: "图片",
      href: "/zh-CN/prompts/image",
      count: 23,
    }),
    term({
      id: "contentType:video",
      axis: "contentType",
      slug: "video",
      label: "视频",
      labelZh: "视频",
      href: null,
      count: 11,
    }),
  ];

  it("links the published type and marks it as the current page", () => {
    const { container } = render(<ContentTypeTiles types={types} currentSlug="image" />);
    const tile = container.querySelector('[data-content-type="image"]');

    expect(tile?.tagName).toBe("A");
    expect(tile?.getAttribute("href")).toBe("/zh-CN/prompts/image");
    expect(tile?.getAttribute("aria-current")).toBe("page");
    expect(tile?.textContent).toContain("23 条");
  });

  it("never links a type whose page does not exist yet", () => {
    const { container } = render(<ContentTypeTiles types={types} currentSlug="image" />);
    const tile = container.querySelector('[data-content-type="video"]') as HTMLElement;

    expect(tile.tagName).not.toBe("A");
    expect(tile.querySelector("a")).toBeNull();
    expect(tile.textContent).toContain("11 条");
    expect(tile.textContent).toContain("尚未发布");
    for (const node of container.querySelectorAll("a[href]")) {
      expect(node.getAttribute("href")).not.toContain("/prompts/video");
    }
  });

  it("opens every tile with the family's accent edge, and no proportion bar", () => {
    const { container } = render(<ContentTypeTiles types={types} currentSlug="image" />);

    for (const slug of ["image", "video"]) {
      const tile = container.querySelector(`[data-content-type="${slug}"]`) as HTMLElement;
      const edge = tile.firstElementChild as HTMLElement;
      expect(edge.getAttribute("aria-hidden")).toBe("true");
      expect(edge.className).toContain("h-1.5");
      // Pinned inside the frame rather than laid out, so it costs no height.
      expect(edge.className).toContain("absolute");
      expect(edge.className).toMatch(/bg-(accent-red|accent-blue|accent-yellow|foreground)/);
    }
    expect(container.querySelector("[style]")).toBeNull();
  });

  it("carries a different accent from the model band above it", () => {
    const { container: models } = render(
      <ModelTiles
        models={[term({ id: "model:a", slug: "a", label: "A", href: "/zh-CN/x", count: 4 })]}
      />,
    );
    const { container: contentTypes } = render(
      <ContentTypeTiles types={types} currentSlug="image" />,
    );

    const edge = (root: HTMLElement) =>
      root.querySelector('span[aria-hidden="true"].absolute')?.className;
    expect(edge(models)).not.toBe(edge(contentTypes));
  });

  it("explains the unknown content type as unlabelled data rather than an unpublished page", () => {
    const withUnknown: TaxonomyWithCount[] = [
      ...types,
      term({
        id: "contentType:unknown",
        axis: "contentType",
        slug: "unknown",
        label: "未标注",
        labelZh: "未标注",
        href: null,
        count: 1,
      }),
    ];
    const { container } = render(<ContentTypeTiles types={withUnknown} currentSlug="image" />);
    const tile = container.querySelector('[data-content-type="unknown"]') as HTMLElement;

    expect(tile.tagName).not.toBe("A");
    expect(tile.textContent).toContain("未标注类型，不会生成独立页面");
    // This is a different message from an unreleased-but-real page.
    expect(tile.textContent).not.toContain("该类型页面尚未发布");
  });
});

describe("topRailedModels", () => {
  const published = (slug: string, count: number) =>
    term({ id: `model:${slug}`, slug, label: slug, href: `/zh-CN/prompts/models/${slug}`, count });

  it("caps at the given limit, keeping only models with a real page", () => {
    const a = published("a", 10);
    const b = published("b", 8);
    const c = published("c", 6);
    const noPage = term({ id: "model:d", slug: "d", label: "d", href: null, count: 20 });

    expect(topRailedModels([a, noPage, b, c], 2)).toEqual([a, b]);
  });

  it("relies on its input already being sorted count desc / slug asc — the order countTermsWithin produces", () => {
    const zebra = published("zebra", 5);
    const apple = published("apple", 5);

    // countTermsWithin itself breaks a count tie by slug (apple before
    // zebra); topRailedModels only slices, so pre-sorted input like this is
    // what actually reaches it from `page.tsx`.
    expect(topRailedModels([apple, zebra], 1)).toEqual([apple]);
  });
});

describe("railMoreLabel", () => {
  it("writes the prototype's 查看全部 N 条 → with the rail's own scope", () => {
    expect(railMoreLabel(136)).toBe("查看全部 136 条 →");
  });

  it("shares its wording with the tile action row, which draws its own arrow", () => {
    expect(tileActionLabel(136)).toBe("查看全部 136 条");
    expect(railMoreLabel(136)).toBe(`${tileActionLabel(136)} →`);
  });
});

describe("gallery copy helpers", () => {
  it("keeps the prototype lede verbatim, with only the count made dynamic", () => {
    expect(galleryLede(7)).toBe(
      "7 条可直接复制的图片提示词，全部来自 X 创作者的公开分享，注明作者与出处。",
    );
  });

  it("keeps the prototype meta description verbatim", () => {
    expect(galleryDescription(7)).toBe("7 条可复制的图片提示词，注明作者与出处。");
  });
});

describe("image-prompts helpers", () => {
  const image = makePromptSummary({ id: "a", metrics: makeMetrics({ highValue: true }) });
  const video = makePromptSummary({
    id: "b",
    contentType: makeTaxonomy({
      id: "contentType:video",
      axis: "contentType",
      slug: "video",
      label: "视频",
      href: null,
    }),
  });

  it("keeps only prompts whose content type is image", () => {
    expect(selectImagePrompts([image, video]).map((prompt) => prompt.id)).toEqual(["a"]);
    expect(IMAGE_CONTENT_TYPE_SLUG).toBe("image");
  });

  it("computes the statline from the subset alone", () => {
    const second = makePromptSummary({
      id: "c",
      creator: { ...image.creator, id: "creator-2" },
      source: { ...image.source, publishedAt: "2026-08-19" },
    });
    const undated = makePromptSummary({
      id: "d",
      source: { ...image.source, publishedAt: null },
    });

    expect(galleryStats([image, second, undated])).toEqual({
      total: 3,
      highValueCount: 1,
      creatorCount: 2,
      datedCount: 2,
      latestPublishedAt: "2026-08-19",
    });
  });

  it("reports no date rather than inventing one", () => {
    const undated = makePromptSummary({ source: { ...image.source, publishedAt: null } });
    expect(galleryStats([undated]).latestPublishedAt).toBeNull();
  });

  it("counts and filters terms against the subset, dropping terms with no members", () => {
    const seedance = term({ slug: "seedance", label: "Seedance", count: 99 });
    const absent = term({ id: "model:absent", slug: "absent", label: "Absent", count: 42 });

    const counted = countTermsWithin([seedance, absent], [image], "model");
    expect(counted).toHaveLength(1);
    expect(counted[0]?.slug).toBe("seedance");
    // The count is recomputed from the subset, never carried over.
    expect(counted[0]?.count).toBe(1);

    expect(promptsForTerm([image, video], "model", "seedance").map((p) => p.id)).toEqual(["a", "b"]);
  });

  it("sorts by count desc and breaks a tie by slug — what topRailedModels' cap depends on", () => {
    const zebraPrompt = makePromptSummary({
      id: "z",
      models: [makeTaxonomy({ id: "model:zebra", slug: "zebra", label: "zebra" })],
    });
    const applePrompt = makePromptSummary({
      id: "p",
      models: [makeTaxonomy({ id: "model:apple", slug: "apple", label: "apple" })],
    });
    const zebra = term({ id: "model:zebra", slug: "zebra", label: "zebra" });
    const apple = term({ id: "model:apple", slug: "apple", label: "apple" });

    // Both terms end up with count 1 — a genuine tie — and input order is
    // zebra-before-apple, the opposite of the expected output order.
    const counted = countTermsWithin([zebra, apple], [zebraPrompt, applePrompt], "model");
    expect(counted.map((t) => t.slug)).toEqual(["apple", "zebra"]);
  });
});
