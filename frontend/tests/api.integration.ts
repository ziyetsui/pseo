import { describe, expect, it } from "vitest";
import { PublicApiClient } from "../src/lib/api/client";
import { loadPublicCatalog } from "../src/lib/catalog/public";
import { filterPrompts } from "../src/lib/catalog/query";

const baseUrl = process.env.FRONTEND_CONTRACT_API_URL;
if (!baseUrl) throw new Error("Set FRONTEND_CONTRACT_API_URL to the explicitly started local backend");

describe("live backend OpenAPI integration", () => {
  it("validates every implemented read endpoint and builds one closed catalog", async () => {
    const client = new PublicApiClient(baseUrl);
    const health = await client.get("/healthz", {}, {});
    const locales = await client.get("/api/v1/locales", {}, {});
    const enabled = locales.data.find((locale) => locale.enabled);
    if (!enabled || (enabled.locale !== "zh-CN" && enabled.locale !== "en")) throw new Error("Local backend has no supported enabled locale");
    const locale = enabled.locale;
    const home = await client.get("/api/v1/home", { locale }, {});
    const list = await client.get("/api/v1/prompts", { locale, limit: 50 }, {});
    const facets = await client.get("/api/v1/facets", { locale }, {});
    const image = await client.get("/api/v1/categories/{axis}/{slug}", { locale }, { axis: "content-type", slug: "image" });
    for (const model of home.data.browse.models) await client.get("/api/v1/models/{slug}", { locale }, { slug: model.slug });
    for (const prompt of list.data) await client.get("/api/v1/prompts/{slug}", { locale }, { slug: prompt.slug });
    const catalog = await loadPublicCatalog(baseUrl, locale, new PublicApiClient(baseUrl, { expectedRevision: health.indexRevision }));
    expect(catalog.revision).toBe(health.indexRevision);
    expect(catalog.prompts).toHaveLength(home.data.stats.promptCount);
    expect(catalog.prompts.filter((prompt) => prompt.kind === "image")).toHaveLength(image.data.page.total);
    expect(facets.meta.contentRevision).toBe(catalog.revision);
    for (const prompt of catalog.prompts) {
      const detail = await client.get("/api/v1/prompts/{slug}", { locale }, { slug: prompt.slug });
      expect(prompt.revision).toBe(detail.data.revision);
      expect(prompt.seo).toEqual(detail.data.seo);
    }
    for (const model of catalog.models) {
      const projection = await client.get("/api/v1/models/{slug}", { locale }, { slug: model.slug });
      expect(model.seo).toEqual(projection.data.entity.seo);
      expect(model.localeVariants).toEqual(projection.data.entity.localeVariants);
    }
    for (const sort of ["relevance", "value", "trending", "newest"] as const) {
      const sorted = await client.get("/api/v1/prompts", { locale, sort, limit: 50 }, {});
      expect(filterPrompts(catalog, { sort }).map((prompt) => prompt.id).slice(0, 50)).toEqual(sorted.data.map((prompt) => prompt.id));
    }
    for (const window of ["7d", "30d", "all"] as const) {
      const filtered = await client.get("/api/v1/prompts", { locale, window, limit: 50 }, {});
      expect(filterPrompts(catalog, { window }).map((prompt) => prompt.id).slice(0, 50)).toEqual(filtered.data.map((prompt) => prompt.id));
    }
  });

  it("keeps missing detail and unpublished locale failures explicit", async () => {
    const client = new PublicApiClient(baseUrl);
    await expect(client.get("/api/v1/prompts/{slug}", { locale: "zh-CN" }, { slug: "contract-intentionally-missing" })).rejects.toMatchObject({ status: 404, code: "RESOURCE_NOT_FOUND" });
    const locales = await client.get("/api/v1/locales", {}, {});
    for (const locale of locales.data.filter((item) => !item.enabled)) {
      await expect(client.get("/api/v1/home", { locale: locale.locale }, {})).rejects.toMatchObject({ status: 404, code: "LOCALE_VARIANT_NOT_FOUND" });
    }
  });
});
