import {
  ContentWithdrawalInputError,
  type ContentWithdrawalRightsReader,
  type CurrentWithdrawalRightsState,
  type InternalBetaLocale,
} from '../domain/index.ts'
import { canonicalRecordRevision } from '../publication/canonicalPromptBundle.ts'
import type { ContentWithdrawalPayloadLocalApi } from './payloadContentWithdrawalRepository.ts'

function object(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ContentWithdrawalInputError('CMS returned a malformed rights record')
  }
  return value as Record<string, unknown>
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new ContentWithdrawalInputError(`Current primary source ${field} is required`)
  }
  return value.trim()
}

export class PayloadContentWithdrawalRightsReader implements ContentWithdrawalRightsReader {
  private readonly payload: ContentWithdrawalPayloadLocalApi

  constructor(payload: ContentWithdrawalPayloadLocalApi) {
    this.payload = payload
  }

  async readCurrentRights(
    artifactId: string,
    _locale: InternalBetaLocale,
  ): Promise<CurrentWithdrawalRightsState> {
    const artifacts = await this.payload.find({
      collection: 'prompt-artifacts',
      depth: 0,
      draft: true,
      limit: 2,
      overrideAccess: true,
      where: { artifactKey: { equals: artifactId } },
    })
    if (artifacts.docs.length !== 1) {
      throw new ContentWithdrawalInputError('artifactId must resolve to exactly one PromptArtifact draft')
    }
    const artifactDocumentId = object(artifacts.docs[0]).id
    if (typeof artifactDocumentId !== 'string' && typeof artifactDocumentId !== 'number') {
      throw new ContentWithdrawalInputError('PromptArtifact draft has no valid document id')
    }
    const sources = await this.payload.find({
      collection: 'source-evidence',
      depth: 0,
      draft: true,
      limit: 100,
      overrideAccess: true,
      where: { artifact: { equals: artifactDocumentId } },
    })
    const primary = sources.docs.map(object).filter((candidate) => (
      candidate.recordType === 'source' && candidate.isPrimarySource === true
    ))
    if (primary.length !== 1) {
      throw new ContentWithdrawalInputError('artifact must have exactly one primary source')
    }
    const source = primary[0] ?? {}
    const status = source.rightsStatus
    if (status !== 'restricted' && status !== 'takedown') {
      throw new ContentWithdrawalInputError(
        'Primary source rights must be restricted or takedown before appending a withdrawal',
      )
    }
    const sourceUrl = requiredString(source.sourceUrl, 'sourceUrl')
    const reviewedBy = status === 'takedown'
      ? requiredString(source.takedownHandledBy, 'takedownHandledBy')
      : null
    const reviewedAt = status === 'takedown'
      ? requiredString(source.takedownHandledAt, 'takedownHandledAt')
      : null
    const caseId = status === 'takedown'
      ? requiredString(source.takedownCaseId, 'takedownCaseId')
      : null
    const rightsRevision = canonicalRecordRevision({
      caseId,
      decision: status,
      basis: status === 'restricted' ? requiredString(source.basis, 'basis') : null,
      reviewedAt,
      reviewedBy,
      scope: status === 'takedown' ? requiredString(source.takedownScope, 'takedownScope') : null,
      sourceUrl,
    })
    return { caseId, decision: status, rightsRevision }
  }
}
