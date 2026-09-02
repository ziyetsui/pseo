import { describe, expect, it } from "vitest";

import { getContentRepository } from "@/lib/content";
import type { PromptSummary } from "@/lib/content/types";
import { modelPage, promptDetail, promptsHome, promptsImage } from "@/lib/i18n/routes";

const repo = getContentRepository();
const LOCALE = "zh-CN" as const;
const GOLDEN_SLUG = "country-miniature-stamp-poster";
const GOLDEN_ID = "2063814043631280180";

async function allPrompts(): Promise<PromptSummary[]> {
  return (await repo.listPrompts(LOCALE)).items;
}

describe("snapshot", () => {
  it("pins every metric to the 2026-08-20 observation", async () => {
    const snapshot = await repo.getSnapshot();
    expect(snapshot).toEqual({
      observedAt: "2026-08-20",
      indexVersion: "wireframe-flow-proto",
      source: "docs/wireframes/flow-proto.html",
    });

    for (const prompt of await allPrompts()) {
      expect(prompt.metrics.observedAt).toBe("2026-08-20");
    }
  });
});

describe("listPrompts", () => {
  it("exposes exactly the 35 unique X status ids the four pages contain", async () => {
    const items = await allPrompts();
    expect(items).toHaveLength(35);
    expect(new Set(items.map((p) => p.id)).size).toBe(35);
    expect(new Set(items.map((p) => p.slug)).size).toBe(35);
  });

  it("builds every href through the typed route builders — no '#' placeholders", async () => {
    for (const prompt of await allPrompts()) {
      expect(prompt.href).toBe(promptDetail(LOCALE, prompt.slug));
      for (const term of [
        ...prompt.models,
        ...prompt.useCases,
        ...prompt.techniques,
        ...prompt.styles,
        ...prompt.subjects,
        prompt.contentType,
      ]) {
        if (term.href === null) continue;
        expect(term.href.startsWith("/zh-CN/")).toBe(true);
        expect(term.href).not.toContain("#");
      }
    }
  });

  it("links model terms only when a model page will exist, and image content type to L2", async () => {
    const items = await allPrompts();
    const withPrompts = new Set(items.flatMap((p) => p.models.map((m) => m.slug)));
    for (const prompt of items) {
      for (const model of prompt.models) {
        expect(model.href).toBe(withPrompts.has(model.slug) ? modelPage(LOCALE, model.slug) : null);
      }
      if (prompt.contentType.slug === "image") expect(prompt.contentType.href).toBe(promptsImage(LOCALE));
      else expect(prompt.contentType.href).toBeNull();
    }
  });

  it("never fills a missing metric with 0", async () => {
    const items = await allPrompts();
    // Only the L4 golden record publishes views/reposts/replies/quotes.
    expect(items.filter((p) => p.metrics.views !== null)).toHaveLength(1);
    for (const prompt of items) {
      if (prompt.appearsOn.includes("l4")) continue;
      expect(prompt.metrics.views).toBeNull();
      expect(prompt.metrics.reposts).toBeNull();
    }
  });

  it("ORs inside an axis and ANDs across axes, with counts from the current data", async () => {
    const both = await repo.listPrompts(LOCALE, { model: ["nano-banana-pro", "gpt-image-2"] });
    const pro = await repo.listPrompts(LOCALE, { model: ["nano-banana-pro"] });
    const gpt = await repo.listPrompts(LOCALE, { model: ["gpt-image-2"] });
    expect(both.total).toBe(new Set([...pro.items, ...gpt.items].map((p) => p.id)).size);
    expect(both.total).toBeGreaterThan(pro.total);

    const crossed = await repo.listPrompts(LOCALE, {
      model: ["nano-banana-pro"],
      style: ["photorealistic"],
    });
    expect(crossed.total).toBeLessThanOrEqual(pro.total);
    for (const prompt of crossed.items) {
      expect(prompt.models.some((m) => m.slug === "nano-banana-pro")).toBe(true);
      expect(prompt.styles.some((s) => s.slug === "photorealistic")).toBe(true);
    }
  });

  it("reports applied filters and facet counts derived from the fixture", async () => {
    const result = await repo.listPrompts(LOCALE, { q: "portrait", model: ["nano-banana-pro"] });
    expect(result.appliedFilters.map((f) => f.key)).toEqual(["q", "model"]);

    const modelFacet = result.facets.find((f) => f.key === "model");
    expect(modelFacet).toBeDefined();
    const selected = modelFacet?.options.find((o) => o.slug === "nano-banana-pro");
    expect(selected?.selected).toBe(true);
    // Facet counts must be real, not the prototype's declared 136.
    expect(selected?.count).toBeLessThanOrEqual(35);
    expect(selected?.count).not.toBe(136);
  });

  it("surfaces a filter value it cannot honour instead of silently ignoring it", async () => {
    const result = await repo.listPrompts(LOCALE, { model: ["not-a-model"] });
    expect(result.unknownParams).toEqual(["model=not-a-model"]);
    expect(result.total).toBe(0);
    // The unusable value stays visible so the user can remove it.
    const option = result.facets.find((f) => f.key === "model")?.options.find((o) => o.slug === "not-a-model");
    expect(option?.selected).toBe(true);
    expect(option?.count).toBe(0);
  });

  it("matches free text past the 240-char promptPreview cut-off (searches the FULL prompt text)", async () => {
    const isometricId = "concept-2008952931484098637";
    const isometric = (await allPrompts()).find((p) => p.slug === isometricId);
    expect(isometric).toBeDefined();
    // Both terms only occur well past character 240 of the (much longer) prompt.
    expect(isometric!.promptPreview.length).toBeLessThanOrEqual(241);
    expect(isometric!.promptPreview.toLowerCase()).not.toContain("raytracing");
    expect(isometric!.searchText).toContain("raytracing");

    const byRaytracing = await repo.listPrompts(LOCALE, { q: "raytracing" });
    expect(byRaytracing.items.map((p) => p.slug)).toContain(isometricId);

    const byNegativePrompt = await repo.listPrompts(LOCALE, { q: "negative prompt" });
    expect(byNegativePrompt.items.map((p) => p.slug)).toContain(isometricId);
  });
});

