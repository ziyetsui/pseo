/** Reviewed visual-fixture edits only; JSON is also hashed by the export receipt. */
import edits from "./prompt-templates.json";
import type { TemplateEdit } from "../../lib/catalog/template";
export const promptTemplateEdits: Record<string, TemplateEdit[]> = edits;
