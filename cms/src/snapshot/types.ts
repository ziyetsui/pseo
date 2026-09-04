import type {
  ContentApprovalRecord,
  ContentApprovalValidationResult,
  ContentWithdrawalRecord,
  InternalBetaLocale,
} from '../domain/index.ts'

export const PUBLIC_SNAPSHOT_SCHEMA_VERSION = 1 as const
export const PUBLIC_SNAPSHOT_EXPORTER_VERSION = 'cms-public-snapshot-v1' as const
export const PUBLIC_SNAPSHOT_MAX_APPROVALS = 10_000
export const PUBLIC_SNAPSHOT_MAX_FILES = 10_000
export const PUBLIC_SNAPSHOT_MAX_FILE_BYTES = 8 * 1024 * 1024
export const PUBLIC_SNAPSHOT_MAX_TOTAL_BYTES = 32 * 1024 * 1024

export type PublicRightsMetadata =
  | {
      readonly basis: string
      readonly evidenceUrl: string
      readonly licenseReference: string
      readonly reviewedAt: string
      readonly sourceUrl: string
      readonly status: 'cleared'
    }
  | {
      readonly authorName: string
      readonly authorUrl: string | null
      readonly notice: string
      readonly originalPostUrl: string
      readonly policyVersion: string
      readonly reviewedAt: string
      readonly riskAcceptanceRevision: string
      readonly sourceUrl: string
      readonly status: 'community_attributed'
      readonly takedownUrl: string
    }

export interface PublicSnapshotValidatedApproval extends ContentApprovalValidationResult {
  readonly rightsRevision: string
  readonly rights: PublicRightsMetadata
}

export interface PublicSnapshotReadSession {
  listApprovals(): Promise<readonly ContentApprovalRecord[]>
  listWithdrawals(): Promise<readonly ContentWithdrawalRecord[]>
  validateApproval(approval: ContentApprovalRecord): Promise<PublicSnapshotValidatedApproval>
}

/**
 * The source owns the consistency boundary. Implementations must either run
 * the entire callback against one immutable/repeatable-read view or reject the
 * request before returning any snapshot bytes.
 */
export interface PublicSnapshotSource {
  readConsistently<T>(read: (session: PublicSnapshotReadSession) => Promise<T>): Promise<T>
}

export interface PublicSnapshotFile {
  readonly content: string
  readonly encoding: 'base64'
  readonly path: string
  readonly sha256: string
}

export interface PublicSnapshotManifestFile {
  readonly bytes: number
  readonly path: string
  readonly sha256: string
}

export interface PublicSnapshotManifest {
  readonly counts: Readonly<Record<string, number>>
  readonly exporterVersion: string
  readonly exportRevision: string
  readonly files: readonly PublicSnapshotManifestFile[]
  readonly schemaVersion: typeof PUBLIC_SNAPSHOT_SCHEMA_VERSION
}

export interface PublicSnapshotEnvelope {
  readonly exporterVersion: string
  readonly exportRevision: string
  readonly files: readonly PublicSnapshotFile[]
  readonly manifest: PublicSnapshotManifest
  readonly manifestSha256: string
  readonly schemaVersion: typeof PUBLIC_SNAPSHOT_SCHEMA_VERSION
}

export interface PublicSnapshotCatalogItem {
  readonly id: string
  readonly locale: InternalBetaLocale
  readonly path: string
  readonly rightsStatus: 'cleared' | 'community_attributed'
  readonly slug: string
  readonly sourceUrl: string
  readonly summary: string
  readonly title: string
}

export class PublicSnapshotError extends Error {
  override readonly name = 'PublicSnapshotError'
  readonly code: string
  readonly publicDetail: string
  readonly httpStatus: 409 | 422 | 500 | 503

  constructor(
    code: string,
    publicDetail: string,
    httpStatus: 409 | 422 | 500 | 503 = 422,
  ) {
    super(publicDetail)
    this.code = code
    this.publicDetail = publicDetail
    this.httpStatus = httpStatus
  }
}
