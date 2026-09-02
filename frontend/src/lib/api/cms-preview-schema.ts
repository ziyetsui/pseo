import type {
  Collection,
  Creator,
  Snapshot,
  WireframeModelRecord,
  WireframePromptRecord,
  WireframeTaxonomyRecord,
} from "@/lib/content/types";

import { CmsPreviewClientError } from "./cms-preview-errors";

export interface CmsPreviewEnvelope {
  data: {
    prompts: readonly WireframePromptRecord[];
    taxonomies: readonly WireframeTaxonomyRecord[];
    creators: readonly Creator[];
    models: readonly WireframeModelRecord[];
    collections: readonly Collection[];
    snapshot: Snapshot;
  };
  meta: {
    contentRevision: `sha256:${string}`;
    generatedAt: string;
    mode: "cms-preview";
  };
}

type JsonObject = Record<string, unknown>;

function invalid(path: string): never {
  throw new CmsPreviewClientError("invalid-response", `CMS preview response is invalid at ${path}`);
}

function objectAt(value: unknown, path: string, keys: readonly string[]): JsonObject {
  if (typeof value !== "object" || value === null || Array.isArray(value)) invalid(path);
  const record = value as JsonObject;
  const actual = Object.keys(record).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    invalid(path);
  }
  return record;
}

function arrayAt(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) invalid(path);
  return value;
}

function stringAt(value: unknown, path: string): string {
  if (typeof value !== "string") invalid(path);
  return value;
}

function nonemptyStringAt(value: unknown, path: string): string {
  const result = stringAt(value, path);
  if (result.length === 0) invalid(path);
  return result;
}

function numberAt(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) invalid(path);
  return value;
}

function nullableNumberAt(value: unknown, path: string): void {
  if (value !== null) numberAt(value, path);
}

function nullableStringAt(value: unknown, path: string): void {
  if (value !== null) stringAt(value, path);
}

function booleanAt(value: unknown, path: string): boolean {
  if (typeof value !== "boolean") invalid(path);
  return value;
}

function literalAt<T extends string>(value: unknown, path: string, choices: readonly T[]): T {
  if (typeof value !== "string" || !(choices as readonly string[]).includes(value)) invalid(path);
  return value as T;
}

function stringArrayAt(value: unknown, path: string): void {
  arrayAt(value, path).forEach((item, index) => stringAt(item, `${path}[${index}]`));
}

function validateMedia(value: unknown, path: string): void {
  const item = objectAt(value, path, [
    "id", "kind", "src", "srcSet", "alt", "label", "durationSeconds", "index", "total",
  ]);
  nonemptyStringAt(item.id, `${path}.id`);
  literalAt(item.kind, `${path}.kind`, ["image", "video"]);
  stringAt(item.src, `${path}.src`);
  // Optional in meaning, required in shape: a preview envelope that knows no
  // size ladder must say `null`, not omit the field.
  nullableStringAt(item.srcSet, `${path}.srcSet`);
  stringAt(item.alt, `${path}.alt`);
  nullableStringAt(item.label, `${path}.label`);
  nullableNumberAt(item.durationSeconds, `${path}.durationSeconds`);
  numberAt(item.index, `${path}.index`);
  numberAt(item.total, `${path}.total`);
}

function validateVariable(value: unknown, path: string): void {
  const item = objectAt(value, path, ["token", "label", "options", "defaultValue", "note"]);
  stringAt(item.token, `${path}.token`);
  stringAt(item.label, `${path}.label`);
  stringArrayAt(item.options, `${path}.options`);
  stringAt(item.defaultValue, `${path}.defaultValue`);
  nullableStringAt(item.note, `${path}.note`);
}

function validateStep(value: unknown, path: string): void {
  const item = objectAt(value, path, ["order", "title", "body"]);
  numberAt(item.order, `${path}.order`);
  stringAt(item.title, `${path}.title`);
  stringAt(item.body, `${path}.body`);
}

function validateParameter(value: unknown, path: string): void {
  const item = objectAt(value, path, ["label", "value"]);
  stringAt(item.label, `${path}.label`);
  stringAt(item.value, `${path}.value`);
}

function validateVariation(value: unknown, path: string): void {
  const item = objectAt(value, path, ["title", "variableValue", "media", "status"]);
  stringAt(item.title, `${path}.title`);
  stringAt(item.variableValue, `${path}.variableValue`);
  if (item.media !== null) validateMedia(item.media, `${path}.media`);
  literalAt(item.status, `${path}.status`, ["pending"]);
}

