import { fetchCmsPreviewCatalog } from "@/lib/api/cms-preview-client";
import type { Locale } from "@/lib/i18n/config";

import {
  createDataContentRepository,
  getFixtureContentRepository,
} from "./fixture-repository";
import type { ContentRepository } from "./repository";

export type ContentSourceConfig =
  | { mode: "fixture" }
  | {
      mode: "cms-preview";
      baseUrl: string;
      token: string;
    };

export type ContentSourceEnvironment = Readonly<Record<string, string | undefined>>;

export class CmsPreviewConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CmsPreviewConfigError";
  }
}

function configured(value: string | undefined): boolean {
  return value !== undefined && value.length > 0;
}

function validateBaseUrl(value: string): void {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new CmsPreviewConfigError("PSEO_PREVIEW_API_BASE_URL must be an absolute URL");
  }
  if ((url.protocol !== "http:" && url.protocol !== "https:") || url.username !== "" || url.password !== "") {
    throw new CmsPreviewConfigError("PSEO_PREVIEW_API_BASE_URL must be an HTTP(S) origin without credentials");
  }
}

export function resolveContentSourceConfig(env: ContentSourceEnvironment): ContentSourceConfig {
  const source = env.PSEO_CONTENT_SOURCE ?? "fixture";
  if (source !== "fixture" && source !== "cms-preview") {
    throw new CmsPreviewConfigError("PSEO_CONTENT_SOURCE must be fixture or cms-preview");
  }
  if (source === "fixture") {
    if (
      env.PSEO_PREVIEW !== undefined ||
      configured(env.PSEO_PREVIEW_API_BASE_URL) ||
      configured(env.PSEO_PREVIEW_API_TOKEN)
    ) {
      throw new CmsPreviewConfigError("CMS preview variables require PSEO_CONTENT_SOURCE=cms-preview");
    }
    return { mode: "fixture" };
  }

  if (env.PSEO_PREVIEW !== "1") {
    throw new CmsPreviewConfigError("CMS preview requires PSEO_PREVIEW=1");
  }
  const baseUrl = env.PSEO_PREVIEW_API_BASE_URL;
  const token = env.PSEO_PREVIEW_API_TOKEN;
  if (!configured(baseUrl)) throw new CmsPreviewConfigError("CMS preview API base URL is required");
  if (!configured(token)) throw new CmsPreviewConfigError("CMS preview API token is required");
  validateBaseUrl(baseUrl!);
  return { mode: "cms-preview", baseUrl: baseUrl!, token: token! };
}

export type ServerContentContext =
  | {
      mode: "fixture";
      revision: string;
      repository: ContentRepository;
    }
  | {
      mode: "cms-preview";
      revision: `sha256:${string}`;
      generatedAt: string;
      repository: ContentRepository;
    };

export interface CreateServerContentContextOptions {
  env?: ContentSourceEnvironment;
  locale?: Locale;
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
}

/**
 * Server/build-only source switch. It is intentionally absent from the shared
 * `@/lib/content` barrel, which is also consumed by Client Components.
 */
export async function createServerContentContext(
  options: CreateServerContentContextOptions = {},
): Promise<ServerContentContext> {
  const config = resolveContentSourceConfig(options.env ?? process.env);
  if (config.mode === "fixture") {
    const repository = getFixtureContentRepository();
    const snapshot = await repository.getSnapshot();
    return { mode: "fixture", revision: snapshot.indexVersion, repository };
  }
  if (typeof window !== "undefined") {
    throw new CmsPreviewConfigError("CMS preview content context cannot run in the browser");
  }

  const envelope = await fetchCmsPreviewCatalog({
    baseUrl: config.baseUrl,
    token: config.token,
    locale: options.locale ?? "zh-CN",
    fetchImpl: options.fetchImpl,
    signal: options.signal,
  });
  return {
    mode: "cms-preview",
    revision: envelope.meta.contentRevision,
    generatedAt: envelope.meta.generatedAt,
    repository: createDataContentRepository(envelope.data),
  };
}

export async function getServerContentRepository(): Promise<ContentRepository> {
  return (await createServerContentContext()).repository;
}
