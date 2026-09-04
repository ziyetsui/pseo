import { isIP } from 'node:net'

import {
  PublicationContentValidationError,
  type PublicationContentValidationIssue,
  type PublicationContentValidationResult,
  type PublicationContentValidator,
  type PublicationDraftSelection,
} from '../domain/index.ts'
import {
  buildCanonicalPromptBundle,
  canonicalBundleRevision,
  canonicalRecordRevision,
  type CanonicalPromptDocument,
  type CanonicalTaxonomyDocument,
} from './canonicalPromptBundle.ts'

export interface PayloadContentValidationApi {
  find(args: Record<string, unknown>): Promise<{ docs: unknown[] }>
}

type UnknownRecord = Record<string, unknown>

const CONTENT_TYPES = new Set(['image', 'video', 'text', 'other'])
const PARAMETER_TYPES = new Set(['text', 'number', 'enum', 'boolean'])
const SOURCE_PLATFORMS = new Set(['x', 'rss', 'url', 'manual'])
const TOKEN_PATTERN = /\[[A-Z][A-Z0-9_]{1,39}\]/gu
const ARTIFACT_PATTERN = /^prm_[a-z0-9_]{8,64}$/u
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u
const LANGUAGE_PATTERN = /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/u
const PARAMETER_KEY_PATTERN = /^[A-Z][A-Z0-9_]{1,39}$/u
const SHA256_PATTERN = /^sha256:[a-f0-9]{64}$/u
const TAXONOMY_AXES = {
  models: 'model',
  useCases: 'use_case',
  techniques: 'technique',
  styles: 'style',
  subjects: 'subject',
} as const
const PROMPTLAB_CANONICAL_BASE = 'https://github.com/ziyetsui/prompt-lab/blob/main'
const RIGHTS_BASIS_MINIMUM = 12
const RIGHTS_BASIS_MAXIMUM = 500
const RIGHTS_REVIEWER_MAXIMUM = 100
const RIGHTS_LICENSE_MAXIMUM = 200
const SECRET_PATTERNS = [
  /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----/u,
  /\bgh[pousr]_[A-Za-z0-9]{30,}\b/u,
  /\bgithub_pat_[A-Za-z0-9_]{40,}\b/u,
  /\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{24,}\b/u,
  /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/u,
  /\bAIza[0-9A-Za-z_-]{35}\b/u,
  /\bBearer[ \t]+[^\s"'<>\[\]{}]{16,}/iu,
  /\b(?:https?|postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis):\/\/[^\s/@:]+:[^\s/@]+@/iu,
  /\b(?:api[_-]?key|access[_-]?token|client[_-]?secret|password|aws_secret_access_key)\b[ \t]*[:=][ \t]*["']?[A-Za-z0-9_./+~=-]{20,}/iu,
]
const EXECUTABLE_HTML_PATTERNS = [
  /<\s*\/?\s*(?:script|iframe|object|embed|style)\b/iu,
  /<[^>]{0,4096}\s+on[a-z]{2,32}\s*=/iu,
  /\bjavascript\s*:/iu,
  /\bdata\s*:\s*text\/html/iu,
]

function record(value: unknown): UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {}
}

function rows(value: unknown): UnknownRecord[] {
  return Array.isArray(value) ? value.map(record) : []
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function nullableText(value: unknown): string | null {
  const normalized = text(value)
  return normalized === '' ? null : normalized
}

function dateOnly(value: unknown): string {
  const normalized = text(value)
  return /^\d{4}-\d{2}-\d{2}(?:T|$)/u.test(normalized) ? normalized.slice(0, 10) : normalized
}

function numberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function relationshipIdentity(value: unknown): string | null {
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  const relation = record(value)
  return nullableText(relation.taxonomyKey) ?? nullableText(relation.artifactKey) ?? nullableText(relation.id)
}

function relationshipIdentities(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.map(relationshipIdentity).filter((item): item is string => item !== null).sort()
}

function decodeHtmlEntitiesForSafety(value: string): string {
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
    const next = decoded.replace(
      /&(?:#(\d{1,7})|#x([a-f0-9]{1,6})|([a-z][a-z0-9]+));/giu,
      (match, decimal: string | undefined, hexadecimal: string | undefined, name: string | undefined) => {
        if (name !== undefined) return named.get(name.toLowerCase()) ?? match
        const codePoint = Number.parseInt(decimal ?? hexadecimal ?? '', decimal === undefined ? 16 : 10)
        if (!Number.isSafeInteger(codePoint) || codePoint < 0 || codePoint > 0x10ffff) return match
        try {
          return String.fromCodePoint(codePoint)
        } catch {
          return match
        }
      },
    )
    if (next === decoded) break
    decoded = next
  }
  return decoded
}

function containsExecutableContent(value: string): boolean {
  const decoded = decodeHtmlEntitiesForSafety(value)
  if (EXECUTABLE_HTML_PATTERNS.some((pattern) => pattern.test(decoded))) return true
  const compact = decoded.replace(/[\u0000-\u0020\u007f-\u00a0]+/gu, '').toLowerCase()
  return compact.includes('javascript:') || compact.includes('data:text/html')
}

function forbiddenIpv4(hostname: string): boolean {
  const octets = hostname.split('.').map(Number)
  const [first, second, third] = octets
  return first === 0
    || first === 10
    || first === 127
    || (first !== undefined && first >= 224)
    || (first === 100 && second !== undefined && second >= 64 && second <= 127)
    || (first === 169 && second === 254)
    || (first === 172 && second !== undefined && second >= 16 && second <= 31)
    || (first === 192 && second === 0)
    || (first === 192 && second === 88 && third === 99)
    || (first === 192 && second === 168)
    || (first === 198 && (second === 18 || second === 19 || second === 51))
    || (first === 203 && second === 0)
}

function forbiddenIpv6(hostname: string): boolean {
  const normalized = hostname.toLowerCase()
  return normalized === '::'
    || normalized === '::1'
    || normalized.startsWith('fc')
    || normalized.startsWith('fd')
    || /^fe[89ab]/u.test(normalized)
    || normalized.startsWith('::ffff:')
    || normalized.startsWith('ff')
    || normalized === '100::'
    || normalized.startsWith('100::')
    || normalized.startsWith('2001:db8:')
}

function forbiddenHostname(hostname: string): boolean {
  const normalized = hostname.replace(/^\[|\]$/gu, '').replace(/\.+$/gu, '').toLowerCase()
  const addressType = isIP(normalized)
  return normalized === 'localhost'
    || normalized.endsWith('.localhost')
    || normalized.endsWith('.local')
    || normalized.endsWith('.internal')
    || (!addressType && !normalized.includes('.'))
    || (addressType === 4 && forbiddenIpv4(normalized))
    || (addressType === 6 && forbiddenIpv6(normalized))
}

function validHttpsUrl(value: string): boolean {
  if (
    value.length === 0
    || value.length > 2_048
    || decodeHtmlEntitiesForSafety(value) !== value
    || containsExecutableContent(value)
  ) return false
  try {
    const url = new URL(value)
    return url.protocol === 'https:'
      && url.username === ''
      && url.password === ''
      && !forbiddenHostname(url.hostname)
  } catch {
    return false
  }
}

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) return false
  const parsed = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().startsWith(value)
}

