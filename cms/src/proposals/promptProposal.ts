import { createHash } from 'node:crypto'

import type { InternalBetaLocale } from '../domain/publication.ts'

type RecordValue = Record<string, unknown>

const ARTIFACT_KEY = /^prm_[a-z0-9]{8,64}$/u
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u
const SAFE_IDEMPOTENCY_KEY = /^[A-Za-z0-9][A-Za-z0-9:._/-]{11,199}$/u
const X_HOSTS = new Set(['x.com', 'www.x.com', 'twitter.com', 'www.twitter.com'])
const FORBIDDEN_TEXT = [
  /<\s*script\b/iu,
  /javascript\s*:/iu,
  /data\s*:\s*text\/html/iu,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/u,
  /\b(?:gh[opsu]_[A-Za-z0-9]{30,}|sk-[A-Za-z0-9_-]{20,})\b/u,
]

export class PromptProposalInputError extends Error {
  readonly code = 'PROMPT_PROPOSAL_INVALID'
  override readonly name = 'PromptProposalInputError'
}

export class PromptProposalConflictError extends Error {
  readonly code = 'PROMPT_PROPOSAL_CONFLICT'
  override readonly name = 'PromptProposalConflictError'
}

export interface PromptProposalInput {
  readonly expectedState: 'absent'
  readonly locale: {
    readonly bodyMarkdown: string | null
    readonly locale: InternalBetaLocale
    readonly slug: string
    readonly summary: string | null
    readonly title: string
  }
  readonly operation: 'create_prompt'
  readonly prompt: {
    readonly artifactKey: string
    readonly contentType: 'image' | 'video' | 'text' | 'other'
    readonly sourceLocale: InternalBetaLocale
    readonly text: string
  }
  readonly schemaVersion: 1
  readonly source: {
    readonly creatorHandle: string | null
    readonly id: string
    readonly observedAt: string
    readonly platform: 'x' | 'rss' | 'url' | 'manual'
    readonly publishedDate: string | null
    readonly url: string
  }
}

export interface PromptProposalResult {
  readonly artifactId: string | number
  readonly artifactKey: string
  readonly auditId: string | number
  readonly locale: InternalBetaLocale
  readonly localeVariantId: string | number
  readonly replayed: boolean
  readonly rightsStatus: 'review_required'
  readonly sourceEvidenceId: string | number
  readonly state: 'draft'
}

export interface PromptProposalPayloadApi {
  create(args: RecordValue): Promise<unknown>
  find(args: RecordValue): Promise<{ docs: unknown[] }>
  update(args: RecordValue): Promise<unknown>
}

function object(value: unknown, field: string): RecordValue {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new PromptProposalInputError(`${field} must be an object`)
  }
  return value as RecordValue
}

function exactKeys(value: RecordValue, allowed: readonly string[], field: string): void {
  const extras = Object.keys(value).filter((key) => !allowed.includes(key))
  if (extras.length > 0) {
    throw new PromptProposalInputError(`${field} contains unsupported fields: ${extras.sort().join(', ')}`)
  }
}

function boundedString(value: unknown, field: string, max: number): string {
  if (typeof value !== 'string' || value.trim().length === 0 || value.length > max) {
    throw new PromptProposalInputError(`${field} must be a non-empty string of at most ${max} characters`)
  }
  if (value.trim() !== value || /[\u0000\r]/u.test(value)) {
    throw new PromptProposalInputError(`${field} contains unsupported whitespace or control characters`)
  }
  return value
}

function nullableString(value: unknown, field: string, max: number): string | null {
  if (value === undefined || value === null || value === '') return null
  return boundedString(value, field, max)
}

function safeText(value: unknown, field: string, max: number): string {
  const text = boundedString(value, field, max)
  if (FORBIDDEN_TEXT.some((pattern) => pattern.test(text))) {
    throw new PromptProposalInputError(`${field} contains executable HTML, an unsafe URL, or a secret-like value`)
  }
  return text
}

function locale(value: unknown, field: string): InternalBetaLocale {
  if (value !== 'en' && value !== 'zh-CN') {
    throw new PromptProposalInputError(`${field} must be en or zh-CN`)
  }
  return value
}

