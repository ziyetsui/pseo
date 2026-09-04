import { createHash } from 'node:crypto'

import {
  CONTENT_APPROVAL_RIGHTS_POLICY_VERSION,
  ContentApprovalIdempotencyConflictError,
  ContentApprovalInputError,
  ContentApprovalRevisionConflictError,
  INTERNAL_BETA_LOCALES,
  PublicationContentValidationError,
  type ApprovedContentRevision,
  type ContentApprovalClock,
  type ContentApprovalInput,
  type ContentApprovalRecord,
  type ContentApprovalRepository,
  type ContentApprovalValidator,
  type InternalBetaLocale,
  type NormalizedContentApprovalInput,
  type PreparedContentApproval,
  type PublicationFile,
  type PublicationFileMetadata,
} from '../domain/index.ts'

const REVISION_PATTERN = /^sha256:[a-f0-9]{64}$/u
const POLICY_VERSION_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{2,63}$/u

function normalizedString(value: unknown, field: string, minimum: number, maximum: number): string {
  if (typeof value !== 'string') throw new ContentApprovalInputError(`${field} must be a string`)
  const normalized = value.trim()
  if (normalized.length < minimum || normalized.length > maximum) {
    throw new ContentApprovalInputError(`${field} must contain ${minimum}-${maximum} characters`)
  }
  return normalized
}

function revision(value: unknown, field: string): `sha256:${string}` {
  const normalized = normalizedString(value, field, 71, 71)
  if (!REVISION_PATTERN.test(normalized)) {
    throw new ContentApprovalInputError(`${field} must be a sha256:<64 lowercase hex> revision`)
  }
  return normalized as `sha256:${string}`
}

function decisionSequence(value: unknown): number {
  if (!Number.isSafeInteger(value) || Number(value) < 0) {
    throw new ContentApprovalInputError('expectedDecisionSequence must be a non-negative integer')
  }
  return Number(value)
}

export function normalizeContentApprovalInput(
  input: ContentApprovalInput,
): NormalizedContentApprovalInput {
  const artifactId = normalizedString(input.artifactId, 'artifactId', 3, 128)
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/u.test(artifactId)) {
    throw new ContentApprovalInputError('artifactId contains unsupported characters')
  }

  const locale = normalizedString(input.locale, 'locale', 2, 35)
  if (!(INTERNAL_BETA_LOCALES as readonly string[]).includes(locale)) {
    throw new ContentApprovalInputError(`locale is not enabled for the internal beta: ${locale}`)
  }

  const idempotencyKey = normalizedString(input.idempotencyKey, 'idempotencyKey', 8, 128)
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]*$/u.test(idempotencyKey)) {
    throw new ContentApprovalInputError('idempotencyKey contains unsupported characters')
  }

  const expectedRightsPolicyVersion = normalizedString(
    input.expectedRightsPolicyVersion,
    'expectedRightsPolicyVersion',
    3,
    64,
  )
  if (!POLICY_VERSION_PATTERN.test(expectedRightsPolicyVersion)) {
    throw new ContentApprovalInputError('expectedRightsPolicyVersion contains unsupported characters')
  }

  return {
    artifactId,
    expectedContentRevision: revision(input.expectedContentRevision, 'expectedContentRevision'),
    expectedDecisionSequence: decisionSequence(input.expectedDecisionSequence),
    expectedRightsPolicyVersion,
    expectedRightsRevision: revision(input.expectedRightsRevision, 'expectedRightsRevision'),
    expectedSourceRevision: revision(input.expectedSourceRevision, 'expectedSourceRevision'),
    idempotencyKey,
    locale: locale as InternalBetaLocale,
  }
}

export function contentApprovalDecisionFingerprint(
  input: NormalizedContentApprovalInput,
  approvedBy: string,
): `sha256:${string}` {
  const canonical = JSON.stringify({
    approvedBy,
    artifactId: input.artifactId,
    contentRevision: input.expectedContentRevision,
    decision: 'approved',
    locale: input.locale,
    rightsPolicyVersion: input.expectedRightsPolicyVersion,
    rightsRevision: input.expectedRightsRevision,
    sourceRevision: input.expectedSourceRevision,
  })
  return `sha256:${createHash('sha256').update(canonical, 'utf8').digest('hex')}`
}

function validatedRightsRevision(validation: unknown): `sha256:${string}` {
  const value = typeof validation === 'object' && validation !== null && 'rightsRevision' in validation
    ? validation.rightsRevision
    : undefined
  if (typeof value !== 'string' || !REVISION_PATTERN.test(value)) {
    throw new PublicationContentValidationError('Content contract validation failed', [{
      code: 'RIGHTS_REVISION_MISSING',
      message: 'Content approval validation must return an independent rights revision',
      path: 'rightsRevision',
    }])
  }
  return value as `sha256:${string}`
}

export function contentApprovalFileMetadata(
  files: readonly PublicationFile[],
): readonly PublicationFileMetadata[] {
  if (files.length === 0) {
    throw new PublicationContentValidationError('Content contract validation failed', [{
      code: 'EMPTY_OUTPUT',
      message: 'Validated approval bundle must contain at least one output file',
      path: 'files',
    }])
  }
  const sorted = [...files].sort((left, right) => left.path.localeCompare(right.path, 'en'))
  const seen = new Set<string>()
  return sorted.map((file) => {
    if (seen.has(file.path)) {
      throw new PublicationContentValidationError('Content contract validation failed', [{
        code: 'DUPLICATE_OUTPUT_PATH',
        message: 'Validated approval bundle contains a duplicate output path',
        path: file.path,
      }])
    }
    seen.add(file.path)
    return {
      byteLength: Buffer.byteLength(file.content, 'utf8'),
      path: file.path,
      sha256: createHash('sha256').update(file.content, 'utf8').digest('hex'),
    }
  })
}