function validDateTime(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/u.test(value) &&
    !Number.isNaN(Date.parse(value))
}

function promptFence(body: string): string | null {
  const matches = [...body.matchAll(/```prompt\n([\s\S]*?)\n```/gu)]
  return matches.length === 1 ? (matches[0]?.[1]?.trim() ?? null) : null
}

interface ValidatorContext {
  readonly issues: PublicationContentValidationIssue[]
}

function addIssue(
  context: ValidatorContext,
  path: string,
  code: string,
  message: string,
): void {
  context.issues.push({ path, code, message })
}

function validateTextSafety(context: ValidatorContext, value: string, path: string): void {
  if (SECRET_PATTERNS.some((pattern) => pattern.test(value))) {
    addIssue(context, path, 'SECRET_DETECTED', 'Must not contain credentials or secret-like values')
  }
  if (containsExecutableContent(value)) {
    addIssue(context, path, 'EXECUTABLE_CONTENT_FORBIDDEN', 'Must not contain executable HTML or URL content')
  }
}

function requireText(
  context: ValidatorContext,
  value: unknown,
  path: string,
  minimum = 1,
): string {
  const normalized = text(value)
  if (normalized.length < minimum) addIssue(context, path, 'REQUIRED', `Must contain at least ${minimum} characters`)
  validateTextSafety(context, normalized, path)
  return normalized
}

function requireBoundedText(
  context: ValidatorContext,
  value: unknown,
  path: string,
  minimum: number,
  maximum: number,
): string {
  const normalized = requireText(context, value, path, minimum)
  if (normalized.length > maximum) {
    addIssue(context, path, 'MAX_LENGTH', `Must contain at most ${maximum} characters`)
  }
  return normalized
}

function nullableBoundedText(
  context: ValidatorContext,
  value: unknown,
  path: string,
  maximum: number,
): string | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value !== 'string') {
    addIssue(context, path, 'INVALID_TYPE', 'Must be a string or null')
    return null
  }
  const normalized = value.trim()
  validateTextSafety(context, normalized, path)
  if (normalized.length > maximum) {
    addIssue(context, path, 'MAX_LENGTH', `Must contain at most ${maximum} characters`)
  }
  return normalized === '' ? null : normalized
}

function normalizeStringList(
  context: ValidatorContext,
  value: unknown,
  path: string,
  options: {
    readonly maximum?: number
    readonly minimumItems?: number
    readonly pattern?: RegExp
  } = {},
): string[] {
  if (!Array.isArray(value)) {
    addIssue(context, path, 'INVALID_LIST', 'Must be an array')
    return []
  }
  const minimumItems = options.minimumItems ?? 0
  if (value.length < minimumItems) {
    addIssue(context, path, 'MIN_ITEMS', `Must contain at least ${minimumItems} items`)
  }
  const normalized = value.map((raw, index) => {
    const itemPath = `${path}[${index}]`
    const item = record(raw)
    const itemValue = requireBoundedText(context, item.value, itemPath, 1, options.maximum ?? 160)
    if (options.pattern !== undefined && !options.pattern.test(itemValue)) {
      addIssue(context, itemPath, 'INVALID_PATTERN', 'Must match the public content contract')
    }
    return itemValue
  })
  const seen = new Set<string>()
  for (const [index, item] of normalized.entries()) {
    if (seen.has(item)) addIssue(context, `${path}[${index}]`, 'DUPLICATE_VALUE', 'List items must be unique')
    seen.add(item)
  }
  return normalized
}

function validateBoolean(context: ValidatorContext, value: unknown, path: string): boolean {
  if (typeof value !== 'boolean') addIssue(context, path, 'INVALID_TYPE', 'Must be a boolean')
  return value === true
}

function normalizeMetric(context: ValidatorContext, value: unknown, path: string): number | null {
  if (value === null) return null
  if (!Number.isSafeInteger(value) || Number(value) < 0) {
    addIssue(context, path, 'INVALID_METRIC', 'Must be null or a non-negative safe integer')
    return null
  }
  return Number(value)
}

function validateMarkdownLinks(context: ValidatorContext, bodyMarkdown: string, path: string): void {
  const validateTarget = (rawTarget: string): void => {
    const target = rawTarget.startsWith('<') && rawTarget.endsWith('>')
      ? rawTarget.slice(1, -1)
      : rawTarget
    if (target.startsWith('#')) return
    if (!validHttpsUrl(target)) {
      addIssue(
        context,
        path,
        'UNSAFE_MARKDOWN_LINK',
        'Markdown links must use an anchor or a safe public HTTPS URL',
      )
    }
  }
  const inline = /!?\[[^\]]*\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/gu
  for (const match of bodyMarkdown.matchAll(inline)) {
    const target = match[1]
    if (target !== undefined) validateTarget(target)
  }
  const references = /^\s{0,3}\[[^\]]+\]:\s*(\S+)/gmu
  for (const match of bodyMarkdown.matchAll(references)) {
    const target = match[1]
    if (target !== undefined) validateTarget(target)
  }
}

