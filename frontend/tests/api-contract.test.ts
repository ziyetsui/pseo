import { describe, expect, it } from "vitest";
import { PublicApiClient, validateResponse } from "../src/lib/api/client";
import { dataMode, publicDataConfig } from "../src/lib/catalog/config";
import { createFixtureCatalog } from "../src/lib/catalog/fixture";
import { fillVariables, filterPrompts, filtersFromParams } from "../src/lib/catalog/query";
import { promptFromApi } from "../src/lib/catalog/public";
import type { PromptDetailSchema } from "../src/lib/api/generated";

const revision = `sha256:${"a".repeat(64)}`;
const locales = {
  data: [{ locale: "zh-CN", displayName: "简体中文", default: true, enabled: true, href: "/zh-CN/prompts" }],
  meta: { requestId: "request-test", contentRevision: revision, indexVersion: "test-v1", rankingVersion: "unranked-v1" },
};

describe("generated public API boundary", () => {
  it("validates the real OpenAPI envelope and rejects missing/extra fields", () => {
    expect(validateResponse("/api/v1/locales", locales)).toEqual(locales);
    expect(() => validateResponse("/api/v1/locales", { data: locales.data })).toThrow("generated contract");
    expect(() => validateResponse("/api/v1/locales", { ...locales, secret: "not-a-real-secret" })).toThrow("generated contract");
  });

  it("requires identical header and body revisions", async () => {
    const client = new PublicApiClient("http://127.0.0.1:8000", { fetch: async () => Response.json(locales, { headers: { "X-Content-Revision": "different" } }) });
    await expect(client.get("/api/v1/locales", {}, {})).rejects.toMatchObject({ code: "REVISION_CONFLICT" });
  });

  it("defaults to no-store and makes immutable build cache keys revision-specific", async () => {
    const requests: RequestInit[] = [];
    const fetcher: typeof fetch = async (_url, init) => {
      requests.push(init ?? {});
      const currentRevision = new Headers(init?.headers).get("X-Content-Revision") ?? revision;
      return Response.json({ ...locales, meta: { ...locales.meta, contentRevision: currentRevision } }, { headers: { "X-Content-Revision": currentRevision } });
    };
    await new PublicApiClient("http://127.0.0.1:8000", { fetch: fetcher }).get("/api/v1/locales", {}, {});
    const nextRevision = `sha256:${"b".repeat(64)}`;
    for (const expectedRevision of [revision, nextRevision]) {
      await new PublicApiClient("http://127.0.0.1:8000", { fetch: fetcher, expectedRevision, cache: "force-cache" }).get("/api/v1/locales", {}, {});
    }
    expect(requests[0]?.cache).toBe("no-store");
    expect(requests.slice(1).map((request) => request.cache)).toEqual(["force-cache", "force-cache"]);
    expect(requests.slice(1).map((request) => new Headers(request.headers).get("X-Content-Revision"))).toEqual([revision, nextRevision]);
  });

  it("still rejects a cached response from another immutable revision", async () => {
    const client = new PublicApiClient("http://127.0.0.1:8000", { expectedRevision: `sha256:${"b".repeat(64)}`, cache: "force-cache", fetch: async () => Response.json(locales, { headers: { "X-Content-Revision": revision } }) });
    await expect(client.get("/api/v1/locales", {}, {})).rejects.toMatchObject({ code: "REVISION_CONFLICT" });
  });

  it("rejects drift between successful reads instead of mixing snapshots", async () => {
    let requests = 0;
    const client = new PublicApiClient("http://127.0.0.1:8000", { fetch: async () => {
      const current = ++requests === 1 ? revision : `sha256:${"b".repeat(64)}`;
      return Response.json({ ...locales, meta: { ...locales.meta, contentRevision: current } }, { headers: { "X-Content-Revision": current } });
    } });
    await client.get("/api/v1/locales", {}, {});
    await expect(client.get("/api/v1/locales", {}, {})).rejects.toMatchObject({ code: "REVISION_CONFLICT" });
  });

  it("surfaces stable problem codes and trace IDs", async () => {
    const client = new PublicApiClient("http://127.0.0.1:8000", { fetch: async () => Response.json({ code: "LOCALE_VARIANT_NOT_FOUND", detail: "No translation", traceId: "trace-test" }, { status: 404, headers: { "Content-Type": "application/problem+json" } }) });
    await expect(client.get("/api/v1/locales", {}, {})).rejects.toMatchObject({ status: 404, code: "LOCALE_VARIANT_NOT_FOUND", traceId: "trace-test" });
  });

  it("requires an explicit mode and does not silently select fixtures", () => {
    expect(() => dataMode({ NODE_ENV: "production" })).toThrow("FRONTEND_DATA_MODE");
    expect(() => dataMode({ FRONTEND_DATA_MODE: "public" })).toThrow();
    expect(dataMode({ FRONTEND_DATA_MODE: "public-api" })).toBe("public-api");
  });

  it("requires a complete externally pinned revision for all public builds", () => {
    expect(() => publicDataConfig({ FRONTEND_API_URL: "http://127.0.0.1:8000" })).toThrow("FRONTEND_EXPECTED_REVISION");
    expect(() => publicDataConfig({ FRONTEND_API_URL: "http://127.0.0.1:8000", FRONTEND_EXPECTED_REVISION: "sha256:short" })).toThrow("FRONTEND_EXPECTED_REVISION");
    expect(publicDataConfig({ FRONTEND_API_URL: "http://127.0.0.1:8000", FRONTEND_EXPECTED_REVISION: revision, FRONTEND_SITE_URL: "https://example.com" })).toEqual({ url: "http://127.0.0.1:8000", expectedRevision: revision });
  });

  it("rejects a different pinned revision on the first request", async () => {
    const client = new PublicApiClient("http://127.0.0.1:8000", { expectedRevision: `sha256:${"b".repeat(64)}`, fetch: async () => Response.json(locales, { headers: { "X-Content-Revision": revision } }) });
    await expect(client.get("/api/v1/locales", {}, {})).rejects.toMatchObject({ code: "REVISION_CONFLICT" });
  });

  it("keeps the source-record revision and full text separate from the catalog envelope", () => {
    const source = { platform: "manual" as const, sourceId: "source-test", url: "https://example.com/source", authorHandle: null, observedAt: "2026-09-04T00:00:00Z" };
    const detail: PromptDetailSchema = {
      summary: { id: "prompt-test", slug: "test", href: "/zh-CN/prompts/test", locale: "zh-CN", title: "Test", excerpt: "Summary", contentType: "text", promptPreview: "Only a preview", models: [], useCases: [], techniques: [], styles: [], subjects: [], media: [], source, metrics: { likes: null, bookmarks: null, comments: null, reposts: null, views: null, observedAt: source.observedAt }, publishedAt: source.observedAt, updatedAt: source.observedAt },
      localeVariants: [{ locale: "zh-CN", slug: "test", href: "/zh-CN/prompts/test" }],
      identity: { title: "Test", summary: "Summary", contentType: "text" },
      outcome: { outputType: "text", purpose: "", platforms: [], characteristics: [] },
      prompt: { language: "en", text: "Exact source text.\n  Preserve indentation.", variables: [] },
      inputs: { required: [], optional: [] }, parameters: [], examples: [], workflow: [], variations: [], source, evidence: [],
      relations: { models: [], useCases: [], techniques: [], styles: [], subjects: [], creator: null, relatedPrompts: [] },
      actions: { canCopy: true, tryUrl: null },
      seo: { title: "Test", description: "Summary", canonicalUrl: "https://example.com/zh-CN/prompts/test", hreflang: {}, robots: "noindex,nofollow" },
      revision: "source-record-revision-123",
    };
    const mapped = promptFromApi(detail, "zh-CN");
    expect(mapped.revision).toBe("source-record-revision-123");
    expect(mapped.revision).not.toBe(revision);
    expect(mapped.prompt).toBe(detail.prompt.text);
    expect(mapped.seo).toEqual(detail.seo);
  });
});