export class SystemContentApprovalClock implements ContentApprovalClock {
  now(): Date {
    return new Date()
  }
}

export interface ContentApprovalServiceOptions {
  readonly clock?: ContentApprovalClock
  readonly rightsPolicyVersion?: string
}

export class ContentApprovalService {
  private readonly clock: ContentApprovalClock
  private readonly repository: ContentApprovalRepository
  private readonly rightsPolicyVersion: string
  private readonly validator: ContentApprovalValidator

  constructor(
    repository: ContentApprovalRepository,
    validator: ContentApprovalValidator,
    options: ContentApprovalServiceOptions = {},
  ) {
    this.repository = repository
    this.validator = validator
    this.clock = options.clock ?? new SystemContentApprovalClock()
    this.rightsPolicyVersion = options.rightsPolicyVersion ?? CONTENT_APPROVAL_RIGHTS_POLICY_VERSION
  }

  async prepare(artifactId: string, locale: string): Promise<PreparedContentApproval> {
    const input = normalizeContentApprovalInput({
      artifactId,
      expectedContentRevision: `sha256:${'0'.repeat(64)}`,
      expectedDecisionSequence: 0,
      expectedRightsPolicyVersion: this.rightsPolicyVersion,
      expectedRightsRevision: `sha256:${'0'.repeat(64)}`,
      expectedSourceRevision: `sha256:${'0'.repeat(64)}`,
      idempotencyKey: 'prepare:approval',
      locale,
    })
    const expectedDecisionSequence = await this.repository.latestDecisionSequence(input.artifactId)
    const validation = await this.validator.validate({
      artifactId: input.artifactId,
      locales: [input.locale],
    })
    const rightsRevision = validatedRightsRevision(validation)
    const files = contentApprovalFileMetadata(validation.files)
    return {
      artifactId: input.artifactId,
      expectedContentRevision: validation.contentRevision,
      expectedDecisionSequence,
      expectedRightsPolicyVersion: this.rightsPolicyVersion,
      expectedRightsRevision: rightsRevision,
      expectedSourceRevision: validation.sourceRevision,
      fileCount: files.length,
      files,
      locale: input.locale,
    }
  }

  async approve(rawInput: ContentApprovalInput, approvedByValue: string): Promise<ContentApprovalRecord> {
    const input = normalizeContentApprovalInput(rawInput)
    const approvedBy = normalizedString(approvedByValue, 'approvedBy', 1, 128)
    const decisionFingerprint = contentApprovalDecisionFingerprint(input, approvedBy)
    const existing = await this.repository.findByIdempotencyKey(input.idempotencyKey)
    if (existing) return this.reuse(existing, decisionFingerprint)

    const currentDecisionSequence = await this.repository.latestDecisionSequence(input.artifactId)
    if (currentDecisionSequence !== input.expectedDecisionSequence) {
      throw new ContentApprovalRevisionConflictError(
        'A publication approval or withdrawal was recorded after preparation; prepare again',
      )
    }

    if (input.expectedRightsPolicyVersion !== this.rightsPolicyVersion) {
      throw new ContentApprovalRevisionConflictError(
        'The rights policy changed after preparation; prepare the approval again',
      )
    }

    const validation = await this.validator.validate({
      artifactId: input.artifactId,
      locales: [input.locale],
    })
    const rightsRevision = validatedRightsRevision(validation)
    if (
      validation.contentRevision !== input.expectedContentRevision ||
      rightsRevision !== input.expectedRightsRevision ||
      validation.sourceRevision !== input.expectedSourceRevision
    ) {
      throw new ContentApprovalRevisionConflictError(
        'The CMS content, source, or rights revision changed after preparation; prepare the approval again',
      )
    }

    const approvedAt = this.clock.now()
    if (Number.isNaN(approvedAt.valueOf())) throw new Error('Content approval clock returned an invalid date')
    const files = contentApprovalFileMetadata(validation.files)
    const approved: ApprovedContentRevision = {
      approvedAt: approvedAt.toISOString(),
      approvedBy,
      artifactId: input.artifactId,
      contentRevision: validation.contentRevision,
      decision: 'approved',
      decisionFingerprint,
      fileCount: files.length,
      files,
      idempotencyKey: input.idempotencyKey,
      locale: input.locale,
      rightsPolicyVersion: this.rightsPolicyVersion,
      rightsRevision,
      sourceRevision: validation.sourceRevision,
    }

    try {
      return await this.repository.createApproved(approved)
    } catch (error: unknown) {
      const concurrent = await this.repository.findByIdempotencyKey(input.idempotencyKey)
      if (concurrent) return this.reuse(concurrent, decisionFingerprint)
      throw error
    }
  }

  private reuse(
    existing: ContentApprovalRecord,
    decisionFingerprint: string,
  ): ContentApprovalRecord {
    if (existing.decisionFingerprint !== decisionFingerprint) {
      throw new ContentApprovalIdempotencyConflictError(
        'Idempotency-Key is already associated with a different content approval',
      )
    }
    return existing
  }
}
