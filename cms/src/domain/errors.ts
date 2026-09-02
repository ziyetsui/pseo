export class PublicationRequestInputError extends Error {
  readonly code = 'INVALID_PUBLICATION_REQUEST'
  override readonly name = 'PublicationRequestInputError'
}

export class PublicationIdempotencyConflictError extends Error {
  readonly code = 'IDEMPOTENCY_KEY_REUSED'
  override readonly name = 'PublicationIdempotencyConflictError'
}

export class PublicationBaseRevisionConflictError extends Error {
  readonly code = 'REVISION_CONFLICT'
  override readonly name = 'PublicationBaseRevisionConflictError'
}

export class PublicationContentRevisionConflictError extends Error {
  readonly code = 'CONTENT_REVISION_CONFLICT'
  override readonly name = 'PublicationContentRevisionConflictError'
}

export interface PublicationContentValidationIssue {
  readonly code: string
  readonly message: string
  readonly path: string
}

export class PublicationContentValidationError extends Error {
  readonly code = 'CONTENT_CONTRACT_INVALID'
  override readonly name = 'PublicationContentValidationError'
  readonly issues: readonly PublicationContentValidationIssue[]

  constructor(message: string, issues: readonly PublicationContentValidationIssue[]) {
    super(message)
    this.issues = issues
  }
}

export class GitPublisherUnavailableError extends Error {
  readonly code = 'GIT_PUBLISHER_UNAVAILABLE'
  override readonly name = 'GitPublisherUnavailableError'
}
