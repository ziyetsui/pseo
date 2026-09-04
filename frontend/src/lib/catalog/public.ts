import { ApiError, PublicApiClient } from "../api/client";
import type { LocalizedRefSchema, PromptDetailSchema, PromptPageEnvelope } from "../api/generated";
import { filterHref } from "./query";
import type { Axis, Catalog, Locale, Prompt, Ref } from "./types";

function reference(value: LocalizedRefSchema, locale: Locale, axis: Axis): Ref {
  return { id: value.id, slug: value.slug, label: value.name, href: axis === "model" ? value.href : filterHref(locale, axis, value.slug), count: 0 };
}

export function promptFromApi(detail: PromptDetailSchema, locale: Locale): Prompt {
  const value = detail.summary;
  if (value.locale !== locale) throw new ApiError(502, "LOCALE_MISMATCH", "The response contains a different locale");
  const media = value.media.map((item) => ({ id: item.assetId, kind: item.type, src: item.url, alt: item.alt, width: item.width, height: item.height, poster: item.posterUrl, label: null }));
  return {
    id: value.id, slug: value.slug, href: value.href, locale, title: value.title,
    summary: detail.identity.summary, prompt: detail.prompt.text, language: detail.prompt.language, kind: value.contentType,
    models: value.models.map((item) => reference(item, locale, "model")),
    useCases: value.useCases.map((item) => reference(item, locale, "useCase")),
    techniques: value.techniques.map((item) => reference(item, locale, "technique")),
    styles: value.styles.map((item) => reference(item, locale, "style")),
    subjects: value.subjects.map((item) => reference(item, locale, "subject")),
    handle: value.source.authorHandle ? `@${value.source.authorHandle.replace(/^@/, "")}` : "",
    creatorRef: detail.relations.creator ? { id: detail.relations.creator.id, slug: detail.relations.creator.slug, label: detail.relations.creator.name } : null,
    img: media.find((item) => item.kind === "image")?.src ?? media.find((item) => item.poster)?.poster ?? null,
    media, likes: value.metrics.likes, saves: value.metrics.bookmarks, views: value.metrics.views,
    highValue: false, score: null, publishedAt: value.publishedAt,
    variables: detail.prompt.variables.map((variable) => ({ token: variable.key.startsWith("[") ? variable.key : `[${variable.key}]`, label: variable.label, defaultValue: variable.defaultValue ?? "", options: variable.options, note: null, required: variable.required })),
    steps: detail.workflow.map((step) => ({ order: step.position, title: step.title, body: step.body })),
    requiredInputs: detail.inputs.required, optionalInputs: detail.inputs.optional,
    parameters: detail.parameters.map((parameter) => ({ label: parameter.label, value: parameter.options.join(" · ") })),
    source: { url: detail.source.url, platform: detail.source.platform, observedAt: detail.source.observedAt }, evidence: detail.evidence,
    actions: { canCopy: detail.actions.canCopy, tryUrl: detail.actions.tryUrl },
    localeVariants: detail.localeVariants, seo: detail.seo, revision: detail.revision,
    appearsOn: ["l1", ...(value.contentType === "image" ? ["l2" as const] : []), "l3", "l4"], featuredOn: [],
    ranking: {
      value: (value.metrics.likes ?? 0) + (value.metrics.bookmarks ?? 0) * 2 + (value.metrics.comments ?? 0) + (value.metrics.reposts ?? 0) * 2,
      featured: false,
      searchText: [value.title, detail.identity.summary, detail.prompt.text, ...[...value.models, ...value.useCases, ...value.techniques, ...value.styles, ...value.subjects].map((ref) => ref.name), ...[...value.models, ...value.useCases, ...value.techniques, ...value.styles, ...value.subjects].map((ref) => ref.slug), ...(detail.relations.creator ? [detail.relations.creator.name, detail.relations.creator.slug] : [])].join(" ").toLowerCase(),
      metricsObservedAt: value.metrics.observedAt,
    },
  };
}

