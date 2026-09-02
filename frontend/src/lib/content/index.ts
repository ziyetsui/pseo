import { getFixtureContentRepository } from "./fixture-repository";
import type { ContentRepository } from "./repository";

export type { ContentRepository } from "./repository";
export * from "./types";
export { applyPromptQuery, isEmptyPromptQuery, parsePromptQuery, resolveWindowStart, serializePromptQuery } from "./query";
export { countToken, extractVariables, substituteVariables } from "./variables";

/**
 * The one place a data source is chosen. Pages call `getContentRepository()`
 * and never import a concrete implementation — swapping the wireframe fixture
 * for an API-backed repository is a change to this function alone.
 */
export function getContentRepository(): ContentRepository {
  return getFixtureContentRepository();
}
