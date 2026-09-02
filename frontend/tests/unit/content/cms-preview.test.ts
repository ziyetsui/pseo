// @vitest-environment node

import { describe, expect, it, vi } from "vitest";

import {
  WIREFRAME_COLLECTIONS,
  WIREFRAME_CREATORS,
  WIREFRAME_MODELS,
  WIREFRAME_PROMPTS,
  WIREFRAME_SNAPSHOT,
  WIREFRAME_TAXONOMIES,
} from "@/data/wireframe";
import {
  CmsPreviewClientError,
  fetchCmsPreviewCatalog,
} from "@/lib/api/cms-preview-client";
import {
  validateCmsPreviewEnvelope,
  type CmsPreviewEnvelope,
} from "@/lib/api/cms-preview-schema";
import {
  CmsPreviewConfigError,
  createServerContentContext,
  resolveContentSourceConfig,
} from "@/lib/content/server";

function validEnvelope(): CmsPreviewEnvelope {
  return {
    data: {
      prompts: structuredClone(WIREFRAME_PROMPTS),
      taxonomies: structuredClone(WIREFRAME_TAXONOMIES),
      creators: structuredClone(WIREFRAME_CREATORS),
      models: structuredClone(WIREFRAME_MODELS),
      collections: structuredClone(WIREFRAME_COLLECTIONS),
      snapshot: structuredClone(WIREFRAME_SNAPSHOT),
    },
    meta: {
      contentRevision: `sha256:${"a".repeat(64)}`,
      generatedAt: "2026-09-02T08:00:00.000Z",
      mode: "cms-preview",
    },
  };
}

function previewEnv(overrides: Record<string, string | undefined> = {}): Record<string, string | undefined> {
  return {
    PSEO_CONTENT_SOURCE: "cms-preview",
    PSEO_PREVIEW: "1",
    PSEO_PREVIEW_API_BASE_URL: "http://127.0.0.1:3001",
    PSEO_PREVIEW_API_TOKEN: "test-preview-token-that-is-not-public",
    ...overrides,
  };
}

describe("CMS preview configuration", () => {
  it("keeps the default content source on the checked-in fixture", () => {
    expect(resolveContentSourceConfig({})).toEqual({ mode: "fixture" });
  });

  it.each([
    ["missing preview flag", { PSEO_PREVIEW: undefined }],
    ["relative API URL", { PSEO_PREVIEW_API_BASE_URL: "/api" }],
    ["empty token", { PSEO_PREVIEW_API_TOKEN: "" }],
    ["unknown source", { PSEO_CONTENT_SOURCE: "payload" }],
  ])("rejects %s instead of silently using fixture", (_name, overrides) => {
    expect(() => resolveContentSourceConfig(previewEnv(overrides))).toThrow(CmsPreviewConfigError);
  });

  it("rejects preview variables when cms-preview mode was not explicitly selected", () => {
    expect(() =>
      resolveContentSourceConfig({
        PSEO_PREVIEW: "1",
        PSEO_PREVIEW_API_BASE_URL: "http://127.0.0.1:3001",
        PSEO_PREVIEW_API_TOKEN: "secret",
      }),
    ).toThrow(CmsPreviewConfigError);
  });
});

describe("CMS preview envelope validation", () => {
  it("accepts the complete closed contract", () => {
    expect(validateCmsPreviewEnvelope(validEnvelope()).meta.mode).toBe("cms-preview");
  });

  it.each([
    ["unknown top-level field", (value: Record<string, unknown>) => Object.assign(value, { secret: "leak" })],
    ["unknown nested field", (value: Record<string, unknown>) => Object.assign(value.meta as object, { extra: true })],
    ["unsupported mode", (value: Record<string, unknown>) => Object.assign(value.meta as object, { mode: "fixture" })],
    ["invalid revision", (value: Record<string, unknown>) => Object.assign(value.meta as object, { contentRevision: "sha256:no" })],
    ["malformed prompt", (value: Record<string, unknown>) => Object.assign((value.data as { prompts: object[] }).prompts[0]!, { title: 42 })],
  ])("rejects an %s", (_name, mutate) => {
    const value = validEnvelope() as unknown as Record<string, unknown>;
    mutate(value);
    expect(() => validateCmsPreviewEnvelope(value)).toThrow(CmsPreviewClientError);
  });
});