export async function loadPublicCatalog(baseUrl: string, locale: Locale, client = new PublicApiClient(baseUrl)): Promise<Catalog> {
  const locales = await client.get("/api/v1/locales", {}, {});
  if (!locales.data.some((item) => item.locale === locale && item.enabled)) throw new ApiError(404, "LOCALE_VARIANT_NOT_FOUND", "This locale is not published");
  const home = await client.get("/api/v1/home", { locale }, {});
  const summaries = [];
  const cursors = new Set<string>();
  const identities = new Set<string>();
  let cursor: string | null = null;
  let expectedTotal: number | null = null;
  do {
    const page: PromptPageEnvelope = await client.get("/api/v1/prompts", { locale, limit: 50, sort: "relevance", ...(cursor ? { cursor } : {}) }, {});
    if (expectedTotal === null) expectedTotal = page.page.total;
    if (page.page.total !== expectedTotal || page.page.hasMore !== (page.page.nextCursor !== null)) throw new ApiError(409, "PAGINATION_DRIFT", "The catalog page set is not closed");
    for (const summary of page.data) {
      if (identities.has(summary.id)) throw new ApiError(409, "DUPLICATE_PROMPT", "A prompt was repeated across catalog pages");
      identities.add(summary.id);
      summaries.push(summary);
    }
    cursor = page.page.nextCursor;
    if (cursor) {
      if (cursors.has(cursor) || page.data.length === 0 || cursors.size >= 200) throw new ApiError(409, "INVALID_CURSOR", "The public catalog cursor did not advance");
      cursors.add(cursor);
    }
  } while (cursor);
  if (summaries.length !== expectedTotal || home.data.stats.promptCount !== summaries.length) throw new ApiError(409, "CATALOG_COUNT_MISMATCH", "The catalog count does not match its immutable page set");
  const revision = client.contentRevision;
  if (!revision) throw new ApiError(502, "MISSING_REVISION", "The catalog revision is missing");
  const prompts: Prompt[] = [];
  for (let offset = 0; offset < summaries.length; offset += 8) {
    const batch = await Promise.all(summaries.slice(offset, offset + 8).map(async (summary) => {
      const result = await client.get("/api/v1/prompts/{slug}", { locale }, { slug: summary.slug });
      if (result.data.summary.id !== summary.id || result.data.summary.slug !== summary.slug) throw new ApiError(409, "PROMPT_IDENTITY_DRIFT", "The prompt detail does not match its list identity");
      return promptFromApi(result.data, locale);
    }));
    prompts.push(...batch);
  }
  const fields = { model: "models", useCase: "useCases", technique: "techniques", style: "styles", subject: "subjects" } as const;
  function collect(axis: Axis, seed: LocalizedRefSchema[] = []): Ref[] {
    const values = new Map(seed.map((item) => [item.slug, reference(item, locale, axis)]));
    for (const prompt of prompts) for (const term of prompt[fields[axis]]) values.set(term.slug, term);
    return [...values.values()].map((term) => ({ ...term, count: prompts.filter((prompt) => prompt[fields[axis]].some((item) => item.slug === term.slug)).length }));
  }
  const models = collect("model", home.data.browse.models);
  for (const model of models) {
    const projection = await client.get("/api/v1/models/{slug}", { locale, limit: 1 }, { slug: model.slug });
    if (projection.data.page.total !== model.count) throw new ApiError(409, "MODEL_COUNT_MISMATCH", "The model projection does not match the prompt catalog");
    model.description = projection.data.entity.description;
    model.officialUrl = projection.data.entity.officialUrl;
    model.seo = projection.data.entity.seo;
    model.localeVariants = projection.data.entity.localeVariants;
  }
  for (const prompt of prompts) prompt.models = prompt.models.map((ref) => models.find((model) => model.id === ref.id && model.slug === ref.slug) ?? ref);
  // The image route is defined by the L2 contract, including a valid empty category.
  try {
    const category = await client.get("/api/v1/categories/{axis}/{slug}", { locale, limit: 1 }, { axis: "content-type", slug: "image" });
    if (category.data.page.total !== prompts.filter((prompt) => prompt.kind === "image").length) throw new ApiError(409, "CATEGORY_COUNT_MISMATCH", "The image projection does not match the prompt catalog");
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 404 || prompts.some((prompt) => prompt.kind === "image")) throw error;
  }
  const featured = new Set(home.data.featured.map((item) => item.id));
  for (const prompt of prompts) if (featured.has(prompt.id)) {
    prompt.featuredOn = ["l1"];
    if (prompt.ranking) prompt.ranking.featured = true;
  }
  const creators = home.data.creators.map((creator) => ({ id: creator.id, slug: creator.slug, label: creator.name, handle: creator.name, href: filterHref(locale, "creator", creator.slug), url: "", avatarUrl: null, count: prompts.filter((prompt) => prompt.handle.replace(/^@/, "").toLowerCase() === creator.slug.toLowerCase()).length }));
  return { locale, mode: "public-api", revision, observedAt: home.data.stats.updatedAt, prompts, models, useCases: collect("useCase", home.data.browse.useCases), techniques: collect("technique", home.data.browse.techniques), styles: collect("style", home.data.browse.styles), subjects: collect("subject"), collections: [], creators, locales: locales.data };
}
