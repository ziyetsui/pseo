/**
 * Anchor ids shared by the model page's server components and its client
 * explorer.
 *
 * They live in a plain module rather than in `ModelPromptExplorer.tsx`: that
 * file is a client component, and a value imported from a client module into a
 * server component is serialized as a client reference — the static export then
 * writes `href="#function(){throw Error(...)}"` instead of the anchor. Keeping
 * the constant in a neutral module lets both sides import the same string.
 */
export const ALL_PROMPTS_ID = "all-prompts";