function validatePrompt(value: unknown, path: string): void {
  const item = objectAt(value, path, [
    "id", "slug", "slugSource", "title", "summary", "promptText", "contentType",
    "contentTypeReason", "modelSlugs", "useCaseSlugs", "techniqueSlugs", "styleSlugs",
    "subjectSlugs", "creatorId", "handle", "sourceUrl", "publishedAt", "likes", "bookmarks",
    "views", "reposts", "replies", "quotes", "metricsRounded", "valueScore", "highValue",
    "media", "appearsOn", "featuredOn", "variables", "steps", "requiredInputs",
    "optionalInputs", "parameters", "variations",
  ]);
  nonemptyStringAt(item.id, `${path}.id`);
  nonemptyStringAt(item.slug, `${path}.slug`);
  literalAt(item.slugSource, `${path}.slugSource`, ["wireframe-slug", "derived", "curated"]);
  stringAt(item.title, `${path}.title`);
  nullableStringAt(item.summary, `${path}.summary`);
  stringAt(item.promptText, `${path}.promptText`);
  literalAt(item.contentType, `${path}.contentType`, ["image", "video", "unknown"]);
  stringAt(item.contentTypeReason, `${path}.contentTypeReason`);
  for (const key of ["modelSlugs", "useCaseSlugs", "techniqueSlugs", "styleSlugs", "subjectSlugs"] as const) {
    stringArrayAt(item[key], `${path}.${key}`);
  }
  nonemptyStringAt(item.creatorId, `${path}.creatorId`);
  stringAt(item.handle, `${path}.handle`);
  stringAt(item.sourceUrl, `${path}.sourceUrl`);
  nullableStringAt(item.publishedAt, `${path}.publishedAt`);
  for (const key of ["likes", "bookmarks", "views", "reposts", "replies", "quotes", "valueScore"] as const) {
    nullableNumberAt(item[key], `${path}.${key}`);
  }
  booleanAt(item.metricsRounded, `${path}.metricsRounded`);
  booleanAt(item.highValue, `${path}.highValue`);
  arrayAt(item.media, `${path}.media`).forEach((entry, index) => validateMedia(entry, `${path}.media[${index}]`));
  arrayAt(item.appearsOn, `${path}.appearsOn`).forEach((entry, index) =>
    literalAt(entry, `${path}.appearsOn[${index}]`, ["l1", "l2", "l3", "l4"]),
  );
  arrayAt(item.featuredOn, `${path}.featuredOn`).forEach((entry, index) =>
    literalAt(entry, `${path}.featuredOn[${index}]`, ["l1", "l2"]),
  );
  arrayAt(item.variables, `${path}.variables`).forEach((entry, index) => validateVariable(entry, `${path}.variables[${index}]`));
  arrayAt(item.steps, `${path}.steps`).forEach((entry, index) => validateStep(entry, `${path}.steps[${index}]`));
  stringArrayAt(item.requiredInputs, `${path}.requiredInputs`);
  stringArrayAt(item.optionalInputs, `${path}.optionalInputs`);
  arrayAt(item.parameters, `${path}.parameters`).forEach((entry, index) => validateParameter(entry, `${path}.parameters[${index}]`));
  arrayAt(item.variations, `${path}.variations`).forEach((entry, index) => validateVariation(entry, `${path}.variations[${index}]`));
}

function validateTaxonomy(value: unknown, path: string): void {
  const item = objectAt(value, path, [
    "id", "axis", "slug", "label", "labelZh", "aliases", "wireframeDeclaredCount", "appearsOn",
  ]);
  nonemptyStringAt(item.id, `${path}.id`);
  literalAt(item.axis, `${path}.axis`, ["model", "useCase", "technique", "style", "subject", "contentType"]);
  nonemptyStringAt(item.slug, `${path}.slug`);
  stringAt(item.label, `${path}.label`);
  nullableStringAt(item.labelZh, `${path}.labelZh`);
  stringArrayAt(item.aliases, `${path}.aliases`);
  nullableNumberAt(item.wireframeDeclaredCount, `${path}.wireframeDeclaredCount`);
  arrayAt(item.appearsOn, `${path}.appearsOn`).forEach((entry, index) =>
    literalAt(entry, `${path}.appearsOn[${index}]`, ["l1", "l2", "l3", "l4"]),
  );
}

function validateCreator(value: unknown, path: string): void {
  const item = objectAt(value, path, [
    "id", "handle", "url", "avatarUrl", "followers", "wireframeDeclaredPromptCount",
    "wireframeDeclaredLikes", "wireframeDeclaredBookmarks",
  ]);
  nonemptyStringAt(item.id, `${path}.id`);
  stringAt(item.handle, `${path}.handle`);
  stringAt(item.url, `${path}.url`);
  nullableStringAt(item.avatarUrl, `${path}.avatarUrl`);
  for (const key of ["followers", "wireframeDeclaredPromptCount", "wireframeDeclaredLikes", "wireframeDeclaredBookmarks"] as const) {
    nullableNumberAt(item[key], `${path}.${key}`);
  }
}

