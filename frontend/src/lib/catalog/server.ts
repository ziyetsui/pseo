import "server-only";
import { cache } from "react";
import { loadPublicCatalog } from "./public";
import { PublicApiClient } from "../api/client";
import type { Catalog, Locale } from "./types";
import { dataMode, publicDataConfig } from "./config";
export { dataMode } from "./config";

export const loadCatalog = cache(async (locale: Locale = "zh-CN"): Promise<Catalog> => {
  const mode = dataMode();
  if (mode === "visual-fixture") {
    const { createFixtureCatalog } = await import("./fixture");
    return createFixtureCatalog(locale);
  }
  const { url, expectedRevision } = publicDataConfig();
  return loadPublicCatalog(url, locale, new PublicApiClient(url, { expectedRevision, cache: "force-cache" }));
});

export const availableLocales = cache(async (): Promise<Locale[]> => {
  if (dataMode() === "visual-fixture") return ["zh-CN"];
  const { url, expectedRevision } = publicDataConfig();
  const response = await new PublicApiClient(url, { expectedRevision, cache: "force-cache" }).get("/api/v1/locales", {}, {});
  return response.data.filter((locale) => locale.enabled).map((locale) => {
    if (locale.locale !== "zh-CN" && locale.locale !== "en") throw new Error("The public API enabled a locale not implemented by this frontend");
    return locale.locale;
  });
});

export const loadCatalogs = cache(async (): Promise<Catalog[]> => {
  const locales = await availableLocales();
  const catalogs = await Promise.all(locales.map((locale) => loadCatalog(locale)));
  if (new Set(catalogs.map((catalog) => catalog.revision)).size > 1) throw new Error("Enabled locale catalogs came from different revisions");
  return catalogs;
});