describe("getPromptBySlug — the L4 golden record", () => {
  it("is reachable at country-miniature-stamp-poster with the prototype's own data", async () => {
    const detail = await repo.getPromptBySlug(LOCALE, GOLDEN_SLUG);
    expect(detail).not.toBeNull();
    if (detail === null) return;

    expect(detail.id).toBe(GOLDEN_ID);
    expect(detail.title).toBe("国家主题微缩邮票海报");
    expect(detail.appearsOn).toEqual(["l4"]);
    expect(detail.models.map((m) => m.slug)).toEqual(["gpt-image-2"]);
    expect(detail.creator.handle).toBe("@Naiknelofar788");
    expect(detail.creator.followers).toBe(34683);
    expect(detail.source.publishedAt).toBe("2026-06-08");
    expect(detail.source.url).toBe("https://x.com/Naiknelofar788/status/2063814043631280180");

    expect(detail.metrics).toMatchObject({
      views: 7318,
      likes: 185,
      bookmarks: 122,
      reposts: 20,
      replies: 44,
      quotes: 2,
    });

    expect(detail.variables).toEqual([
      {
        token: "[COUNTRY]",
        label: "国家",
        options: ["Japan", "France", "Egypt", "Brazil", "India", "Mexico"],
        defaultValue: "Japan",
      },
    ]);
    expect(detail.steps).toHaveLength(4);
    expect(detail.steps.map((s) => s.order)).toEqual([1, 2, 3, 4]);
    expect(detail.requiredInputs).toEqual(["国家名（替换 [COUNTRY]）"]);
    expect(detail.optionalInputs).toEqual([]);
    expect(detail.parameters.map((p) => p.value)).toEqual([
      "8k resolution",
      "octane render",
      "tilt-shift lens effect",
      "shallow depth of field",
    ]);
    expect(detail.variations).toHaveLength(6);
    for (const variation of detail.variations) {
      expect(variation.status).toBe("pending");
      expect(variation.media).toBeNull();
    }
    expect(detail.media).toHaveLength(4);
    for (const item of detail.media) {
      expect(item).toMatchObject({ kind: "image", width: 640, height: 360, dimensionsSource: "assumed" });
      expect(item.alt.length).toBeGreaterThan(0);
    }
    expect(detail.promptLanguage).toBe("en");
    expect(detail.hasVariables).toBe(true);
    expect(detail.localeVariants).toEqual([
      { locale: LOCALE, slug: GOLDEN_SLUG, href: promptDetail(LOCALE, GOLDEN_SLUG), status: "ready" },
    ]);
  });

  it("returns null for an unknown slug rather than throwing", async () => {
    expect(await repo.getPromptBySlug(LOCALE, "no-such-prompt")).toBeNull();
  });
});

