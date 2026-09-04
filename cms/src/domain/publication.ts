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

/** The persisted Payload draft scope consumed by deterministic validation. */
export interface PublicationDraftSelection {
  readonly artifactId: string
  readonly locales: readonly InternalBetaLocale[]
}

export interface PublicationContentValidationResult {
  readonly contentRevision: string
  readonly files: readonly PublicationFile[]
  /** Present for CMS approval/export; legacy publication validators may omit it. */
  readonly rightsRevision?: string
  readonly sourceRevision: string
}

export interface PublicationFile {
  readonly content: string
  readonly path: string
}

export interface PublicationContentValidator {
  validate(
    input: PublicationDraftSelection,
  ): Promise<PublicationContentValidationResult>
}

export interface PublicationFileMetadata {
  readonly byteLength: number
  readonly path: string
  readonly sha256: string
}
