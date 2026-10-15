import { createHash } from 'node:crypto';
import prepared from '@/data/website-placeholder-templates.json';
import { placeholderTokens } from './placeholders';
import type { Catalog, Locale, Prompt, Variable, WebsiteCase } from './types';

export interface WebsiteReplacement {
  token: string;
  labelEn: string;
  labelZh: string;
  en: string[];
  zh: string[];
}
export interface WebsiteTemplateEntry {
  sourceHash: { en: string; zh: string };
  replacements: WebsiteReplacement[];
}
export type WebsiteTemplateManifest = Record<string, WebsiteTemplateEntry>;
export interface EditableWebsitePrompt extends Pick<Prompt, 'prompt' | 'variables' | 'language'> {
  editableTemplate: true;
  origin: 'adapted-source' | 'site-authored';
  sourceText: string | null;
}
const hash = (value: string) => `sha256:${createHash('sha256').update(value, 'utf8').digest('hex')}`;
const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const strings = (value: unknown): value is string[] => Array.isArray(value) && value.length > 0 && value.every(item => typeof item === 'string' && item.length > 0);

function readManifest(input: unknown): WebsiteTemplateManifest {
  if (!record(input)) throw new Error('Invalid Website template manifest');
  const result: WebsiteTemplateManifest = {};
  for (const [id, value] of Object.entries(input)) {
    if (!record(value) || !record(value.sourceHash) || !Array.isArray(value.replacements)) throw new Error(`Invalid Website template entry: ${id}`);
    const hashes = value.sourceHash;
    if (!['en', 'zh'].every(locale => /^sha256:[a-f0-9]{64}$/.test(String(hashes[locale])))) throw new Error(`Invalid Website template hash: ${id}`);
    const replacements: WebsiteReplacement[] = value.replacements.map((rule: unknown) => {
      if (!record(rule) || typeof rule.token !== 'string' || !/^\[[A-Z][A-Z0-9_]*\]$/.test(rule.token) || typeof rule.labelEn !== 'string' || !rule.labelEn.trim() || typeof rule.labelZh !== 'string' || !rule.labelZh.trim() || !strings(rule.en) || !strings(rule.zh)) throw new Error(`Invalid Website template replacement: ${id}`);
      return { token: rule.token, labelEn: rule.labelEn, labelZh: rule.labelZh, en: rule.en, zh: rule.zh };
    });
    if (new Set(replacements.map(rule => rule.token)).size !== replacements.length) throw new Error(`Duplicate Website template variable: ${id}`);
    result[id] = { sourceHash: { en: String(value.sourceHash.en), zh: String(value.sourceHash.zh) }, replacements };
  }
  return result;
}
const manifest = readManifest(prepared);

