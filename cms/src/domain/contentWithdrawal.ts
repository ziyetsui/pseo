import type { InternalBetaLocale } from './publication.ts'

export const CONTENT_WITHDRAWAL_DECISIONS = ['restricted', 'takedown'] as const

export type ContentWithdrawalDecision = (typeof CONTENT_WITHDRAWAL_DECISIONS)[number]

export interface ContentWithdrawalInput {
  readonly artifactId: string
  readonly caseId: string
  readonly decision: string
  readonly expectedDecisionSequence: number
  readonly expectedRightsRevision: string
  readonly idempotencyKey: string
  readonly locale: string
}

export interface NormalizedContentWithdrawalInput {
  readonly artifactId: string
  readonly caseId: string
  readonly decision: ContentWithdrawalDecision
  readonly expectedDecisionSequence: number
  readonly expectedRightsRevision: `sha256:${string}`
  readonly idempotencyKey: string
  readonly locale: InternalBetaLocale
}

export interface CurrentWithdrawalRightsState {
  readonly caseId: string | null
  readonly decision: ContentWithdrawalDecision
  readonly rightsRevision: `sha256:${string}`
}

export interface PreparedContentWithdrawal {
  readonly artifactId: string
  readonly caseId: string
  readonly decision: ContentWithdrawalDecision
  readonly expectedDecisionSequence: number
  readonly expectedRightsRevision: `sha256:${string}`
  readonly locale: InternalBetaLocale
}

/**
 * One immutable record is both the reviewer decision/tombstone and a disabled
 * publication outbox source event. Dispatch must remain off until a durable
 * worker and separate delivery receipt are implemented.
 */
export interface ApprovedContentWithdrawal {
  readonly artifactId: string
  readonly caseId: string
  readonly decision: ContentWithdrawalDecision
  readonly decisionFingerprint: `sha256:${string}`
  readonly idempotencyKey: string
  readonly locale: InternalBetaLocale
  readonly rightsRevision: `sha256:${string}`
  /** Automatic dispatch is intentionally disabled until a durable worker and receipt exist. */
  readonly syncDispatchMode: 'disabled'
  readonly syncEventRevision: `sha256:${string}`
  readonly syncEventType: 'public_snapshot_withdrawal'
  readonly syncPriority: 'urgent'
  readonly syncRequestedAt: string
  readonly withdrawnAt: string
  readonly withdrawnBy: string
}

export interface ContentWithdrawalRecord extends ApprovedContentWithdrawal {
  /** Database-issued cross-decision ordering token; app timestamps never order publication. */
  readonly decisionSequence: number
  readonly id: string
}

export interface ContentWithdrawalRepository {
  createWithdrawal(input: ApprovedContentWithdrawal): Promise<ContentWithdrawalRecord>
  findByIdempotencyKey(key: string): Promise<ContentWithdrawalRecord | null>
  latestDecisionSequence(artifactId: string): Promise<number>
}

export interface ContentWithdrawalRightsReader {
  readCurrentRights(
    artifactId: string,
    locale: InternalBetaLocale,
  ): Promise<CurrentWithdrawalRightsState>
}

export interface ContentWithdrawalClock {
  now(): Date
}

export class ContentWithdrawalInputError extends Error {
  readonly code = 'INVALID_CONTENT_WITHDRAWAL'
  override readonly name = 'ContentWithdrawalInputError'
}

export class ContentWithdrawalIdempotencyConflictError extends Error {
  readonly code = 'WITHDRAWAL_IDEMPOTENCY_KEY_REUSED'
  override readonly name = 'ContentWithdrawalIdempotencyConflictError'
}

export class ContentWithdrawalRevisionConflictError extends Error {
  readonly code = 'CONTENT_WITHDRAWAL_REVISION_CONFLICT'
  override readonly name = 'ContentWithdrawalRevisionConflictError'
}