function canonicalFingerprint(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalFingerprint).join(',')}]`
  if (typeof value === 'object' && value !== null) {
    const item = value as UnknownRecord
    return `{${Object.keys(item).sort().map((key) => `${JSON.stringify(key)}:${canonicalFingerprint(item[key])}`).join(',')}}`
  }
  return JSON.stringify(value)
}

function validateUniqueObjects(
  context: ValidatorContext,
  values: readonly unknown[],
  path: string,
): void {
  const seen = new Set<string>()
  for (const [index, value] of values.entries()) {
    const fingerprint = canonicalFingerprint(value)
    if (seen.has(fingerprint)) addIssue(context, `${path}[${index}]`, 'DUPLICATE_VALUE', 'Items must be unique')
    seen.add(fingerprint)
  }
}

function normalizeMedia(value: unknown): unknown[] {
  return rows(value).map((item) => ({
    assetId: text(item.assetId),
    type: text(item.mediaType),
    url: text(item.url),
    width: numberOrNull(item.width),
    height: numberOrNull(item.height),
    alt: text(item.alt),
    posterUrl: nullableText(item.posterUrl),
  }))
}

function normalizeCreator(context: ValidatorContext, value: unknown): UnknownRecord | null {
  if (value === null || value === undefined || value === '') return null
  const relation = record(value)
  const taxonomyKey = requireText(context, relation.taxonomyKey, 'artifact.creator.taxonomyKey')
  const slug = requireBoundedText(context, relation.slug, 'artifact.creator.slug', 3, 96)
  const name = requireBoundedText(context, relation.name, 'artifact.creator.name', 1, 100)
  const identity = taxonomyKey.startsWith('creator:') ? taxonomyKey.slice('creator:'.length) : taxonomyKey
  const id = identity.startsWith('ctr_')
    ? identity
    : `ctr_${identity.toLowerCase().replace(/[^a-z0-9_]+/gu, '_').replace(/^_+|_+$/gu, '')}`
  if (!/^ctr_[a-z0-9_]{3,64}$/u.test(id)) {
    addIssue(context, 'artifact.creator.taxonomyKey', 'INVALID_CREATOR_ID', 'Must resolve to a canonical creator id')
  }
  if (!SLUG_PATTERN.test(slug)) {
    addIssue(context, 'artifact.creator.slug', 'INVALID_TAXONOMY_SLUG', 'Must be a canonical taxonomy slug')
  }
  return { id, slug, name }
}

function normalizeArtifact(
  context: ValidatorContext,
  artifact: UnknownRecord,
  input: PublicationDraftSelection,
): UnknownRecord {
  const artifactId = requireText(context, artifact.artifactKey, 'artifact.artifactKey')
  if (artifactId !== input.artifactId) {
    addIssue(context, 'artifact.artifactKey', 'ARTIFACT_ID_MISMATCH', 'Artifact does not match the request')
  }
  if (!ARTIFACT_PATTERN.test(artifactId)) {
    addIssue(context, 'artifact.artifactKey', 'INVALID_ARTIFACT_ID', 'Must match the Git content artifact id contract')
  }
  if (artifact.draftWorkflowState !== 'validated') {
    addIssue(context, 'artifact.draftWorkflowState', 'NOT_VALIDATED', 'PromptArtifact must be validated')
  }

  const contentType = text(artifact.contentType)
  const sourceLocale = text(artifact.sourceLocale)
  if (!CONTENT_TYPES.has(contentType)) {
    addIssue(context, 'artifact.contentType', 'INVALID_ENUM', 'Unsupported content type')
  }
  if (sourceLocale !== 'en' && sourceLocale !== 'zh-CN') {
    addIssue(context, 'artifact.sourceLocale', 'INVALID_LOCALE', 'Unsupported source locale')
  }

  const prompt = record(artifact.prompt)
  const language = requireText(context, prompt.language, 'artifact.prompt.language')
  if (!LANGUAGE_PATTERN.test(language)) {
    addIssue(context, 'artifact.prompt.language', 'INVALID_LANGUAGE', 'Must use a canonical BCP-47 language tag')
  }
  const promptText = requireBoundedText(context, prompt.text, 'artifact.prompt.text', 80, 20_000)
  if (!Array.isArray(prompt.variables)) {
    addIssue(context, 'artifact.prompt.variables', 'INVALID_LIST', 'Must be an array')
  }
  const variables = rows(prompt.variables).map((variable, index) => {
    const itemPath = `artifact.prompt.variables[${index}]`
    const key = requireText(context, variable.key, `${itemPath}.key`)
    if (!/^\[[A-Z][A-Z0-9_]{1,39}\]$/u.test(key)) {
      addIssue(context, `${itemPath}.key`, 'INVALID_VARIABLE_KEY', 'Use [UPPER_SNAKE_CASE]')
    }
    return {
      key,
      label: requireBoundedText(context, variable.label, `${itemPath}.label`, 1, 80),
      required: validateBoolean(context, variable.required, `${itemPath}.required`),
      defaultValue: nullableBoundedText(context, variable.defaultValue, `${itemPath}.defaultValue`, 120),
      options: normalizeStringList(context, variable.options, `${itemPath}.options`),
    }
  })
  if (variables.length === 0) {
    addIssue(context, 'artifact.prompt.variables', 'MIN_ITEMS', 'At least one Prompt variable is required')
  }
  validateUniqueObjects(context, variables, 'artifact.prompt.variables')
  const variableKeys = new Set<string>()
  for (const [index, variable] of variables.entries()) {
    if (variableKeys.has(variable.key)) {
      addIssue(context, `artifact.prompt.variables[${index}].key`, 'DUPLICATE_VARIABLE_KEY', 'Variable keys must be unique')
    }
    variableKeys.add(variable.key)
  }
  const usedTokens = [...new Set(promptText.match(TOKEN_PATTERN) ?? [])].sort()
  const declaredTokens = [...new Set(variables.map((variable) => variable.key))].sort()
  if (JSON.stringify(usedTokens) !== JSON.stringify(declaredTokens)) {
    addIssue(context, 'artifact.prompt.variables', 'VARIABLE_DRIFT', 'Variables must exactly cover Prompt tokens')
  }

  const outcome = record(artifact.outcome)
  const outputType = requireText(context, outcome.outputType, 'artifact.outcome.outputType')
  if (!CONTENT_TYPES.has(outputType) || outputType !== contentType) {
    addIssue(context, 'artifact.outcome.outputType', 'OUTPUT_TYPE_MISMATCH', 'Must equal contentType')
  }
  const platforms = normalizeStringList(context, outcome.platforms, 'artifact.outcome.platforms', {
    maximum: 96,
    minimumItems: 1,
    pattern: SLUG_PATTERN,
  })

  if (!Array.isArray(artifact.parameters)) {
    addIssue(context, 'artifact.parameters', 'INVALID_LIST', 'Must be an array')
  }
  const parameters = rows(artifact.parameters).map((parameter, index) => {
    const itemPath = `artifact.parameters[${index}]`
    const key = requireText(context, parameter.key, `${itemPath}.key`)
    if (!PARAMETER_KEY_PATTERN.test(key)) {
      addIssue(context, `${itemPath}.key`, 'INVALID_PARAMETER_KEY', 'Use UPPER_SNAKE_CASE')
    }
    const valueType = requireText(context, parameter.valueType, `${itemPath}.valueType`)
    if (!PARAMETER_TYPES.has(valueType)) {
      addIssue(context, `${itemPath}.valueType`, 'INVALID_ENUM', 'Unsupported parameter type')
    }
    return {
      key,
      label: requireBoundedText(context, parameter.label, `${itemPath}.label`, 1, 80),
      type: valueType,
      required: validateBoolean(context, parameter.required, `${itemPath}.required`),
      options: normalizeStringList(context, parameter.options, `${itemPath}.options`),
    }
  })
  if (parameters.length === 0) {
    addIssue(context, 'artifact.parameters', 'MIN_ITEMS', 'At least one parameter is required')
  }
  validateUniqueObjects(context, parameters, 'artifact.parameters')
  const parameterKeys = new Set<string>()
  for (const [index, parameter] of parameters.entries()) {
    if (parameterKeys.has(parameter.key)) {
      addIssue(context, `artifact.parameters[${index}].key`, 'DUPLICATE_PARAMETER_KEY', 'Parameter keys must be unique')
    }
    parameterKeys.add(parameter.key)
  }
  const parameterTokens = [...new Set(parameters.map((parameter) => `[${parameter.key}]`))].sort()
  if (JSON.stringify(parameterTokens) !== JSON.stringify(declaredTokens)) {
    addIssue(context, 'artifact.parameters', 'PARAMETER_DRIFT', 'Parameters must exactly cover Prompt variables')
  }

  const taxonomy: UnknownRecord = {}
  for (const [field, expectedAxis] of Object.entries(TAXONOMY_AXES)) {
    if (!Array.isArray(artifact[field])) {
      addIssue(context, `artifact.${field}`, 'INVALID_LIST', 'Must be an array')
    }
    const relations = rows(artifact[field])
    const slugs = relations.map((relation, index) => {
      const path = `artifact.${field}[${index}]`
      const slug = nullableBoundedText(context, relation.slug, `${path}.slug`, 96)
      if (relation.axis !== expectedAxis) {
        addIssue(context, `${path}.axis`, 'TAXONOMY_AXIS_MISMATCH', `Must equal ${expectedAxis}`)
      }
      if (slug !== null && (slug.length < 3 || !SLUG_PATTERN.test(slug))) {
        addIssue(context, `${path}.slug`, 'INVALID_TAXONOMY_SLUG', 'Must be a canonical taxonomy slug')
      }
      return slug
    }).filter((item): item is string => item !== null)
    if (relations.length === 0 || slugs.length !== relations.length) {
      addIssue(context, `artifact.${field}`, 'TAXONOMY_UNRESOLVED', 'At least one populated taxonomy relation with a slug is required')
    }
    const seen = new Set<string>()
    for (const [index, slug] of slugs.entries()) {
      if (seen.has(slug)) addIssue(context, `artifact.${field}[${index}].slug`, 'DUPLICATE_VALUE', 'Taxonomy slugs must be unique')
      seen.add(slug)
    }
    taxonomy[field] = [...new Set(slugs)].sort()
  }
  if (JSON.stringify(taxonomy.models) !== JSON.stringify(['model-agnostic'])) {
    addIssue(
      context,
      'artifact.models',
      'UNSUPPORTED_PUBLIC_MODEL_TAXONOMY',
      'The Day-1 public bundle supports exactly the product-owned model-agnostic taxonomy',
    )
  }

  const metrics = record(artifact.metrics)
  const metricsObservedAt = requireText(context, metrics.observedAt, 'artifact.metrics.observedAt')
  if (!validDateTime(metricsObservedAt)) {
    addIssue(context, 'artifact.metrics.observedAt', 'INVALID_DATE_TIME', 'Must be an RFC 3339 UTC date-time')
  }

  if (!Array.isArray(artifact.media)) addIssue(context, 'artifact.media', 'INVALID_LIST', 'Must be an array')
  if (rows(artifact.media).length > 0) {
    addIssue(context, 'artifact.media', 'UNVERIFIED_MEDIA', 'Public contract v1 requires media to remain empty')
  }
  if (!Array.isArray(artifact.examples)) addIssue(context, 'artifact.examples', 'INVALID_LIST', 'Must be an array')
  if (rows(artifact.examples).length > 0) {
    addIssue(context, 'artifact.examples', 'UNVERIFIED_MEDIA', 'Public contract v1 requires examples to remain empty')
  }
  const examples = rows(artifact.examples).map((example) => ({
    id: text(example.exampleId),
    input: nullableText(example.input),
    output: normalizeMedia([record(example.output)])[0] ?? null,
    caption: nullableText(example.caption),
  }))
  const relatedPromptIds = relationshipIdentities(artifact.relatedPrompts)
  if (!Array.isArray(artifact.relatedPrompts)) {
    addIssue(context, 'artifact.relatedPrompts', 'INVALID_LIST', 'Must be an array')
  }
  if (Array.isArray(artifact.relatedPrompts) && artifact.relatedPrompts.length > 0) {
    addIssue(context, 'artifact.relatedPrompts', 'UNRESOLVED_RELATED_PROMPT', 'Public contract v1 requires relatedPromptIds to remain empty')
  }
  const actions = record(artifact.actions)
  const tryUrl = nullableBoundedText(context, actions.tryUrl, 'artifact.actions.tryUrl', 2_048)
  if (tryUrl !== null && !validHttpsUrl(tryUrl)) {
    addIssue(context, 'artifact.actions.tryUrl', 'UNSAFE_PUBLIC_URL', 'Must use a safe public HTTPS URL')
  }

  return {
    id: artifactId,
    contentType,
    sourceLocale,
    prompt: {
      language,
      text: promptText,
      variables,
    },
    outcome: { outputType, platforms },
    inputs: {
      required: normalizeStringList(context, artifact.requiredInputs, 'artifact.requiredInputs'),
      optional: normalizeStringList(context, artifact.optionalInputs, 'artifact.optionalInputs'),
    },
    parameters,
    taxonomy,
    media: normalizeMedia(artifact.media),
    metrics: {
      likes: normalizeMetric(context, metrics.likes, 'artifact.metrics.likes'),
      bookmarks: normalizeMetric(context, metrics.bookmarks, 'artifact.metrics.bookmarks'),
      comments: normalizeMetric(context, metrics.comments, 'artifact.metrics.comments'),
      reposts: normalizeMetric(context, metrics.reposts, 'artifact.metrics.reposts'),
      views: normalizeMetric(context, metrics.views, 'artifact.metrics.views'),
      observedAt: metricsObservedAt,
    },
    examples,
    creator: normalizeCreator(context, artifact.creator),
    relatedPromptIds,
    actions: {
      canCopy: validateBoolean(context, actions.canCopy, 'artifact.actions.canCopy'),
      tryUrl,
    },
  }
}

function normalizeVariant(
  context: ValidatorContext,
  candidate: UnknownRecord,
  artifact: UnknownRecord,
  requested: boolean,
  path: string,
): UnknownRecord {
  const locale = requireText(context, candidate.locale, `${path}.locale`)
  const sourceLocale = requireText(context, candidate.sourceLocale, `${path}.sourceLocale`)
  if (locale !== 'en' && locale !== 'zh-CN') {
    addIssue(context, `${path}.locale`, 'INVALID_LOCALE', 'Unsupported locale')
  }
  if (sourceLocale !== 'en' && sourceLocale !== 'zh-CN') {
    addIssue(context, `${path}.sourceLocale`, 'INVALID_LOCALE', 'Unsupported source locale')
  }
  if (sourceLocale !== artifact.sourceLocale) {
    addIssue(context, `${path}.sourceLocale`, 'SOURCE_LOCALE_DRIFT', 'Must match PromptArtifact.sourceLocale')
  }
  const slug = requireBoundedText(context, candidate.slug, `${path}.slug`, 3, 96)
  if (!SLUG_PATTERN.test(slug)) addIssue(context, `${path}.slug`, 'INVALID_SLUG', 'Must be a canonical locale slug')
  const title = requireBoundedText(context, candidate.title, `${path}.title`, 4, 120)
  const summary = requireBoundedText(context, candidate.summary, `${path}.summary`, 24, 320)

  const bodyMarkdown = requireText(context, candidate.bodyMarkdown, `${path}.bodyMarkdown`)
  if (promptFence(bodyMarkdown) !== record(artifact.prompt).text) {
    addIssue(context, `${path}.bodyMarkdown`, 'PROMPT_BODY_DRIFT', 'The single prompt fence must equal PromptArtifact.prompt.text')
  }
  if (bodyMarkdown.includes('\r')) {
    addIssue(context, `${path}.bodyMarkdown`, 'CR_FORBIDDEN', 'Markdown must use LF line endings')
  }
  if (/<\/?[A-Za-z][^>]*>/u.test(bodyMarkdown)) {
    addIssue(context, `${path}.bodyMarkdown`, 'RAW_HTML_FORBIDDEN', 'Raw HTML is not allowed in canonical Markdown')
  }
  if ((bodyMarkdown.split('\n').find((line) => line.trim() !== '') ?? '') !== `# ${title}`) {
    addIssue(context, `${path}.bodyMarkdown`, 'H1_MISMATCH', 'First non-empty line must exactly match the localized title')
  }
  validateMarkdownLinks(context, bodyMarkdown, `${path}.bodyMarkdown`)

  if (!Array.isArray(candidate.workflow)) {
    addIssue(context, `${path}.workflow`, 'INVALID_LIST', 'Must be an array')
  }
  const workflow = rows(candidate.workflow).map((step, index) => {
    const position = step.position
    if (!Number.isSafeInteger(position) || Number(position) < 1 || Number(position) > 20) {
      addIssue(context, `${path}.workflow[${index}].position`, 'INVALID_POSITION', 'Must be a safe integer from 1 to 20')
    }
    return {
      position,
      title: requireBoundedText(context, step.title, `${path}.workflow[${index}].title`, 2, 100),
      body: requireBoundedText(context, step.body, `${path}.workflow[${index}].body`, 4, 400),
    }
  })
  if (
    workflow.length < 2
    || workflow.length > 20
    || workflow.some((step, index) => step.position !== index + 1)
  ) {
    addIssue(context, `${path}.workflow`, 'WORKFLOW_ORDER', 'Two to twenty contiguous steps starting at 1 are required')
  }
  validateUniqueObjects(context, workflow.map((step) => step.position), `${path}.workflow.position`)

  const translation = record(candidate.translation)
  if (requested && translation.translationStatus !== 'ready') {
    addIssue(context, `${path}.translation.translationStatus`, 'LOCALE_NOT_READY', 'Requested locale must be ready')
  }
  if (requested && text(translation.reviewer) === '') {
    addIssue(context, `${path}.translation.reviewer`, 'REVIEWER_REQUIRED', 'Requested locale requires a reviewer')
  }
  const reviewer = nullableBoundedText(context, translation.reviewer, `${path}.translation.reviewer`, 80)

  const seo = record(candidate.seo)
  const updatedAt = requireText(context, candidate.updatedAt, `${path}.updatedAt`)
  if (!validDateTime(updatedAt)) {
    addIssue(context, `${path}.updatedAt`, 'INVALID_DATE_TIME', 'Must be a trusted Payload RFC 3339 UTC update timestamp')
  }
  const indexable = validateBoolean(context, candidate.indexable, `${path}.indexable`)
  if (requested && indexable) {
    addIssue(
      context,
      `${path}.indexable`,
      'GOVERNANCE_CLEARANCE_REQUIRED',
      'CMS drafts remain noindex until a revision-bound human approval enters the public snapshot',
    )
  }
  const expectedRobots = indexable ? 'index,follow' : 'noindex,nofollow'
  if (seo.robots !== expectedRobots) {
    addIssue(context, `${path}.seo.robots`, 'ROBOTS_MISMATCH', `Must equal ${expectedRobots}`)
  }

  const localizedOutcome = record(candidate.localizedOutcome)
  const purpose = requireBoundedText(context, localizedOutcome.purpose, `${path}.localizedOutcome.purpose`, 8, 240)
  const characteristics = normalizeStringList(
    context,
    localizedOutcome.characteristics,
    `${path}.localizedOutcome.characteristics`,
  )
  return {
    locale,
    sourceLocale,
    slug,
    title,
    summary,
    bodyMarkdown,
    updatedAt,
    indexable,
    outcome: {
      purpose,
      characteristics,
    },
    workflow,
    translation: {
      status: text(translation.translationStatus),
      translatedFromRevision: nullableBoundedText(
        context,
        translation.translatedFromRevision,
        `${path}.translation.translatedFromRevision`,
        71,
      ),
      reviewer,
    },
    seo: {
      title: requireBoundedText(context, seo.title, `${path}.seo.title`, 8, 120),
      description: requireBoundedText(context, seo.description, `${path}.seo.description`, 32, 320),
      robots: text(seo.robots),
    },
  }
}

