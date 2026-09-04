import { createHash } from "node:crypto";
import prototype from "../../data/prototype.json";
import { WIREFRAME_COLLECTIONS } from "../../data/wireframe/collections";
import { WIREFRAME_CREATORS } from "../../data/wireframe/creators";
import { WIREFRAME_MODELS } from "../../data/wireframe/models";
import { WIREFRAME_PROMPTS } from "../../data/wireframe/prompts";
import { promptTemplateEdits } from "../../data/wireframe/prompt-templates";
import { WIREFRAME_TAXONOMIES } from "../../data/wireframe/taxonomies";
import { filterHref, modelHref, promptHref } from "./query";
import type { Axis, Catalog, Locale, Prompt, Ref } from "./types";
import { createEditableTemplate } from "./template";

const fields = { model: "models", useCase: "useCases", technique: "techniques", style: "styles", subject: "subjects" } as const;

/** Design review data only. Deliberately loaded dynamically by the mode boundary. */
export function createFixtureCatalog(locale: Locale): Catalog {
  if (locale !== "zh-CN") throw new Error("The supplied visual prototype only contains zh-CN routes");
  const revision = `sha256:${createHash("sha256").update(JSON.stringify({ prototype, promptTemplateEdits })).digest("hex")}`;
  const labelLookup = new Map(WIREFRAME_TAXONOMIES.flatMap((term) => [term.label, term.labelZh, ...term.aliases].filter((label): label is string => Boolean(label)).map((label) => [`${term.axis}:${label.toLowerCase()}`, term] as const)));
  function ref(axis: Axis, label: string): Ref {
    const term = labelLookup.get(`${axis}:${label.toLowerCase()}`);
    const slug = term?.slug ?? label.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/gu, "-").replace(/^-|-$/gu, "");
    return { id: term?.id ?? `${axis}:${slug}`, slug, label, href: axis === "model" ? modelHref(locale, slug) : filterHref(locale, axis, slug), count: 0 };
  }
  const prompts: Prompt[] = prototype.prompts.map((record) => {
    const original = WIREFRAME_PROMPTS.find((item) => item.id === record.id);
    if (!original) throw new Error(`Visual fixture ${record.id} is missing its source evidence`);
    const edits = promptTemplateEdits[record.id];
    if (!edits) throw new Error(`Visual fixture ${record.id} needs a reviewed editable template`);
    const template = createEditableTemplate(record.prompt, edits, original.variables);
    const media = record.imgs.map((src, index) => ({ id: `${record.id}-${index + 1}`, kind: "image" as const, src, alt: record.title, width: null, height: null, poster: null, label: record.kind === "video" ? `${record.dur ?? ""}s` : null }));
    return {
      id: record.id, slug: record.slug, href: promptHref(locale, record.slug), locale,
      title: record.title, summary: original.summary ?? "", prompt: template.prompt, editableTemplate: true, language: "en",
      kind: record.kind === "image" || record.kind === "video" ? record.kind : "other",
      models: record.models.map((label) => ref("model", label)), useCases: record.uses.map((label) => ref("useCase", label)),
      techniques: record.techs.map((label) => ref("technique", label)), styles: record.styles.map((label) => ref("style", label)), subjects: record.subjects.map((label) => ref("subject", label)),
      handle: record.handle, img: record.img, media, likes: record.likes, saves: record.saves, views: original.views,
      creatorRef: { id: original.creatorId, slug: original.creatorId, label: record.handle },
      highValue: record.hv, score: record.score, publishedAt: original.publishedAt,
      variables: template.variables, steps: [...original.steps],
      requiredInputs: [...original.requiredInputs], optionalInputs: [...original.optionalInputs], parameters: [...original.parameters],
      source: { url: original.sourceUrl, platform: "x", observedAt: "2026-08-20" }, evidence: [], actions: { canCopy: true, tryUrl: null },
      localeVariants: [{ locale, slug: record.slug, href: promptHref(locale, record.slug) }],
      seo: { title: record.title, description: original.summary ?? record.title, canonicalUrl: null, robots: "noindex,nofollow", hreflang: {} },
      revision, appearsOn: [...original.appearsOn], featuredOn: [...original.featuredOn],
    };
  });
  function allRefs(axis: Axis): Ref[] {
    const collected = new Map<string, Ref>();
    if (axis === "model") for (const model of WIREFRAME_MODELS) collected.set(model.slug, ref(axis, model.label));
    // Registered categories remain addressable; the footer separately hides destinations without prompts.
    if (axis === "useCase" || axis === "style" || axis === "subject") for (const term of WIREFRAME_TAXONOMIES.filter(term => term.axis === axis)) collected.set(term.slug, ref(axis, term.label));
    for (const prompt of prompts) for (const term of prompt[fields[axis]]) collected.set(term.slug, term);
    return [...collected.values()].map((term) => ({ ...term, count: prompts.filter((prompt) => prompt[fields[axis]].some((item) => item.slug === term.slug)).length }));
  }
  const models = allRefs("model"), useCases = allRefs("useCase"), techniques = allRefs("technique"), styles = allRefs("style"), subjects = allRefs("subject");
  const references = { model: models, useCase: useCases, technique: techniques, style: styles, subject: subjects };
  for (const prompt of prompts) for (const axis of Object.keys(fields) as Axis[]) prompt[fields[axis]] = prompt[fields[axis]].map((term) => references[axis].find((item) => item.slug === term.slug) ?? term);
  const collections = WIREFRAME_COLLECTIONS.map((collection) => {
    const promptIds = prompts.filter((prompt) => {
      if (collection.rule.type === "regex") return new RegExp(collection.rule.pattern, "iu").test(prompt.prompt);
      return collection.rule.conditions.every(({ axis, value }) => axis === "contentType" ? prompt.kind === value : axis in fields && prompt[fields[axis as Axis]].some((term) => term.slug === value));
    }).map((prompt) => prompt.id);
    return { id: collection.id, slug: collection.slug, label: collection.title, subtitle: collection.subtitle, href: filterHref(locale, "collection", collection.slug), count: promptIds.length, promptIds };
  });
  const avatars: Record<string, string> = prototype.avatars;
  const creators = WIREFRAME_CREATORS.map((creator) => ({
    id: creator.id, slug: creator.id, label: creator.handle, handle: creator.handle,
    href: filterHref(locale, "creator", creator.id), url: creator.url,
    avatarUrl: avatars[creator.handle] ?? avatars[creator.handle.replace(/^@/, "")] ?? creator.avatarUrl,
    count: prompts.filter((prompt) => prompt.handle.toLowerCase() === creator.handle.toLowerCase()).length,
  }));
  return { locale, mode: "visual-fixture", revision, observedAt: "2026-08-20", prompts, models, useCases, techniques, styles, subjects, collections, creators, locales: [{ locale: "zh-CN", displayName: "简体中文", enabled: true, href: "/zh-CN/prompts" }, { locale: "en", displayName: "English", enabled: false, href: "/en/prompts" }] };
}
