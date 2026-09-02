import { describe, expect, it } from "vitest";

import {
  applyPromptQuery,
  buildPromptSearchText,
  isEmptyPromptQuery,
  parsePromptQuery,
  resolveWindowStart,
  serializePromptQuery,
} from "@/lib/content/query";
import type { PromptSummary, Taxonomy } from "@/lib/content/types";

function taxonomy(axis: Taxonomy["axis"], slug: string, label: string): Taxonomy {
  return { id: `${axis}:${slug}`, axis, slug, label, labelZh: null, href: null, wireframeDeclaredCount: null };
}

function prompt(overrides: Partial<PromptSummary> & Pick<PromptSummary, "id">): PromptSummary {
  const base: Omit<PromptSummary, "searchText"> = {
    id: overrides.id,
    slug: `slug-${overrides.id}`,
    href: `/zh-CN/prompts/slug-${overrides.id}`,
    locale: "zh-CN",
    title: "Untitled",
    excerpt: "",
    promptText: "",
    promptPreview: "",
    contentType: taxonomy("contentType", "image", "image"),
    models: [],
    useCases: [],
    techniques: [],
    styles: [],
    subjects: [],
    creator: {
      id: "creator",
      handle: "@someone",
      url: "https://x.com/someone",
      avatarUrl: null,
      followers: null,
      wireframeDeclaredPromptCount: null,
      wireframeDeclaredLikes: null,
      wireframeDeclaredBookmarks: null,
    },
    source: {
      platform: "x",
      url: "https://x.com/someone/status/1",
      sourceId: overrides.id,
      handle: "@someone",
      creatorId: "creator",
      publishedAt: null,
    },
    metrics: {
      observedAt: "2026-08-20",
      likes: null,
      bookmarks: null,
      views: null,
      reposts: null,
      replies: null,
      quotes: null,
      valueScore: null,
      highValue: false,
    },
    media: [],
    appearsOn: ["l1"],
    hasVariables: false,
    featuredOn: [],
  };
  const merged: PromptSummary = { ...base, searchText: "", ...overrides };
  // Recomputed from the merged fields (unless a test explicitly overrides
  // `searchText`) so `q` tests exercise the same builder production uses.
  if (overrides.searchText === undefined) {
    merged.searchText = buildPromptSearchText({
      title: merged.title,
      promptText: overrides.promptPreview ?? merged.promptPreview,
      handle: merged.source.handle,
      taxonomies: [
        merged.contentType,
        ...merged.models,
        ...merged.useCases,
        ...merged.techniques,
        ...merged.styles,
        ...merged.subjects,
      ],
    });
  }
  return merged;
}

const nanoBananaPro = taxonomy("model", "nano-banana-pro", "Nano Banana Pro");
const gptImage2 = taxonomy("model", "gpt-image-2", "GPT Image 2");
const beauty = taxonomy("useCase", "beauty", "Beauty");
const fashion = taxonomy("useCase", "fashion", "Fashion");
const photorealistic = taxonomy("style", "photorealistic", "Photorealistic");

const A = prompt({
  id: "a",
  title: "Portrait photography from above",
  models: [nanoBananaPro],
  useCases: [beauty],
  styles: [photorealistic],
  source: {
    platform: "x",
    url: "https://x.com/KeorUnreal/status/a",
    sourceId: "a",
    handle: "@KeorUnreal",
    creatorId: "keorunreal",
    publishedAt: "2026-08-19",
  },
  metrics: {
    observedAt: "2026-08-20",
    likes: 100,
    bookmarks: null,
    views: null,
    reposts: null,
    replies: null,
    quotes: null,
    valueScore: 90,
    highValue: true,
  },
});
const B = prompt({
  id: "b",
  title: "Miniature stamp poster",
  models: [gptImage2],
  useCases: [fashion],
  source: {
    platform: "x",
    url: "https://x.com/Naiknelofar788/status/b",
    sourceId: "b",
    handle: "@Naiknelofar788",
    creatorId: "naiknelofar788",
    publishedAt: "2026-07-25",
  },
});
const C = prompt({
  id: "c",
  title: "Cinematic one-take shot",
  models: [nanoBananaPro, gptImage2],
  useCases: [fashion],
  source: {
    platform: "x",
    url: "https://x.com/zeuuss_01/status/c",
    sourceId: "c",
    handle: "@zeuuss_01",
    creatorId: "zeuuss-01",
    publishedAt: "2026-01-07",
  },
});
const D = prompt({ id: "d", title: "Undated portrait" });

const ALL = [A, B, C, D];

