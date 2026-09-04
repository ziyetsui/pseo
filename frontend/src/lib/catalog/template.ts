import { placeholderParts, placeholderTokens } from "./placeholders";
import type { Variable } from "./types";

export interface TemplateEdit { token: string; source: string; label: string }

/** Reviewed visual-fixture edits, applied once against the source. Never used by the public API adapter. */
export function createEditableTemplate(text: string, edits: TemplateEdit[], metadata: readonly Omit<Variable, "required" | "note">[]) {
  for (const edit of edits) {
    if (!edit.source || !text.includes(edit.source) || placeholderTokens(edit.token)[0] !== edit.token)
      throw new Error(`Invalid template edit for ${edit.token}`);
    if (edits.some(other => other !== edit && (other.source.includes(edit.source) || other.token === edit.token)))
      throw new Error(`Overlapping template edit for ${edit.token}`);
  }
  const bySource = new Map(edits.map(edit => [edit.source, edit]));
  const prompt = placeholderParts(text, edits.map(edit => edit.source))
    .map(part => part.token ? bySource.get(part.token)!.token : part.text).join("");
  const variables: Variable[] = placeholderTokens(prompt).map(token => {
    const edit = edits.find(item => item.token === token);
    const original = metadata.find(item => item.token === token);
    return {
      token, label: edit?.label ?? original?.label ?? token.slice(1, -1),
      defaultValue: edit ? (edit.source.startsWith("[") ? "" : edit.source) : original?.defaultValue ?? "",
      options: original?.options ?? [], note: null, required: true,
    };
  });
  if (!variables.length) throw new Error("Every visual prompt must have editable placeholders");
  return { prompt, variables };
}