describe("listTrending", () => {
  it("computes windows from the snapshot date, not from Date.now()", async () => {
    const week = await repo.listTrending(LOCALE, "7d", 6);
    expect(week.windowStart).toBe("2026-08-13");
    const month = await repo.listTrending(LOCALE, "30d", 6);
    expect(month.windowStart).toBe("2026-07-21");
    const all = await repo.listTrending(LOCALE, "all", 6);
    expect(all.windowStart).toBeNull();
    expect(all.note).toBeNull();
  });

  it("keeps only prompts published inside the window, and says so when it tops up", async () => {
    const month = await repo.listTrending(LOCALE, "30d", 6);
    expect(month.note).toBeNull();
    for (const prompt of month.items) {
      expect(prompt.source.publishedAt).not.toBeNull();
      expect((prompt.source.publishedAt ?? "") >= "2026-07-21").toBe(true);
    }

    // Only two prompts fall inside 7 days, so the prototype's top-up note applies.
    const week = await repo.listTrending(LOCALE, "7d", 6);
    expect(week.note).not.toBeNull();
    expect(week.items.slice(0, 2).every((p) => (p.source.publishedAt ?? "") >= "2026-08-13")).toBe(true);
  });

  it("sorts by valueScore desc with nulls last, then by likes", async () => {
    const all = await repo.listTrending(LOCALE, "all", 35);
    const scores = all.items.map((p) => p.metrics.valueScore);
    const firstNull = scores.indexOf(null);
    if (firstNull !== -1) expect(scores.slice(firstNull).every((s) => s === null)).toBe(true);
    for (let i = 1; i < scores.length; i += 1) {
      const previous = scores[i - 1];
      const current = scores[i];
      if (previous !== null && previous !== undefined && current !== null && current !== undefined) {
        expect(previous).toBeGreaterThanOrEqual(current);
      }
    }
  });

  it("respects the limit", async () => {
    expect((await repo.listTrending(LOCALE, "all", 3)).items).toHaveLength(3);
  });
});

describe("listTaxonomies", () => {
  it("returns counts computed from the prompts, never the prototype's declared numbers", async () => {
    const prompts = await allPrompts();
    const models = await repo.listTaxonomies(LOCALE, "model");
    expect(models.length).toBeGreaterThan(0);
    for (const term of models) {
      expect(term.count).toBe(prompts.filter((p) => p.models.some((m) => m.slug === term.slug)).length);
      expect(term.count).toBeGreaterThan(0);
    }
    // Sora / Wan are declared by the prototype but own no prompt here.
    expect(models.map((m) => m.slug)).not.toContain("sora");
    expect(models.map((m) => m.slug)).not.toContain("wan");
  });

  it("keeps the prototype's declared count as metadata only", async () => {
    const models = await repo.listTaxonomies(LOCALE, "model");
    const pro = models.find((m) => m.slug === "nano-banana-pro");
    expect(pro?.wireframeDeclaredCount).toBe(136);
    expect(pro?.count).not.toBe(136);
  });

  it("covers every axis the query layer can filter on", async () => {
    for (const axis of ["model", "useCase", "technique", "style", "subject", "contentType"] as const) {
      expect((await repo.listTaxonomies(LOCALE, axis)).length).toBeGreaterThan(0);
    }
  });
});

