#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { spawn } from 'node:child_process'
import {
  lstat,
  mkdir,
  mkdtemp,
  open,
  readFile,
  readdir,
  realpath,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises'
import { isIP } from 'node:net'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const ENVELOPE_SCHEMA_VERSION = 1
const MAX_FILES = 10_000
const MAX_FILE_BYTES = 8 * 1024 * 1024
const MAX_TOTAL_FILE_BYTES = 32 * 1024 * 1024
const MAX_ENVELOPE_BYTES = 48 * 1024 * 1024
const HASH = /^sha256:[a-f0-9]{64}$/
const REVISION = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,199}$/
const EXPORTER_VERSION = /^[A-Za-z0-9][A-Za-z0-9._+-]{0,63}$/
const SAFE_PATH = /^[A-Za-z0-9._/-]+$/
const PROMPT_ID = /^prm_[a-z0-9_]{8,64}$/
const TAXONOMY_ID = /^(?:cty|mdl)_[a-z0-9_]{3,64}$/
const LOCALE = /^(?:en|zh-CN)$/
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const ROOT_README = /^README(?:_(?:en|zh-CN))?\.md$/
const LOCALE_OUTPUT = /^locales\/(en|zh-CN)\/(README\.md|index\.json|taxonomies\.json)$/
const PROMPT_OUTPUT = /^content\/prompts\/(prm_[a-z0-9_]{8,64})\/(en|zh-CN)\.md$/
const TAXONOMY_OUTPUT = /^content\/taxonomies\/(content-type|model)\/((?:cty|mdl)_[a-z0-9_]{3,64})\/(en|zh-CN)\.json$/
const PUBLIC_PROMPT_KEYS = [
  'schemaVersion',
  'id',
  'type',
  'locale',
  'sourceLocale',
  'slug',
  'title',
  'summary',
  'status',
  'indexable',
  'contentType',
  'models',
  'useCases',
  'techniques',
  'styles',
  'subjects',
  'prompt',
  'outcome',
  'media',
  'metrics',
  'inputs',
  'parameters',
  'examples',
  'workflow',
  'creator',
  'relatedPromptIds',
  'actions',
  'source',
  'evidence',
  'seo',
  'publication',
  'translation',
]
const SECRET_PATTERNS = [
  /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----/,
  /\bgh[pousr]_[A-Za-z0-9]{30,}\b/,
  /\bgithub_pat_[A-Za-z0-9_]{40,}\b/,
  /\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{24,}\b/,
  /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/,
  /\bAIza[0-9A-Za-z_-]{35}\b/,
  /\bBearer[ \t]+[^\s"'<>\[\]{}]{16,}/i,
  /\b(?:https?|postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis):\/\/[^\s/@:]+:[^\s/@]+@/i,
  /\b(?:api[_-]?key|access[_-]?token|client[_-]?secret|password|aws_secret_access_key)\b[ \t]*[:=][ \t]*["']?[A-Za-z0-9_./+~=-]{20,}/i,
]
const EXECUTABLE_HTML_PATTERNS = [
  /<\s*\/?\s*(?:script|iframe|object|embed|style)\b/i,
  /<[^>]{0,4096}\s+on[a-z]{2,32}\s*=/i,
  /\bjavascript\s*:/i,
  /\bdata\s*:\s*text\/html/i,
]
const REQUIRED_SNAPSHOT_PATHS = new Set([
  'README.md',
  'catalog.json',
  'content/site.json',
  'governance/content-rights.json',
  'governance/publication-audit.json',
])
const LEGACY_BOOTSTRAP_PATHS = new Set([
  'content/README.md',
  'governance/README.md',
  'governance/rights-clearances.json',
])

function decodeHtmlEntitiesForSafety(value) {
  let decoded = value
  const named = new Map([
    ['amp', '&'],
    ['apos', "'"],
    ['colon', ':'],
    ['gt', '>'],
    ['lt', '<'],
    ['newline', '\n'],
    ['quot', '"'],
    ['tab', '\t'],
  ])
  for (let pass = 0; pass < 3; pass += 1) {
    const next = decoded.replace(/&(?:#(\d{1,7})|#x([a-f0-9]{1,6})|([a-z][a-z0-9]+));/gi, (match, decimal, hexadecimal, name) => {
      if (name !== undefined) return named.get(String(name).toLowerCase()) ?? match
      const codePoint = Number.parseInt(decimal ?? hexadecimal, decimal === undefined ? 16 : 10)
      if (!Number.isSafeInteger(codePoint) || codePoint < 0 || codePoint > 0x10ffff) return match
      try {
        return String.fromCodePoint(codePoint)
      } catch {
        return match
      }
    })
    if (next === decoded) break
    decoded = next
  }
  return decoded
}

function containsExecutableContent(source) {
  const decoded = decodeHtmlEntitiesForSafety(source)
  if (EXECUTABLE_HTML_PATTERNS.some((pattern) => pattern.test(decoded))) return true
  const compact = decoded.replace(/[\u0000-\u0020\u007f-\u00a0]+/g, '').toLowerCase()
  return compact.includes('javascript:') || compact.includes('data:text/html')
}

function containsCommunityLicenseClaim(source) {
  return /\b(?:CC[\s_-]*BY|Creative\s+Commons(?:\s+Attribution)?)\b/i.test(source)
}

export class MirrorSyncError extends Error {
  constructor(code, message, { preserveBackup = false } = {}) {
    super(message)
    this.name = 'MirrorSyncError'
    this.code = code
    this.preserveBackup = preserveBackup
  }
}

function fail(code, message) {
  throw new MirrorSyncError(code, message)
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function exactKeys(value, expected, code) {
  if (!isPlainObject(value)) fail(code, 'Snapshot object shape is invalid')
  const actual = Object.keys(value).sort()
  const wanted = [...expected].sort()
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    fail(code, 'Snapshot object contains missing or unknown fields')
  }
}

function canonicalValue(value) {
  if (Array.isArray(value)) return value.map(canonicalValue)
  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalValue(value[key])]),
    )
  }
  return value
}

export function stableJson(value) {
  return `${JSON.stringify(canonicalValue(value), null, 2)}\n`
}