function utcInstant(value: unknown, field: string): string {
  const text = boundedString(value, field, 40)
  if (!/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?Z$/u.test(text) || Number.isNaN(Date.parse(text))) {
    throw new PromptProposalInputError(`${field} must be an RFC 3339 UTC timestamp`)
  }
  return text
}

function calendarDate(value: unknown, field: string): string | null {
  if (value === undefined || value === null || value === '') return null
  const text = boundedString(value, field, 10)
  const parsed = new Date(`${text}T00:00:00.000Z`)
  if (
    !/^\d{4}-\d{2}-\d{2}$/u.test(text) ||
    Number.isNaN(parsed.valueOf()) ||
    parsed.toISOString().slice(0, 10) !== text
  ) {
    throw new PromptProposalInputError(`${field} must be YYYY-MM-DD`)
  }
  return text
}

function sourceUrl(value: unknown, platform: PromptProposalInput['source']['platform']): string {
  const text = boundedString(value, 'source.url', 2048)
  let parsed: URL
  try {
    parsed = new URL(text)
  } catch {
    throw new PromptProposalInputError('source.url must be an absolute HTTPS URL')
  }
  if (parsed.protocol !== 'https:' || parsed.username !== '' || parsed.password !== '') {
    throw new PromptProposalInputError('source.url must be an absolute HTTPS URL without credentials')
  }
  if (platform === 'x' && !X_HOSTS.has(parsed.hostname.toLowerCase())) {
    throw new PromptProposalInputError('source.url must use x.com or twitter.com when source.platform is x')
  }
  return parsed.toString()
}

export function normalizePromptProposal(value: unknown): PromptProposalInput {
  const body = object(value, 'body')
  exactKeys(body, ['schemaVersion', 'operation', 'expectedState', 'prompt', 'locale', 'source'], 'body')
  if (body.schemaVersion !== 1 || body.operation !== 'create_prompt' || body.expectedState !== 'absent') {
    throw new PromptProposalInputError('schemaVersion=1, operation=create_prompt and expectedState=absent are required')
  }

  const prompt = object(body.prompt, 'prompt')
  const localized = object(body.locale, 'locale')
  const source = object(body.source, 'source')
  exactKeys(prompt, ['artifactKey', 'contentType', 'sourceLocale', 'text'], 'prompt')
  exactKeys(localized, ['locale', 'slug', 'title', 'summary', 'bodyMarkdown'], 'locale')
  exactKeys(source, ['platform', 'url', 'id', 'creatorHandle', 'publishedDate', 'observedAt'], 'source')

  const artifactKey = boundedString(prompt.artifactKey, 'prompt.artifactKey', 68)
  if (!ARTIFACT_KEY.test(artifactKey)) throw new PromptProposalInputError('prompt.artifactKey is invalid')
  const contentType = prompt.contentType
  if (contentType !== 'image' && contentType !== 'video' && contentType !== 'text' && contentType !== 'other') {
    throw new PromptProposalInputError('prompt.contentType is invalid')
  }
  const sourceLocale = locale(prompt.sourceLocale, 'prompt.sourceLocale')
  const localizedLocale = locale(localized.locale, 'locale.locale')
  if (sourceLocale !== localizedLocale) {
    throw new PromptProposalInputError('create_prompt requires locale.locale to match prompt.sourceLocale')
  }
  const slug = boundedString(localized.slug, 'locale.slug', 120)
  if (!SLUG.test(slug)) throw new PromptProposalInputError('locale.slug is invalid')
  const platform = source.platform
  if (platform !== 'x' && platform !== 'rss' && platform !== 'url' && platform !== 'manual') {
    throw new PromptProposalInputError('source.platform is invalid')
  }
  const normalizedSourceUrl = sourceUrl(source.url, platform)
  const sourceId = boundedString(source.id, 'source.id', 240)
  if (platform === 'x') {
    const statusId = new URL(normalizedSourceUrl).pathname.match(/\/status\/(\d+)(?:\/|$)/u)?.[1]
    if (statusId === undefined || statusId !== sourceId) {
      throw new PromptProposalInputError('source.id must match the numeric X status id in source.url')
    }
  }

  return {
    schemaVersion: 1,
    operation: 'create_prompt',
    expectedState: 'absent',
    prompt: {
      artifactKey,
      contentType,
      sourceLocale,
      text: safeText(prompt.text, 'prompt.text', 100_000),
    },
    locale: {
      locale: localizedLocale,
      slug,
      title: safeText(localized.title, 'locale.title', 240),
      summary: localized.summary === null || localized.summary === undefined || localized.summary === ''
        ? null
        : safeText(localized.summary, 'locale.summary', 2_000),
      bodyMarkdown: localized.bodyMarkdown === null || localized.bodyMarkdown === undefined || localized.bodyMarkdown === ''
        ? null
        : safeText(localized.bodyMarkdown, 'locale.bodyMarkdown', 120_000),
    },
    source: {
      platform,
      url: normalizedSourceUrl,
      id: sourceId,
      creatorHandle: nullableString(source.creatorHandle, 'source.creatorHandle', 240),
      publishedDate: calendarDate(source.publishedDate, 'source.publishedDate'),
      observedAt: utcInstant(source.observedAt, 'source.observedAt'),
    },
  }
}

