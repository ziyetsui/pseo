export const INTERNAL_BETA_LOCALES = ['en', 'zh-CN'] as const

export type InternalBetaLocale = (typeof INTERNAL_BETA_LOCALES)[number]

export const PUBLICATION_REQUEST_STATUSES = [
  'pending',
  'mock_accepted',
  'pr_open',
  'checks_passed',
  'conflicted',
  'merged',
  'released',
  'rejected',
  'failed',
] as const

export type PublicationRequestStatus = (typeof PUBLICATION_REQUEST_STATUSES)[number]

export interface PublicationRequestInput {
  readonly artifactId: string
  readonly commitMessage: string
  readonly expectedBaseSha: string
  readonly expectedContentRevision: string
  readonly expectedSourceRevision: string
  readonly idempotencyKey: string
  readonly locales: readonly string[]
}

export interface NormalizedPublicationRequestInput {
  readonly artifactId: string
  readonly commitMessage: string
  readonly expectedBaseSha: string
  readonly expectedContentRevision: string
  readonly expectedSourceRevision: string
  readonly idempotencyKey: string
  readonly locales: readonly InternalBetaLocale[]
}

export interface PublicationContentValidationResult {
  readonly contentRevision: string
  readonly sourceRevision: string
}

export interface PublicationContentValidator {
  validate(
    input: NormalizedPublicationRequestInput,
  ): Promise<PublicationContentValidationResult>
}

export interface PublicationCheck {
  readonly name: string
  readonly status: 'pending' | 'passed' | 'failed'
}

export interface GitPublisherRequest extends NormalizedPublicationRequestInput {
  readonly requestId: string
  readonly requestFingerprint: string
  readonly validatedContentRevision: string
  readonly validatedSourceRevision: string
}

export interface GitPublisherReceipt {
  readonly branch: string | null
  readonly checks: readonly PublicationCheck[]
  readonly commitSha: string | null
  readonly plannedBranch: string
  readonly provider: 'mock' | 'github'
  readonly pullRequestNumber: number | null
  readonly pullRequestUrl: string | null
  readonly status: 'mock_accepted' | 'pr_open'
}

export interface PublicationRequestRecord extends NormalizedPublicationRequestInput {
  readonly branch: string | null
  readonly checks: readonly PublicationCheck[]
  readonly commitSha: string | null
  readonly errorCode: string | null
  readonly errorDetail: string | null
  readonly id: string
  readonly plannedBranch: string | null
  readonly provider: 'mock' | 'github' | null
  readonly pullRequestNumber: number | null
  readonly pullRequestUrl: string | null
  readonly requestFingerprint: string
  readonly requestedBy: string
  readonly status: PublicationRequestStatus
  readonly validatedContentRevision: string
  readonly validatedSourceRevision: string
}

export interface PendingPublicationRequest
  extends NormalizedPublicationRequestInput {
  readonly requestFingerprint: string
  readonly requestedBy: string
  readonly validatedContentRevision: string
  readonly validatedSourceRevision: string
}

export interface PublicationRequestRepository {
  findByIdempotencyKey(key: string): Promise<PublicationRequestRecord | null>
  createPending(input: PendingPublicationRequest): Promise<PublicationRequestRecord>
  applyPublisherReceipt(id: string, receipt: GitPublisherReceipt): Promise<PublicationRequestRecord>
  markFailed(id: string, code: string, detail: string): Promise<PublicationRequestRecord>
  markConflicted(id: string, code: string, detail: string): Promise<PublicationRequestRecord>
}

export interface GitPublisher {
  requestPublication(input: GitPublisherRequest): Promise<GitPublisherReceipt>
}