function validateModel(value: unknown, path: string): void {
  const item = objectAt(value, path, [
    "slug", "label", "wireframeHasPage", "wireframeDeclaredPromptCount", "wireframeDeclaredHotCount",
    "declaredRelatedModelSlugs", "declaredRelatedUseCaseSlugs",
  ]);
  nonemptyStringAt(item.slug, `${path}.slug`);
  stringAt(item.label, `${path}.label`);
  booleanAt(item.wireframeHasPage, `${path}.wireframeHasPage`);
  nullableNumberAt(item.wireframeDeclaredPromptCount, `${path}.wireframeDeclaredPromptCount`);
  nullableNumberAt(item.wireframeDeclaredHotCount, `${path}.wireframeDeclaredHotCount`);
  stringArrayAt(item.declaredRelatedModelSlugs, `${path}.declaredRelatedModelSlugs`);
  stringArrayAt(item.declaredRelatedUseCaseSlugs, `${path}.declaredRelatedUseCaseSlugs`);
}

function validateCollection(value: unknown, path: string): void {
  const item = objectAt(value, path, ["id", "slug", "title", "subtitle", "rule"]);
  nonemptyStringAt(item.id, `${path}.id`);
  nonemptyStringAt(item.slug, `${path}.slug`);
  stringAt(item.title, `${path}.title`);
  stringAt(item.subtitle, `${path}.subtitle`);
  if (typeof item.rule !== "object" || item.rule === null || Array.isArray(item.rule)) invalid(`${path}.rule`);
  const type = (item.rule as JsonObject).type;
  if (type === "regex") {
    const rule = objectAt(item.rule, `${path}.rule`, ["type", "pattern"]);
    stringAt(rule.pattern, `${path}.rule.pattern`);
    return;
  }
  if (type === "axis-all") {
    const rule = objectAt(item.rule, `${path}.rule`, ["type", "conditions"]);
    arrayAt(rule.conditions, `${path}.rule.conditions`).forEach((entry, index) => {
      const condition = objectAt(entry, `${path}.rule.conditions[${index}]`, ["axis", "value"]);
      literalAt(condition.axis, `${path}.rule.conditions[${index}].axis`, ["model", "useCase", "technique", "style", "subject", "contentType"]);
      stringAt(condition.value, `${path}.rule.conditions[${index}].value`);
    });
    return;
  }
  invalid(`${path}.rule.type`);
}

function validateSnapshot(value: unknown): void {
  const item = objectAt(value, "data.snapshot", ["observedAt", "indexVersion", "source"]);
  literalAt(item.observedAt, "data.snapshot.observedAt", ["2026-08-20"]);
  literalAt(item.indexVersion, "data.snapshot.indexVersion", ["wireframe-flow-proto"]);
  literalAt(item.source, "data.snapshot.source", ["docs/wireframes/flow-proto.html"]);
}

export function validateCmsPreviewEnvelope(value: unknown): CmsPreviewEnvelope {
  const envelope = objectAt(value, "envelope", ["data", "meta"]);
  const data = objectAt(envelope.data, "data", ["prompts", "taxonomies", "creators", "models", "collections", "snapshot"]);
  const meta = objectAt(envelope.meta, "meta", ["contentRevision", "generatedAt", "mode"]);

  arrayAt(data.prompts, "data.prompts").forEach((entry, index) => validatePrompt(entry, `data.prompts[${index}]`));
  arrayAt(data.taxonomies, "data.taxonomies").forEach((entry, index) => validateTaxonomy(entry, `data.taxonomies[${index}]`));
  arrayAt(data.creators, "data.creators").forEach((entry, index) => validateCreator(entry, `data.creators[${index}]`));
  arrayAt(data.models, "data.models").forEach((entry, index) => validateModel(entry, `data.models[${index}]`));
  arrayAt(data.collections, "data.collections").forEach((entry, index) => validateCollection(entry, `data.collections[${index}]`));
  validateSnapshot(data.snapshot);

  const revision = stringAt(meta.contentRevision, "meta.contentRevision");
  if (!/^sha256:[0-9a-f]{64}$/.test(revision)) invalid("meta.contentRevision");
  const generatedAt = stringAt(meta.generatedAt, "meta.generatedAt");
  if (Number.isNaN(Date.parse(generatedAt))) invalid("meta.generatedAt");
  literalAt(meta.mode, "meta.mode", ["cms-preview"]);

  return value as CmsPreviewEnvelope;
}