function normalizeProvenance(
  context: ValidatorContext,
  documents: readonly UnknownRecord[],
): {
  readonly communityNotice: UnknownRecord | null
  readonly evidence: unknown[]
  readonly rightsReview: UnknownRecord
  readonly source: UnknownRecord
} {
  const sources = documents.filter((item) => item.recordType === 'source')
  const primary = sources.filter((item) => item.isPrimarySource === true)
  if (primary.length !== 1) {
    addIssue(context, 'sourceEvidence', 'PRIMARY_SOURCE_CARDINALITY', 'Exactly one primary source is required')
  }
  const rawSource = primary[0] ?? sources[0] ?? {}
  const rightsStatus = text(rawSource.rightsStatus)
  const rawAuthorHandle = rightsStatus === 'community_attributed'
    ? rawSource.authorHandle
    : rawSource.creatorHandle
  const source = {
    platform: requireText(context, rawSource.sourcePlatform, 'source.platform'),
    sourceId: requireBoundedText(context, rawSource.sourceId, 'source.sourceId', 1, 160),
    url: requireBoundedText(context, rawSource.sourceUrl, 'source.url', 1, 2_048),
    authorHandle: nullableBoundedText(context, rawAuthorHandle, 'source.authorHandle', 80),
    publishedDate: dateOnly(rawSource.sourcePublishedDate),
    observedAt: requireText(context, rawSource.observedAt, 'source.observedAt'),
  }
  if (source.publishedDate === '') addIssue(context, 'source.publishedDate', 'REQUIRED', 'Published date is required')
  if (!SOURCE_PLATFORMS.has(source.platform)) addIssue(context, 'source.platform', 'INVALID_ENUM', 'Unsupported source platform')
  if (!validHttpsUrl(source.url)) addIssue(context, 'source.url', 'UNSAFE_PUBLIC_URL', 'Source URL must use safe public HTTPS')
  if (!validDate(source.publishedDate)) addIssue(context, 'source.publishedDate', 'INVALID_DATE', 'Must be YYYY-MM-DD')
  if (!validDateTime(source.observedAt)) addIssue(context, 'source.observedAt', 'INVALID_DATE_TIME', 'Must be an RFC 3339 UTC date-time')

  if (rightsStatus !== 'cleared' && rightsStatus !== 'community_attributed') {
    addIssue(
      context,
      'source.rightsStatus',
      'RIGHTS_NOT_CLEARED',
      'Primary source rights must be cleared or explicitly accepted as community-attributed before CMS approval',
    )
  }
  const reviewedBy = requireBoundedText(
    context,
    rawSource.reviewedBy,
    'source.rights.reviewedBy',
    1,
    RIGHTS_REVIEWER_MAXIMUM,
  )
  const reviewedAt = requireText(context, rawSource.reviewedAt, 'source.rights.reviewedAt')
  const rightsReview = rightsStatus === 'community_attributed'
      ? {
        status: rightsStatus,
        authorName: requireBoundedText(context, rawSource.authorName, 'source.rights.authorName', 1, 160),
        authorHandle: nullableBoundedText(context, rawSource.authorHandle, 'source.rights.authorHandle', 80),
        authorUrl: nullableBoundedText(context, rawSource.authorUrl, 'source.rights.authorUrl', 2_048),
        originalPostUrl: requireBoundedText(context, rawSource.originalPostUrl, 'source.rights.originalPostUrl', 1, 2_048),
        policyVersion: requireBoundedText(context, rawSource.policyVersion, 'source.rights.policyVersion', 1, 100),
        reviewedBy,
        reviewedAt,
        riskAcceptedBy: requireBoundedText(context, rawSource.riskAcceptedBy, 'source.rights.riskAcceptedBy', 1, 100),
        riskAcceptedAt: requireText(context, rawSource.riskAcceptedAt, 'source.rights.riskAcceptedAt'),
        takedownUrl: requireBoundedText(context, rawSource.takedownUrl, 'source.rights.takedownUrl', 1, 2_048),
      }
    : {
        status: rightsStatus,
        basis: requireBoundedText(
          context,
          rawSource.basis,
          'source.rights.basis',
          RIGHTS_BASIS_MINIMUM,
          RIGHTS_BASIS_MAXIMUM,
        ),
        reviewedBy,
        reviewedAt,
        evidenceUrl: requireBoundedText(context, rawSource.evidenceUrl, 'source.rights.evidenceUrl', 1, 2_048),
        licenseReference: requireBoundedText(
          context,
          rawSource.licenseReference,
          'source.rights.licenseReference',
          3,
          RIGHTS_LICENSE_MAXIMUM,
        ),
      }
  if (!validDateTime(String(rightsReview.reviewedAt))) {
    addIssue(context, 'source.rights.reviewedAt', 'INVALID_DATE_TIME', 'Must be an RFC 3339 UTC date-time')
  }
  let communityNotice: UnknownRecord | null = null
  if (rightsStatus === 'community_attributed') {
    const authorName = text(rightsReview.authorName)
    const authorUrl = nullableText(rightsReview.authorUrl)
    const originalPostUrl = text(rightsReview.originalPostUrl)
    const riskAcceptedAt = text(rightsReview.riskAcceptedAt)
    const takedownUrl = text(rightsReview.takedownUrl)
    if (/[\r\n<>]/u.test(authorName)) {
      addIssue(context, 'source.rights.authorName', 'UNSAFE_ATTRIBUTION', 'Author name must be safe single-line text')
    }
    if (authorUrl === null && nullableText(rawSource.authorHandle) === null) {
      addIssue(context, 'source.rights.authorUrl', 'AUTHOR_IDENTITY_REQUIRED', 'Author URL or creator handle is required')
    }
    if (authorUrl !== null && !validHttpsUrl(authorUrl)) {
      addIssue(context, 'source.rights.authorUrl', 'UNSAFE_PUBLIC_URL', 'Author URL must use safe public HTTPS')
    }
    if (!validHttpsUrl(originalPostUrl)) {
      addIssue(context, 'source.rights.originalPostUrl', 'UNSAFE_PUBLIC_URL', 'Original post URL must use safe public HTTPS')
    }
    if (originalPostUrl !== source.url) {
      addIssue(context, 'source.rights.originalPostUrl', 'SOURCE_URL_DRIFT', 'Original post URL must equal the primary source URL')
    }
    if (!validDateTime(riskAcceptedAt)) {
      addIssue(context, 'source.rights.riskAcceptedAt', 'INVALID_DATE_TIME', 'Must be an RFC 3339 UTC date-time')
    }
    if (!validHttpsUrl(takedownUrl)) {
      addIssue(context, 'source.rights.takedownUrl', 'UNSAFE_PUBLIC_URL', 'Takedown URL must use safe public HTTPS')
    }
    if (nullableText(rawSource.licenseReference) !== null) {
      addIssue(context, 'source.rights.licenseReference', 'COMMUNITY_LICENSE_FORBIDDEN', 'Community-attributed content must not be relicensed')
    }
    communityNotice = { authorName, authorUrl, originalPostUrl, takedownUrl }
  } else {
    const evidenceUrl = text(rightsReview.evidenceUrl)
    if (!validHttpsUrl(evidenceUrl)) {
      addIssue(context, 'source.rights.evidenceUrl', 'UNSAFE_PUBLIC_URL', 'Rights evidence URL must use safe public HTTPS')
    }
  }

  const evidence = documents.filter((item) => item.recordType === 'evidence').map((item, index) => {
    const url = requireBoundedText(context, item.evidenceUrl, `evidence[${index}].url`, 1, 2_048)
    const confidence = item.confidence === null ? null : numberOrNull(item.confidence)
    if (!validHttpsUrl(url)) addIssue(context, `evidence[${index}].url`, 'UNSAFE_PUBLIC_URL', 'Evidence URL must use safe public HTTPS')
    if (item.confidence !== null && (confidence === null || confidence < 0 || confidence > 1)) {
      addIssue(context, `evidence[${index}].confidence`, 'OUT_OF_RANGE', 'Confidence must be from 0 to 1')
    }
    return {
      type: requireBoundedText(context, item.evidenceType, `evidence[${index}].type`, 2, 80),
      url,
      confidence,
    }
  }).sort((left, right) => `${left.type}\u0000${left.url}`.localeCompare(`${right.type}\u0000${right.url}`, 'en'))
  if (evidence.length === 0) addIssue(context, 'evidence', 'MIN_ITEMS', 'At least one evidence record is required')
  validateUniqueObjects(context, evidence, 'evidence')
  const evidenceIdentities = new Set<string>()
  for (const [index, item] of evidence.entries()) {
    const identity = `${item.type}\u0000${item.url}`
    if (evidenceIdentities.has(identity)) {
      addIssue(context, `evidence[${index}]`, 'DUPLICATE_EVIDENCE', 'Evidence type and URL pairs must be unique')
    }
    evidenceIdentities.add(identity)
  }
  if (!evidence.some((item) => item.url === source.url)) {
    addIssue(context, 'evidence', 'SOURCE_EVIDENCE_MISSING', 'Evidence must include the primary source URL')
  }
  return { source, evidence, rightsReview, communityNotice }
}