describe("same snapshot browser queries", () => {
  const catalog = createFixtureCatalog("zh-CN");

  it("preserves titles, template completeness and relationships across L1–L4", () => {
    expect(catalog.prompts).toHaveLength(34);
    const stamp = catalog.prompts.find((prompt) => prompt.slug === "country-miniature-stamp-poster");
    expect(stamp?.title).toBe("Country stamp built as a breaking-out miniature");
    expect(stamp?.prompt.endsWith("8k resolution, octane render, highly detailed miniature art.")).toBe(true);
    expect(stamp?.media).toHaveLength(4);
    expect(catalog.prompts.find((prompt) => prompt.id === "2008952931484098637")?.variables.map((variable) => variable.token)).toEqual(["[INSERT LOCATION]", "[INSERT DESCRIPTION]", "[POSE]", "[INSERT WALL/BUILDING]", "[PROP_1]", "[PROP_2]"]);
    expect(catalog.models.every((model) => model.count === catalog.prompts.filter((prompt) => prompt.models.some((item) => item.slug === model.slug)).length)).toBe(true);
  });

  it("combines same-axis OR with cross-axis AND and exact creator IDs", () => {
    const filters = { model: ["nano-banana-pro", "gpt-image-2"], contentType: ["image"], style: ["photorealistic"] };
    const result = filterPrompts(catalog, filters);
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((prompt) => prompt.kind === "image" && prompt.models.some((model) => filters.model.includes(model.slug)) && prompt.styles.some((style) => style.slug === "photorealistic"))).toBe(true);
    expect(filterPrompts(catalog, { creator: ["missing-creator"] })).toEqual([]);
    expect(filtersFromParams(new URLSearchParams("model=nano-banana-pro&model=gpt-image-2&contentType=image"))).toEqual({ model: ["nano-banana-pro", "gpt-image-2"], contentType: ["image"] });
  });

  it("retains literal whitespace and substitutes every token without interpreting replacement syntax", () => {
    expect(fillVariables("[COUNTRY]\n  [COUNTRY] — [OTHER]", { "[COUNTRY]": "$& Japan" })).toBe("$& Japan\n  $& Japan — [OTHER]");
  });

  it("rejects missing locale data instead of falling back to zh-CN", () => {
    expect(() => createFixtureCatalog("en")).toThrow("only contains zh-CN");
  });
});