export function validateIdempotencyKey(value: string | null): string {
  if (value === null || !SAFE_IDEMPOTENCY_KEY.test(value)) {
    throw new PromptProposalInputError('Idempotency-Key must contain 12-200 safe characters')
  }
  return value
}

export function promptProposalHash(input: PromptProposalInput): `sha256:${string}` {
  return `sha256:${createHash('sha256').update(JSON.stringify(input)).digest('hex')}`
}

function record(value: unknown, field: string): RecordValue {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`CMS returned an invalid ${field}`)
  }
  return value as RecordValue
}

function id(value: unknown, field: string): string | number {
  const candidate = record(value, field).id
  if (typeof candidate !== 'string' && typeof candidate !== 'number') {
    throw new Error(`CMS returned an invalid ${field} id`)
  }
  return candidate
}

function bodyMarkdown(input: PromptProposalInput): string {
  if (input.locale.bodyMarkdown !== null) return input.locale.bodyMarkdown
  const summary = input.locale.summary === null ? '' : `\n${input.locale.summary}\n`
  return `# ${input.locale.title}\n${summary}\n\`\`\`prompt\n${input.prompt.text}\n\`\`\`\n`
}

export class PromptProposalService {
  private readonly payload: PromptProposalPayloadApi

  constructor(payload: PromptProposalPayloadApi) {
    this.payload = payload
  }

  async findAudit(idempotencyKey: string): Promise<RecordValue | null> {
    const result = await this.payload.find({
      collection: 'agent-proposal-audits',
      where: { idempotencyKey: { equals: idempotencyKey } },
      limit: 1,
      pagination: false,
      overrideAccess: true,
    })
    const audit = result.docs[0]
    return audit === undefined ? null : record(audit, 'proposal audit')
  }

  resultFromAudit(audit: RecordValue, replayed: boolean): PromptProposalResult {
    return {
      artifactId: typeof audit.artifact === 'object' ? id(audit.artifact, 'artifact') : audit.artifact as string | number,
      artifactKey: String(audit.artifactKey),
      auditId: id(audit, 'proposal audit'),
      locale: audit.locale as InternalBetaLocale,
      localeVariantId: typeof audit.localeVariant === 'object' ? id(audit.localeVariant, 'locale variant') : audit.localeVariant as string | number,
      replayed,
      rightsStatus: 'review_required',
      sourceEvidenceId: typeof audit.sourceEvidence === 'object' ? id(audit.sourceEvidence, 'source evidence') : audit.sourceEvidence as string | number,
      state: 'draft',
    }
  }

