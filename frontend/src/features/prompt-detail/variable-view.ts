// Imported from the module, not the `@/lib/content` barrel: this file is pulled
// into the client bundle by `VariableSelector`, and the barrel also exports the
// fixture repository, which reaches the whole generated data set.
import { countToken, extractVariables } from "@/lib/content/variables";

/**
 * View-layer helpers for prompt variables.
 *
 * Every "N 处" the detail page renders is counted from the prompt text here —
 * the prototype's literal "7 处" never reaches a rendering path (global
 * constraint 9). Shared by the server-rendered page and the client selector so
 * the number in the label, in the steps and in the live region can never drift.
 */

export interface PromptTextSegment {
  text: string;
  /** True when this segment is a variable token and should be `<mark>`ed. */
  token: boolean;
}

/**
 * Splits `text` into literal / token segments. Longest match wins at the same
 * position so `[SHOT 2]` is never cut short by a shorter overlapping token.
 */
export function splitPromptText(
  text: string,
  tokens: readonly string[],
): readonly PromptTextSegment[] {
  const segments: PromptTextSegment[] = [];
  const usable = tokens.filter((token) => token.length > 0);
  let cursor = 0;

  while (cursor < text.length) {
    let bestAt = -1;
    let bestToken = "";
    for (const token of usable) {
      const at = text.indexOf(token, cursor);
      if (at === -1) continue;
      if (bestAt === -1 || at < bestAt || (at === bestAt && token.length > bestToken.length)) {
        bestAt = at;
        bestToken = token;
      }
    }

    if (bestAt === -1) {
      segments.push({ text: text.slice(cursor), token: false });
      break;
    }
    if (bestAt > cursor) segments.push({ text: text.slice(cursor, bestAt), token: false });
    segments.push({ text: bestToken, token: true });
    cursor = bestAt + bestToken.length;
  }

  return segments.filter((segment) => segment.text.length > 0);
}

/** Distinct variable tokens in the prompt, in first-appearance order. */
export function promptTokens(promptText: string): readonly string[] {
  return extractVariables(promptText).map((variable) => variable.token);
}

/** `@img1`, `@image2` — reference-image placeholders. Unlike `[COUNTRY]`-style
 * tokens, there is no text value to type in: the reader has to attach a
 * photo, so these are never counted as substitutable "N 处变量" and get their
 * own "需附上参考图" wording instead of "复制后请自行替换". */
const REFERENCE_TOKEN_RE = /^@(?:img|image)\d+$/;

export function isReferenceToken(token: string): boolean {
  return REFERENCE_TOKEN_RE.test(token);
}

export interface TokenKinds {
  /** `[BRACKET]`-style tokens: a value can be typed in and substituted. */
  substitutable: readonly string[];
  /** `@imgN` placeholders: need an attached reference photo, not typed text. */
  reference: readonly string[];
}

/** Splits the distinct tokens returned by `promptTokens` by kind. */
export function splitTokenKinds(tokens: readonly string[]): TokenKinds {
  const substitutable: string[] = [];
  const reference: string[] = [];
  for (const token of tokens) {
    (isReferenceToken(token) ? reference : substitutable).push(token);
  }
  return { substitutable, reference };
}

/** How many substitutable-token occurrences the prompt contains in total.
 * Reference-image tokens are excluded — they are never "replaced". */
export function totalTokenOccurrences(promptText: string): number {
  return extractVariables(promptText)
    .filter((variable) => !isReferenceToken(variable.token))
    .reduce((sum, variable) => sum + variable.count, 0);
}

/**
 * `英文 · 7 处变量`, or plain `英文` when the prompt has nothing to replace.
 * The number is always counted, never taken from the prototype's copy, and
 * only counts substitutable tokens (never `@img1`-style reference images).
 */
export function promptLanguageLabel(language: string, promptText: string): string {
  const label = language === "en" ? "英文" : language;
  const total = totalTokenOccurrences(promptText);
  return total === 0 ? label : `${label} · ${total} 处变量`;
}

/**
 * `[COUNTRY]` → `country`: the prototype writes a variation's value as
 * `country = Japan`, i.e. the token without its brackets, lower-cased.
 */
export function variationVariableName(token: string): string {
  return token.replace(/[[\]]/g, "").trim().toLowerCase();
}

/** How many times one token occurs in the prompt. */
export function tokenOccurrences(promptText: string, token: string): number {
  return countToken(promptText, token);
}

/**
 * Matches the digits of an "N 处" occurrence count — but only when `处` is
 * actually the measure word for "N places/occurrences", not the start of an
 * unrelated word like 处理/处于/处在/处方. `处` must be followed by a boundary
 * (end of string, punctuation, whitespace) or one of the words this fixture's
 * copy actually uses after it (全部, 变量). "分 2 处理" has no such boundary
 * after 处, so it is left untouched.
 */
const OCCURRENCE_COUNT = /(\d+)(?=\s*处(?:$|[，,。！？；;:：、\s]|全部|变量))/g;

/**
 * The fixture's step copy was transcribed from the prototype and contains a
 * hard-coded occurrence count ("7 处全部替换为同一国家名"). We keep the step
 * text as data but re-derive the number from the prompt so the instruction can
 * never contradict the highlighted text above it.
 *
 * The count used is the one for the token the step itself names; steps that
 * name no token fall back to the prompt's substitutable total.
 */
export function formatStepBody(title: string, body: string, promptText: string): string {
  const variables = extractVariables(promptText);
  if (variables.length === 0) return body;

  const named = variables.find(
    (variable) => title.includes(variable.token) || body.includes(variable.token),
  );
  const count = named?.count ?? totalTokenOccurrences(promptText);
  return body.replace(OCCURRENCE_COUNT, String(count));
}
