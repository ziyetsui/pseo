type UnknownRecord = Record<string, unknown>;

export interface PreviewLoopPayload {
  find(args: Record<string, unknown>): Promise<{ docs: unknown[] }>;
  update(args: Record<string, unknown>): Promise<unknown>;
}

export interface PreviewLoopOptions {
  cmsBaseUrl: string;
  fetchImpl?: typeof fetch;
  frontendBaseUrl: string;
  payload: PreviewLoopPayload;
  previewToken: string;
  retry?: { attempts: number; delayMs: number };
}

export interface PreviewLoopEvidence {
  slug: string;
  initialRevision: string;
  editedRevision: string;
  restoredRevision: string;
}

function record(value: unknown, label: string): UnknownRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${label} is malformed`);
  }
  return value as UnknownRecord;
}

function requiredString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) throw new Error(`${label} is missing`);
  return value;
}

function relationId(value: unknown): string | number {
  if (typeof value === "string" || typeof value === "number") return value;
  const relation = record(value, "artifact relation");
  const id = relation.id;
  if (typeof id !== "string" && typeof id !== "number") throw new Error("artifact relation id is missing");
  return id;
}

function assertSafeDraftState(variant: UnknownRecord, artifact: UnknownRecord): void {
  if (variant._status !== "draft" || artifact._status !== "draft") {
    throw new Error("preview record must remain a Payload draft");
  }
  if (artifact.draftWorkflowState !== "needs_review") {
    throw new Error("preview artifact must remain needs_review");
  }
  if (variant.indexable !== false) throw new Error("preview locale must remain non-indexable");
  if (record(variant.translation, "translation").translationStatus !== "draft") {
    throw new Error("preview translation must remain draft");
  }
  if (
    record(variant.gitPublication, "locale Git state").state !== "unpublished" ||
    record(artifact.gitPublication, "artifact Git state").state !== "unpublished"
  ) {
    throw new Error("preview record must remain Git-unpublished");
  }
}

function previewUrl(baseUrl: string): URL {
  const url = new URL("/api/internal/v1/preview-catalog", baseUrl);
  url.searchParams.set("locale", "zh-CN");
  return url;
}

interface PreviewSnapshot {
  revision: string;
  prompts: UnknownRecord[];
}

async function loadPreview(options: PreviewLoopOptions): Promise<PreviewSnapshot> {
  const response = await (options.fetchImpl ?? fetch)(previewUrl(options.cmsBaseUrl), {
    cache: "no-store",
    headers: { authorization: `Bearer ${options.previewToken}` },
  });
  if (!response.ok) throw new Error(`CMS preview returned ${response.status}`);
  if (response.headers.get("cache-control") !== "no-store, private") {
    throw new Error("CMS preview is missing its private no-store policy");
  }
  if (response.headers.get("x-robots-tag") !== "noindex, nofollow, noarchive") {
    throw new Error("CMS preview is missing its noindex policy");
  }
  const body = record(await response.json(), "CMS preview response");
  const meta = record(body.meta, "CMS preview metadata");
  const data = record(body.data, "CMS preview data");
  const revision = requiredString(meta.contentRevision, "content revision");
  if (response.headers.get("x-content-revision") !== revision) {
    throw new Error("CMS preview header/body revision mismatch");
  }
  if (!Array.isArray(data.prompts)) throw new Error("CMS preview prompts are malformed");
  return { revision, prompts: data.prompts.map((item) => record(item, "CMS preview prompt")) };
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function retry<T>(
  options: PreviewLoopOptions,
  operation: () => Promise<T>,
  accept: (value: T) => boolean,
  failure: string,
): Promise<T> {
  const settings = options.retry ?? { attempts: 40, delayMs: 250 };
  let last: T | undefined;
  for (let attempt = 0; attempt < settings.attempts; attempt += 1) {
    last = await operation();
    if (accept(last)) return last;
    if (attempt + 1 < settings.attempts) await delay(settings.delayMs);
  }
  throw new Error(failure);
}

function htmlEscaped(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#x27;");
}

async function loadFrontendHtml(options: PreviewLoopOptions, slug: string): Promise<string> {
  const url = new URL(`/zh-CN/prompts/${encodeURIComponent(slug)}`, options.frontendBaseUrl);
  const response = await (options.fetchImpl ?? fetch)(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`frontend preview returned ${response.status}`);
  return await response.text();
}

function promptTitle(snapshot: PreviewSnapshot, slug: string): string | null {
  const prompt = snapshot.prompts.find((candidate) => candidate.slug === slug);
  return typeof prompt?.title === "string" ? prompt.title : null;
}

async function findOne(
  payload: PreviewLoopPayload,
  collection: string,
  where: Record<string, unknown>,
): Promise<UnknownRecord> {
  const result = await payload.find({
    collection,
    depth: 0,
    draft: true,
    limit: 2,
    overrideAccess: true,
    where,
  });
  if (result.docs.length !== 1) throw new Error(`${collection} lookup did not resolve exactly one draft`);
  return record(result.docs[0], collection);
}

/**
 * Mutates one deterministic draft through Payload Local API and restores it in
 * `finally`. No developer database reset or Git/network publication occurs.
 */
export async function runCmsPreviewLoop(options: PreviewLoopOptions): Promise<PreviewLoopEvidence> {
  const before = await loadPreview(options);
  const preferred = before.prompts.find((prompt) => prompt.slug === "country-miniature-stamp-poster");
  const selected = preferred ?? [...before.prompts].sort((left, right) =>
    requiredString(left.slug, "prompt slug").localeCompare(requiredString(right.slug, "prompt slug"), "en"),
  )[0];
  if (!selected) throw new Error("CMS preview contains no Prompt drafts");
  const slug = requiredString(selected.slug, "prompt slug");

  const variant = await findOne(options.payload, "locale-variants", {
    and: [{ locale: { equals: "zh-CN" } }, { slug: { equals: slug } }],
  });
  const artifactId = relationId(variant.artifact);
  const artifact = await findOne(options.payload, "prompt-artifacts", { id: { equals: artifactId } });
  assertSafeDraftState(variant, artifact);

  const variantId = variant.id;
  if (typeof variantId !== "string" && typeof variantId !== "number") {
    throw new Error("locale variant id is missing");
  }
  const originalTitle = requiredString(variant.title, "locale title");
  const editedTitle = `${originalTitle} · CMS Preview E2E`;
  let editedRevision = "";
  let restoredRevision = "";
  let primaryError: unknown;

  try {
    const edited = record(await options.payload.update({
      collection: "locale-variants",
      id: variantId,
      data: { title: editedTitle },
      draft: true,
      overrideAccess: true,
    }), "updated locale variant");
    assertSafeDraftState(edited, artifact);

    const changed = await retry(
      options,
      () => loadPreview(options),
      (snapshot) => snapshot.revision !== before.revision && promptTitle(snapshot, slug) === editedTitle,
      "CMS preview did not expose the edited draft or a changed revision",
    );
    editedRevision = changed.revision;

    const html = await retry(
      options,
      () => loadFrontendHtml(options, slug),
      (candidate) => candidate.includes(editedTitle) || candidate.includes(htmlEscaped(editedTitle)),
      "frontend preview did not render the edited CMS title",
    );
    if (!html.includes("data-internal-preview") || !html.includes(editedRevision.slice(7, 19))) {
      throw new Error("frontend preview is missing the CMS revision marker");
    }
    if (html.includes(options.previewToken) || html.includes(options.cmsBaseUrl)) {
      throw new Error("frontend HTML exposed private CMS preview configuration");
    }
  } catch (error: unknown) {
    primaryError = error;
    throw error;
  } finally {
    try {
      const restored = record(await options.payload.update({
        collection: "locale-variants",
        id: variantId,
        data: { title: originalTitle },
        draft: true,
        overrideAccess: true,
      }), "restored locale variant");
      assertSafeDraftState(restored, artifact);
      const restoredSnapshot = await retry(
        options,
        () => loadPreview(options),
        (snapshot) => snapshot.revision === before.revision && promptTitle(snapshot, slug) === originalTitle,
        "restored CMS draft did not return to its original revision",
      );
      restoredRevision = restoredSnapshot.revision;
    } catch (restoreError: unknown) {
      if (primaryError !== undefined) {
        throw new AggregateError([primaryError, restoreError], "preview loop failed and draft restoration failed");
      }
      throw restoreError;
    }
  }

  return {
    slug,
    initialRevision: before.revision,
    editedRevision,
    restoredRevision,
  };
}
