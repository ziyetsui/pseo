import type {
  Creator,
  FacetGroup,
  Media,
  Metrics,
  PromptSummary,
  Source,
  Taxonomy,
} from "@/lib/content/types";

/**
 * Hand-built domain objects for component tests. Deliberately NOT the wireframe
 * fixture: component tests must break when a component depends on data it was
 * not given, not when the extracted fixture changes.
 */

export const OBSERVED_AT = "2026-08-20";

export function makeTaxonomy(overrides: Partial<Taxonomy> = {}): Taxonomy {
  return {
    id: "model:seedance",
    axis: "model",
    slug: "seedance",
    label: "Seedance",
    labelZh: null,
    href: null,
    wireframeDeclaredCount: null,
    ...overrides,
  };
}

export function makeCreator(overrides: Partial<Creator> = {}): Creator {
  return {
    id: "creator-1",
    handle: "azed_ai",
    url: "https://x.com/azed_ai",
    avatarUrl: null,
    followers: null,
    wireframeDeclaredPromptCount: null,
    wireframeDeclaredLikes: null,
    wireframeDeclaredBookmarks: null,
    ...overrides,
  };
}

export function makeMedia(overrides: Partial<Media> = {}): Media {
  return {
    id: "media-1",
    kind: "image",
    src: "https://example.invalid/a.jpg",
    alt: "示例图片",
    width: 640,
    height: 360,
    label: null,
    durationSeconds: null,
    index: 1,
    total: 1,
    dimensionsSource: "assumed",
    ...overrides,
  };
}

export function makeSource(overrides: Partial<Source> = {}): Source {
  return {
    platform: "x",
    url: "https://x.com/azed_ai/status/1",
    sourceId: "prompt-1",
    handle: "azed_ai",
    creatorId: "creator-1",
    publishedAt: "2026-08-11",
    ...overrides,
  };
}

export function makeMetrics(overrides: Partial<Metrics> = {}): Metrics {
  return {
    observedAt: OBSERVED_AT,
    likes: 128,
    bookmarks: 44,
    views: null,
    reposts: null,
    replies: null,
    quotes: null,
    valueScore: null,
    highValue: false,
    ...overrides,
  };
}

export function makePromptSummary(overrides: Partial<PromptSummary> = {}): PromptSummary {
  return {
    id: "prompt-1",
    slug: "glass-cube-city",
    href: "/zh-CN/prompts/glass-cube-city",
    locale: "zh-CN",
    title: "玻璃立方城市",
    excerpt: "一个透明立方体内的微缩城市。",
    promptPreview: "A tiny city inside a glass cube, isometric, studio light",
    // concatenation is enough here — these are hand-built fixtures, not the
    // extracted data, so nothing exercises its exact construction.
    searchText: "玻璃立方城市 a tiny city inside a glass cube, isometric, studio light azed_ai seedance poster 海报",
    contentType: makeTaxonomy({
      id: "contentType:image",
      axis: "contentType",
      slug: "image",
      label: "Image",
      labelZh: "图片",
      href: "/zh-CN/prompts/image",
    }),
    models: [makeTaxonomy({ href: "/zh-CN/prompts/models/seedance" })],
    useCases: [
      makeTaxonomy({
        id: "useCase:poster",
        axis: "useCase",
        slug: "poster",
        label: "Poster",
        labelZh: "海报",
      }),
    ],
    techniques: [],
    styles: [],
    subjects: [],
    creator: makeCreator(),
    source: makeSource(),
    metrics: makeMetrics(),
    media: [makeMedia()],
    appearsOn: ["l1"],
    hasVariables: false,
    featuredOn: [],
    ...overrides,
  };
}

export function makeFacetGroups(): FacetGroup[] {
  return [
    {
      key: "model",
      axis: "model",
      label: "模型",
      options: [
        { slug: "seedance", label: "Seedance", count: 3, selected: true },
        { slug: "kling", label: "Kling", count: 2, selected: false },
      ],
    },
    {
      key: "style",
      axis: "style",
      label: "风格",
      options: [{ slug: "realistic", label: "写实", count: 5, selected: false }],
    },
  ];
}