/** Compare executable JSON shape, allowing only string values to become editable. */
function jsonShape(value: unknown): unknown {
  if (typeof value === 'string') return 'string';
  if (Array.isArray(value)) return value.map(jsonShape);
  if (record(value)) return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, jsonShape(item)]));
  return { type: typeof value, value };
}
function defaultValue(value: string): string {
  if (/^\[.*\]$/s.test(value)) return '';
  const argument = value.replaceAll('\\"', '"').match(/^\{argument\s+name="[^"]*"\s+default="([^"]*)"\}$/s);
  return argument ? argument[1]! : value;
}
const starterFields = [
  ['WEBSITE_TYPE', 'Website type', '网站类型'], ['BRAND_NAME', 'Brand name', '品牌名称'],
  ['PROJECT_BRIEF', 'Project brief', '项目需求'], ['TARGET_AUDIENCE', 'Target audience', '目标受众'],
  ['DESIGN_STYLE', 'Design style', '设计风格'], ['PAGE_SECTIONS', 'Page sections', '页面内容'],
] as const;

/** Site-authored display templates never change the source catalog or claim author-original wording. */
export function websiteEditableTemplate(catalog: Catalog, entry: WebsiteCase, definitions: WebsiteTemplateManifest = manifest): EditableWebsitePrompt {
  if (catalog.mode !== 'git-beta') throw new Error('Website editing templates are limited to owner-authorized Git beta');
  const locale: Locale = catalog.locale;
  const source = catalog.prompts.find(prompt => prompt.id === entry.id || prompt.href === entry.promptHref);
  if (!source) {
    const prompt = locale === 'zh-CN'
      ? `为 [BRAND_NAME] 创建一个 [WEBSITE_TYPE]。\n项目需求：[PROJECT_BRIEF]\n目标受众：[TARGET_AUDIENCE]\n设计风格：[DESIGN_STYLE]\n页面内容：[PAGE_SECTIONS]\n\n参考案例：${entry.title}\n${entry.summary}\n参考该案例的视觉方向与交互，结合以上需求创作自己的实现。确保桌面与手机可用，并验证页面交互。`
      : `Create a [WEBSITE_TYPE] for [BRAND_NAME].\nProject brief: [PROJECT_BRIEF]\nTarget audience: [TARGET_AUDIENCE]\nDesign style: [DESIGN_STYLE]\nPage sections: [PAGE_SECTIONS]\n\nReference case: ${entry.title}\n${entry.summary}\nUse the case's visual direction and interactions as inspiration for your own implementation of the brief above. Support desktop and mobile and verify the page interactions.`;
    return { prompt, language: locale, editableTemplate: true, origin: 'site-authored', sourceText: null,
      variables: starterFields.map(([name, en, zh]) => ({ token: `[${name}]`, label: locale === 'zh-CN' ? zh : en, defaultValue: '', options: [], note: null, required: true })) };
  }
  const definition = definitions[entry.id];
  const key = locale === 'zh-CN' ? 'zh' : 'en';
  if (!definition || definition.sourceHash[key] !== hash(source.prompt)) throw new Error(`Missing or stale Website editing template: ${entry.id}`);
  const rules = new Map<string, WebsiteReplacement>();
  const spans = new Map<string, string>();
  for (const rule of definition.replacements) {
    rules.set(rule.token, rule);
    for (const find of rule[key]) {
      if (!source.prompt.includes(find)) throw new Error(`Missing Website template span: ${entry.id} ${rule.token}`);
      if (spans.has(find) && spans.get(find) !== rule.token) throw new Error(`Conflicting Website template span: ${entry.id}`);
      spans.set(find, rule.token);
    }
  }
  // Replace source spans once; inserted variable names never become replacement input.
  const pattern = [...spans.keys()].sort((a, b) => b.length - a.length).map(value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const prompt = pattern ? source.prompt.replace(new RegExp(pattern, 'g'), value => spans.get(value)!) : source.prompt;
  let parsed: unknown;
  try { parsed = JSON.parse(source.prompt); } catch { /* Prose and code remain in their original format. */ }
  if (parsed !== undefined) {
    try { if (JSON.stringify(jsonShape(JSON.parse(prompt))) !== JSON.stringify(jsonShape(parsed))) throw new Error('Changed structure'); }
    catch { throw new Error(`Changed Website template JSON contract: ${entry.id}`); }
  }
  const tokens = placeholderTokens(prompt);
  if (!tokens.length) throw new Error(`Website template has no editable variables: ${entry.id}`);
  const variables: Variable[] = tokens.map(token => {
    const rule = rules.get(token), existing = source.variables.find(variable => variable.token === token);
    return rule ? { token, label: locale === 'zh-CN' ? rule.labelZh : rule.labelEn, defaultValue: defaultValue(rule[key][0]!), options: [], note: null, required: true }
      : existing ? { ...existing } : { token, label: token.slice(1, -1).replaceAll('_', ' '), defaultValue: '', options: [], note: null, required: true };
  });
  return { prompt, variables, language: locale, editableTemplate: true, origin: 'adapted-source', sourceText: source.prompt };
}
