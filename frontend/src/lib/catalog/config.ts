import type { DataMode } from "./types";

export function dataMode(environment: Record<string, string | undefined> = process.env): DataMode {
  const mode = environment.FRONTEND_DATA_MODE;
  if (mode !== "visual-fixture" && mode !== "public-api") throw new Error("Set FRONTEND_DATA_MODE explicitly to visual-fixture or public-api. Production data never falls back to the visual prototype.");
  return mode;
}

/** Public metadata must use the deployed site's HTTPS origin, even during local API checks. */
export function siteOrigin(environment: Record<string, string | undefined> = process.env): string {
  const value = environment.FRONTEND_SITE_URL;
  const invalid = () => new Error("FRONTEND_SITE_URL must be the public site's HTTPS origin, without credentials, path, query, or fragment; localhost is not a canonical site origin");
  if (!value || !/^https:\/\/[^/?#\\@\s]+\/?$/.test(value)) throw invalid();
  let url: URL;
  try { url = new URL(value); } catch { throw invalid(); }
  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  if (url.protocol !== "https:" || !hostname || hostname === "localhost" || hostname.endsWith(".localhost") || hostname === "0.0.0.0" || hostname.startsWith("127.") || hostname === "[::1]" || url.username || url.password || url.pathname !== "/" || url.search || url.hash) throw invalid();
  return url.origin;
}

/** One externally selected immutable revision binds every static generation worker. */
export function publicDataConfig(environment: Record<string, string | undefined> = process.env): { url: string; expectedRevision: string } {
  const url = environment.FRONTEND_API_URL;
  const expectedRevision = environment.FRONTEND_EXPECTED_REVISION;
  if (!url) throw new Error("FRONTEND_API_URL is required in public-api mode");
  if (!expectedRevision || !/^sha256:[a-f0-9]{64}$/.test(expectedRevision)) throw new Error("FRONTEND_EXPECTED_REVISION must pin the complete sha256 content revision in public-api mode");
  siteOrigin(environment);
  return { url, expectedRevision };
}