export function sha256(bytes) {
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`
}

function validPathShape(relative) {
  if (typeof relative !== 'string' || relative === '' || !SAFE_PATH.test(relative)) return false
  if (relative.startsWith('/') || relative.endsWith('/') || relative.includes('\\')) return false
  const segments = relative.split('/')
  if (segments.some((segment) => segment === '' || segment === '.' || segment === '..' || segment.startsWith('.'))) return false
  return path.posix.normalize(relative) === relative
}

export function isAllowedGeneratedPath(relative) {
  if (!validPathShape(relative)) return false
  if (relative === 'catalog.json' || relative === 'mirror-manifest.json') return true
  if (relative === 'content/site.json') return true
  if (relative === 'governance/content-rights.json') return true
  if (relative === 'governance/publication-audit.json') return true
  if (ROOT_README.test(relative)) return true
  if (LOCALE_OUTPUT.test(relative)) return true
  const prompt = PROMPT_OUTPUT.exec(relative)
  if (prompt !== null) return PROMPT_ID.test(prompt[1]) && LOCALE.test(prompt[2])
  const taxonomy = TAXONOMY_OUTPUT.exec(relative)
  if (taxonomy === null || !TAXONOMY_ID.test(taxonomy[2]) || !LOCALE.test(taxonomy[3])) return false
  return (taxonomy[1] === 'content-type' && taxonomy[2].startsWith('cty_'))
    || (taxonomy[1] === 'model' && taxonomy[2].startsWith('mdl_'))
}

export function isAllowedGeneratedChangePath(relative) {
  return isAllowedGeneratedPath(relative) || LEGACY_BOOTSTRAP_PATHS.has(relative)
}

function assertRevision(value) {
  if (typeof value !== 'string' || !REVISION.test(value)) {
    fail('INVALID_REVISION', 'Export revision is missing or malformed')
  }
}

function assertExporterVersion(value) {
  if (typeof value !== 'string' || !EXPORTER_VERSION.test(value)) {
    fail('INVALID_EXPORTER_VERSION', 'Exporter version is missing or malformed')
  }
}

function decodeBase64(value) {
  if (
    typeof value !== 'string'
    || value.length % 4 !== 0
    || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)
  ) {
    fail('INVALID_FILE_ENCODING', 'Snapshot file content is not canonical base64')
  }
  const bytes = Buffer.from(value, 'base64')
  if (bytes.toString('base64') !== value) {
    fail('INVALID_FILE_ENCODING', 'Snapshot file content is not canonical base64')
  }
  return bytes
}

function validateGeneratedText(bytes) {
  let source
  try {
    source = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    fail('INVALID_TEXT_ENCODING', 'Generated files must contain valid UTF-8 text')
  }
  if (source.includes('\0') || source.includes('\r')) {
    fail('INVALID_TEXT_FORMAT', 'Generated files must use NUL-free LF text')
  }
  if (SECRET_PATTERNS.some((pattern) => pattern.test(source))) {
    fail('SECRET_DETECTED', 'Generated file failed the credential safety gate')
  }
  if (containsExecutableContent(source)) {
    fail('UNSAFE_HTML', 'Generated file failed the executable HTML safety gate')
  }
}

function assertSortedUniquePaths(paths) {
  const folded = new Set()
  let previous = null
  for (const relative of paths) {
    if (!isAllowedGeneratedPath(relative) || relative === 'mirror-manifest.json') {
      fail('UNSAFE_PATH', 'Snapshot contains a path outside the generated allowlist')
    }
    const lower = relative.toLowerCase()
    if (folded.has(lower)) fail('DUPLICATE_PATH', 'Snapshot contains duplicate or case-colliding paths')
    folded.add(lower)
    if (previous !== null && previous.localeCompare(relative, 'en') >= 0) {
      fail('UNSORTED_PATHS', 'Snapshot file paths must be unique and sorted')
    }
    previous = relative
  }
}

function validateCounts(counts) {
  exactKeys(counts, ['locales', 'prompts', 'taxonomies'], 'INVALID_MANIFEST')
  for (const value of Object.values(counts)) {
    if (!Number.isSafeInteger(value) || value < 0) fail('INVALID_MANIFEST', 'Manifest count is malformed')
  }
}

function contract(condition, field, code = 'INVALID_PUBLIC_CONTRACT') {
  if (!condition) fail(code, `Generated public contract is invalid at ${field}`)
}

function closed(value, keys, field, code = 'INVALID_PUBLIC_CONTRACT') {
  if (!isPlainObject(value)) fail(code, `Generated public contract is invalid at ${field}`)
  const actual = Object.keys(value).sort()
  const expected = [...keys].sort()
  contract(
    actual.length === expected.length && actual.every((key, index) => key === expected[index]),
    field,
    code,
  )
  return value
}

function stringField(value, field, { min = 1, max = 20_000, pattern } = {}) {
  contract(typeof value === 'string' && value.length >= min && value.length <= max, field)
  if (pattern !== undefined) contract(pattern.test(value), field)
  return value
}

function nullableString(value, field, options = {}) {
  if (value === null) return null
  return stringField(value, field, options)
}

function enumField(value, allowed, field) {
  contract(allowed.includes(value), field)
  return value
}

function arrayField(value, field, { min = 0 } = {}) {
  contract(Array.isArray(value) && value.length >= min, field)
  return value
}

function uniqueArray(value, field) {
  const fingerprints = value.map((item) => JSON.stringify(canonicalValue(item)))
  contract(new Set(fingerprints).size === fingerprints.length, field)
}

function stringList(value, field, { min = 0, pattern, max = 160 } = {}) {
  const items = arrayField(value, field, { min })
  for (const [index, item] of items.entries()) stringField(item, `${field}[${index}]`, { max, pattern })
  uniqueArray(items, field)
  return items
}

function isDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value
}

function isDateTime(value) {
  return typeof value === 'string'
    && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)
    && !Number.isNaN(Date.parse(value))
}

function normalizedHostname(hostname) {
  return hostname.replace(/^\[|\]$/g, '').replace(/\.+$/g, '').toLowerCase()
}

function forbiddenHostname(hostname) {
  const normalized = normalizedHostname(hostname)
  const addressType = isIP(normalized)
  return normalized === 'localhost'
    || normalized.endsWith('.localhost')
    || normalized.endsWith('.local')
    || normalized.endsWith('.internal')
    || (!addressType && !normalized.includes('.'))
    || (addressType === 4 && forbiddenIpv4(normalized))
    || (addressType === 6 && forbiddenIpv6(normalized))
}

function httpsUrl(value, field) {
  stringField(value, field, { max: 2_048 })
  contract(decodeHtmlEntitiesForSafety(value) === value && !containsExecutableContent(value), field)
  let url
  try {
    url = new URL(value)
  } catch {
    contract(false, field)
  }
  contract(
    url.protocol === 'https:'
      && url.username === ''
      && url.password === ''
      && !forbiddenHostname(url.hostname),
    field,
  )
  return value
}

function parseJsonBytes(fileMap, relative) {
  const bytes = fileMap.get(relative)
  contract(bytes !== undefined, relative)
  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
  } catch {
    fail('INVALID_PUBLIC_JSON', `Generated JSON is invalid at ${relative}`)
  }
}

function parsePromptBytes(bytes, relative) {
  let source
  try {
    source = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    fail('INVALID_PUBLIC_PROMPT', 'Generated Prompt Markdown is not valid UTF-8')
  }
  const match = source.match(/^---\n([\s\S]*?)\n---(?:\n|$)/)
  if (match === null) fail('INVALID_PUBLIC_PROMPT', 'Generated Prompt Markdown has invalid frontmatter')
  let data
  try {
    data = JSON.parse(match[1])
  } catch {
    fail('INVALID_PUBLIC_PROMPT', 'Generated Prompt Markdown frontmatter is invalid')
  }
  const body = source.slice(match[0].length)
  contract(body.trim().length > 0, `${relative}:body`, 'INVALID_PUBLIC_PROMPT')
  return { body, data, source }
}

function validatePublicMarkdownLinks(body, relative, { fileMap, allowLocal = false } = {}) {
  const validateTarget = (rawTarget) => {
    const target = rawTarget.startsWith('<') && rawTarget.endsWith('>')
      ? rawTarget.slice(1, -1)
      : rawTarget
    if (target.startsWith('#')) return
    if (target.startsWith('https://')) {
      httpsUrl(target, `${relative}:markdown-link`)
      return
    }
    if (!allowLocal || fileMap === undefined) {
      fail('LOCAL_LINK_FORBIDDEN', 'Public Prompt Markdown cannot contain local or non-HTTPS links')
    }
    contract(
      decodeHtmlEntitiesForSafety(target) === target
        && !target.includes('?')
        && !target.includes('%')
        && !target.includes('\\')
        && !target.startsWith('/'),
      `${relative}:markdown-link`,
      'INVALID_LOCAL_LINK',
    )
    const [targetPath] = target.split('#', 1)
    contract(targetPath !== '', `${relative}:markdown-link`, 'INVALID_LOCAL_LINK')
    const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(relative), targetPath))
    contract(
      !resolved.startsWith('../')
        && isAllowedGeneratedPath(resolved)
        && fileMap.has(resolved),
      `${relative}:markdown-link`,
      'DANGLING_LOCAL_LINK',
    )
  }
  const inline = /!?\[[^\]]*\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g
  for (const match of body.matchAll(inline)) validateTarget(match[1])
  const references = /^\s{0,3}\[[^\]]+\]:\s*(\S+)/gm
  for (const match of body.matchAll(references)) validateTarget(match[1])
  const htmlAttributes = /\b(?:action|data|href|poster|src)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/gi
  for (const match of body.matchAll(htmlAttributes)) validateTarget(match[1] ?? match[2] ?? match[3])
}

function validateVariable(value, field) {
  closed(value, ['key', 'label', 'required', 'defaultValue', 'options'], field)
  stringField(value.key, `${field}.key`, { pattern: /^\[[A-Z][A-Z0-9_]{1,39}\]$/ })
  stringField(value.label, `${field}.label`, { max: 80 })
  contract(typeof value.required === 'boolean', `${field}.required`)
  nullableString(value.defaultValue, `${field}.defaultValue`, { max: 120 })
  stringList(value.options, `${field}.options`)
}

function validateMedia(value, field) {
  closed(value, ['assetId', 'type', 'url', 'width', 'height', 'alt', 'posterUrl'], field)
  stringField(value.assetId, `${field}.assetId`, { pattern: /^ast_[a-z0-9_]{8,64}$/ })
  enumField(value.type, ['image', 'video'], `${field}.type`)
  httpsUrl(value.url, `${field}.url`)
  contract(Number.isSafeInteger(value.width) && value.width > 0, `${field}.width`)
  contract(Number.isSafeInteger(value.height) && value.height > 0, `${field}.height`)
  stringField(value.alt, `${field}.alt`, { max: 240 })
  if (value.posterUrl !== null) httpsUrl(value.posterUrl, `${field}.posterUrl`)
}

function validateRichPublicPrompt(relative, bytes) {
  const pathMatch = PROMPT_OUTPUT.exec(relative)
  contract(pathMatch !== null, `${relative}:path`, 'INVALID_PUBLIC_PROMPT')
  const { body, data, source } = parsePromptBytes(bytes, relative)
  closed(data, PUBLIC_PROMPT_KEYS, `${relative}:frontmatter`, 'INVALID_PUBLIC_PROMPT')
  contract(data.schemaVersion === 1 && data.type === 'prompt', `${relative}:identity`, 'INVALID_PUBLIC_PROMPT')
  stringField(data.id, `${relative}:id`, { pattern: PROMPT_ID })
  contract(data.id === pathMatch[1], `${relative}:id`, 'INVALID_PUBLIC_PROMPT')
  enumField(data.locale, ['en', 'zh-CN'], `${relative}:locale`)
  contract(data.locale === pathMatch[2], `${relative}:locale`, 'INVALID_PUBLIC_PROMPT')
  enumField(data.sourceLocale, ['en', 'zh-CN'], `${relative}:sourceLocale`)
  stringField(data.slug, `${relative}:slug`, { min: 3, max: 96, pattern: SLUG })
  stringField(data.title, `${relative}:title`, { min: 4, max: 120 })
  stringField(data.summary, `${relative}:summary`, { min: 24, max: 320 })
  contract(data.status === 'published' && data.indexable === true, `${relative}:publication-state`, 'INVALID_PUBLIC_PROMPT')
  enumField(data.contentType, ['image', 'video', 'text', 'other'], `${relative}:contentType`)
  for (const field of ['models', 'useCases', 'techniques', 'styles', 'subjects']) {
    stringList(data[field], `${relative}:${field}`, { min: 1, pattern: SLUG, max: 96 })
  }

  closed(data.prompt, ['language', 'text', 'variables'], `${relative}:prompt`, 'INVALID_PUBLIC_PROMPT')
  stringField(data.prompt.language, `${relative}:prompt.language`, { pattern: /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/ })
  stringField(data.prompt.text, `${relative}:prompt.text`, { min: 80, max: 20_000 })
  for (const [index, variable] of arrayField(data.prompt.variables, `${relative}:prompt.variables`, { min: 1 }).entries()) {
    validateVariable(variable, `${relative}:prompt.variables[${index}]`)
  }
  uniqueArray(data.prompt.variables, `${relative}:prompt.variables`)

  closed(data.outcome, ['outputType', 'purpose', 'platforms', 'characteristics'], `${relative}:outcome`, 'INVALID_PUBLIC_PROMPT')
  enumField(data.outcome.outputType, ['image', 'video', 'text', 'other'], `${relative}:outcome.outputType`)
  stringField(data.outcome.purpose, `${relative}:outcome.purpose`, { min: 8, max: 240 })
  stringList(data.outcome.platforms, `${relative}:outcome.platforms`, { min: 1, pattern: SLUG, max: 96 })
  stringList(data.outcome.characteristics, `${relative}:outcome.characteristics`)

  const media = arrayField(data.media, `${relative}:media`)
  contract(media.length === 0, `${relative}:media`, 'UNVERIFIED_MEDIA')
  for (const [index, item] of media.entries()) validateMedia(item, `${relative}:media[${index}]`)

  closed(data.metrics, ['likes', 'bookmarks', 'comments', 'reposts', 'views', 'observedAt'], `${relative}:metrics`, 'INVALID_PUBLIC_PROMPT')
  for (const field of ['likes', 'bookmarks', 'comments', 'reposts', 'views']) {
    contract(data.metrics[field] === null || (Number.isSafeInteger(data.metrics[field]) && data.metrics[field] >= 0), `${relative}:metrics.${field}`)
  }
  contract(isDateTime(data.metrics.observedAt), `${relative}:metrics.observedAt`)

  closed(data.inputs, ['required', 'optional'], `${relative}:inputs`, 'INVALID_PUBLIC_PROMPT')
  stringList(data.inputs.required, `${relative}:inputs.required`)
  stringList(data.inputs.optional, `${relative}:inputs.optional`)
  const parameters = arrayField(data.parameters, `${relative}:parameters`, { min: 1 })
  for (const [index, parameter] of parameters.entries()) {
    const field = `${relative}:parameters[${index}]`
    closed(parameter, ['key', 'label', 'type', 'required', 'options'], field, 'INVALID_PUBLIC_PROMPT')
    stringField(parameter.key, `${field}.key`, { pattern: /^[A-Z][A-Z0-9_]{1,39}$/ })
    stringField(parameter.label, `${field}.label`, { max: 80 })
    enumField(parameter.type, ['text', 'number', 'enum', 'boolean'], `${field}.type`)
    contract(typeof parameter.required === 'boolean', `${field}.required`)
    stringList(parameter.options, `${field}.options`)
  }
  uniqueArray(parameters, `${relative}:parameters`)

  const examples = arrayField(data.examples, `${relative}:examples`)
  contract(examples.length === 0, `${relative}:examples`, 'UNVERIFIED_MEDIA')
  for (const [index, example] of examples.entries()) {
    const field = `${relative}:examples[${index}]`
    closed(example, ['id', 'input', 'output', 'caption'], field, 'INVALID_PUBLIC_PROMPT')
    stringField(example.id, `${field}.id`, { pattern: /^ex_[a-z0-9_]{8,64}$/ })
    nullableString(example.input, `${field}.input`, { max: 2_000 })
    validateMedia(example.output, `${field}.output`)
    nullableString(example.caption, `${field}.caption`, { max: 240 })
  }

  const workflow = arrayField(data.workflow, `${relative}:workflow`, { min: 2 })
  for (const [index, step] of workflow.entries()) {
    const field = `${relative}:workflow[${index}]`
    closed(step, ['position', 'title', 'body'], field, 'INVALID_PUBLIC_PROMPT')
    contract(Number.isSafeInteger(step.position) && step.position >= 1 && step.position <= 20, `${field}.position`)
    stringField(step.title, `${field}.title`, { min: 2, max: 100 })
    stringField(step.body, `${field}.body`, { min: 4, max: 400 })
  }
  uniqueArray(workflow.map((step) => step.position), `${relative}:workflow.position`)

  if (data.creator !== null) {
    closed(data.creator, ['id', 'slug', 'name'], `${relative}:creator`, 'INVALID_PUBLIC_PROMPT')
    stringField(data.creator.id, `${relative}:creator.id`, { pattern: /^ctr_[a-z0-9_]{3,64}$/ })
    stringField(data.creator.slug, `${relative}:creator.slug`, { min: 3, max: 96, pattern: SLUG })
    stringField(data.creator.name, `${relative}:creator.name`, { max: 100 })
  }
  stringList(data.relatedPromptIds, `${relative}:relatedPromptIds`, { pattern: PROMPT_ID, max: 68 })
  contract(data.relatedPromptIds.length === 0, `${relative}:relatedPromptIds`, 'UNRESOLVED_RELATED_PROMPT')
  closed(data.actions, ['canCopy', 'tryUrl'], `${relative}:actions`, 'INVALID_PUBLIC_PROMPT')
  contract(typeof data.actions.canCopy === 'boolean', `${relative}:actions.canCopy`)
  if (data.actions.tryUrl !== null) httpsUrl(data.actions.tryUrl, `${relative}:actions.tryUrl`)

  closed(data.source, ['platform', 'sourceId', 'url', 'authorHandle', 'publishedDate', 'observedAt'], `${relative}:source`, 'INVALID_PUBLIC_PROMPT')
  enumField(data.source.platform, ['x', 'rss', 'url', 'manual'], `${relative}:source.platform`)
  stringField(data.source.sourceId, `${relative}:source.sourceId`, { max: 160 })
  httpsUrl(data.source.url, `${relative}:source.url`)
  nullableString(data.source.authorHandle, `${relative}:source.authorHandle`, { max: 80 })
  contract(isDate(data.source.publishedDate), `${relative}:source.publishedDate`)
  contract(isDateTime(data.source.observedAt), `${relative}:source.observedAt`)

  const evidence = arrayField(data.evidence, `${relative}:evidence`, { min: 1 })
  for (const [index, item] of evidence.entries()) {
    const field = `${relative}:evidence[${index}]`
    closed(item, ['type', 'url', 'confidence'], field, 'INVALID_PUBLIC_PROMPT')
    stringField(item.type, `${field}.type`, { min: 2, max: 80 })
    httpsUrl(item.url, `${field}.url`)
    contract(item.confidence === null || (typeof item.confidence === 'number' && item.confidence >= 0 && item.confidence <= 1), `${field}.confidence`)
  }
  uniqueArray(evidence, `${relative}:evidence`)

  closed(data.seo, ['title', 'description', 'canonical', 'robots'], `${relative}:seo`, 'INVALID_PUBLIC_PROMPT')
  stringField(data.seo.title, `${relative}:seo.title`, { min: 8, max: 120 })
  stringField(data.seo.description, `${relative}:seo.description`, { min: 32, max: 320 })
  httpsUrl(data.seo.canonical, `${relative}:seo.canonical`)
  contract(data.seo.robots === 'index,follow', `${relative}:seo.robots`, 'INVALID_PUBLIC_PROMPT')

  closed(data.publication, ['publishedAt', 'updatedAt', 'sourceRevision'], `${relative}:publication`, 'INVALID_PUBLIC_PROMPT')
  contract(isDateTime(data.publication.publishedAt), `${relative}:publication.publishedAt`, 'INVALID_PUBLIC_PROMPT')
  contract(isDateTime(data.publication.updatedAt), `${relative}:publication.updatedAt`, 'INVALID_PUBLIC_PROMPT')
  stringField(data.publication.sourceRevision, `${relative}:publication.sourceRevision`, { pattern: HASH })

  closed(data.translation, ['status', 'translatedFromRevision', 'reviewer'], `${relative}:translation`, 'INVALID_PUBLIC_PROMPT')
  contract(data.translation.status === 'ready', `${relative}:translation.status`, 'INVALID_PUBLIC_PROMPT')
  stringField(data.translation.reviewer, `${relative}:translation.reviewer`, { max: 80 })
  if (data.locale === data.sourceLocale) {
    contract(data.translation.translatedFromRevision === null, `${relative}:translation.translatedFromRevision`, 'INVALID_PUBLIC_PROMPT')
  } else {
    stringField(data.translation.translatedFromRevision, `${relative}:translation.translatedFromRevision`, { pattern: HASH })
  }
  validatePublicMarkdownLinks(body, relative)
  return { body, data, path: relative, source }
}

function validatePublicSite(fileMap) {
  const site = parseJsonBytes(fileMap, 'content/site.json')
  closed(site, ['schemaVersion', 'siteName', 'defaultLocale', 'locales', 'publishedLocales'], 'content/site.json')
  contract(site.schemaVersion === 1, 'content/site.json:schemaVersion')
  stringField(site.siteName, 'content/site.json:siteName', { max: 120 })
  stringList(site.locales, 'content/site.json:locales', { min: 1, pattern: LOCALE, max: 5 })
  stringList(site.publishedLocales, 'content/site.json:publishedLocales', { pattern: LOCALE, max: 5 })
  contract(site.locales.includes(site.defaultLocale), 'content/site.json:defaultLocale')
  contract(site.publishedLocales.every((locale) => site.locales.includes(locale)), 'content/site.json:publishedLocales')
  return site
}

function validateRightsRegistry(fileMap, exportRevision) {
  const registry = parseJsonBytes(fileMap, 'governance/content-rights.json')
  closed(registry, ['schemaVersion', 'exportRevision', 'total', 'items'], 'governance/content-rights.json', 'INVALID_RIGHTS_REGISTRY')
  contract(registry.schemaVersion === 1 && registry.exportRevision === exportRevision, 'governance/content-rights.json:revision', 'INVALID_RIGHTS_REGISTRY')
  const items = arrayField(registry.items, 'governance/content-rights.json:items')
  contract(Number.isSafeInteger(registry.total) && registry.total === items.length, 'governance/content-rights.json:total', 'INVALID_RIGHTS_REGISTRY')
  let previous = null
  const byIdentity = new Map()
  for (const [index, item] of items.entries()) {
    const field = `governance/content-rights.json:items[${index}]`
    contract(isPlainObject(item), field, 'INVALID_RIGHTS_REGISTRY')
    const common = ['id', 'locale', 'status', 'rightsRevision', 'sourceUrl', 'reviewedAt']
    if (item.status === 'cleared') {
      closed(item, [...common, 'basis', 'evidenceUrl', 'licenseReference'], field, 'INVALID_RIGHTS_REGISTRY')
      stringField(item.basis, `${field}.basis`, { min: 8, max: 1_000 })
      httpsUrl(item.evidenceUrl, `${field}.evidenceUrl`)
      stringField(item.licenseReference, `${field}.licenseReference`, { min: 2, max: 200 })
    } else if (item.status === 'community_attributed') {
      closed(
        item,
        [...common, 'authorName', 'authorUrl', 'originalPostUrl', 'policyVersion', 'riskAcceptanceRevision', 'takedownUrl', 'notice'],
        field,
        'INVALID_RIGHTS_REGISTRY',
      )
      stringField(item.authorName, `${field}.authorName`, { max: 160 })
      if (item.authorUrl !== null) httpsUrl(item.authorUrl, `${field}.authorUrl`)
      httpsUrl(item.originalPostUrl, `${field}.originalPostUrl`)
      contract(item.originalPostUrl === item.sourceUrl, `${field}.originalPostUrl`, 'INVALID_RIGHTS_REGISTRY')
      stringField(item.policyVersion, `${field}.policyVersion`, { max: 100 })
      stringField(item.riskAcceptanceRevision, `${field}.riskAcceptanceRevision`, { pattern: HASH })
      httpsUrl(item.takedownUrl, `${field}.takedownUrl`)
      const expectedNotice = item.locale === 'zh-CN'
        ? '作者保留权利；该 Prompt 不适用仓库的开放内容许可证。'
        : 'The author retains rights; this Prompt is not offered under the repository content license.'
      contract(item.notice === expectedNotice, `${field}.notice`, 'INVALID_RIGHTS_REGISTRY')
      contract(!containsCommunityLicenseClaim(item.notice), `${field}.notice`, 'INVALID_RIGHTS_REGISTRY')
    } else {
      fail('RIGHTS_NOT_PUBLIC', 'Public rights registry contains a non-public status')
    }
    stringField(item.id, `${field}.id`, { pattern: PROMPT_ID })
    enumField(item.locale, ['en', 'zh-CN'], `${field}.locale`)
    stringField(item.rightsRevision, `${field}.rightsRevision`, { pattern: HASH })
    httpsUrl(item.sourceUrl, `${field}.sourceUrl`)
    contract(isDateTime(item.reviewedAt), `${field}.reviewedAt`, 'INVALID_RIGHTS_REGISTRY')
    const identity = `${item.id}\0${item.locale}`
    contract(!byIdentity.has(identity), `${field}:identity`, 'INVALID_RIGHTS_REGISTRY')
    contract(previous === null || previous.localeCompare(identity, 'en') < 0, `${field}:sort`, 'INVALID_RIGHTS_REGISTRY')
    previous = identity
    byIdentity.set(identity, item)
  }
  return { byIdentity, items, registry }
}

function validatePublicationAudit(fileMap, exportRevision, prompts, rights) {
  const audit = parseJsonBytes(fileMap, 'governance/publication-audit.json')
  closed(audit, ['schemaVersion', 'exportRevision', 'total', 'items'], 'governance/publication-audit.json', 'INVALID_PUBLICATION_AUDIT')
  contract(
    audit.schemaVersion === 1 && audit.exportRevision === exportRevision,
    'governance/publication-audit.json:revision',
    'INVALID_PUBLICATION_AUDIT',
  )
  const items = arrayField(audit.items, 'governance/publication-audit.json:items')
  contract(
    Number.isSafeInteger(audit.total) && audit.total === items.length && items.length === prompts.size,
    'governance/publication-audit.json:total',
    'INVALID_PUBLICATION_AUDIT',
  )
  const approvals = new Set()
  let previous = null
  for (const [index, item] of items.entries()) {
    const field = `governance/publication-audit.json:items[${index}]`
    closed(
      item,
      ['approvalId', 'approvedAt', 'contentRevision', 'id', 'locale', 'rightsRevision', 'sourceRevision'],
      field,
      'INVALID_PUBLICATION_AUDIT',
    )
    stringField(item.approvalId, `${field}.approvalId`, { max: 160, pattern: /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/ })
    contract(isDateTime(item.approvedAt), `${field}.approvedAt`, 'INVALID_PUBLICATION_AUDIT')
    stringField(item.contentRevision, `${field}.contentRevision`, { pattern: HASH })
    stringField(item.id, `${field}.id`, { pattern: PROMPT_ID })
    enumField(item.locale, ['en', 'zh-CN'], `${field}.locale`)
    stringField(item.rightsRevision, `${field}.rightsRevision`, { pattern: HASH })
    stringField(item.sourceRevision, `${field}.sourceRevision`, { pattern: HASH })
    const identity = `${item.id}\0${item.locale}`
    const prompt = prompts.get(identity)
    const decision = rights.get(identity)
    contract(prompt !== undefined && decision !== undefined, `${field}:identity`, 'PUBLICATION_AUDIT_COVERAGE_MISMATCH')
    contract(item.approvedAt === prompt.data.publication.publishedAt, `${field}.approvedAt`, 'INVALID_PUBLICATION_AUDIT')
    contract(item.sourceRevision === prompt.data.publication.sourceRevision, `${field}.sourceRevision`, 'INVALID_PUBLICATION_AUDIT')
    contract(item.rightsRevision === decision.rightsRevision, `${field}.rightsRevision`, 'INVALID_PUBLICATION_AUDIT')
    contract(!approvals.has(item.approvalId), `${field}.approvalId`, 'INVALID_PUBLICATION_AUDIT')
    contract(previous === null || previous.localeCompare(identity, 'en') < 0, `${field}:sort`, 'INVALID_PUBLICATION_AUDIT')
    approvals.add(item.approvalId)
    previous = identity
  }
  return audit
}

function validateCatalog(fileMap, exportRevision, prompts, rights) {
  const catalog = parseJsonBytes(fileMap, 'catalog.json')
  closed(catalog, ['schemaVersion', 'exportRevision', 'total', 'items'], 'catalog.json', 'INVALID_CATALOG')
  contract(catalog.schemaVersion === 1 && catalog.exportRevision === exportRevision, 'catalog.json:revision', 'INVALID_CATALOG')
  const items = arrayField(catalog.items, 'catalog.json:items')
  contract(Number.isSafeInteger(catalog.total) && catalog.total === items.length, 'catalog.json:total', 'INVALID_CATALOG')
  contract(items.length === prompts.size, 'catalog.json:items', 'INVALID_CATALOG')
  let previous = null
  for (const [index, item] of items.entries()) {
    const field = `catalog.json:items[${index}]`
    closed(item, ['id', 'locale', 'path', 'slug', 'title', 'summary', 'sourceUrl', 'rightsStatus'], field, 'INVALID_CATALOG')
    stringField(item.id, `${field}.id`, { pattern: PROMPT_ID })
    enumField(item.locale, ['en', 'zh-CN'], `${field}.locale`)
    const identity = `${item.id}\0${item.locale}`
    const prompt = prompts.get(identity)
    const decision = rights.get(identity)
    contract(prompt !== undefined && decision !== undefined, `${field}:identity`, 'INVALID_CATALOG')
    contract(item.path === prompt.path, `${field}.path`, 'INVALID_CATALOG')
    contract(item.slug === prompt.data.slug && item.title === prompt.data.title && item.summary === prompt.data.summary, `${field}:content`, 'INVALID_CATALOG')
    contract(item.sourceUrl === prompt.data.source.url && item.sourceUrl === decision.sourceUrl, `${field}.sourceUrl`, 'INVALID_CATALOG')
    contract(item.rightsStatus === decision.status, `${field}.rightsStatus`, 'INVALID_CATALOG')
    contract(previous === null || previous.localeCompare(identity, 'en') < 0, `${field}:sort`, 'INVALID_CATALOG')
    previous = identity
  }
  return catalog
}

function validateLocaleIndexes(fileMap, exportRevision, site, catalog, rights) {
  for (const locale of site.locales) {
    const indexPath = `locales/${locale}/index.json`
    const readmePath = `locales/${locale}/README.md`
    const taxonomiesPath = `locales/${locale}/taxonomies.json`
    contract(fileMap.has(indexPath) && fileMap.has(readmePath) && fileMap.has(taxonomiesPath), `locales/${locale}`, 'INCOMPLETE_SNAPSHOT')
    const index = parseJsonBytes(fileMap, indexPath)
    closed(index, ['schemaVersion', 'exportRevision', 'locale', 'total', 'items'], indexPath, 'INVALID_LOCALE_INDEX')
    const expectedItems = catalog.items.filter((item) => item.locale === locale)
    contract(
      index.schemaVersion === 1
        && index.exportRevision === exportRevision
        && index.locale === locale
        && index.total === expectedItems.length
        && stableJson(index.items) === stableJson(expectedItems),
      indexPath,
      'INVALID_LOCALE_INDEX',
    )
    const readme = new TextDecoder('utf-8', { fatal: true }).decode(fileMap.get(readmePath))
    for (const decision of rights.values()) {
      if (decision.locale !== locale || decision.status !== 'community_attributed') continue
      for (const required of [decision.authorName, decision.originalPostUrl, decision.notice, decision.takedownUrl]) {
        contract(readme.includes(required), readmePath, 'MISSING_COMMUNITY_NOTICE')
      }
      contract(!containsCommunityLicenseClaim(readme), readmePath, 'COMMUNITY_LICENSE_FORBIDDEN')
    }

    const taxonomyIndex = parseJsonBytes(fileMap, taxonomiesPath)
    closed(taxonomyIndex, ['schemaVersion', 'exportRevision', 'locale', 'total', 'items'], taxonomiesPath, 'INVALID_LOCALE_TAXONOMIES')
    const expectedTaxonomies = [...fileMap.keys()]
      .filter((relative) => TAXONOMY_OUTPUT.exec(relative)?.[3] === locale)
      .map((relative) => ({ path: relative, record: parseJsonBytes(fileMap, relative) }))
      .sort((left, right) => (
        String(left.record.axis).localeCompare(String(right.record.axis), 'en')
        || String(left.record.slug).localeCompare(String(right.record.slug), 'en')
        || left.path.localeCompare(right.path, 'en')
      ))
    contract(
      taxonomyIndex.schemaVersion === 1
        && taxonomyIndex.exportRevision === exportRevision
        && taxonomyIndex.locale === locale
        && taxonomyIndex.total === expectedTaxonomies.length
        && Array.isArray(taxonomyIndex.items)
        && taxonomyIndex.items.length === expectedTaxonomies.length,
      taxonomiesPath,
      'INVALID_LOCALE_TAXONOMIES',
    )
    for (const [index, item] of taxonomyIndex.items.entries()) {
      const expected = expectedTaxonomies[index]
      const field = `${taxonomiesPath}:items[${index}]`
      contract(isPlainObject(item) && item.path === expected.path, field, 'INVALID_LOCALE_TAXONOMIES')
      const { path: itemPath, ...record } = item
      validateTaxonomyFile(itemPath, record, site)
      contract(stableJson(record) === stableJson(expected.record), field, 'INVALID_LOCALE_TAXONOMIES')
    }
  }
}

function validateTaxonomyFile(relative, value, site) {
  const match = TAXONOMY_OUTPUT.exec(relative)
  contract(match !== null, `${relative}:path`, 'INVALID_PUBLIC_TAXONOMY')
  closed(
    value,
    ['schemaVersion', 'id', 'type', 'axis', 'locale', 'sourceLocale', 'slug', 'name', 'description', 'status', 'indexable', 'selector', 'surface', 'model', 'sourceRef', 'seo', 'publication', 'translation'],
    relative,
    'INVALID_PUBLIC_TAXONOMY',
  )
  contract(value.schemaVersion === 1 && value.type === 'taxonomy', `${relative}:identity`, 'INVALID_PUBLIC_TAXONOMY')
  contract(value.id === match[2] && value.axis === match[1] && value.locale === match[3], `${relative}:identity`, 'INVALID_PUBLIC_TAXONOMY')
  enumField(value.sourceLocale, ['en', 'zh-CN'], `${relative}:sourceLocale`)
  contract(site.locales.includes(value.locale), `${relative}:locale`, 'INVALID_PUBLIC_TAXONOMY')
  stringField(value.slug, `${relative}:slug`, { min: 3, max: 96, pattern: SLUG })
  stringField(value.name, `${relative}:name`, { max: 80 })
  stringField(value.description, `${relative}:description`, { min: 12, max: 320 })
  contract(value.status === 'published' && value.indexable === false, `${relative}:publication-state`, 'INVALID_PUBLIC_TAXONOMY')
  closed(value.selector, ['field', 'value'], `${relative}:selector`, 'INVALID_PUBLIC_TAXONOMY')
  const expectedField = value.axis === 'content-type' ? 'contentType' : 'models'
  contract(value.selector.field === expectedField, `${relative}:selector.field`, 'INVALID_PUBLIC_TAXONOMY')
  stringField(value.selector.value, `${relative}:selector.value`, { min: 3, max: 96, pattern: SLUG })
  contract(value.selector.value === value.slug, `${relative}:selector.value`, 'INVALID_PUBLIC_TAXONOMY')
  closed(value.surface, ['level', 'kind', 'path'], `${relative}:surface`, 'INVALID_PUBLIC_TAXONOMY')
  enumField(value.surface.level, ['L2', 'L3'], `${relative}:surface.level`)
  enumField(value.surface.kind, ['content-type-gallery', 'model-detail'], `${relative}:surface.kind`)
  stringField(value.surface.path, `${relative}:surface.path`, { pattern: /^\/(?:en|zh-CN)\/prompts(?:\/models)?\/[a-z0-9]+(?:-[a-z0-9]+)*$/ })
  const expectedSurface = value.axis === 'content-type'
    ? { kind: 'content-type-gallery', level: 'L2', path: `/${value.locale}/prompts/${value.slug}` }
    : { kind: 'model-detail', level: 'L3', path: `/${value.locale}/prompts/models/${value.slug}` }
  contract(
    value.surface.kind === expectedSurface.kind
      && value.surface.level === expectedSurface.level
      && value.surface.path === expectedSurface.path,
    `${relative}:surface`,
    'INVALID_PUBLIC_TAXONOMY',
  )
  if (value.model !== null) {
    closed(value.model, ['officialUrl', 'capabilities', 'inputs', 'outputs', 'limitations'], `${relative}:model`, 'INVALID_PUBLIC_TAXONOMY')
    if (value.model.officialUrl !== null) httpsUrl(value.model.officialUrl, `${relative}:model.officialUrl`)
    for (const field of ['capabilities', 'inputs', 'outputs', 'limitations']) stringList(value.model[field], `${relative}:model.${field}`)
  }
  httpsUrl(value.sourceRef, `${relative}:sourceRef`)
  closed(value.seo, ['title', 'description', 'canonical', 'robots'], `${relative}:seo`, 'INVALID_PUBLIC_TAXONOMY')
  stringField(value.seo.title, `${relative}:seo.title`, { min: 4, max: 120 })
  stringField(value.seo.description, `${relative}:seo.description`, { min: 12, max: 320 })
  httpsUrl(value.seo.canonical, `${relative}:seo.canonical`)
  contract(value.seo.robots === 'noindex,nofollow', `${relative}:seo.robots`, 'INVALID_PUBLIC_TAXONOMY')
  closed(value.publication, ['publishedAt', 'updatedAt', 'sourceRevision'], `${relative}:publication`, 'INVALID_PUBLIC_TAXONOMY')
  contract(isDateTime(value.publication.publishedAt) && isDateTime(value.publication.updatedAt), `${relative}:publication`, 'INVALID_PUBLIC_TAXONOMY')
  stringField(value.publication.sourceRevision, `${relative}:publication.sourceRevision`, { pattern: HASH })
  closed(value.translation, ['status', 'translatedFromRevision', 'reviewer'], `${relative}:translation`, 'INVALID_PUBLIC_TAXONOMY')
  contract(value.translation.status === 'ready', `${relative}:translation.status`, 'INVALID_PUBLIC_TAXONOMY')
  stringField(value.translation.reviewer, `${relative}:translation.reviewer`, { max: 80 })
  if (value.locale === value.sourceLocale) contract(value.translation.translatedFromRevision === null, `${relative}:translation.translatedFromRevision`, 'INVALID_PUBLIC_TAXONOMY')
  else stringField(value.translation.translatedFromRevision, `${relative}:translation.translatedFromRevision`, { pattern: HASH })
  return { data: value, path: relative }
}

export function validatePublicMirrorFileMap(fileMap, { exportRevision, manifest } = {}) {
  assertRevision(exportRevision)
  const site = validatePublicSite(fileMap)
  const prompts = new Map()
  const promptSlugs = new Set()
  const taxonomies = []
  for (const [relative, bytes] of fileMap) {
    if (relative === 'mirror-manifest.json') continue
    const localeOutput = LOCALE_OUTPUT.exec(relative)
    const localizedRootReadme = /^README_(en|zh-CN)\.md$/.exec(relative)
    contract(
      (localeOutput === null || site.locales.includes(localeOutput[1]))
        && (localizedRootReadme === null || site.locales.includes(localizedRootReadme[1])),
      `${relative}:locale`,
      'UNDECLARED_LOCALE_OUTPUT',
    )
    const promptMatch = PROMPT_OUTPUT.exec(relative)
    if (promptMatch !== null) {
      const prompt = validateRichPublicPrompt(relative, bytes)
      contract(site.publishedLocales.includes(prompt.data.locale), `${relative}:locale`, 'INVALID_PUBLIC_PROMPT')
      const identity = `${prompt.data.id}\0${prompt.data.locale}`
      const localizedSlug = `${prompt.data.locale}\0${prompt.data.slug}`
      contract(!prompts.has(identity), `${relative}:identity`, 'INVALID_PUBLIC_PROMPT')
      contract(!promptSlugs.has(localizedSlug), `${relative}:slug`, 'DUPLICATE_PROMPT_SLUG')
      prompts.set(identity, prompt)
      promptSlugs.add(localizedSlug)
    } else if (TAXONOMY_OUTPUT.test(relative)) {
      taxonomies.push(validateTaxonomyFile(relative, parseJsonBytes(fileMap, relative), site))
    }
  }
  const taxonomyIdentities = new Set()
  const taxonomySlugs = new Set()
  const taxonomySelectors = new Map()
  const taxonomyFamilies = new Map()
  for (const taxonomy of taxonomies) {
    const { data, path: taxonomyPath } = taxonomy
    const identity = `${data.id}\0${data.locale}`
    const slug = `${data.axis}\0${data.locale}\0${data.slug}`
    const selector = `${data.locale}\0${data.selector.field}\0${data.selector.value}`
    contract(!taxonomyIdentities.has(identity), `${taxonomyPath}:identity`, 'DUPLICATE_TAXONOMY')
    contract(!taxonomySlugs.has(slug), `${taxonomyPath}:slug`, 'DUPLICATE_TAXONOMY')
    contract(!taxonomySelectors.has(selector), `${taxonomyPath}:selector`, 'DUPLICATE_TAXONOMY')
    taxonomyIdentities.add(identity)
    taxonomySlugs.add(slug)
    taxonomySelectors.set(selector, taxonomy)
    const family = taxonomyFamilies.get(data.id) ?? []
    family.push(taxonomy)
    taxonomyFamilies.set(data.id, family)
    if (data.locale !== data.sourceLocale) {
      contract(
        data.translation.translatedFromRevision === data.publication.sourceRevision,
        `${taxonomyPath}:translation.translatedFromRevision`,
        'TRANSLATION_REVISION_MISMATCH',
      )
    }
  }
  for (const family of taxonomyFamilies.values()) {
    const [first] = family
    for (const taxonomy of family.slice(1)) {
      contract(taxonomy.data.axis === first.data.axis, `${taxonomy.path}:axis`, 'TRANSLATION_REVISION_MISMATCH')
      contract(taxonomy.data.sourceLocale === first.data.sourceLocale, `${taxonomy.path}:sourceLocale`, 'TRANSLATION_REVISION_MISMATCH')
      contract(
        taxonomy.data.publication.sourceRevision === first.data.publication.sourceRevision,
        `${taxonomy.path}:publication.sourceRevision`,
        'TRANSLATION_REVISION_MISMATCH',
      )
    }
  }
  const promptFamilies = new Map()
  for (const prompt of prompts.values()) {
    const family = promptFamilies.get(prompt.data.id) ?? []
    family.push(prompt)
    promptFamilies.set(prompt.data.id, family)
    if (prompt.data.locale !== prompt.data.sourceLocale) {
      contract(
        prompt.data.translation.translatedFromRevision === prompt.data.publication.sourceRevision,
        `${prompt.path}:translation.translatedFromRevision`,
        'TRANSLATION_REVISION_MISMATCH',
      )
    }
  }
  for (const family of promptFamilies.values()) {
    const [first] = family
    for (const prompt of family.slice(1)) {
      contract(prompt.data.sourceLocale === first.data.sourceLocale, `${prompt.path}:sourceLocale`, 'TRANSLATION_REVISION_MISMATCH')
      contract(
        prompt.data.publication.sourceRevision === first.data.publication.sourceRevision,
        `${prompt.path}:publication.sourceRevision`,
        'TRANSLATION_REVISION_MISMATCH',
      )
    }
  }
  const referencedTaxonomies = new Set()
  for (const prompt of prompts.values()) {
    const required = [
      `${prompt.data.locale}\0contentType\0${prompt.data.contentType}`,
      ...prompt.data.models.map((model) => `${prompt.data.locale}\0models\0${model}`),
    ]
    for (const selector of required) {
      const taxonomy = taxonomySelectors.get(selector)
      contract(taxonomy !== undefined, `${prompt.path}:taxonomy`, 'MISSING_PUBLIC_TAXONOMY')
      referencedTaxonomies.add(taxonomy.path)
    }
  }
  for (const taxonomy of taxonomies) {
    contract(referencedTaxonomies.has(taxonomy.path), `${taxonomy.path}:orphan`, 'ORPHAN_PUBLIC_TAXONOMY')
  }
  const { byIdentity: rights, items: rightsItems } = validateRightsRegistry(fileMap, exportRevision)
  contract(rights.size === prompts.size, 'governance/content-rights.json:items', 'RIGHTS_COVERAGE_MISMATCH')
  for (const [identity, prompt] of prompts) {
    const decision = rights.get(identity)
    contract(decision !== undefined, `${prompt.path}:rights`, 'RIGHTS_COVERAGE_MISMATCH')
    contract(decision.sourceUrl === prompt.data.source.url, `${prompt.path}:source`, 'RIGHTS_SOURCE_MISMATCH')
    if (decision.status === 'community_attributed') {
      for (const required of [decision.authorName, decision.originalPostUrl, decision.notice, decision.takedownUrl]) {
        contract(prompt.body.includes(required), `${prompt.path}:community-notice`, 'MISSING_COMMUNITY_NOTICE')
      }
      contract(!containsCommunityLicenseClaim(prompt.source), `${prompt.path}:community-license`, 'COMMUNITY_LICENSE_FORBIDDEN')
    } else {
      contract(prompt.body.includes(decision.sourceUrl), `${prompt.path}:source`, 'RIGHTS_SOURCE_MISMATCH')
    }
  }
  const catalog = validateCatalog(fileMap, exportRevision, prompts, rights)
  validatePublicationAudit(fileMap, exportRevision, prompts, rights)
  validateLocaleIndexes(fileMap, exportRevision, site, catalog, rights)
  for (const [relative, bytes] of fileMap) {
    if (!ROOT_README.test(relative) && !LOCALE_OUTPUT.test(relative)) continue
    if (!relative.endsWith('.md')) continue
    const source = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
    validatePublicMarkdownLinks(source, relative, { allowLocal: true, fileMap })
  }
  if (manifest !== undefined) {
    contract(manifest.counts.prompts === prompts.size, 'mirror-manifest.json:counts.prompts', 'INVALID_MANIFEST')
    contract(manifest.counts.taxonomies === taxonomies.length, 'mirror-manifest.json:counts.taxonomies', 'INVALID_MANIFEST')
    contract(manifest.counts.locales === site.locales.length, 'mirror-manifest.json:counts.locales', 'INVALID_MANIFEST')
  }
  contract(rightsItems.length === prompts.size, 'governance/content-rights.json:items', 'RIGHTS_COVERAGE_MISMATCH')
  return { catalog, prompts, rights, site, taxonomies }
}

export function validateSnapshotEnvelope(envelope) {
  exactKeys(
    envelope,
    ['schemaVersion', 'exportRevision', 'exporterVersion', 'manifestSha256', 'manifest', 'files'],
    'INVALID_ENVELOPE',
  )
  if (envelope.schemaVersion !== ENVELOPE_SCHEMA_VERSION) {
    fail('INVALID_SCHEMA_VERSION', 'Unsupported snapshot envelope schema version')
  }
  assertRevision(envelope.exportRevision)
  assertExporterVersion(envelope.exporterVersion)
  if (typeof envelope.manifestSha256 !== 'string' || !HASH.test(envelope.manifestSha256)) {
    fail('INVALID_MANIFEST_HASH', 'Manifest SHA-256 is missing or malformed')
  }
  if (!Array.isArray(envelope.files) || envelope.files.length === 0 || envelope.files.length > MAX_FILES) {
    fail('INVALID_FILES', 'Snapshot file list is empty or exceeds its limit')
  }

  exactKeys(
    envelope.manifest,
    ['schemaVersion', 'exportRevision', 'exporterVersion', 'counts', 'files'],
    'INVALID_MANIFEST',
  )
  const manifest = envelope.manifest
  if (manifest.schemaVersion !== ENVELOPE_SCHEMA_VERSION) {
    fail('INVALID_MANIFEST', 'Manifest schema version does not match the envelope')
  }
  if (manifest.exportRevision !== envelope.exportRevision || manifest.exporterVersion !== envelope.exporterVersion) {
    fail('INVALID_MANIFEST', 'Manifest revision or exporter version does not match the envelope')
  }
  validateCounts(manifest.counts)
  if (!Array.isArray(manifest.files) || manifest.files.length !== envelope.files.length) {
    fail('INVALID_MANIFEST', 'Manifest file list does not match the envelope')
  }

  const filePaths = envelope.files.map((file) => file?.path)
  const manifestPaths = manifest.files.map((file) => file?.path)
  assertSortedUniquePaths(filePaths)
  assertSortedUniquePaths(manifestPaths)

  const fileMap = new Map()
  let totalBytes = 0
  for (let index = 0; index < envelope.files.length; index += 1) {
    const file = envelope.files[index]
    const manifestFile = manifest.files[index]
    exactKeys(file, ['path', 'encoding', 'sha256', 'content'], 'INVALID_FILE')
    exactKeys(manifestFile, ['path', 'sha256', 'bytes'], 'INVALID_MANIFEST')
    if (file.encoding !== 'base64') fail('INVALID_FILE_ENCODING', 'Snapshot files must use base64 encoding')
    if (!HASH.test(file.sha256) || !HASH.test(manifestFile.sha256)) {
      fail('INVALID_FILE_HASH', 'Snapshot file SHA-256 is missing or malformed')
    }
    if (!Number.isSafeInteger(manifestFile.bytes) || manifestFile.bytes < 0 || manifestFile.bytes > MAX_FILE_BYTES) {
      fail('INVALID_FILE_SIZE', 'Snapshot file size is malformed or exceeds its limit')
    }
    if (file.path !== manifestFile.path || file.sha256 !== manifestFile.sha256) {
      fail('INVALID_MANIFEST', 'Manifest file metadata does not match the envelope')
    }
    const bytes = decodeBase64(file.content)
    if (bytes.length !== manifestFile.bytes || bytes.length > MAX_FILE_BYTES) {
      fail('FILE_SIZE_MISMATCH', 'Snapshot file size does not match its manifest entry')
    }
    if (sha256(bytes) !== file.sha256) {
      fail('FILE_HASH_MISMATCH', 'Snapshot file content does not match its SHA-256')
    }
    validateGeneratedText(bytes)
    totalBytes += bytes.length
    if (totalBytes > MAX_TOTAL_FILE_BYTES) fail('SNAPSHOT_TOO_LARGE', 'Snapshot files exceed the total size limit')
    fileMap.set(file.path, bytes)
  }

  for (const required of REQUIRED_SNAPSHOT_PATHS) {
    if (!fileMap.has(required)) fail('INCOMPLETE_SNAPSHOT', 'Snapshot is missing a required generated file')
  }

  const manifestBytes = Buffer.from(stableJson(manifest), 'utf8')
  if (sha256(manifestBytes) !== envelope.manifestSha256) {
    fail('MANIFEST_HASH_MISMATCH', 'Canonical manifest does not match its SHA-256')
  }
  validatePublicMirrorFileMap(fileMap, {
    exportRevision: envelope.exportRevision,
    manifest,
  })
  fileMap.set('mirror-manifest.json', manifestBytes)

  return {
    exportRevision: envelope.exportRevision,
    exporterVersion: envelope.exporterVersion,
    fileMap,
    manifest,
    manifestSha256: envelope.manifestSha256,
  }
}

function forbiddenIpv4(hostname) {
  const octets = hostname.split('.').map(Number)
  const [first, second] = octets
  return first === 0
    || first === 10
    || first === 127
    || first >= 224
    || (first === 100 && second >= 64 && second <= 127)
    || (first === 169 && second === 254)
    || (first === 172 && second >= 16 && second <= 31)
    || (first === 192 && second === 0)
    || (first === 192 && second === 168)
    || (first === 198 && (second === 18 || second === 19))
    || (first === 198 && second === 51)
    || (first === 203 && second === 0)
}

function forbiddenIpv6(hostname) {
  const normalized = hostname.toLowerCase()
  return normalized === '::'
    || normalized === '::1'
    || normalized.startsWith('fc')
    || normalized.startsWith('fd')
    || /^fe[89ab]/.test(normalized)
    || normalized.startsWith('::ffff:')
    || normalized.startsWith('ff')
    || normalized.startsWith('2001:db8:')
}

export function validateSnapshotUrl(value) {
  if (typeof value !== 'string' || value.trim() === '') {
    fail('INVALID_URL', 'An explicit CMS snapshot URL is required')
  }
  let url
  try {
    url = new URL(value)
  } catch {
    fail('INVALID_URL', 'CMS snapshot URL is malformed')
  }
  if (url.protocol !== 'https:') fail('INVALID_URL', 'CMS snapshot URL must use HTTPS')
  if (url.username !== '' || url.password !== '' || url.hash !== '') {
    fail('INVALID_URL', 'CMS snapshot URL cannot contain credentials or a fragment')
  }
  if (url.hostname.endsWith('.')) fail('INVALID_URL', 'CMS snapshot URL host is not allowed')
  if (forbiddenHostname(url.hostname)) {
    fail('INVALID_URL', 'CMS snapshot URL host is not allowed')
  }
  return url
}

async function pathInfo(target) {
  try {
    return await lstat(target)
  } catch (error) {
    if (error.code === 'ENOENT') return null
    throw error
  }
}

async function checkedRoot(root) {
  const absolute = path.resolve(root)
  const info = await pathInfo(absolute)
  if (info === null || !info.isDirectory() || info.isSymbolicLink()) {
    fail('UNSAFE_ROOT', 'Mirror root must be an existing regular directory')
  }
  return realpath(absolute)
}

async function collectTreeFiles(root, relativeRoot, found) {
  const absoluteRoot = path.join(root, ...relativeRoot.split('/'))
  const rootInfo = await pathInfo(absoluteRoot)
  if (rootInfo === null) return
  if (rootInfo.isSymbolicLink() || !rootInfo.isDirectory()) {
    fail('UNSAFE_EXISTING_TREE', 'Managed output root is not a regular directory')
  }

  async function walk(absolute, relative) {
    const entries = await readdir(absolute, { withFileTypes: true })
    for (const entry of entries) {
      const childRelative = `${relative}/${entry.name}`
      const childAbsolute = path.join(absolute, entry.name)
      if (entry.isSymbolicLink()) fail('UNSAFE_SYMLINK', 'Symbolic links are forbidden in managed output')
      if (entry.isDirectory()) {
        await walk(childAbsolute, childRelative)
      } else if (entry.isFile()) {
        if (!isAllowedGeneratedChangePath(childRelative)) {
          fail('UNSAFE_EXISTING_PATH', 'Managed output contains a non-allowlisted file')
        }
        found.add(childRelative)
      } else {
        fail('UNSAFE_EXISTING_TREE', 'Managed output contains a non-regular entry')
      }
    }
  }

  await walk(absoluteRoot, relativeRoot)
}

async function collectExistingManagedFiles(root) {
  const found = new Set()
  await collectTreeFiles(root, 'content', found)
  await collectTreeFiles(root, 'locales', found)
  await collectTreeFiles(root, 'governance', found)

  const rootEntries = await readdir(root, { withFileTypes: true })
  for (const entry of rootEntries) {
    const foldedName = entry.name.toLowerCase()
    if (['content', 'locales', 'governance'].includes(foldedName) && entry.name !== foldedName) {
      fail('UNSAFE_EXISTING_PATH', 'Managed output contains a case-colliding root')
    }
    if (['catalog.json', 'mirror-manifest.json', 'readme.md'].includes(foldedName)
      && !['catalog.json', 'mirror-manifest.json', 'README.md'].includes(entry.name)) {
      fail('UNSAFE_EXISTING_PATH', 'Managed output contains a case-colliding root file')
    }
    if (foldedName.startsWith('readme_') && !ROOT_README.test(entry.name)) {
      fail('UNSAFE_EXISTING_PATH', 'Managed output contains a non-allowlisted file')
    }
    if (!ROOT_README.test(entry.name) && !['catalog.json', 'mirror-manifest.json'].includes(entry.name)) continue
    if (entry.isSymbolicLink()) fail('UNSAFE_SYMLINK', 'Symbolic links are forbidden in managed output')
    if (!entry.isFile()) fail('UNSAFE_EXISTING_TREE', 'Managed output contains a non-regular entry')
    found.add(entry.name)
  }

  return found
}

async function ensureParentDirectories(root, relative) {
  const segments = relative.split('/').slice(0, -1)
  let current = root
  for (const segment of segments) {
    current = path.join(current, segment)
    const info = await pathInfo(current)
    if (info === null) {
      await mkdir(current)
    } else if (info.isSymbolicLink() || !info.isDirectory()) {
      fail('UNSAFE_TARGET_PARENT', 'Managed output parent is not a regular directory')
    }
  }
}

async function stageFiles(stageRoot, fileMap) {
  for (const [relative, bytes] of fileMap) {
    await ensureParentDirectories(stageRoot, relative)
    await writeFile(path.join(stageRoot, ...relative.split('/')), bytes, { flag: 'wx', mode: 0o644 })
  }
}

async function computeChanges(root, existing, fileMap) {
  const changed = []
  for (const [relative, expected] of fileMap) {
    if (!existing.has(relative)) {
      changed.push(relative)
      continue
    }
    const actual = await readFile(path.join(root, ...relative.split('/')))
    if (!actual.equals(expected)) changed.push(relative)
  }
  const obsolete = [...existing].filter((relative) => !fileMap.has(relative)).sort((left, right) => left.localeCompare(right, 'en'))
  return { changed, obsolete, total: changed.length + obsolete.length }
}

async function readCurrentManifestIdentity(root, existing) {
  if (!existing.has('mirror-manifest.json')) return null
  const manifestPath = path.join(root, 'mirror-manifest.json')
  const info = await pathInfo(manifestPath)
  if (info === null || info.isSymbolicLink() || !info.isFile()) {
    fail('INVALID_EXISTING_MANIFEST', 'Current mirror manifest is not a regular file')
  }
  const bytes = await readFile(manifestPath)
  let manifest
  try {
    manifest = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
  } catch {
    fail('INVALID_EXISTING_MANIFEST', 'Current mirror manifest is invalid')
  }
  exactKeys(manifest, ['schemaVersion', 'exportRevision', 'exporterVersion', 'counts', 'files'], 'INVALID_EXISTING_MANIFEST')
  if (manifest.schemaVersion !== ENVELOPE_SCHEMA_VERSION) fail('INVALID_EXISTING_MANIFEST', 'Current mirror manifest schema is unsupported')
  assertRevision(manifest.exportRevision)
  assertExporterVersion(manifest.exporterVersion)
  validateCounts(manifest.counts)
  if (!Array.isArray(manifest.files)) fail('INVALID_EXISTING_MANIFEST', 'Current mirror manifest file list is invalid')
  const canonical = Buffer.from(stableJson(manifest), 'utf8')
  if (!bytes.equals(canonical)) fail('INVALID_EXISTING_MANIFEST', 'Current mirror manifest is not canonical')
  return {
    exportRevision: manifest.exportRevision,
    manifestSha256: sha256(bytes),
  }
}

function validateSeenRevisions(seenRevisions) {
  const normalized = new Set()
  for (const revision of seenRevisions ?? []) {
    assertRevision(revision)
    normalized.add(revision)
  }
  return normalized
}

async function enforceRevisionMonotonicity({ root, existing, snapshot, seenRevisions }) {
  const current = await readCurrentManifestIdentity(root, existing)
  if (current?.exportRevision === snapshot.exportRevision) {
    if (current.manifestSha256 !== snapshot.manifestSha256) {
      fail('REVISION_EQUIVOCATION', 'The current export revision has a different manifest identity')
    }
    return
  }
  if (validateSeenRevisions(seenRevisions).has(snapshot.exportRevision)) {
    fail('REVISION_REPLAY', 'A previously mirrored export revision cannot replace the current mirror')
  }
}

export async function applyTransaction({
  root,
  stageRoot,
  backupRoot,
  fileMap,
  existing,
  changes,
  operations = { rename, rm },
}) {
  const toBackup = [...new Set([
    ...changes.obsolete,
    ...changes.changed.filter((relative) => existing.has(relative)),
  ])].sort((left, right) => left.localeCompare(right, 'en'))
  const installed = []
  const backedUp = []

  try {
    for (const relative of toBackup) {
      await ensureParentDirectories(backupRoot, relative)
      await operations.rename(
        path.join(root, ...relative.split('/')),
        path.join(backupRoot, ...relative.split('/')),
      )
      backedUp.push(relative)
    }

    for (const relative of changes.changed) {
      const target = path.join(root, ...relative.split('/'))
      if (!existing.has(relative) && await pathInfo(target) !== null) {
        fail('CONCURRENT_WRITE', 'Managed output changed during synchronization')
      }
      await ensureParentDirectories(root, relative)
      await operations.rename(path.join(stageRoot, ...relative.split('/')), target)
      installed.push(relative)
    }

    for (const [relative, expected] of fileMap) {
      const actual = await readFile(path.join(root, ...relative.split('/')))
      if (!actual.equals(expected)) fail('APPLY_VERIFY_FAILED', 'Managed output verification failed after synchronization')
    }
  } catch (error) {
    const rollbackFailures = []
    for (const relative of [...installed].reverse()) {
      await operations.rm(path.join(root, ...relative.split('/')), { force: true }).catch(() => rollbackFailures.push(relative))
    }
    for (const relative of [...backedUp].reverse()) {
      try {
        await ensureParentDirectories(root, relative)
        await operations.rename(
          path.join(backupRoot, ...relative.split('/')),
          path.join(root, ...relative.split('/')),
        )
      } catch {
        rollbackFailures.push(relative)
      }
    }
    if (rollbackFailures.length > 0) {
      throw new MirrorSyncError(
        'ROLLBACK_FAILED',
        'Managed output rollback was incomplete; the transaction backup was preserved for recovery',
        { preserveBackup: true },
      )
    }
    if (error instanceof MirrorSyncError) throw error
    fail('APPLY_FAILED', 'Managed output transaction failed and was rolled back')
  }
}

export async function syncValidatedSnapshot({ root, snapshot, check = false, seenRevisions = [] }) {
  const repositoryRoot = await checkedRoot(root)

  if (check) {
    const existing = await collectExistingManagedFiles(repositoryRoot)
    await enforceRevisionMonotonicity({ root: repositoryRoot, existing, snapshot, seenRevisions })
    const changes = await computeChanges(repositoryRoot, existing, snapshot.fileMap)
    if (changes.total > 0) fail('MIRROR_DRIFT', `Generated mirror differs from the snapshot in ${changes.total} path(s)`)
    return { ...snapshot, changes: 0, status: 'checked' }
  }

  const lockPath = path.join(repositoryRoot, '.cms-mirror-sync.lock')
  let lock
  try {
    lock = await open(lockPath, 'wx', 0o600)
  } catch (error) {
    if (error.code === 'EEXIST') fail('SYNC_LOCKED', 'Another mirror synchronization is already running')
    fail('LOCK_FAILED', 'Mirror synchronization lock could not be created')
  }

  let temporaryRoot
  let preserveTemporaryRoot = false
  try {
    const existing = await collectExistingManagedFiles(repositoryRoot)
    await enforceRevisionMonotonicity({ root: repositoryRoot, existing, snapshot, seenRevisions })
    temporaryRoot = await mkdtemp(path.join(repositoryRoot, '.cms-mirror-stage-'))
    const stageRoot = path.join(temporaryRoot, 'next')
    const backupRoot = path.join(temporaryRoot, 'previous')
    await mkdir(stageRoot)
    await mkdir(backupRoot)
    await stageFiles(stageRoot, snapshot.fileMap)
    const changes = await computeChanges(repositoryRoot, existing, snapshot.fileMap)
    if (changes.total === 0) return { ...snapshot, changes: 0, status: 'noop' }
    try {
      await applyTransaction({ root: repositoryRoot, stageRoot, backupRoot, fileMap: snapshot.fileMap, existing, changes })
    } catch (error) {
      preserveTemporaryRoot = error instanceof MirrorSyncError && error.preserveBackup === true
      throw error
    }
    return { ...snapshot, changes: changes.total, status: 'synced' }
  } finally {
    await lock?.close().catch(() => {})
    if (temporaryRoot !== undefined && !preserveTemporaryRoot) {
      await rm(temporaryRoot, { recursive: true, force: true }).catch(() => {})
    }
    if (!preserveTemporaryRoot) await rm(lockPath, { force: true }).catch(() => {})
  }
}

export async function syncCmsSnapshot() {
  fail(
    'NETWORK_FETCH_DISABLED',
    'Direct network fetch is disabled; provide a DNS-pinned snapshot file from the credential-isolated workflow step',
  )
}

export function publicErrorMessage(error) {
  if (error instanceof MirrorSyncError) return `${error.code}: ${error.message}`
  return 'UNEXPECTED_ERROR: CMS mirror synchronization failed'
}

async function runGit(root, args, { maxBytes = MAX_TOTAL_FILE_BYTES + MAX_ENVELOPE_BYTES } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn('git', ['-C', root, ...args], {
      env: {
        GIT_CONFIG_GLOBAL: '/dev/null',
        GIT_CONFIG_NOSYSTEM: '1',
        GIT_TERMINAL_PROMPT: '0',
        LANG: 'C',
        LC_ALL: 'C',
        PATH: process.env.PATH,
      },
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    const output = []
    let outputBytes = 0
    child.stdout.on('data', (chunk) => {
      outputBytes += chunk.length
      if (outputBytes > maxBytes) {
        child.kill('SIGKILL')
        return
      }
      output.push(chunk)
    })
    child.stderr.resume()
    child.once('error', () => reject(new MirrorSyncError('GIT_FAILED', 'Git mirror verification could not start')))
    child.once('close', (code) => {
      if (outputBytes > maxBytes) {
        reject(new MirrorSyncError('GIT_OUTPUT_TOO_LARGE', 'Git mirror verification exceeded its output limit'))
      } else if (code !== 0) {
        reject(new MirrorSyncError('GIT_FAILED', 'Git mirror verification command failed'))
      } else {
        resolve(Buffer.concat(output))
      }
    })
  })
}

function managedNamespace(relative) {
  const folded = relative.toLowerCase()
  return folded.startsWith('content/')
    || folded.startsWith('locales/')
    || folded.startsWith('governance/')
    || folded === 'catalog.json'
    || folded === 'mirror-manifest.json'
    || folded.startsWith('readme_')
    || folded === 'readme.md'
}

function parseGitRecords(bytes, kind) {
  const records = new Map()
  const folded = new Set()
  for (const raw of bytes.toString('utf8').split('\0').filter(Boolean)) {
    const tab = raw.indexOf('\t')
    if (tab < 0) fail('INVALID_GIT_TREE', 'Git returned a malformed tree record')
    const metadata = raw.slice(0, tab).split(' ')
    const relative = raw.slice(tab + 1)
    if (relative.includes('\0') || relative.includes('\n') || relative.includes('\r')) {
      fail('INVALID_GIT_TREE', 'Git tree contains an unsafe path')
    }
    const [mode, second, third] = metadata
    const objectId = kind === 'index' ? second : third
    if (kind === 'index' && metadata[2] !== '0') fail('INVALID_GIT_INDEX', 'Git index contains an unresolved stage')
    if (managedNamespace(relative)) {
      if (!isAllowedGeneratedPath(relative)) fail('UNSAFE_GIT_PATH', 'Git tree contains a non-allowlisted managed path')
      if (mode !== '100644') fail('UNSAFE_GIT_MODE', 'Generated Git entries must be regular non-executable files')
      if (!/^[a-f0-9]{40,64}$/.test(objectId ?? '')) fail('INVALID_GIT_TREE', 'Git tree contains an invalid object id')
      const foldedPath = relative.toLowerCase()
      if (folded.has(foldedPath)) fail('DUPLICATE_GIT_PATH', 'Git tree contains duplicate or case-colliding generated paths')
      folded.add(foldedPath)
      records.set(relative, objectId)
    }
  }
  return records
}

function parseManifestBytes(bytes) {
  let manifest
  try {
    manifest = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
  } catch {
    fail('INVALID_MANIFEST', 'Mirror manifest is not valid UTF-8 JSON')
  }
  exactKeys(manifest, ['schemaVersion', 'exportRevision', 'exporterVersion', 'counts', 'files'], 'INVALID_MANIFEST')
  contract(manifest.schemaVersion === 1, 'mirror-manifest.json:schemaVersion', 'INVALID_MANIFEST')
  assertRevision(manifest.exportRevision)
  assertExporterVersion(manifest.exporterVersion)
  validateCounts(manifest.counts)
  contract(Array.isArray(manifest.files) && manifest.files.length <= MAX_FILES, 'mirror-manifest.json:files', 'INVALID_MANIFEST')
  const paths = manifest.files.map((entry) => entry?.path)
  assertSortedUniquePaths(paths)
  for (const entry of manifest.files) {
    exactKeys(entry, ['path', 'sha256', 'bytes'], 'INVALID_MANIFEST')
    contract(HASH.test(entry.sha256), 'mirror-manifest.json:files.sha256', 'INVALID_MANIFEST')
    contract(Number.isSafeInteger(entry.bytes) && entry.bytes >= 0 && entry.bytes <= MAX_FILE_BYTES, 'mirror-manifest.json:files.bytes', 'INVALID_MANIFEST')
  }
  const canonical = Buffer.from(stableJson(manifest), 'utf8')
  contract(bytes.equals(canonical), 'mirror-manifest.json:canonical', 'INVALID_MANIFEST')
  return manifest
}

function verifyGeneratedFileMap(fileMap) {
  const manifestBytes = fileMap.get('mirror-manifest.json')
  contract(manifestBytes !== undefined, 'mirror-manifest.json', 'MANIFEST_TREE_MISMATCH')
  const manifest = parseManifestBytes(manifestBytes)
  const expectedPaths = new Set([...manifest.files.map((entry) => entry.path), 'mirror-manifest.json'])
  contract(fileMap.size === expectedPaths.size, 'generated-tree', 'MANIFEST_TREE_MISMATCH')
  for (const relative of fileMap.keys()) contract(expectedPaths.has(relative), relative, 'MANIFEST_TREE_MISMATCH')
  for (const entry of manifest.files) {
    const bytes = fileMap.get(entry.path)
    contract(bytes !== undefined, entry.path, 'MANIFEST_TREE_MISMATCH')
    contract(bytes.length === entry.bytes && sha256(bytes) === entry.sha256, entry.path, 'MANIFEST_TREE_MISMATCH')
  }
  validatePublicMirrorFileMap(fileMap, { exportRevision: manifest.exportRevision, manifest })
  return {
    exportRevision: manifest.exportRevision,
    files: fileMap.size,
    manifestSha256: sha256(manifestBytes),
  }
}

export async function verifyMirrorDirectory({ root }) {
  const repositoryRoot = await checkedRoot(root)
  const existing = await collectExistingManagedFiles(repositoryRoot)
  const fileMap = new Map()
  let total = 0
  for (const relative of [...existing].sort((left, right) => left.localeCompare(right, 'en'))) {
    const absolute = path.join(repositoryRoot, ...relative.split('/'))
    const info = await pathInfo(absolute)
    if (info === null || info.isSymbolicLink() || !info.isFile()) fail('UNSAFE_EXISTING_TREE', 'Managed output is not a regular file')
    const bytes = await readFile(absolute)
    total += bytes.length
    if (bytes.length > MAX_FILE_BYTES || total > MAX_TOTAL_FILE_BYTES) fail('MIRROR_TOO_LARGE', 'Generated mirror exceeds its size limit')
    validateGeneratedText(bytes)
    fileMap.set(relative, bytes)
  }
  return verifyGeneratedFileMap(fileMap)
}

async function readGitGeneratedFileMap(root, kind) {
  const listing = kind === 'index'
    ? await runGit(root, ['ls-files', '--stage', '-z'])
    : await runGit(root, ['ls-tree', '-rz', '--full-tree', 'HEAD'])
  const records = parseGitRecords(listing, kind)
  contract(records.has('mirror-manifest.json'), 'mirror-manifest.json', 'INVALID_GIT_TREE')
  const fileMap = new Map()
  let total = 0
  for (const [relative, objectId] of records) {
    const bytes = await runGit(root, ['cat-file', 'blob', objectId], { maxBytes: MAX_FILE_BYTES + 1 })
    total += bytes.length
    if (bytes.length > MAX_FILE_BYTES || total > MAX_TOTAL_FILE_BYTES) {
      fail('GIT_TREE_TOO_LARGE', 'Generated Git tree exceeds the mirror size limit')
    }
    validateGeneratedText(bytes)
    fileMap.set(relative, bytes)
  }
  return fileMap
}

export async function verifyGitMirror({ root, kind = 'tree' }) {
  contract(kind === 'index' || kind === 'tree', 'git-kind', 'INVALID_ARGUMENTS')
  const repositoryRoot = await checkedRoot(root)
  if (kind === 'tree') {
    const status = await runGit(repositoryRoot, ['status', '--porcelain=v1', '-z', '--untracked-files=all'])
    if (status.length !== 0) fail('DIRTY_GIT_CHECKOUT', 'Git mirror verification requires a clean checkout')
  }
  const fileMap = await readGitGeneratedFileMap(repositoryRoot, kind)
  return verifyGeneratedFileMap(fileMap)
}

async function readSnapshotFile(file) {
  const info = await pathInfo(file)
  if (info === null || info.isSymbolicLink() || !info.isFile() || info.size > MAX_ENVELOPE_BYTES) {
    fail('INVALID_SNAPSHOT_FILE', 'Snapshot input must be a bounded regular file')
  }
  const bytes = await readFile(file)
  let envelope
  try {
    envelope = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
  } catch {
    fail('INVALID_JSON', 'CMS snapshot file is not valid UTF-8 JSON')
  }
  return validateSnapshotEnvelope(envelope)
}

function parseArguments(argv) {
  const options = {
    check: false,
    checkPaths: false,
    root: process.cwd(),
    seenRevisionsStdin: false,
    snapshotFile: undefined,
    url: undefined,
    verifyGitIndex: false,
    verifyGitTree: false,
    verifyWorktree: false,
  }
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    if (argument === '--check') options.check = true
    else if (argument === '--check-paths') options.checkPaths = true
    else if (argument === '--seen-revisions-stdin') options.seenRevisionsStdin = true
    else if (argument === '--verify-git-index') options.verifyGitIndex = true
    else if (argument === '--verify-git-tree') options.verifyGitTree = true
    else if (argument === '--verify-worktree') options.verifyWorktree = true
    else if (argument === '--root' || argument === '--url' || argument === '--snapshot-file') {
      const value = argv[index + 1]
      if (value === undefined || value.startsWith('--')) fail('INVALID_ARGUMENTS', 'Command option is missing its value')
      if (argument === '--root') options.root = value
      else if (argument === '--url') options.url = value
      else options.snapshotFile = value
      index += 1
    } else {
      fail('INVALID_ARGUMENTS', 'Unknown command option')
    }
  }
  const standaloneModes = Number(options.checkPaths) + Number(options.verifyGitIndex) + Number(options.verifyGitTree) + Number(options.verifyWorktree)
  if (standaloneModes > 1) fail('INVALID_ARGUMENTS', 'Only one standalone verification mode can be selected')
  if (standaloneModes > 0 && (options.check || options.url !== undefined || options.snapshotFile !== undefined || options.seenRevisionsStdin)) {
    fail('INVALID_ARGUMENTS', 'Standalone verification cannot be combined with snapshot options')
  }
  if (options.url !== undefined && options.snapshotFile !== undefined) {
    fail('INVALID_ARGUMENTS', 'Use either a snapshot URL or a snapshot file, not both')
  }
  return options
}

async function readStandardInput() {
  const chunks = []
  let total = 0
  for await (const chunk of process.stdin) {
    total += chunk.length
    if (total > 1024 * 1024) fail('PATH_INPUT_TOO_LARGE', 'Changed-path input exceeds its limit')
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}

async function runCli() {
  const options = parseArguments(process.argv.slice(2))
  if (options.checkPaths) {
    const source = (await readStandardInput()).toString('utf8')
    const paths = source.split(source.includes('\0') ? '\0' : '\n').filter(Boolean)
    for (const relative of paths) {
      if (!isAllowedGeneratedChangePath(relative)) fail('UNSAFE_CHANGED_PATH', 'Git change is outside the generated allowlist')
    }
    process.stdout.write(`PATHS_OK count=${paths.length}\n`)
    return
  }

  if (options.verifyGitIndex || options.verifyGitTree) {
    const result = await verifyGitMirror({ root: options.root, kind: options.verifyGitIndex ? 'index' : 'tree' })
    process.stdout.write(`GIT_MIRROR_OK revision=${result.exportRevision} manifest=${result.manifestSha256} files=${result.files}\n`)
    return
  }

  if (options.verifyWorktree) {
    const result = await verifyMirrorDirectory({ root: options.root })
    process.stdout.write(`MIRROR_TREE_OK revision=${result.exportRevision} manifest=${result.manifestSha256} files=${result.files}\n`)
    return
  }

  let seenRevisions = []
  if (options.seenRevisionsStdin) {
    let source
    try {
      source = new TextDecoder('utf-8', { fatal: true }).decode(await readStandardInput())
    } catch {
      fail('INVALID_SEEN_REVISIONS', 'Seen revision input must be valid UTF-8')
    }
    if (source.includes('\0') || source.includes('\r')) fail('INVALID_SEEN_REVISIONS', 'Seen revision input is malformed')
    seenRevisions = source.split('\n').map((value) => value.trim()).filter(Boolean)
    validateSeenRevisions(seenRevisions)
  }

  let result
  if (options.snapshotFile !== undefined) {
    const snapshot = await readSnapshotFile(options.snapshotFile)
    result = await syncValidatedSnapshot({ root: options.root, snapshot, check: options.check, seenRevisions })
  } else if (options.url !== undefined) {
    result = await syncCmsSnapshot()
  } else {
    fail('INVALID_ARGUMENTS', 'A validated snapshot file is required')
  }
  process.stdout.write(
    `MIRROR_${result.status.toUpperCase()} revision=${result.exportRevision} manifest=${result.manifestSha256} files=${result.fileMap.size} changes=${result.changes}\n`,
  )
}

const isMain = process.argv[1] !== undefined
  && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href

if (isMain) {
  runCli().catch((error) => {
    process.stderr.write(`${publicErrorMessage(error)}\n`)
    process.exitCode = 1
  })
}
