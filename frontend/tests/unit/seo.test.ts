import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { Locale } from "@/lib/i18n/config";
import { breadcrumbList, serializeJsonLd } from "@/lib/seo/json-ld";
import { absoluteUrl, buildMetadata, getSiteUrl } from "@/lib/seo/site";

/**
 * `Locale` only has one real member (`"zh-CN"`) in this phase. The tests below
 * exercise the multi-locale branches of `buildMetadata` by asserting a wider
 * set of locale keys past the type checker — this never happens in production
 * call sites, which only ever pass real `Locale` keys.
 */
function fakeLocalePaths(paths: Record<string, string>): Partial<Record<Locale, string>> {
  return paths as unknown as Partial<Record<Locale, string>>;
}

function fakePublishedLocales(locales: readonly string[]): readonly Locale[] {
  return locales as unknown as readonly Locale[];
}

const ORIGINAL = process.env.NEXT_PUBLIC_SITE_URL;

describe("site url", () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
  });

  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = ORIGINAL;
  });

  it("falls back to the documented placeholder origin", () => {
    expect(getSiteUrl()).toBe("https://example.invalid");
  });

  it("uses NEXT_PUBLIC_SITE_URL and strips the trailing slash", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://pseo.example.com/";
    expect(getSiteUrl()).toBe("https://pseo.example.com");
  });

  it("ignores a blank NEXT_PUBLIC_SITE_URL", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "   ";
    expect(getSiteUrl()).toBe("https://example.invalid");
  });

  it("joins absolute urls without duplicating slashes", () => {
    expect(absoluteUrl("/zh-CN/prompts")).toBe("https://example.invalid/zh-CN/prompts");
    expect(absoluteUrl("zh-CN/prompts")).toBe("https://example.invalid/zh-CN/prompts");
    expect(absoluteUrl("/")).toBe("https://example.invalid/");
  });
});

describe("buildMetadata", () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
  });

  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = ORIGINAL;
  });

  const base = {
    locale: "zh-CN" as const,
    title: "提示词库",
    description: "来自 X 的图片提示词合集。",
    paths: { "zh-CN": "/zh-CN/prompts" },
  };

  it("sets title, description and an absolute canonical", () => {
    const meta = buildMetadata(base);
    expect(meta.title).toBe("提示词库");
    expect(meta.description).toBe("来自 X 的图片提示词合集。");
    expect(meta.alternates?.canonical).toBe("https://example.invalid/zh-CN/prompts");
  });

  it("never claims en, regardless of what paths carries", () => {
    const meta = buildMetadata(base);
    const languages = meta.alternates?.languages ?? {};
    expect(languages).not.toHaveProperty("en");
    expect(JSON.stringify(meta)).not.toContain('"en"');
  });

  it("omits languages entirely when only one locale variant exists (one locale -> no languages key)", () => {
    const meta = buildMetadata(base);
    expect(meta.alternates?.languages).toBeUndefined();
  });

  it("two published locales produce two distinct hreflang URLs", () => {
    const meta = buildMetadata({
      ...base,
      paths: fakeLocalePaths({ "zh-CN": "/zh-CN/prompts", en: "/en/prompts" }),
      publishedLocales: fakePublishedLocales(["zh-CN", "en"]),
    });
    expect(meta.alternates?.languages).toEqual({
      "zh-CN": "https://example.invalid/zh-CN/prompts",
      en: "https://example.invalid/en/prompts",
    });
  });

  it("filters out a path whose locale is not in publishedLocales", () => {
    const meta = buildMetadata({
      ...base,
      // "fr" is not a published locale, but a stray key must never leak
      // through even if it were supplied by mistake.
      paths: fakeLocalePaths({
        "zh-CN": "/zh-CN/prompts",
        en: "/en/prompts",
        fr: "/fr/prompts",
      }),
      publishedLocales: fakePublishedLocales(["zh-CN", "en"]),
    });
    expect(Object.keys(meta.alternates?.languages ?? {})).toEqual(["zh-CN", "en"]);
  });

  it("throws when no path is supplied for the current locale", () => {
    expect(() => buildMetadata({ ...base, paths: {} })).toThrow(/no path supplied/);
  });

  it("fills Open Graph and Twitter from the same values", () => {
    const meta = buildMetadata(base);
    expect(meta.openGraph?.title).toBe("提示词库");
    expect(meta.openGraph?.description).toBe("来自 X 的图片提示词合集。");
    expect(meta.openGraph?.url).toBe("https://example.invalid/zh-CN/prompts");
    expect(meta.openGraph?.locale).toBe("zh_CN");
    expect(meta.twitter).toMatchObject({
      card: "summary",
      title: "提示词库",
      description: "来自 X 的图片提示词合集。",
    });
  });

  it("opts a page out of indexing while still allowing crawlers to follow links", () => {
    const meta = buildMetadata({ ...base, noindex: true });
    expect(meta.robots).toEqual({ index: false, follow: true });
  });

  it("leaves robots unset for indexable pages", () => {
    expect(buildMetadata(base).robots).toBeUndefined();
  });
});

describe("breadcrumbList", () => {
  it("numbers positions from 1 and uses absolute urls", () => {
    const json = breadcrumbList([
      { name: "首页", path: "/zh-CN" },
      { name: "提示词库", path: "/zh-CN/prompts" },
    ]);
    expect(json["@context"]).toBe("https://schema.org");
    expect(json["@type"]).toBe("BreadcrumbList");
    expect(json.itemListElement).toEqual([
      {
        "@type": "ListItem",
        position: 1,
        name: "首页",
        item: "https://example.invalid/zh-CN",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "提示词库",
        item: "https://example.invalid/zh-CN/prompts",
      },
    ]);
  });
});

describe("serializeJsonLd", () => {
  it("escapes '<' so a payload cannot close the script element", () => {
    const out = serializeJsonLd({ name: "</script><script>alert(1)</script>" });
    expect(out).not.toContain("</script>");
    expect(out).toContain("\\u003c");
  });
});
