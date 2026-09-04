import type {
  InternalBetaLocale,
  PublicationDraftSelection,
  PublicationFile,
  PublicationFileMetadata,
} from './publication.ts'

export const CONTENT_APPROVAL_RIGHTS_POLICY_VERSION = 'promptlab-rights-v1' as const

export interface ContentApprovalInput {
  readonly artifactId: string
  readonly expectedContentRevision: string
  readonly expectedDecisionSequence: number
  readonly expectedRightsPolicyVersion: string
  readonly expectedRightsRevision: string
  readonly expectedSourceRevision: string
  readonly idempotencyKey: string
  readonly locale: string
}

export interface NormalizedContentApprovalInput {
  readonly artifactId: string
  readonly expectedContentRevision: `sha256:${string}`
  readonly expectedDecisionSequence: number
  readonly expectedRightsPolicyVersion: string
  readonly expectedRightsRevision: `sha256:${string}`
  readonly expectedSourceRevision: `sha256:${string}`
  readonly idempotencyKey: string
  readonly locale: InternalBetaLocale
}

export interface PreparedContentApproval {
  readonly artifactId: string
  readonly expectedContentRevision: string
  readonly expectedDecisionSequence: number
  readonly expectedRightsPolicyVersion: string
  readonly expectedRightsRevision: string
  readonly expectedSourceRevision: string
  readonly fileCount: number
  readonly files: readonly PublicationFileMetadata[]
  readonly locale: InternalBetaLocale
}

export interface ApprovedContentRevision {
  readonly approvedAt: string
  readonly approvedBy: string
  readonly artifactId: string
  readonly contentRevision: string
  readonly decision: 'approved'
  readonly decisionFingerprint: string
  readonly fileCount: number
  readonly files: readonly PublicationFileMetadata[]
  readonly idempotencyKey: string
  readonly locale: InternalBetaLocale
  readonly rightsPolicyVersion: string
  readonly rightsRevision: string
  readonly sourceRevision: string
}

export interface ContentApprovalRecord extends ApprovedContentRevision {
  /** Database-issued cross-decision ordering token; app timestamps never order publication. */
  readonly decisionSequence: number
  readonly id: string
}

export interface ContentApprovalRepository {
  createApproved(input: ApprovedContentRevision): Promise<ContentApprovalRecord>
  findByIdempotencyKey(key: string): Promise<ContentApprovalRecord | null>
  latestDecisionSequence(artifactId: string): Promise<number>
}

export interface ContentApprovalClock {
  now(): Date
}

export interface ContentApprovalValidator {
  validate(input: PublicationDraftSelection): Promise<ContentApprovalValidationResult>
}

export interface ContentApprovalValidationResult {
  readonly contentRevision: string
  readonly files: readonly PublicationFile[]
  readonly rightsRevision: string
  readonly sourceRevision: string
}

export class ContentApprovalInputError extends Error {
  readonly code = 'INVALID_CONTENT_APPROVAL'
  override readonly name = 'ContentApprovalInputError'
}

export class ContentApprovalIdempotencyConflictError extends Error {
  readonly code = 'IDEMPOTENCY_KEY_REUSED'
  override readonly name = 'ContentApprovalIdempotencyConflictError'
}

export class ContentApprovalRevisionConflictError extends Error {
  readonly code = 'CONTENT_APPROVAL_REVISION_CONFLICT'
  override readonly name = 'ContentApprovalRevisionConflictError'
}