describe("CMS preview HTTP client", () => {
  it("sends the token only as authorization, disables caching, and carries a request id", async () => {
    let request: { input: string; init?: RequestInit } | undefined;
    const fetchImpl: typeof fetch = vi.fn(async (input, init) => {
      request = { input: String(input), init };
      return new Response(JSON.stringify(validEnvelope()), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });

    await fetchCmsPreviewCatalog({
      baseUrl: "http://127.0.0.1:3001",
      token: "private-token",
      locale: "zh-CN",
      fetchImpl,
      requestId: () => "request-123",
    });

    expect(request?.input).toBe("http://127.0.0.1:3001/api/internal/v1/preview-catalog?locale=zh-CN");
    expect(new Headers(request?.init?.headers).get("authorization")).toBe("Bearer private-token");
    expect(new Headers(request?.init?.headers).get("x-request-id")).toBe("request-123");
    expect(request?.init?.cache).toBe("no-store");
    expect(request?.input).not.toContain("private-token");
  });

  it("normalizes auth, timeout, and unavailable failures into typed errors without leaking the token", async () => {
    const authFetch: typeof fetch = vi.fn(async () => new Response(null, { status: 401 }));
    await expect(
      fetchCmsPreviewCatalog({
        baseUrl: "http://127.0.0.1:3001",
        token: "do-not-leak",
        locale: "zh-CN",
        fetchImpl: authFetch,
      }),
    ).rejects.toMatchObject({ code: "unauthorized" });

    const unavailableFetch: typeof fetch = vi.fn(async () => new Response(null, { status: 503 }));
    await expect(
      fetchCmsPreviewCatalog({
        baseUrl: "http://127.0.0.1:3001",
        token: "do-not-leak",
        locale: "zh-CN",
        fetchImpl: unavailableFetch,
      }),
    ).rejects.toMatchObject({ code: "unavailable" });

    const timeoutFetch: typeof fetch = vi.fn(
      async (_input, init) =>
        await new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
        }),
    );
    const timeout = fetchCmsPreviewCatalog({
      baseUrl: "http://127.0.0.1:3001",
      token: "do-not-leak",
      locale: "zh-CN",
      fetchImpl: timeoutFetch,
      timeoutMs: 5,
    });
    await expect(timeout).rejects.toMatchObject({ code: "timeout" });
    await expect(timeout).rejects.not.toThrow(/do-not-leak/);
  });

  it("rejects unsupported locales before making a request", async () => {
    const fetchImpl = vi.fn<typeof fetch>();
    await expect(
      fetchCmsPreviewCatalog({
        baseUrl: "http://127.0.0.1:3001",
        token: "private-token",
        locale: "en" as "zh-CN",
        fetchImpl,
      }),
    ).rejects.toMatchObject({ code: "invalid-config" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe("server content context", () => {
  it("uses the unchanged fixture repository by default", async () => {
    const context = await createServerContentContext({ env: {} });
    expect(context.mode).toBe("fixture");
    expect(context.revision).toBe("wireframe-flow-proto");
    expect((await context.repository.listPrompts("zh-CN")).items).toHaveLength(35);
  });

  it("binds one fetched envelope and revision to the preview repository", async () => {
    const envelope = validEnvelope();
    envelope.data.prompts[0]!.title = "CMS EDITED TITLE";
    envelope.data.prompts[0]!.promptText = `${envelope.data.prompts[0]!.promptText}\nCMS FULL COPY SENTINEL`;
    const fetchImpl: typeof fetch = vi.fn(async () =>
      new Response(JSON.stringify(envelope), { status: 200, headers: { "content-type": "application/json" } }),
    );

    const context = await createServerContentContext({ env: previewEnv(), fetchImpl });
    const prompt = await context.repository.getPromptBySlug("zh-CN", envelope.data.prompts[0]!.slug);
    const again = await context.repository.listPrompts("zh-CN");

    expect(context).toMatchObject({ mode: "cms-preview", revision: envelope.meta.contentRevision });
    expect(prompt?.title).toBe("CMS EDITED TITLE");
    expect(prompt?.promptText.endsWith("CMS FULL COPY SENTINEL")).toBe(true);
    expect(again.items[0]?.title).toBe("CMS EDITED TITLE");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("fails closed when CMS preview is unavailable", async () => {
    const fetchImpl: typeof fetch = vi.fn(async () => new Response(null, { status: 503 }));
    await expect(createServerContentContext({ env: previewEnv(), fetchImpl })).rejects.toMatchObject({
      code: "unavailable",
    });
  });

  it("delegates blog methods to the unchanged fixture data", async () => {
    const fetchImpl: typeof fetch = vi.fn(async () =>
      new Response(JSON.stringify(validEnvelope()), { status: 200, headers: { "content-type": "application/json" } }),
    );
    const context = await createServerContentContext({ env: previewEnv(), fetchImpl });
    expect(await context.repository.listArticles("zh-CN")).toHaveLength(3);
  });
});
