import { createHash } from 'node:crypto'

import {
  CONTENT_WITHDRAWAL_DECISIONS,
  ContentWithdrawalIdempotencyConflictError,
  ContentWithdrawalInputError,
  ContentWithdrawalRevisionConflictError,
  INTERNAL_BETA_LOCALES,
  type ApprovedContentWithdrawal,
  type ContentWithdrawalClock,
  type ContentWithdrawalInput,
  type ContentWithdrawalRecord,
  type ContentWithdrawalRepository,
  type ContentWithdrawalRightsReader,
  type InternalBetaLocale,
  type NormalizedContentWithdrawalInput,
  type PreparedContentWithdrawal,
} from '../domain/index.ts'

const REVISION_PATTERN = /^sha256:[a-f0-9]{64}$/u
const ARTIFACT_PATTERN = /^prm_[a-z0-9_]{8,64}$/u
const IDEMPOTENCY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/u
const CASE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:/-]*$/u

function normalizedString(value: unknown, field: string, minimum: number, maximum: number): string {
  if (typeof value !== 'string') throw new ContentWithdrawalInputError(`${field} must be a string`)
  const normalized = value.trim()
  if (normalized.length < minimum || normalized.length > maximum) {
    throw new ContentWithdrawalInputError(`${field} must contain ${minimum}-${maximum} characters`)
  }
  return normalized
}

function normalizeIdentity(
  artifactIdValue: unknown,
  localeValue: unknown,
): { readonly artifactId: string; readonly locale: InternalBetaLocale } {
  const artifactId = normalizedString(artifactIdValue, 'artifactId', 12, 68)
  if (!ARTIFACT_PATTERN.test(artifactId)) {
    throw new ContentWithdrawalInputError('artifactId must match the immutable Prompt id contract')
  }
  const locale = normalizedString(localeValue, 'locale', 2, 5)
  if (!(INTERNAL_BETA_LOCALES as readonly string[]).includes(locale)) {
    throw new ContentWithdrawalInputError(`locale is not enabled for the internal beta: ${locale}`)
  }
  return { artifactId, locale: locale as InternalBetaLocale }
}

function normalizeDecision(value: unknown): 'restricted' | 'takedown' {
  const decision = normalizedString(value, 'decision', 8, 10)
  if (!(CONTENT_WITHDRAWAL_DECISIONS as readonly string[]).includes(decision)) {
    throw new ContentWithdrawalInputError('decision must be restricted or takedown')
  }
  return decision as 'restricted' | 'takedown'
}

function normalizeCaseId(value: unknown): string {
  const caseId = normalizedString(value, 'caseId', 3, 160)
  if (!CASE_PATTERN.test(caseId)) {
    throw new ContentWithdrawalInputError('caseId contains unsupported characters')
  }
  return caseId
}

function normalizeRevision(value: unknown): `sha256:${string}` {
  const revision = normalizedString(value, 'expectedRightsRevision', 71, 71)
  if (!REVISION_PATTERN.test(revision)) {
    throw new ContentWithdrawalInputError(
      'expectedRightsRevision must be a sha256:<64 lowercase hex> revision',
    )
  }
  return revision as `sha256:${string}`
}

function normalizeDecisionSequence(value: unknown): number {
  if (!Number.isSafeInteger(value) || Number(value) < 0) {
    throw new ContentWithdrawalInputError('expectedDecisionSequence must be a non-negative integer')
  }
  return Number(value)
}

export function normalizeContentWithdrawalInput(
  input: ContentWithdrawalInput,
): NormalizedContentWithdrawalInput {
  const identity = normalizeIdentity(input.artifactId, input.locale)
  const idempotencyKey = normalizedString(input.idempotencyKey, 'idempotencyKey', 8, 128)
  if (!IDEMPOTENCY_PATTERN.test(idempotencyKey)) {
    throw new ContentWithdrawalInputError('idempotencyKey contains unsupported characters')
  }
  return {
    ...identity,
    caseId: normalizeCaseId(input.caseId),
    decision: normalizeDecision(input.decision),
    expectedDecisionSequence: normalizeDecisionSequence(input.expectedDecisionSequence),
    expectedRightsRevision: normalizeRevision(input.expectedRightsRevision),
    idempotencyKey,
  }
}

function normalizePrepareInput(
  artifactIdValue: unknown,
  localeValue: unknown,
  decisionValue: unknown,
  caseIdValue: unknown,
): Omit<
  NormalizedContentWithdrawalInput,
  'expectedDecisionSequence' | 'expectedRightsRevision' | 'idempotencyKey'
> {
  return {
    ...normalizeIdentity(artifactIdValue, localeValue),
    caseId: normalizeCaseId(caseIdValue),
    decision: normalizeDecision(decisionValue),
  }
}

export function contentWithdrawalDecisionFingerprint(
  input: NormalizedContentWithdrawalInput,
  withdrawnBy: string,
): `sha256:${string}` {
  const canonical = JSON.stringify({
    artifactId: input.artifactId,
    caseId: input.caseId,
    decision: input.decision,
    locale: input.locale,
    rightsRevision: input.expectedRightsRevision,
    withdrawnBy,
  })
  return `sha256:${createHash('sha256').update(canonical, 'utf8').digest('hex')}`
}

