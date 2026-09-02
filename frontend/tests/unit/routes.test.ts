import { describe, expect, it } from "vitest";

import { DEFAULT_LOCALE, PUBLISHED_LOCALES, SUPPORTED_LOCALES, isLocale } from "@/lib/i18n/config";
import {
  blogArticle,
  blogCategory,
  blogHome,
  localeHome,
  modelPage,
  promptDetail,
  promptsHome,
  promptsImage,
  withQuery,
} from "@/lib/i18n/routes";

describe("i18n config", () => {
  it("publishes only zh-CN in this phase", () => {
    expect(SUPPORTED_LOCALES).toEqual(["zh-CN"]);
    expect(PUBLISHED_LOCALES).toEqual(["zh-CN"]);
    expect(DEFAULT_LOCALE).toBe("zh-CN");
  });

  it("narrows unknown strings with isLocale", () => {
    expect(isLocale("zh-CN")).toBe(true);
    expect(isLocale("en")).toBe(false);
    expect(isLocale("zh-cn")).toBe(false);
    expect(isLocale("")).toBe(false);
  });
});

describe("route builders", () => {
  it("builds locale-prefixed paths", () => {
    expect(localeHome("zh-CN")).toBe("/zh-CN");
    expect(promptsHome("zh-CN")).toBe("/zh-CN/prompts");
    expect(promptsImage("zh-CN")).toBe("/zh-CN/prompts/image");
    expect(modelPage("zh-CN", "nano-banana-pro")).toBe("/zh-CN/prompts/models/nano-banana-pro");
    expect(promptDetail("zh-CN", "country-miniature-stamp-poster")).toBe(
      "/zh-CN/prompts/country-miniature-stamp-poster",
    );
    expect(blogHome("zh-CN")).toBe("/zh-CN/blog");
    expect(blogArticle("zh-CN", "prompt-variables")).toBe("/zh-CN/blog/prompt-variables");
    expect(blogCategory("zh-CN", "guides")).toBe("/zh-CN/blog/category/guides");
  });

  it("never produces a trailing slash or a '#' placeholder href", () => {
    const all = [
      localeHome("zh-CN"),
      promptsHome("zh-CN"),
      promptsImage("zh-CN"),
      modelPage("zh-CN", "gpt-image-2"),
      promptDetail("zh-CN", "a-slug"),
      blogHome("zh-CN"),
      blogArticle("zh-CN", "a-slug"),
      blogCategory("zh-CN", "guides"),
    ];
    for (const href of all) {
      expect(href.startsWith("/zh-CN")).toBe(true);
      expect(href.endsWith("/")).toBe(false);
      expect(href).not.toContain("#");
    }
  });

  it("percent-encodes slug segments", () => {
    expect(promptDetail("zh-CN", "a b")).toBe("/zh-CN/prompts/a%20b");
    expect(blogCategory("zh-CN", "指南")).toBe(`/zh-CN/blog/category/${encodeURIComponent("指南")}`);
  });

  it("rejects empty slugs instead of emitting a broken href", () => {
    expect(() => promptDetail("zh-CN", "")).toThrow();
    expect(() => modelPage("zh-CN", "   ")).toThrow();
  });
});

describe("withQuery", () => {
  it("returns the path unchanged when there is nothing to serialize", () => {
    expect(withQuery("/zh-CN/prompts", {})).toBe("/zh-CN/prompts");
    expect(withQuery("/zh-CN/prompts", { q: "" })).toBe("/zh-CN/prompts");
    expect(withQuery("/zh-CN/prompts", { q: undefined, model: null })).toBe("/zh-CN/prompts");
    expect(withQuery("/zh-CN/prompts", { model: [] })).toBe("/zh-CN/prompts");
  });

  it("serializes keys in a stable (alphabetical) order regardless of input order", () => {
    const a = withQuery("/zh-CN/prompts", { window: "7d", model: "nano-banana-pro", q: "海报" });
    const b = withQuery("/zh-CN/prompts", { q: "海报", window: "7d", model: "nano-banana-pro" });
    expect(a).toBe(b);
    expect(a).toBe(
      `/zh-CN/prompts?model=nano-banana-pro&q=${encodeURIComponent("海报")}&window=7d`,
    );
  });

  it("repeats array values in the caller's order and drops empty entries", () => {
    expect(withQuery("/zh-CN/prompts", { style: ["b", "", "a"] })).toBe(
      "/zh-CN/prompts?style=b&style=a",
    );
  });

  it("keeps numeric values and trims whitespace-only values away", () => {
    expect(withQuery("/zh-CN/prompts", { page: 2, q: "   " })).toBe("/zh-CN/prompts?page=2");
  });

  it("replaces an existing query string rather than appending a second '?'", () => {
    expect(withQuery("/zh-CN/prompts?stale=1", { q: "x" })).toBe("/zh-CN/prompts?q=x");
  });
});
