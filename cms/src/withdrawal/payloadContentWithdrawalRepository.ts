import {
  ContentWithdrawalInputError,
  type ApprovedContentWithdrawal,
  type ContentWithdrawalRecord,
  type ContentWithdrawalRepository,
  type InternalBetaLocale,
} from '../domain/index.ts'
import {
  allocatePayloadPublicationDecisionSequence,
  readLatestPayloadPublicationDecisionSequence,
} from '../decision/index.ts'

export interface ContentWithdrawalPayloadLocalApi {
  create(args: Record<string, unknown>): Promise<unknown>
  find(args: Record<string, unknown>): Promise<{ docs: unknown[] }>
}

function object(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Payload content withdrawal record is malformed')
  }
  return value as Record<string, unknown>
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Payload content withdrawal ${field} is malformed`)
  }
  return value
}

function relationId(value: unknown, field: string): string {
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  const id = object(value).id
  if (typeof id === 'string' || typeof id === 'number') return String(id)
  throw new Error(`Payload content withdrawal ${field} is malformed`)
}

function decisionSequence(value: unknown): number {
  const id = relationId(value, 'decisionSequence')
  const numeric = Number(id)
  if (!Number.isSafeInteger(numeric) || numeric < 1) {
    throw new Error('Payload content withdrawal decisionSequence is malformed')
  }
  return numeric
}

function dispatchMode(value: unknown): 'disabled' {
  if (value !== 'disabled') {
    throw new Error('Payload content withdrawal syncDispatchMode is malformed')
  }
  return 'disabled'
}

function payloadRelationshipId(value: string): string | number {
  if (/^[1-9][0-9]*$/u.test(value)) {
    const numeric = Number(value)
    if (Number.isSafeInteger(numeric)) return numeric
  }
  return value
}

export function mapContentWithdrawalRecord(value: unknown): ContentWithdrawalRecord {
  const record = object(value)
  const locale = record.locale
  const decision = record.decision
  if ((locale !== 'en' && locale !== 'zh-CN') || (decision !== 'restricted' && decision !== 'takedown')) {
    throw new Error('Payload content withdrawal identity is malformed')
  }
  if (
    record.syncEventType !== 'public_snapshot_withdrawal' ||
    record.syncPriority !== 'urgent'
  ) {
    throw new Error('Payload content withdrawal sync event is malformed')
  }
  return {
    artifactId: requiredString(record.artifactKey, 'artifactKey'),
    caseId: requiredString(record.caseId, 'caseId'),
    decision,
    decisionFingerprint: requiredString(record.decisionFingerprint, 'decisionFingerprint') as `sha256:${string}`,
    decisionSequence: decisionSequence(record.decisionSequence),
    id: relationId(record.id, 'id'),
    idempotencyKey: requiredString(record.idempotencyKey, 'idempotencyKey'),
    locale: locale as InternalBetaLocale,
    rightsRevision: requiredString(record.rightsRevision, 'rightsRevision') as `sha256:${string}`,
    syncDispatchMode: dispatchMode(record.syncDispatchMode),
    syncEventRevision: requiredString(record.syncEventRevision, 'syncEventRevision') as `sha256:${string}`,
    syncEventType: 'public_snapshot_withdrawal',
    syncPriority: 'urgent',
    syncRequestedAt: requiredString(record.syncRequestedAt, 'syncRequestedAt'),
    withdrawnAt: requiredString(record.withdrawnAt, 'withdrawnAt'),
    withdrawnBy: relationId(record.withdrawnBy, 'withdrawnBy'),
  }
}

export class PayloadContentWithdrawalRepository implements ContentWithdrawalRepository {
  private readonly payload: ContentWithdrawalPayloadLocalApi

  constructor(payload: ContentWithdrawalPayloadLocalApi) {
    this.payload = payload
  }

  async findByIdempotencyKey(key: string): Promise<ContentWithdrawalRecord | null> {
    const result = await this.payload.find({
      collection: 'content-withdrawals',
      depth: 0,
      limit: 1,
      overrideAccess: true,
      where: { idempotencyKey: { equals: key } },
    })
    return result.docs[0] === undefined ? null : mapContentWithdrawalRecord(result.docs[0])
  }

  async latestDecisionSequence(artifactId: string): Promise<number> {
    return readLatestPayloadPublicationDecisionSequence(this.payload, artifactId)
  }

  async createWithdrawal(input: ApprovedContentWithdrawal): Promise<ContentWithdrawalRecord> {
    const artifacts = await this.payload.find({
      collection: 'prompt-artifacts',
      depth: 0,
      draft: true,
      limit: 2,
      overrideAccess: true,
      where: { artifactKey: { equals: input.artifactId } },
    })
    if (artifacts.docs.length !== 1) {
      throw new ContentWithdrawalInputError('artifactId must resolve to exactly one PromptArtifact draft')
    }
    const artifactDocumentId = object(artifacts.docs[0]).id
    if (typeof artifactDocumentId !== 'string' && typeof artifactDocumentId !== 'number') {
      throw new ContentWithdrawalInputError('PromptArtifact draft has no valid document id')
    }
    const decisionSequence = await allocatePayloadPublicationDecisionSequence(this.payload, {
      artifactDocumentId,
      artifactId: input.artifactId,
      decidedAt: input.withdrawnAt,
      decidedBy: input.withdrawnBy,
      decisionFingerprint: input.decisionFingerprint,
      idempotencyKey: input.idempotencyKey,
      kind: 'withdrawal',
      locale: input.locale,
    })
    const created = await this.payload.create({
      collection: 'content-withdrawals',
      data: {
        artifact: artifactDocumentId,
        artifactKey: input.artifactId,
        caseId: input.caseId,
        decision: input.decision,
        decisionFingerprint: input.decisionFingerprint,
        decisionSequence,
        idempotencyKey: input.idempotencyKey,
        locale: input.locale,
        rightsRevision: input.rightsRevision,
        syncDispatchMode: input.syncDispatchMode,
        syncEventRevision: input.syncEventRevision,
        syncEventType: input.syncEventType,
        syncPriority: input.syncPriority,
        syncRequestedAt: input.syncRequestedAt,
        withdrawnAt: input.withdrawnAt,
        withdrawnBy: payloadRelationshipId(input.withdrawnBy),
      },
      overrideAccess: true,
    })
    return mapContentWithdrawalRecord(created)
  }
}
