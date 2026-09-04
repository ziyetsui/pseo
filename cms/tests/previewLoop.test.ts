import assert from "node:assert/strict";
import test from "node:test";

import { runCmsPreviewLoop } from "../src/integration/previewLoop.ts";

const ORIGINAL_TITLE = "Original CMS title";
const SLUG = "deterministic-preview-prompt";
const REVISION_A = `sha256:${"a".repeat(64)}`;
const REVISION_B = `sha256:${"b".repeat(64)}`;

function previewResponse(title: string): Response {
  const revision = title === ORIGINAL_TITLE ? REVISION_A : REVISION_B;
  return Response.json(
    {
      data: { prompts: [{ slug: SLUG, title }] },
      meta: { contentRevision: revision },
    },
    {
      headers: {
        "cache-control": "no-store, private",
        "x-content-revision": revision,
        "x-robots-tag": "noindex, nofollow, noarchive",
      },
    },
  );
}

function fixture() {
  const variant: Record<string, unknown> = {
    id: "variant-db-1",
    artifact: "artifact-db-1",
    locale: "zh-CN",
    slug: SLUG,
    title: ORIGINAL_TITLE,
    indexable: false,
    translation: { translationStatus: "draft" },
    gitPublication: { state: "unpublished" },
    _status: "draft",
  };
  const artifact: Record<string, unknown> = {
    id: "artifact-db-1",
    artifactKey: "prm_deterministic-preview-prompt",
    draftWorkflowState: "needs_review",
    gitPublication: { state: "unpublished" },
    _status: "draft",
  };
  const updates: string[] = [];
  const payload = {
    async find(args: Record<string, unknown>) {
      if (args.collection === "locale-variants") return { docs: [structuredClone(variant)] };
      if (args.collection === "prompt-artifacts") return { docs: [structuredClone(artifact)] };
      return { docs: [] };
    },
    async update(args: Record<string, unknown>) {
      assert.equal(args.collection, "locale-variants");
      assert.equal(args.id, variant.id);
      const title = (args.data as { title: string }).title;
      variant.title = title;
      updates.push(title);
      return structuredClone(variant);
    },
  };
  return { artifact, payload, updates, variant };
}

test("the local loop proves edit, preview headers, safe draft state, and restore", async () => {
  const { payload, updates, variant } = fixture();
  const previewToken = "private-preview-token-never-in-html";
  const fetchImpl: typeof fetch = async (input) => {
    const url = String(input);
    if (url.includes("/api/internal/v1/preview-catalog")) {
      return previewResponse(String(variant.title));
    }
    const revision = variant.title === ORIGINAL_TITLE ? REVISION_A : REVISION_B;
    return new Response(
      `<html><body><aside data-internal-preview>CMS Preview · ${revision.slice(7, 19)}</aside><h1>${String(variant.title)}</h1></body></html>`,
      { status: 200, headers: { "content-type": "text/html" } },
    );
  };

  const evidence = await runCmsPreviewLoop({
    cmsBaseUrl: "http://127.0.0.1:3001",
    fetchImpl,
    frontendBaseUrl: "http://127.0.0.1:3200",
    payload,
    previewToken,
  });

  assert.equal(evidence.slug, SLUG);
  assert.equal(evidence.initialRevision, REVISION_A);
  assert.equal(evidence.editedRevision, REVISION_B);
  assert.equal(evidence.restoredRevision, REVISION_A);
  assert.deepEqual(updates, [`${ORIGINAL_TITLE} · CMS Preview E2E`, ORIGINAL_TITLE]);
  assert.equal(variant.title, ORIGINAL_TITLE);
});

test("a failed browser assertion still restores the developer draft", async () => {
  const { payload, updates, variant } = fixture();
  const fetchImpl: typeof fetch = async (input) => {
    if (String(input).includes("/api/internal/v1/preview-catalog")) {
      return previewResponse(String(variant.title));
    }
    return new Response("<html><body>stale page</body></html>", { status: 200 });
  };

  await assert.rejects(
    runCmsPreviewLoop({
      cmsBaseUrl: "http://127.0.0.1:3001",
      fetchImpl,
      frontendBaseUrl: "http://127.0.0.1:3200",
      payload,
      previewToken: "private-preview-token-never-in-html",
      retry: { attempts: 1, delayMs: 0 },
    }),
    /edited CMS title/u,
  );

  assert.deepEqual(updates, [`${ORIGINAL_TITLE} · CMS Preview E2E`, ORIGINAL_TITLE]);
  assert.equal(variant.title, ORIGINAL_TITLE);
});
