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
