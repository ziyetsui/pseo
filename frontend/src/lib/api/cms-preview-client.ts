import { isLocale, type Locale } from "@/lib/i18n/config";

import { CmsPreviewClientError } from "./cms-preview-errors";
import { validateCmsPreviewEnvelope, type CmsPreviewEnvelope } from "./cms-preview-schema";

export { CmsPreviewClientError } from "./cms-preview-errors";

export interface FetchCmsPreviewCatalogOptions {
  baseUrl: string;
  token: string;
  locale: Locale;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  signal?: AbortSignal;
  requestId?: () => string;
}

function endpointUrl(baseUrl: string, locale: Locale): URL {
  let base: URL;
  try {
    base = new URL(baseUrl);
  } catch {
    throw new CmsPreviewClientError("invalid-config", "CMS preview API base URL must be absolute");
  }
  if ((base.protocol !== "http:" && base.protocol !== "https:") || base.username !== "" || base.password !== "") {
    throw new CmsPreviewClientError("invalid-config", "CMS preview API base URL must be an HTTP(S) origin without credentials");
  }
  const normalized = new URL(base.origin);
  normalized.pathname = "/api/internal/v1/preview-catalog";
  normalized.searchParams.set("locale", locale);
  return normalized;
}

function generatedRequestId(): string {
  return globalThis.crypto.randomUUID();
}

export async function fetchCmsPreviewCatalog(
  options: FetchCmsPreviewCatalogOptions,
): Promise<CmsPreviewEnvelope> {
  if (typeof window !== "undefined") {
    throw new CmsPreviewClientError("invalid-config", "CMS preview client is server/build-only");
  }
  if (!isLocale(options.locale)) {
    throw new CmsPreviewClientError("invalid-config", "CMS preview locale is unsupported");
  }
  if (options.token.length === 0) {
    throw new CmsPreviewClientError("invalid-config", "CMS preview token is required");
  }

  const url = endpointUrl(options.baseUrl, options.locale);
  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? 5_000;
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new CmsPreviewClientError("invalid-config", "CMS preview timeout must be positive");
  }
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const abortFromCaller = (): void => controller.abort();
  options.signal?.addEventListener("abort", abortFromCaller, { once: true });
  if (options.signal?.aborted) controller.abort();

  try {
    const response = await (options.fetchImpl ?? fetch)(url, {
      method: "GET",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${options.token}`,
        "x-request-id": (options.requestId ?? generatedRequestId)(),
      },
      cache: "no-store",
      signal: controller.signal,
    });
    if (response.status === 401) {
      throw new CmsPreviewClientError("unauthorized", "CMS preview authorization failed", 401);
    }
    if (!response.ok) {
      throw new CmsPreviewClientError("unavailable", `CMS preview request failed with status ${response.status}`, response.status);
    }
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new CmsPreviewClientError("invalid-response", "CMS preview response was not valid JSON", response.status);
    }
    return validateCmsPreviewEnvelope(body);
  } catch (error) {
    if (error instanceof CmsPreviewClientError) throw error;
    if (timedOut) {
      throw new CmsPreviewClientError("timeout", "CMS preview request timed out");
    }
    if (controller.signal.aborted) {
      throw new CmsPreviewClientError("unavailable", "CMS preview request was cancelled");
    }
    throw new CmsPreviewClientError("unavailable", "CMS preview service is unavailable");
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", abortFromCaller);
  }
}