describe("models", () => {
  it("counts nano-banana-pro prompts from the fixture's own tags", async () => {
    const prompts = await allPrompts();
    const expected = prompts.filter((p) => p.models.some((m) => m.slug === "nano-banana-pro"));
    const listed = await repo.listModelPrompts(LOCALE, "nano-banana-pro");
    expect(listed.total).toBe(expected.length);
    expect(listed.items.map((p) => p.id).sort()).toEqual(expected.map((p) => p.id).sort());
  });

  it("derives the nano-banana-pro model page from the fixture", async () => {
    const model = await repo.getModel(LOCALE, "nano-banana-pro");
    expect(model).not.toBeNull();
    if (model === null) return;

    const listed = await repo.listModelPrompts(LOCALE, "nano-banana-pro");
    expect(model.href).toBe(modelPage(LOCALE, "nano-banana-pro"));
    expect(model.summary).toContain(`库中 ${listed.total} 条 Prompt 点名该模型`);
    expect(model.summary).not.toContain("136");
    expect(model.editorialStatus).toBe("derived-from-fixture");
    expect(model.officialUrl).toBeNull();
    expect(model.outputs).toEqual(["image"]);
    expect(model.capabilities.length).toBeGreaterThan(0);
    expect(model.inputs[0]).toBe("文本 Prompt");
    expect(model.limitations).toEqual(["官方功能与定价说明尚未收录，请以官方渠道为准"]);
    expect(model.editorial).toHaveLength(3);
    expect(model.editorial[0]?.body).not.toContain("157");
    expect(model.editorial[0]?.body).not.toContain("68");
    expect(model.relatedModels.map((m) => m.slug)).toEqual(["higgsfield-soul", "gpt-image-2"]);
    expect(model.relatedUseCases.map((u) => u.slug)).toEqual(["fashion", "beauty"]);
  });

  it("has content for gpt-image-2 as well", async () => {
    const model = await repo.getModel(LOCALE, "gpt-image-2");
    expect(model).not.toBeNull();
    if (model === null) return;
    expect(model.label).toBe("GPT Image 2");
    expect(model.summary.length).toBeGreaterThan(0);
    expect(model.editorial).toHaveLength(3);
    expect(model.relatedModels.length).toBeGreaterThan(0);
  });

  it("generates a model page for every model that owns at least one prompt, and none for the rest", async () => {
    const prompts = await allPrompts();
    const withPrompts = new Set(prompts.flatMap((p) => p.models.map((m) => m.slug)));
    for (const slug of withPrompts) {
      expect(await repo.getModel(LOCALE, slug), slug).not.toBeNull();
    }
    expect(await repo.getModel(LOCALE, "sora")).toBeNull();
    expect(await repo.getModel(LOCALE, "not-a-model")).toBeNull();
  });
});

describe("collections", () => {
  it("counts members dynamically from the current prompts", async () => {
    const collections = await repo.listCollections(LOCALE);
    expect(collections).toHaveLength(6);
    const prompts = await allPrompts();

    const cinematic = collections.find((c) => c.slug === "cinematic-camera");
    expect(cinematic?.count).toBe(
      prompts.filter(
        (p) =>
          p.techniques.some((t) => t.slug === "camera-movement-shot-language") &&
          p.styles.some((s) => s.slug === "cinematic"),
      ).length,
    );

    const templates = collections.find((c) => c.slug === "template-prompts");
    expect(templates?.count).toBe(prompts.filter((p) => p.hasVariables).length);

    for (const collection of collections) {
      expect(collection.count).toBeGreaterThan(0);
      expect(collection.sampleIds.length).toBeLessThanOrEqual(3);
      expect(collection.sampleIds.length).toBeLessThanOrEqual(collection.count);
    }
  });
});

describe("creators", () => {
  it("lists only creators that own a prompt, with counts that add up", async () => {
    const creators = await repo.listCreators(LOCALE);
    const prompts = await allPrompts();
    expect(creators.length).toBeGreaterThan(0);
    expect(creators.reduce((sum, c) => sum + c.count, 0)).toBe(prompts.length);
    for (const creator of creators) {
      expect(creator.count).toBeGreaterThan(0);
      expect(creator.url.startsWith("https://x.com/")).toBe(true);
    }
    expect(creators.map((c) => c.handle)).not.toContain("@PrometheanAIX");
  });
});

