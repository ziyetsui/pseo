import type { ExtractedVariable } from "./types";

/**
 * Prompt variable handling. Pure functions shared by the extraction script's
 * expectations, the server-rendered detail page and the client-side variable
 * selector — so the "N places replaced" number is always counted, never
 * hard-coded.
 */

/** `[COUNTRY]`, `[BRAND_NAME]`, `[SHOT 2]`, `[A/B]`, `[CTA-TEXT]` … */
const BRACKET_TOKEN = /\[[A-Z][A-Z0-9 _/-]{1,40}\]/g;
/** `@img1`, `@image2` — the prototype's reference-image placeholders. */
const REFERENCE_TOKEN = /@(?:img|image)\d+/g;

function collect(text: string, pattern: RegExp, into: Map<string, number>): void {
  const re = new RegExp(pattern.source, pattern.flags);
  let match = re.exec(text);
  while (match !== null) {
    const token = match[0];
    into.set(token, (into.get(token) ?? 0) + 1);
    match = re.exec(text);
  }
}

/**
 * Every distinct variable token in `promptText`, in first-appearance order,
 * with how many times it occurs.
 */
export function extractVariables(promptText: string): ExtractedVariable[] {
  if (promptText.length === 0) return [];

  const counts = new Map<string, number>();
  collect(promptText, BRACKET_TOKEN, counts);
  collect(promptText, REFERENCE_TOKEN, counts);

  return [...counts.entries()]
    .map(([token, count]) => ({ token, count, at: promptText.indexOf(token) }))
    .sort((a, b) => a.at - b.at)
    .map(({ token, count }) => ({ token, count }));
}

/** Literal (non-regex) occurrence count of `token` in `text`. */
export function countToken(text: string, token: string): number {
  if (token.length === 0) return 0;
  let count = 0;
  let from = 0;
  for (;;) {
    const at = text.indexOf(token, from);
    if (at === -1) return count;
    count += 1;
    from = at + token.length;
  }
}

export interface SubstitutionResult {
  text: string;
  /** token → number of occurrences actually replaced. */
  replaced: Record<string, number>;
  /** Tokens still present in the text because no usable value was supplied. */
  unreplaced: string[];
}

/**
 * Replaces every occurrence of each supplied token. A missing, empty or
 * whitespace-only value counts as "no value": the token is left untouched and
 * reported in `unreplaced` so the UI can say what still needs filling in.
 */
export function substituteVariables(
  text: string,
  values: Readonly<Record<string, string>>,
): SubstitutionResult {
  const replaced: Record<string, number> = {};
  let out = text;

  for (const { token } of extractVariables(text)) {
    const value = values[token];
    if (value === undefined || value.trim().length === 0) continue;
    const count = countToken(out, token);
    if (count === 0) continue;
    out = out.split(token).join(value);
    replaced[token] = count;
  }

  return { text: out, replaced, unreplaced: extractVariables(out).map((v) => v.token) };
}
