import { createHash } from 'node:crypto'

import {
  PublicationContentValidationError,
  type NormalizedPublicationRequestInput,
  type PublicationContentValidationIssue,
  type PublicationContentValidationResult,
  type PublicationContentValidator,
} from '../domain/index.ts'
import type { PayloadLocalApi } from './payloadPublicationRequestRepository.ts'

type UnknownRecord = Record<string, unknown>

const CONTENT_TYPES = new Set(['image', 'video', 'text', 'other'])
const PARAMETER_TYPES = new Set(['text', 'number', 'enum', 'boolean'])
const SOURCE_PLATFORMS = new Set(['x', 'rss', 'url', 'manual'])
const TOKEN_PATTERN = /\[[A-Z][A-Z0-9_]{1,39}\]/gu
const ARTIFACT_PATTERN = /^prm_[a-z0-9_]{8,64}$/u
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u
const SHA256_PATTERN = /^sha256:[a-f0-9]{64}$/u
const TAXONOMY_AXES = {
  models: 'model',
  useCases: 'use_case',
  techniques: 'technique',
  styles: 'style',
  subjects: 'subject',
} as const

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

function stringList(value: unknown): string[] {
  return rows(value).map((item) => text(item.value)).filter(Boolean)
}

function relationshipList(value: unknown): UnknownRecord[] {
  if (!Array.isArray(value)) return []
  return value.map(record).filter((item) => Object.keys(item).length > 0)
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

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical)
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(
      Object.entries(value as UnknownRecord)
        .sort(([left], [right]) => left.localeCompare(right, 'en'))
        .map(([key, member]) => [key, canonical(member)]),
    )
  }
  return value
}

function revision(value: unknown): string {
  const bytes = JSON.stringify(canonical(value))
  return `sha256:${createHash('sha256').update(bytes, 'utf8').digest('hex')}`
}

function validHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === 'https:'
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