describe("featured, variables and related", () => {
  it("keeps the prototype's featured selections per surface", async () => {
    const l1 = await repo.listFeatured(LOCALE, "l1");
    expect(l1.map((p) => p.id)).toEqual(["2071174186978951379"]);
    expect((await repo.listFeatured(LOCALE, "l2")).length).toBe(6);
  });

  it("lists prompts with variables, optionally scoped to a model", async () => {
    const all = await repo.listPromptsWithVariables(LOCALE);
    expect(all.length).toBeGreaterThan(0);
    for (const prompt of all) expect(prompt.hasVariables).toBe(true);

    const scoped = await repo.listPromptsWithVariables(LOCALE, "nano-banana-pro");
    expect(scoped.length).toBeLessThanOrEqual(all.length);
    for (const prompt of scoped) expect(prompt.models.some((m) => m.slug === "nano-banana-pro")).toBe(true);
  });

  it("groups related prompts without ever including the prompt itself", async () => {
    const related = await repo.getRelated(LOCALE, "2019849202591789460");
    for (const group of [related.sameSeries, related.sameModel, related.sameUseCase, related.sameCreator]) {
      expect(group.map((p) => p.id)).not.toContain("2019849202591789460");
    }
    expect(related.sameModel.length).toBeGreaterThan(0);
    for (const prompt of related.sameCreator) expect(prompt.creator.handle).toBe("@KeorUnreal");
  });

  it("returns empty groups for an unknown prompt id", async () => {
    expect(await repo.getRelated(LOCALE, "nope")).toEqual({
      sameSeries: [],
      sameModel: [],
      sameUseCase: [],
      sameCreator: [],
    });
  });
});

describe("articles", () => {
  it("publishes the zh-CN fixture articles across categories", async () => {
    const articles = await repo.listArticles(LOCALE);
    expect(articles).toHaveLength(3);
    for (const article of articles) {
      expect(article.isFixture).toBe(true);
      expect(article.locale).toBe(LOCALE);
      expect(article.readingMinutes).toBeGreaterThan(0);
    }
    expect(articles.map((a) => a.slug)).toEqual([
      "sources-and-copyright",
      "how-to-replace-prompt-variables",
      "stamp-poster-case-study",
    ]);
    expect(articles.filter((a) => a.category.slug === "guides")).toHaveLength(2);
    expect(articles.filter((a) => a.category.slug === "case-studies")).toHaveLength(1);
  });

  it("returns a full article body as plain paragraphs", async () => {
    const article = await repo.getArticle(LOCALE, "how-to-replace-prompt-variables");
    expect(article).not.toBeNull();
    expect(article?.paragraphs.length).toBeGreaterThanOrEqual(3);
    expect(article?.paragraphs.every((p) => p.length > 0)).toBe(true);
    expect(await repo.getArticle(LOCALE, "missing")).toBeNull();
  });

  it("exposes categories — including a zero-article one — and filters by them", async () => {
    const categories = await repo.listArticleCategories(LOCALE);
    expect(categories.map((c) => c.slug)).toEqual(["guides", "release-notes", "case-studies"]);
    expect(categories[0]?.href).toBe("/zh-CN/blog/category/guides");
    expect((await repo.listArticles(LOCALE, "guides"))).toHaveLength(2);
    // `release-notes` is a real, listed category with no articles — this is
    // the exact case the blog list page must not link (see blog.test.tsx).
    expect((await repo.listArticles(LOCALE, "release-notes"))).toHaveLength(0);
    expect((await repo.listArticles(LOCALE, "case-studies"))).toHaveLength(1);
    expect((await repo.listArticles(LOCALE, "nope"))).toHaveLength(0);
    expect(await repo.getArticleCategory(LOCALE, "guides")).not.toBeNull();
    expect(await repo.getArticleCategory(LOCALE, "release-notes")).not.toBeNull();
    expect(await repo.getArticleCategory(LOCALE, "nope")).toBeNull();
  });

  it("attaches an honest, clearly-labelled fixture byline to every article", async () => {
    const articles = await repo.listArticles(LOCALE);
    for (const article of articles) {
      expect(article.author.name).toBe("站点编辑（fixture）");
      expect(article.author.url).toBeNull();
    }
  });

  it("resolves each article's sources to real site-relative route hrefs", async () => {
    const detail = await repo.getArticle(LOCALE, "how-to-replace-prompt-variables");
    expect(detail).not.toBeNull();
    expect(detail?.sources.length).toBeGreaterThan(0);
    for (const source of detail?.sources ?? []) {
      expect(source.url.startsWith("/")).toBe(true);
      expect(source.label.length).toBeGreaterThan(0);
    }
    expect(detail?.sources.some((source) => source.url === promptDetail(LOCALE, GOLDEN_SLUG))).toBe(
      true,
    );

    const copyrightDetail = await repo.getArticle(LOCALE, "sources-and-copyright");
    expect(copyrightDetail?.sources.some((source) => source.url === promptsHome(LOCALE))).toBe(
      true,
    );
  });
});