  async create(input: PromptProposalInput, idempotencyKey: string, requestHash: string, actorId: string | number): Promise<PromptProposalResult> {
    const existingAudit = await this.findAudit(idempotencyKey)
    if (existingAudit !== null) {
      if (existingAudit.requestHash !== requestHash) {
        throw new PromptProposalConflictError('Idempotency-Key is already associated with a different proposal')
      }
      return this.resultFromAudit(existingAudit, true)
    }

    const conflicts = await this.payload.find({
      collection: 'prompt-artifacts',
      where: { artifactKey: { equals: input.prompt.artifactKey } },
      limit: 1,
      pagination: false,
      overrideAccess: true,
    })
    if (conflicts.docs.length > 0) {
      throw new PromptProposalConflictError('expectedState=absent but prompt.artifactKey already exists')
    }

    const artifact = await this.payload.create({
      collection: 'prompt-artifacts',
      draft: true,
      overrideAccess: true,
      data: {
        _status: 'draft',
        artifactKey: input.prompt.artifactKey,
        contentType: input.prompt.contentType,
        sourceLocale: input.prompt.sourceLocale,
        draftWorkflowState: 'draft',
        prompt: { language: input.prompt.sourceLocale, text: input.prompt.text, variables: [] },
        outcome: { outputType: input.prompt.contentType, platforms: [] },
        requiredInputs: [],
        optionalInputs: [],
        parameters: [],
        models: [],
        useCases: [],
        techniques: [],
        styles: [],
        subjects: [],
        media: [],
        metrics: {
          likes: null,
          bookmarks: null,
          comments: null,
          reposts: null,
          views: null,
          observedAt: input.source.observedAt,
        },
        examples: [],
        creator: null,
        relatedPrompts: [],
        actions: { canCopy: true, tryUrl: null },
        sourceEvidence: [],
      },
    })
    const artifactId = id(artifact, 'artifact')

    const source = await this.payload.create({
      collection: 'source-evidence',
      draft: true,
      overrideAccess: true,
      data: {
        _status: 'draft',
        artifact: artifactId,
        recordType: 'source',
        sourcePlatform: input.source.platform,
        sourceUrl: input.source.url,
        sourceId: input.source.id,
        creatorHandle: input.source.creatorHandle,
        sourcePublishedDate: input.source.publishedDate,
        observedAt: input.source.observedAt,
        rightsStatus: 'review_required',
        isPrimarySource: true,
      },
    })
    const sourceEvidenceId = id(source, 'source evidence')

    await this.payload.update({
      collection: 'prompt-artifacts',
      id: artifactId,
      draft: true,
      overrideAccess: true,
      data: { sourceEvidence: [sourceEvidenceId] },
    })

    const variant = await this.payload.create({
      collection: 'locale-variants',
      draft: true,
      overrideAccess: true,
      data: {
        _status: 'draft',
        localeVariantKey: `${input.prompt.artifactKey}:${input.locale.locale}`,
        artifact: artifactId,
        locale: input.locale.locale,
        sourceLocale: input.prompt.sourceLocale,
        slug: input.locale.slug,
        title: input.locale.title,
        summary: input.locale.summary,
        indexable: false,
        bodyMarkdown: bodyMarkdown(input),
        localizedOutcome: { purpose: null, characteristics: [] },
        workflow: [],
        translation: { translationStatus: 'draft', translatedFromRevision: null, reviewer: null },
        seo: { title: null, description: null, robots: 'noindex,nofollow' },
      },
    })
    const localeVariantId = id(variant, 'locale variant')

    const audit = await this.payload.create({
      collection: 'agent-proposal-audits',
      overrideAccess: true,
      data: {
        idempotencyKey,
        requestHash,
        operation: 'create_prompt',
        artifactKey: input.prompt.artifactKey,
        locale: input.locale.locale,
        actor: actorId,
        artifact: artifactId,
        localeVariant: localeVariantId,
        sourceEvidence: sourceEvidenceId,
        result: 'draft_applied',
      },
    })

    return {
      artifactId,
      artifactKey: input.prompt.artifactKey,
      auditId: id(audit, 'proposal audit'),
      locale: input.locale.locale,
      localeVariantId,
      replayed: false,
      rightsStatus: 'review_required',
      sourceEvidenceId,
      state: 'draft',
    }
  }
}