function requireText(
  context: ValidatorContext,
  value: unknown,
  path: string,
  minimum = 1,
): string {
  const normalized = text(value)
  if (normalized.length < minimum) addIssue(context, path, 'REQUIRED', `Must contain at least ${minimum} characters`)
  return normalized
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

function normalizeArtifact(
  context: ValidatorContext,
  artifact: UnknownRecord,
  input: NormalizedPublicationRequestInput,
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
  const promptText = requireText(context, prompt.text, 'artifact.prompt.text', 80)
  const variables = rows(prompt.variables).map((variable, index) => {
    const key = requireText(context, variable.key, `artifact.prompt.variables[${index}].key`)
    const label = requireText(context, variable.label, `artifact.prompt.variables[${index}].label`)
    if (!/^\[[A-Z][A-Z0-9_]{1,39}\]$/u.test(key)) {
      addIssue(context, `artifact.prompt.variables[${index}].key`, 'INVALID_VARIABLE_KEY', 'Use [UPPER_SNAKE_CASE]')
    }
    return {
      key,
      label,
      required: variable.required === true,
      defaultValue: nullableText(variable.defaultValue),
      options: stringList(variable.options),
    }
  })
  if (variables.length === 0) {
    addIssue(context, 'artifact.prompt.variables', 'MIN_ITEMS', 'At least one Prompt variable is required')
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
  const platforms = stringList(outcome.platforms)
  if (platforms.length === 0 || platforms.some((item) => !SLUG_PATTERN.test(item))) {
    addIssue(context, 'artifact.outcome.platforms', 'INVALID_SLUG_LIST', 'At least one platform slug is required')
  }

  const parameters = rows(artifact.parameters).map((parameter, index) => {
    const key = requireText(context, parameter.key, `artifact.parameters[${index}].key`)
    const valueType = requireText(context, parameter.valueType, `artifact.parameters[${index}].valueType`)
    if (!PARAMETER_TYPES.has(valueType)) {
      addIssue(context, `artifact.parameters[${index}].valueType`, 'INVALID_ENUM', 'Unsupported parameter type')
    }
    return {
      key,
      label: requireText(context, parameter.label, `artifact.parameters[${index}].label`),
      type: valueType,
      required: parameter.required === true,
      options: stringList(parameter.options),
    }
  })
  if (parameters.length === 0) {
    addIssue(context, 'artifact.parameters', 'MIN_ITEMS', 'At least one parameter is required')
  }
  const parameterTokens = [...new Set(parameters.map((parameter) => `[${parameter.key}]`))].sort()
  if (JSON.stringify(parameterTokens) !== JSON.stringify(declaredTokens)) {
    addIssue(context, 'artifact.parameters', 'PARAMETER_DRIFT', 'Parameters must exactly cover Prompt variables')
  }

  const taxonomy: UnknownRecord = {}
  for (const [field, expectedAxis] of Object.entries(TAXONOMY_AXES)) {
    const relations = relationshipList(artifact[field])
    const slugs = relations.map((relation, index) => {
      const path = `artifact.${field}[${index}]`
      const slug = nullableText(relation.slug)
      if (relation.axis !== expectedAxis) {
        addIssue(context, `${path}.axis`, 'TAXONOMY_AXIS_MISMATCH', `Must equal ${expectedAxis}`)
      }
      if (slug !== null && !SLUG_PATTERN.test(slug)) {
        addIssue(context, `${path}.slug`, 'INVALID_TAXONOMY_SLUG', 'Must be a canonical taxonomy slug')
      }
      return slug
    }).filter((item): item is string => item !== null)
    if (relations.length === 0 || slugs.length !== relations.length) {
      addIssue(context, `artifact.${field}`, 'TAXONOMY_UNRESOLVED', 'At least one populated taxonomy relation with a slug is required')
    }
    taxonomy[field] = [...new Set(slugs)].sort()
  }

  const metrics = record(artifact.metrics)
  const metricsObservedAt = requireText(context, metrics.observedAt, 'artifact.metrics.observedAt')
  if (!validDateTime(metricsObservedAt)) {
    addIssue(context, 'artifact.metrics.observedAt', 'INVALID_DATE_TIME', 'Must be an RFC 3339 UTC date-time')
  }

  const examples = rows(artifact.examples).map((example) => ({
    id: text(example.exampleId),
    input: nullableText(example.input),
    output: normalizeMedia([record(example.output)])[0] ?? null,
    caption: nullableText(example.caption),
  }))

  return {
    id: artifactId,
    contentType,
    sourceLocale,
    prompt: {
      language: requireText(context, prompt.language, 'artifact.prompt.language'),
      text: promptText,
      variables,
    },
    outcome: { outputType, platforms },
    inputs: {
      required: stringList(artifact.requiredInputs),
      optional: stringList(artifact.optionalInputs),
    },
    parameters,
    taxonomy,
    media: normalizeMedia(artifact.media),
    metrics: {
      likes: numberOrNull(metrics.likes),
      bookmarks: numberOrNull(metrics.bookmarks),
      comments: numberOrNull(metrics.comments),
      reposts: numberOrNull(metrics.reposts),
      views: numberOrNull(metrics.views),
      observedAt: metricsObservedAt,
    },
    examples,
    creator: relationshipIdentity(artifact.creator),
    relatedPromptIds: relationshipIdentities(artifact.relatedPrompts),
    actions: {
      canCopy: record(artifact.actions).canCopy === true,
      tryUrl: nullableText(record(artifact.actions).tryUrl),
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
  if (sourceLocale !== artifact.sourceLocale) {
    addIssue(context, `${path}.sourceLocale`, 'SOURCE_LOCALE_DRIFT', 'Must match PromptArtifact.sourceLocale')
  }
  const slug = requireText(context, candidate.slug, `${path}.slug`, 3)
  if (!SLUG_PATTERN.test(slug)) addIssue(context, `${path}.slug`, 'INVALID_SLUG', 'Must be a canonical locale slug')

  const bodyMarkdown = requireText(context, candidate.bodyMarkdown, `${path}.bodyMarkdown`)
  if (promptFence(bodyMarkdown) !== record(artifact.prompt).text) {
    addIssue(context, `${path}.bodyMarkdown`, 'PROMPT_BODY_DRIFT', 'The single prompt fence must equal PromptArtifact.prompt.text')
  }

  const workflow = rows(candidate.workflow).map((step, index) => ({
    position: step.position,
    title: requireText(context, step.title, `${path}.workflow[${index}].title`),
    body: requireText(context, step.body, `${path}.workflow[${index}].body`),
  }))
  if (workflow.length < 2 || workflow.some((step, index) => step.position !== index + 1)) {
    addIssue(context, `${path}.workflow`, 'WORKFLOW_ORDER', 'At least two contiguous steps starting at 1 are required')
  }

  const translation = record(candidate.translation)
  if (requested && translation.translationStatus !== 'ready') {
    addIssue(context, `${path}.translation.translationStatus`, 'LOCALE_NOT_READY', 'Requested locale must be ready')
  }
  if (requested && text(translation.reviewer) === '') {
    addIssue(context, `${path}.translation.reviewer`, 'REVIEWER_REQUIRED', 'Requested locale requires a reviewer')
  }

  const seo = record(candidate.seo)
  const indexable = candidate.indexable === true
  const expectedRobots = indexable ? 'index,follow' : 'noindex,nofollow'
  if (seo.robots !== expectedRobots) {
    addIssue(context, `${path}.seo.robots`, 'ROBOTS_MISMATCH', `Must equal ${expectedRobots}`)
  }

  const localizedOutcome = record(candidate.localizedOutcome)
  return {
    locale,
    sourceLocale,
    slug,
    title: requireText(context, candidate.title, `${path}.title`, 4),
    summary: requireText(context, candidate.summary, `${path}.summary`, 24),
    bodyMarkdown,
    indexable,
    outcome: {
      purpose: requireText(context, localizedOutcome.purpose, `${path}.localizedOutcome.purpose`, 8),
      characteristics: stringList(localizedOutcome.characteristics),
    },
    workflow,
    translation: {
      status: text(translation.translationStatus),
      translatedFromRevision: nullableText(translation.translatedFromRevision),
      reviewer: nullableText(translation.reviewer),
    },
    seo: {
      title: requireText(context, seo.title, `${path}.seo.title`, 8),
      description: requireText(context, seo.description, `${path}.seo.description`, 32),
      robots: text(seo.robots),
    },
  }
}

function normalizeProvenance(
  context: ValidatorContext,
  documents: readonly UnknownRecord[],
): { readonly evidence: unknown[]; readonly source: UnknownRecord } {
  const sources = documents.filter((item) => item.recordType === 'source')
  const primary = sources.filter((item) => item.isPrimarySource === true)
  if (primary.length !== 1) {
    addIssue(context, 'sourceEvidence', 'PRIMARY_SOURCE_CARDINALITY', 'Exactly one primary source is required')
  }
  const rawSource = primary[0] ?? sources[0] ?? {}
  const source = {
    platform: requireText(context, rawSource.sourcePlatform, 'source.platform'),
    sourceId: requireText(context, rawSource.sourceId, 'source.sourceId'),
    url: requireText(context, rawSource.sourceUrl, 'source.url'),
    authorHandle: nullableText(rawSource.creatorHandle),
    publishedDate: dateOnly(rawSource.sourcePublishedDate),
    observedAt: requireText(context, rawSource.observedAt, 'source.observedAt'),
  }
  if (source.publishedDate === '') addIssue(context, 'source.publishedDate', 'REQUIRED', 'Published date is required')
  if (!SOURCE_PLATFORMS.has(source.platform)) addIssue(context, 'source.platform', 'INVALID_ENUM', 'Unsupported source platform')
  if (!validHttpsUrl(source.url)) addIssue(context, 'source.url', 'HTTPS_REQUIRED', 'Source URL must use HTTPS')
  if (!validDate(source.publishedDate)) addIssue(context, 'source.publishedDate', 'INVALID_DATE', 'Must be YYYY-MM-DD')
  if (!validDateTime(source.observedAt)) addIssue(context, 'source.observedAt', 'INVALID_DATE_TIME', 'Must be an RFC 3339 UTC date-time')

  const evidence = documents.filter((item) => item.recordType === 'evidence').map((item, index) => {
    const url = requireText(context, item.evidenceUrl, `evidence[${index}].url`)
    const confidence = numberOrNull(item.confidence)
    if (!validHttpsUrl(url)) addIssue(context, `evidence[${index}].url`, 'HTTPS_REQUIRED', 'Evidence URL must use HTTPS')
    if (confidence !== null && (confidence < 0 || confidence > 1)) {
      addIssue(context, `evidence[${index}].confidence`, 'OUT_OF_RANGE', 'Confidence must be from 0 to 1')
    }
    return {
      type: requireText(context, item.evidenceType, `evidence[${index}].type`, 2),
      url,
      confidence,
    }
  }).sort((left, right) => `${left.type}\u0000${left.url}`.localeCompare(`${right.type}\u0000${right.url}`, 'en'))
  if (evidence.length === 0) addIssue(context, 'evidence', 'MIN_ITEMS', 'At least one evidence record is required')
  if (!evidence.some((item) => item.url === source.url)) {
    addIssue(context, 'evidence', 'SOURCE_EVIDENCE_MISSING', 'Evidence must include the primary source URL')
  }
  return { source, evidence }
}

export class PayloadDraftContentValidator implements PublicationContentValidator {
  private readonly payload: PayloadLocalApi

  constructor(payload: PayloadLocalApi) {
    this.payload = payload
  }

  async validate(
    input: NormalizedPublicationRequestInput,
  ): Promise<PublicationContentValidationResult> {
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
    const sourceRevision = revision({
      artifact: normalizedArtifact,
      provenance,
      sourceVariant: sourceVariant
        ? { ...sourceVariant, translation: undefined }
        : null,
    })
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

    const selectedVariants = normalizedVariants
      .filter((variant) => input.locales.includes(String(variant.locale) as (typeof input.locales)[number]))
      .sort((left, right) => String(left.locale).localeCompare(String(right.locale), 'en'))
    const contentRevision = revision({
      artifact: normalizedArtifact,
      provenance,
      sourceRevision,
      variants: selectedVariants,
    })

    if (context.issues.length > 0) {
      throw new PublicationContentValidationError('Content contract validation failed', context.issues)
    }
    return { contentRevision, sourceRevision }
  }
}