function markdownLabel(value: string): string {
  return value.replace(/([\\`*_[\]()])/gu, '\\$1')
}

function appendCommunityNotice(
  bodyMarkdown: string,
  locale: unknown,
  notice: UnknownRecord | null,
): string {
  if (notice === null) return bodyMarkdown
  const chinese = locale === 'zh-CN'
  const authorName = markdownLabel(String(notice.authorName))
  const authorUrl = nullableText(notice.authorUrl)
  const author = authorUrl === null ? authorName : `[${authorName}](${authorUrl})`
  const heading = chinese ? '权利与署名' : 'Rights and attribution'
  const authorLabel = chinese ? '原作者' : 'Original author'
  const sourceLabel = chinese ? '原帖' : 'Original post'
  const retained = chinese ? '作者保留权利；该 Prompt 不适用仓库的开放内容许可证。' : 'The author retains rights; this Prompt is not offered under the repository content license.'
  const removal = chinese ? '申请更正或删除' : 'Request correction or removal'
  return [
    bodyMarkdown.trim(),
    '',
    `## ${heading}`,
    '',
    `${authorLabel}: ${author}`,
    '',
    `${sourceLabel}: ${String(notice.originalPostUrl)}`,
    '',
    retained,
    '',
    `[${removal}](${String(notice.takedownUrl)})`,
  ].join('\n')
}

function canonicalPromptFrontmatter(
  artifact: UnknownRecord,
  variant: UnknownRecord,
  provenance: { readonly evidence: unknown[]; readonly rightsReview: UnknownRecord; readonly source: UnknownRecord },
  sourceRevision: string,
): UnknownRecord {
  const taxonomy = record(artifact.taxonomy)
  const baseOutcome = record(artifact.outcome)
  const localizedOutcome = record(variant.outcome)
  const translation = record(variant.translation)
  const seo = record(variant.seo)
  const promptPath = `content/prompts/${String(artifact.id)}/${String(variant.locale)}.md`
  return {
    schemaVersion: 1,
    id: artifact.id,
    type: 'prompt',
    locale: variant.locale,
    sourceLocale: artifact.sourceLocale,
    slug: variant.slug,
    title: variant.title,
    summary: variant.summary,
    status: 'draft',
    indexable: false,
    contentType: artifact.contentType,
    models: taxonomy.models,
    useCases: taxonomy.useCases,
    techniques: taxonomy.techniques,
    styles: taxonomy.styles,
    subjects: taxonomy.subjects,
    prompt: artifact.prompt,
    outcome: {
      outputType: baseOutcome.outputType,
      purpose: localizedOutcome.purpose,
      platforms: baseOutcome.platforms,
      characteristics: localizedOutcome.characteristics,
    },
    media: artifact.media,
    metrics: artifact.metrics,
    inputs: artifact.inputs,
    parameters: artifact.parameters,
    examples: artifact.examples,
    workflow: variant.workflow,
    creator: artifact.creator,
    relatedPromptIds: artifact.relatedPromptIds,
    actions: artifact.actions,
    source: provenance.source,
    evidence: provenance.evidence,
    seo: {
      title: seo.title,
      description: seo.description,
      canonical: `${PROMPTLAB_CANONICAL_BASE}/${promptPath}`,
      robots: 'noindex,nofollow',
    },
    publication: {
      publishedAt: null,
      updatedAt: variant.updatedAt,
      sourceRevision,
    },
    translation: {
      status: translation.status,
      translatedFromRevision: translation.translatedFromRevision,
      reviewer: translation.reviewer,
    },
  }
}

interface LocalizedTaxonomyCopy {
  readonly description: string
  readonly name: string
  readonly seoDescription: string
  readonly seoTitle: string
}

const CONTENT_TYPE_COPY: Readonly<Record<string, Readonly<Record<string, LocalizedTaxonomyCopy>>>> = {
  image: {
    en: {
      name: 'Image',
      description: 'Prompts that produce image outputs through a compatible generative model.',
      seoTitle: 'Image prompts',
      seoDescription: 'Browse reusable Prompts whose declared output type is an image.',
    },
    'zh-CN': {
      name: '图像',
      description: '通过兼容的生成模型产出图像内容的提示词分类。',
      seoTitle: '图像提示词',
      seoDescription: '浏览输出类型明确为图像的可复用提示词。',
    },
  },
  video: {
    en: {
      name: 'Video',
      description: 'Prompts that produce video outputs through a compatible generative model.',
      seoTitle: 'Video prompts',
      seoDescription: 'Browse reusable Prompts whose declared output type is a video.',
    },
    'zh-CN': {
      name: '视频',
      description: '通过兼容的生成模型产出视频内容的提示词分类。',
      seoTitle: '视频提示词',
      seoDescription: '浏览输出类型明确为视频的可复用提示词。',
    },
  },
  text: {
    en: {
      name: 'Text',
      description: 'Prompts that produce structured or free-form text through a compatible model.',
      seoTitle: 'Text prompts',
      seoDescription: 'Browse reusable Prompts whose declared output type is text.',
    },
    'zh-CN': {
      name: '文本',
      description: '通过兼容模型产出结构化或自由文本内容的提示词分类。',
      seoTitle: '文本提示词',
      seoDescription: '浏览输出类型明确为文本的可复用提示词。',
    },
  },
  other: {
    en: {
      name: 'Other',
      description: 'Prompts with a declared output type outside the current text, image, and video groups.',
      seoTitle: 'Other prompts',
      seoDescription: 'Browse reusable Prompts in other explicitly declared output groups.',
    },
    'zh-CN': {
      name: '其他',
      description: '输出类型不属于当前文本、图像或视频分类的提示词。',
      seoTitle: '其他提示词',
      seoDescription: '浏览归入其他明确输出类型的可复用提示词。',
    },
  },
}

const MODEL_AGNOSTIC_COPY: Readonly<Record<string, LocalizedTaxonomyCopy>> = {
  en: {
    name: 'Model agnostic',
    description: 'Prompts designed without a dependency on one named model or provider.',
    seoTitle: 'Model-agnostic prompts',
    seoDescription: 'Browse reusable Prompts designed to work without a named model dependency.',
  },
  'zh-CN': {
    name: '模型无关',
    description: '不依赖某个指定模型或供应商即可使用的提示词分类。',
    seoTitle: '模型无关提示词',
    seoDescription: '浏览不依赖指定模型或供应商的可复用提示词。',
  },
}

function taxonomyCopy(
  axis: 'content-type' | 'model',
  slug: string,
  locale: string,
): LocalizedTaxonomyCopy {
  const value = axis === 'content-type'
    ? CONTENT_TYPE_COPY[slug]?.[locale]
    : slug === 'model-agnostic' ? MODEL_AGNOSTIC_COPY[locale] : undefined
  if (!value) throw new Error(`Unsupported canonical taxonomy: ${axis}/${slug}/${locale}`)
  return value
}

function provisionalTaxonomy(
  axis: 'content-type' | 'model',
  slug: string,
  locale: string,
  sourceLocale: string,
  sourceRef: string,
  updatedAt: string,
): UnknownRecord {
  const copy = taxonomyCopy(axis, slug, locale)
  const model = axis === 'model'
  const id = model ? 'mdl_model_agnostic' : `cty_${slug.replace(/-/gu, '_')}`
  const taxonomyPath = `content/taxonomies/${axis}/${id}/${locale}.json`
  return {
    schemaVersion: 1,
    id,
    type: 'taxonomy',
    axis,
    locale,
    sourceLocale,
    slug,
    name: copy.name,
    description: copy.description,
    status: 'draft',
    indexable: false,
    selector: { field: model ? 'models' : 'contentType', value: slug },
    surface: {
      level: model ? 'L3' : 'L2',
      kind: model ? 'model-detail' : 'content-type-gallery',
      path: model ? `/${locale}/prompts/models/${slug}` : `/${locale}/prompts/${slug}`,
    },
    model: model
      ? { officialUrl: null, capabilities: [], inputs: [], outputs: [], limitations: [] }
      : null,
    sourceRef,
    seo: {
      title: copy.seoTitle,
      description: copy.seoDescription,
      canonical: `${PROMPTLAB_CANONICAL_BASE}/${taxonomyPath}`,
      robots: 'noindex,nofollow',
    },
    publication: {
      publishedAt: null,
      updatedAt,
      sourceRevision: `sha256:${'0'.repeat(64)}`,
    },
    translation: {
      status: 'draft',
      translatedFromRevision: null,
      reviewer: null,
    },
  }
}

function canonicalTaxonomyDocuments(
  artifact: UnknownRecord,
  selectedVariants: readonly UnknownRecord[],
  sourceVariant: UnknownRecord,
  sourceRef: string,
): CanonicalTaxonomyDocument[] {
  const contentType = String(artifact.contentType)
  const variantsByLocale = new Map<string, UnknownRecord>()
  variantsByLocale.set(String(sourceVariant.locale), sourceVariant)
  for (const variant of selectedVariants) variantsByLocale.set(String(variant.locale), variant)
  const locales = [...new Set(['en', ...selectedVariants.map((variant) => String(variant.locale))])]
    .sort((left, right) => left.localeCompare(right, 'en'))
  const models = record(artifact.taxonomy).models
  const modelSlugs = Array.isArray(models) ? models.map(String) : []
  const clusters = [
    { axis: 'content-type' as const, slug: contentType },
    ...modelSlugs.map((slug) => ({ axis: 'model' as const, slug })),
  ]
  const documents: CanonicalTaxonomyDocument[] = []
  for (const cluster of clusters) {
    const provisional = locales.map((locale) => provisionalTaxonomy(
      cluster.axis,
      cluster.slug,
      locale,
      'en',
      sourceRef,
      String(variantsByLocale.get(locale)?.updatedAt ?? sourceVariant.updatedAt ?? ''),
    ))
    const english = provisional.find((value) => value.locale === 'en')
    if (!english) throw new Error(`Canonical English taxonomy is missing: ${cluster.axis}/${cluster.slug}`)
    const sourceRevision = canonicalRecordRevision(english)
    for (const value of provisional) {
      const locale = String(value.locale)
      const translation = record(value.translation)
      const finalValue = {
        ...value,
        publication: { ...record(value.publication), sourceRevision },
        translation: {
          ...translation,
          translatedFromRevision: locale === 'en' ? null : sourceRevision,
        },
      }
      documents.push({
        axis: cluster.axis,
        id: String(value.id),
        locale,
        value: finalValue,
      })
    }
  }
  return documents
}

export class PayloadDraftContentValidator implements PublicationContentValidator {
  private readonly payload: PayloadContentValidationApi

  constructor(payload: PayloadContentValidationApi) {
    this.payload = payload
  }

  async validate(
    input: PublicationDraftSelection,
  ): Promise<PublicationContentValidationResult & { readonly rightsRevision: string }> {
    const artifacts = await this.payload.find({
      collection: 'prompt-artifacts',
      depth: 1,
      draft: true,
      limit: 2,
      overrideAccess: true,
      where: { artifactKey: { equals: input.artifactId } },
    })
    if (artifacts.docs.length !== 1) {
      throw new PublicationContentValidationError('Content contract validation failed', [{
        path: 'artifactId',
        code: 'ARTIFACT_CARDINALITY',
        message: 'artifactId must resolve to exactly one PromptArtifact draft',
      }])
    }
    const artifact = record(artifacts.docs[0])
    const artifactDocumentId = artifact.id
    if (typeof artifactDocumentId !== 'string' && typeof artifactDocumentId !== 'number') {
      throw new PublicationContentValidationError('Content contract validation failed', [{
        path: 'artifact.id',
        code: 'ARTIFACT_ID_MISSING',
        message: 'PromptArtifact has no valid Payload document id',
      }])
    }

    const [variantResult, sourceEvidenceResult] = await Promise.all([
      this.payload.find({
        collection: 'locale-variants',
        depth: 1,
        draft: true,
        limit: 100,
        overrideAccess: true,
        where: { artifact: { equals: artifactDocumentId } },
      }),
      this.payload.find({
        collection: 'source-evidence',
        depth: 0,
        draft: true,
        limit: 100,
        overrideAccess: true,
        where: { artifact: { equals: artifactDocumentId } },
      }),
    ])

    const context: ValidatorContext = { issues: [] }
    const normalizedArtifact = normalizeArtifact(context, artifact, input)
    const variants = variantResult.docs.map(record)
    const normalizedVariants: UnknownRecord[] = []
    for (const locale of new Set([...input.locales, String(normalizedArtifact.sourceLocale)])) {
      const matching = variants.filter((candidate) => candidate.locale === locale)
      if (matching.length !== 1) {
        addIssue(context, `locales.${locale}`, 'LOCALE_CARDINALITY', 'Locale must resolve to exactly one draft')
        continue
      }
      normalizedVariants.push(normalizeVariant(
        context,
        matching[0] ?? {},
        normalizedArtifact,
        input.locales.includes(locale as (typeof input.locales)[number]),
        `locales.${locale}`,
      ))
    }

    const provenance = normalizeProvenance(context, sourceEvidenceResult.docs.map(record))
    const sourceVariant = normalizedVariants.find((variant) => variant.locale === normalizedArtifact.sourceLocale)
    if (!sourceVariant) {
      addIssue(context, 'sourceLocale', 'SOURCE_LOCALE_MISSING', 'Source locale draft is required')
    }
    if (context.issues.length > 0 || !sourceVariant) {
      throw new PublicationContentValidationError('Content contract validation failed', context.issues)
    }

    const selectedVariants = normalizedVariants
      .filter((variant) => input.locales.includes(String(variant.locale) as (typeof input.locales)[number]))
      .sort((left, right) => String(left.locale).localeCompare(String(right.locale), 'en'))
    const provisionalSourcePrompt: CanonicalPromptDocument = {
      bodyMarkdown: appendCommunityNotice(
        String(sourceVariant.bodyMarkdown).trim(),
        sourceVariant.locale,
        provenance.communityNotice,
      ),
      frontmatter: canonicalPromptFrontmatter(
        normalizedArtifact,
        sourceVariant,
        provenance,
        `sha256:${'0'.repeat(64)}`,
      ),
    }
    const sourceRevision = canonicalRecordRevision(
      provisionalSourcePrompt.frontmatter,
      provisionalSourcePrompt.bodyMarkdown,
    )
    if (!SHA256_PATTERN.test(sourceRevision)) throw new Error('Calculated source revision is malformed')

    for (const variant of normalizedVariants) {
      if (!input.locales.includes(String(variant.locale) as (typeof input.locales)[number])) continue
      const translation = record(variant.translation)
      if (variant.locale === normalizedArtifact.sourceLocale) {
        if (translation.translatedFromRevision !== null) {
          addIssue(context, `locales.${String(variant.locale)}.translation.translatedFromRevision`, 'SOURCE_REVISION_MUST_BE_NULL', 'Source locale must not reference itself')
        }
      } else if (translation.translatedFromRevision !== sourceRevision) {
        addIssue(context, `locales.${String(variant.locale)}.translation.translatedFromRevision`, 'STALE_TRANSLATION', `Must equal current source revision ${sourceRevision}`)
      }
    }

    if (context.issues.length > 0) {
      throw new PublicationContentValidationError('Content contract validation failed', context.issues)
    }

    const promptDocuments: CanonicalPromptDocument[] = selectedVariants.map((variant) => ({
      bodyMarkdown: appendCommunityNotice(
        String(variant.bodyMarkdown).trim(),
        variant.locale,
        provenance.communityNotice,
      ),
      frontmatter: canonicalPromptFrontmatter(normalizedArtifact, variant, provenance, sourceRevision),
    }))
    const taxonomyDocuments = canonicalTaxonomyDocuments(
      normalizedArtifact,
      selectedVariants,
      sourceVariant,
      String(provenance.source.url),
    )
    const files = buildCanonicalPromptBundle({ prompts: promptDocuments, taxonomies: taxonomyDocuments })
    const rightsRevision = canonicalRecordRevision(provenance.rightsReview)
    const contentRevision = canonicalBundleRevision(files, provenance.rightsReview)
    return { contentRevision, files, rightsRevision, sourceRevision }
  }
}
