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

/** How many token occurrences the prompt contains in total. */
export function totalTokenOccurrences(promptText: string): number {
  return extractVariables(promptText).reduce((sum, variable) => sum + variable.count, 0);
}

/**
 * `英文 · 7 处变量`, or plain `英文` when the prompt has nothing to replace.
 * The number is always counted, never taken from the prototype's copy.
 */
export function promptLanguageLabel(language: string, promptText: string): string {
  const label = language === "en" ? "英文" : language;
  const total = totalTokenOccurrences(promptText);
  return total === 0 ? label : `${label} · ${total} 处变量`;
}

/** `复制时替换 7 处 [COUNTRY]` — the phrase the live region announces. */
export function replacementPhrase(promptText: string, token: string): string {
  return `复制时替换 ${countToken(promptText, token)} 处 ${token}`;
}

/**
 * The fixture's step copy was transcribed from the prototype and contains a
 * hard-coded occurrence count ("7 处全部替换为同一国家名"). We keep the step
 * text as data but re-derive the number from the prompt so the instruction can
 * never contradict the highlighted text above it.
 *
 * The count used is the one for the token the step itself names; steps that
 * name no token fall back to the prompt's total.
 */
export function formatStepBody(title: string, body: string, promptText: string): string {
  const variables = extractVariables(promptText);
  if (variables.length === 0) return body;

  const named = variables.find(
    (variable) => title.includes(variable.token) || body.includes(variable.token),
  );
  const count = named?.count ?? totalTokenOccurrences(promptText);
  return body.replace(/\d+(?=\s*处)/g, String(count));
}