describe("applyPromptQuery", () => {
  it("returns every prompt for an empty query", () => {
    expect(applyPromptQuery(ALL, {}).map((p) => p.id)).toEqual(["a", "b", "c", "d"]);
  });

  it("ORs values inside one axis", () => {
    expect(applyPromptQuery(ALL, { model: ["nano-banana-pro", "gpt-image-2"] }).map((p) => p.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("ANDs across axes", () => {
    expect(applyPromptQuery(ALL, { model: ["nano-banana-pro"], useCase: ["fashion"] }).map((p) => p.id)).toEqual(
      ["c"],
    );
    expect(applyPromptQuery(ALL, { model: ["gpt-image-2"], style: ["photorealistic"] })).toEqual([]);
  });

  it("ANDs the free-text query with the facets", () => {
    expect(applyPromptQuery(ALL, { q: "portrait", model: ["nano-banana-pro"] }).map((p) => p.id)).toEqual(["a"]);
  });

  it("requires every whitespace-separated term to match (AND), case-insensitively", () => {
    expect(applyPromptQuery(ALL, { q: "cinematic ONE-TAKE" }).map((p) => p.id)).toEqual(["c"]);
    expect(applyPromptQuery(ALL, { q: "cinematic portrait" })).toEqual([]);
  });

  it("matches a creator handle with or without the leading @", () => {
    expect(applyPromptQuery(ALL, { q: "@KeorUnreal" }).map((p) => p.id)).toEqual(["a"]);
    expect(applyPromptQuery(ALL, { q: "keorunreal" }).map((p) => p.id)).toEqual(["a"]);
  });

  it("matches taxonomy labels", () => {
    expect(applyPromptQuery(ALL, { q: "Nano Banana Pro" }).map((p) => p.id)).toEqual(["a", "c"]);
  });

  it("ignores a window filter unless a windowStart is supplied", () => {
    expect(applyPromptQuery(ALL, { window: "7d" }).map((p) => p.id)).toEqual(["a", "b", "c", "d"]);
  });

  it("drops prompts published before windowStart, and prompts with no date at all", () => {
    expect(applyPromptQuery(ALL, { window: "7d" }, { windowStart: "2026-08-13" }).map((p) => p.id)).toEqual(["a"]);
    expect(applyPromptQuery(ALL, { window: "30d" }, { windowStart: "2026-07-21" }).map((p) => p.id)).toEqual([
      "a",
      "b",
    ]);
    expect(applyPromptQuery(ALL, { window: "all" }, { windowStart: null }).map((p) => p.id)).toEqual([
      "a",
      "b",
      "c",
      "d",
    ]);
  });
});

describe("resolveWindowStart", () => {
  it("computes 7d/30d relative to the snapshot date, never to Date.now()", () => {
    expect(resolveWindowStart("2026-08-20", "7d")).toBe("2026-08-13");
    expect(resolveWindowStart("2026-08-20", "30d")).toBe("2026-07-21");
    expect(resolveWindowStart("2026-08-20", "all")).toBeNull();
  });
});

describe("parsePromptQuery", () => {
  it("reads repeated facet params and the free-text query", () => {
    const params = new URLSearchParams("q=%E6%B5%B7%E6%8A%A5&model=nano-banana-pro&model=gpt-image-2&window=7d");
    const { query, unknownParams } = parsePromptQuery(params);
    expect(query).toEqual({ q: "海报", model: ["nano-banana-pro", "gpt-image-2"], window: "7d" });
    expect(unknownParams).toEqual([]);
  });

  it("accepts the Next.js searchParams record shape", () => {
    const { query } = parsePromptQuery({ style: ["cinematic", "luxury"], useCase: "beauty", q: undefined });
    expect(query).toEqual({ style: ["cinematic", "luxury"], useCase: ["beauty"] });
  });

  it("reports unknown params instead of silently dropping them", () => {
    const { query, unknownParams } = parsePromptQuery("?model=gpt-image-2&sort=likes&page=2");
    expect(query).toEqual({ model: ["gpt-image-2"] });
    expect(unknownParams).toEqual(["page", "sort"]);
  });

  it("reports an unusable window value as unknown rather than guessing", () => {
    const { query, unknownParams } = parsePromptQuery("?window=90d");
    expect(query).toEqual({});
    expect(unknownParams).toEqual(["window"]);
  });

  it("drops empty values and de-duplicates repeated facet values", () => {
    const { query, unknownParams } = parsePromptQuery("?q=++&model=a&model=a&style=");
    expect(query).toEqual({ model: ["a"] });
    expect(unknownParams).toEqual([]);
  });
});

describe("serializePromptQuery", () => {
  it("round-trips through parsePromptQuery", () => {
    const query = { q: "海报", model: ["a", "b"], style: ["c"], window: "30d" } as const;
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(serializePromptQuery(query))) {
      if (Array.isArray(value)) for (const v of value) params.append(key, v);
      else if (typeof value === "string") params.append(key, value);
    }
    expect(parsePromptQuery(params).query).toEqual(query);
  });

  it("omits empty axes so the URL stays clean", () => {
    expect(serializePromptQuery({})).toEqual({});
    expect(serializePromptQuery({ q: "", model: [], window: "all" })).toEqual({});
  });
});

describe("isEmptyPromptQuery", () => {
  it("is true only when nothing would be filtered", () => {
    expect(isEmptyPromptQuery({})).toBe(true);
    expect(isEmptyPromptQuery({ window: "all" })).toBe(true);
    expect(isEmptyPromptQuery({ q: "x" })).toBe(false);
    expect(isEmptyPromptQuery({ model: ["a"] })).toBe(false);
    expect(isEmptyPromptQuery({ window: "7d" })).toBe(false);
  });
});
