import { createHash } from 'node:crypto';
import templateInput from '../../data/website-prompt-templates.json';
import { placeholderTokens } from './placeholders';
import type { Catalog, Locale, Prompt, Variable } from './types';
import { websitePrompts } from './website';

export interface WebsiteTemplateEdit {
  token: string;
  en: string;
  zh: string;
  occurrence?: number;
}
export interface WebsiteTemplate {
  sourceHash: string;
  translationHash: string;
  edits: WebsiteTemplateEdit[];
}
const templates: Record<string, WebsiteTemplate> = templateInput;
const hash = (text: string) => `sha256:${createHash('sha256').update(text, 'utf8').digest('hex')}`;

/** Apply reviewed spans once; neither translations nor immutable intake records are rewritten. */
export function websiteTemplate(prompt: Prompt, locale: Locale, template: WebsiteTemplate): Prompt {
  if (hash(prompt.prompt) !== (locale === 'en' ? template.sourceHash : template.translationHash))
    throw new Error(`Stale website template: ${prompt.id}`);
  const spans: { start: number; end: number; token: string }[] = [];
  const metadata = new Map<string, Variable>();
  for (const edit of template.edits) {
    if (!/^\[[A-Z][A-Z0-9_]*\]$/u.test(edit.token)) throw new Error(`Invalid website token: ${prompt.id}`);
    const source = locale === 'en' ? edit.en : edit.zh;
    if (!source) throw new Error(`Empty website edit: ${prompt.id}`);
    const starts: number[] = [];
    let start = prompt.prompt.indexOf(source);
    while (start >= 0) {
      starts.push(start);
      start = prompt.prompt.indexOf(source, start + source.length);
    }
    if (!starts.length || (edit.occurrence !== undefined && (!Number.isInteger(edit.occurrence) || edit.occurrence < 0 || edit.occurrence >= starts.length)))
      throw new Error(`Missing website edit: ${prompt.id} ${edit.token}`);
    for (const [index, start] of starts.entries()) {
      if (edit.occurrence === undefined || edit.occurrence === index) spans.push({ start, end: start + source.length, token: edit.token });
    }
    metadata.set(edit.token, {
      token: edit.token, label: edit.token.slice(1, -1).replaceAll('_', ' '),
      defaultValue: source.startsWith('[') || /^<.*>$/u.test(source) || /^\{.*\}$/u.test(source) ? '' : source,
      options: [], note: null, required: true,
    });
  }
  spans.sort((a, b) => a.start - b.start);
  let position = 0;
  let text = '';
  for (const span of spans) {
    if (span.start < position) throw new Error(`Overlapping website edits: ${prompt.id}`);
    text += prompt.prompt.slice(position, span.start) + span.token;
    position = span.end;
  }
  text += prompt.prompt.slice(position);
  const variables = placeholderTokens(text).map(token => metadata.get(token) ?? prompt.variables.find(variable => variable.token === token));
  if (!variables.length || variables.some(variable => !variable)) throw new Error(`Unreviewed website placeholder: ${prompt.id}`);
  return { ...prompt, prompt: text, editableTemplate: true, variables: variables.filter((variable): variable is Variable => variable !== undefined) };
}

/** All website surfaces and generation links consume this same Git beta catalog. */
export function editableWebsiteCatalog(catalog: Catalog): Catalog {
  const websiteIds = new Set(websitePrompts(catalog).map(prompt => prompt.id));
  const prompts = catalog.prompts.map(prompt => {
    if (!websiteIds.has(prompt.id)) return prompt;
    const template = templates[prompt.id];
    if (!template) {
      if (prompt.editableTemplate && prompt.variables.length) return prompt;
      throw new Error(`Missing website template: ${prompt.id}`);
    }
    return websiteTemplate(prompt, catalog.locale, template);
  });
  return { ...catalog, prompts };
}
