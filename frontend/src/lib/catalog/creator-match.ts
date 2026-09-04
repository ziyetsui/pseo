import type { Creator, Prompt } from "./types";

/** Canonical references take precedence; handles identify legacy records only. */
export function isPromptCreator(
  prompt: Pick<Prompt, "creatorRef" | "handle">,
  creator: Pick<Creator, "id" | "slug" | "handle">,
): boolean {
  if (prompt.creatorRef) {
    const { id, slug } = prompt.creatorRef;
    return Boolean((id.trim() && id === creator.id) || (slug.trim() && slug === creator.slug));
  }
  const normalize = (handle: string) => handle.trim().replace(/^@/, "").trim().toLowerCase();
  const handle = normalize(prompt.handle);
  return Boolean(handle && handle === normalize(creator.handle));
}