export function contentWithdrawalSyncEventRevision(
  decisionFingerprint: `sha256:${string}`,
  idempotencyKey: string,
): `sha256:${string}` {
  return `sha256:${createHash('sha256').update(JSON.stringify({
    decisionFingerprint,
    idempotencyKey,
  }), 'utf8').digest('hex')}`
}

export class SystemContentWithdrawalClock implements ContentWithdrawalClock {
  now(): Date {
    return new Date()
  }
}

export interface ContentWithdrawalServiceOptions {
  readonly clock?: ContentWithdrawalClock
}

export class ContentWithdrawalService {
  private readonly clock: ContentWithdrawalClock
  private readonly repository: ContentWithdrawalRepository
  private readonly rightsReader: ContentWithdrawalRightsReader

  constructor(
    repository: ContentWithdrawalRepository,
    rightsReader: ContentWithdrawalRightsReader,
    options: ContentWithdrawalServiceOptions = {},
  ) {
    this.repository = repository
    this.rightsReader = rightsReader
    this.clock = options.clock ?? new SystemContentWithdrawalClock()
  }

  async prepare(
    artifactIdValue: unknown,
    localeValue: unknown,
    decisionValue: unknown,
    caseIdValue: unknown,
  ): Promise<PreparedContentWithdrawal> {
    const input = normalizePrepareInput(artifactIdValue, localeValue, decisionValue, caseIdValue)
    const expectedDecisionSequence = await this.repository.latestDecisionSequence(input.artifactId)
    const current = await this.rightsReader.readCurrentRights(input.artifactId, input.locale)
    this.assertCurrentDecision(input.decision, input.caseId, current)
    return {
      ...input,
      expectedDecisionSequence,
      expectedRightsRevision: current.rightsRevision,
    }
  }

  async withdraw(
    rawInput: ContentWithdrawalInput,
    withdrawnByValue: unknown,
  ): Promise<ContentWithdrawalRecord> {
    const input = normalizeContentWithdrawalInput(rawInput)
    const withdrawnBy = normalizedString(withdrawnByValue, 'withdrawnBy', 1, 128)
    const decisionFingerprint = contentWithdrawalDecisionFingerprint(input, withdrawnBy)
    const existing = await this.repository.findByIdempotencyKey(input.idempotencyKey)
    if (existing) return this.reuse(existing, decisionFingerprint)

    const currentDecisionSequence = await this.repository.latestDecisionSequence(input.artifactId)
    if (currentDecisionSequence !== input.expectedDecisionSequence) {
      throw new ContentWithdrawalRevisionConflictError(
        'A publication approval or withdrawal was recorded after preparation; prepare again',
      )
    }

    const current = await this.rightsReader.readCurrentRights(input.artifactId, input.locale)
    this.assertCurrentDecision(input.decision, input.caseId, current)
    if (current.rightsRevision !== input.expectedRightsRevision) {
      throw new ContentWithdrawalRevisionConflictError(
        'The CMS rights revision changed after preparation; prepare the withdrawal again',
      )
    }

    const now = this.clock.now()
    if (Number.isNaN(now.valueOf())) throw new Error('Content withdrawal clock returned an invalid date')
    const withdrawnAt = now.toISOString()
    const approved: ApprovedContentWithdrawal = {
      artifactId: input.artifactId,
      caseId: input.caseId,
      decision: input.decision,
      decisionFingerprint,
      idempotencyKey: input.idempotencyKey,
      locale: input.locale,
      rightsRevision: input.expectedRightsRevision,
      syncDispatchMode: 'disabled',
      syncEventRevision: contentWithdrawalSyncEventRevision(
        decisionFingerprint,
        input.idempotencyKey,
      ),
      syncEventType: 'public_snapshot_withdrawal',
      syncPriority: 'urgent',
      syncRequestedAt: withdrawnAt,
      withdrawnAt,
      withdrawnBy,
    }

    try {
      return await this.repository.createWithdrawal(approved)
    } catch (error: unknown) {
      const concurrent = await this.repository.findByIdempotencyKey(input.idempotencyKey)
      if (concurrent) return this.reuse(concurrent, decisionFingerprint)
      throw error
    }
  }

  private assertCurrentDecision(
    decision: 'restricted' | 'takedown',
    caseId: string,
    current: Awaited<ReturnType<ContentWithdrawalRightsReader['readCurrentRights']>>,
  ): void {
    if (current.decision !== decision) {
      throw new ContentWithdrawalRevisionConflictError(
        'The primary source is not in the requested restricted or takedown state',
      )
    }
    if (decision === 'takedown' && current.caseId !== caseId) {
      throw new ContentWithdrawalRevisionConflictError(
        'caseId must match the current CMS takedown case',
      )
    }
  }

  private reuse(
    existing: ContentWithdrawalRecord,
    decisionFingerprint: string,
  ): ContentWithdrawalRecord {
    if (existing.decisionFingerprint !== decisionFingerprint) {
      throw new ContentWithdrawalIdempotencyConflictError(
        'Idempotency-Key is already associated with a different content withdrawal',
      )
    }
    return existing
  }
}
