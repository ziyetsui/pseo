import Ajv2020 from "ajv/dist/2020";
import schema from "./schema.generated.json";
import type { ApiPath, ApiPathParams, ApiQueries, ApiResponses, ProblemSchema } from "./generated";

const schemaId = "https://pseo.invalid/openapi";
const ajv = new Ajv2020({ strict: false, allErrors: true, validateFormats: false });
ajv.addSchema({ $id: schemaId, components: schema.components });
const validators = new Map<ApiPath, ReturnType<typeof ajv.compile>>();

export class ApiError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string, public readonly traceId: string | null = null) {
    super(message);
    this.name = "ApiError";
  }
}

export function validateResponse<P extends ApiPath>(path: P, value: unknown): ApiResponses[P] {
  let validate = validators.get(path);
  if (!validate) {
    const responseSchema = schema.paths[path].response;
    validate = ajv.compile({ $ref: `${schemaId}${responseSchema.$ref}` });
    validators.set(path, validate);
  }
  if (!validate(value)) throw new ApiError(502, "INVALID_API_RESPONSE", `The backend response does not match the generated contract for ${path}`);
  return value as ApiResponses[P];
}

export interface ApiClientOptions {
  fetch?: typeof fetch;
  timeoutMs?: number;
  expectedRevision?: string;
  cache?: RequestCache;
}

export class PublicApiClient {
  private readonly fetcher: typeof fetch;
  private readonly timeoutMs: number;
  private readonly requestCache: RequestCache;
  private readonly expectedRevision: string | null;
  private revision: string | null = null;
  constructor(private readonly baseUrl: string, options: ApiClientOptions = {}) {
    const url = new URL(baseUrl);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error("FRONTEND_API_URL must be an HTTP(S) origin without credentials, query or fragment");
    this.fetcher = options.fetch ?? fetch;
    this.timeoutMs = options.timeoutMs ?? 10_000;
    this.requestCache = options.cache ?? "no-store";
    this.expectedRevision = options.expectedRevision ?? null;
    this.revision = options.expectedRevision ?? null;
  }

  get contentRevision(): string | null { return this.revision; }

  async get<P extends ApiPath>(path: P, query: ApiQueries[P], parameters: ApiPathParams[P]): Promise<ApiResponses[P]> {
    let resolved: string = path;
    for (const [key, value] of Object.entries(parameters)) resolved = resolved.replace(`{${key}}`, encodeURIComponent(String(value)));
    if (resolved.includes("{")) throw new Error("Required API path parameter is missing");
    const url = new URL(resolved, this.baseUrl);
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) continue;
      for (const member of Array.isArray(value) ? value : [value]) url.searchParams.append(key, String(member));
    }
    // Next's persistent fetch cache includes request headers in its key. A new
    // immutable build revision must never reuse the previous revision's bytes.
    const headers: Record<string, string> = { Accept: "application/json" };
    if (this.expectedRevision) headers["X-Content-Revision"] = this.expectedRevision;
    const response = await this.fetcher(url, { method: "GET", headers, signal: AbortSignal.timeout(this.timeoutMs), cache: this.requestCache });
    if (!response.ok) {
      let problem: Partial<ProblemSchema> = {};
      if (response.headers.get("content-type")?.includes("application/problem+json")) {
        try { problem = await response.json() as Partial<ProblemSchema>; } catch { /* Retain a safe transport error. */ }
      }
      throw new ApiError(response.status, typeof problem.code === "string" ? problem.code : "API_UNAVAILABLE", typeof problem.detail === "string" ? problem.detail : "The public catalog could not be loaded", typeof problem.traceId === "string" ? problem.traceId : null);
    }
    const body = validateResponse(path, await response.json());
    const revision = response.headers.get("x-content-revision");
    const bodyRevision = "meta" in body ? body.meta.contentRevision : body.indexRevision;
    if (!revision || revision !== bodyRevision || (this.revision !== null && this.revision !== revision)) throw new ApiError(409, "REVISION_CONFLICT", "Catalog requests did not resolve to one immutable content revision");
    this.revision = revision;
    return body;
  }
}
