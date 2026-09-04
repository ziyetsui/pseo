import {
  ContentApprovalInputError,
  type ApprovedContentRevision,
  type ContentApprovalRecord,
  type ContentApprovalRepository,
  type InternalBetaLocale,
  type PublicationFileMetadata,
} from '../domain/index.ts'
import {
  allocatePayloadPublicationDecisionSequence,
  readLatestPayloadPublicationDecisionSequence,
} from '../decision/index.ts'

export interface ContentApprovalPayloadLocalApi {
  create(args: Record<string, unknown>): Promise<unknown>
  find(args: Record<string, unknown>): Promise<{ docs: unknown[] }>
  update(args: Record<string, unknown>): Promise<unknown>
}

function object(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Payload content approval record is malformed')
  }
  return value as Record<string, unknown>
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Payload content approval ${field} is malformed`)
  }
  return value
}

function relationId(value: unknown, field: string): string {
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  const relation = object(value)
  const id = relation.id
  if (typeof id === 'string' || typeof id === 'number') return String(id)
  throw new Error(`Payload content approval ${field} is malformed`)
}

function decisionSequence(value: unknown): number {
  const id = relationId(value, 'decisionSequence')
  const numeric = Number(id)
  if (!Number.isSafeInteger(numeric) || numeric < 1) {
    throw new Error('Payload content approval decisionSequence is malformed')
  }
  return numeric
}

function payloadRelationshipId(value: string): string | number {
  if (/^[1-9][0-9]*$/u.test(value)) {
    const numeric = Number(value)
    if (Number.isSafeInteger(numeric)) return numeric
  }
  return value
}

function files(value: unknown): readonly PublicationFileMetadata[] {
  if (!Array.isArray(value)) throw new Error('Payload content approval files are malformed')
  return value.map((candidate) => {
    const file = object(candidate)
    if (
      typeof file.byteLength !== 'number' ||
      !Number.isSafeInteger(file.byteLength) ||
      file.byteLength < 1
    ) {
      throw new Error('Payload content approval file byteLength is malformed')
    }
    return {
      byteLength: Number(file.byteLength),
      path: requiredString(file.path, 'file path'),
      sha256: requiredString(file.sha256, 'file sha256'),
    }
  })
}

function mapRecord(value: unknown): ContentApprovalRecord {
  const record = object(value)
  const rawId = record.id
  if (typeof rawId !== 'string' && typeof rawId !== 'number') {
    throw new Error('Payload content approval id is malformed')
  }
  const locale = record.locale
  if (locale !== 'en' && locale !== 'zh-CN') {
    throw new Error('Payload content approval locale is malformed')
  }
  if (record.decision !== 'approved') {
    throw new Error('Payload content approval decision is malformed')
  }
  const mappedFiles = files(record.files)
  const fileCount = Number(record.fileCount)
  if (!Number.isSafeInteger(fileCount) || fileCount !== mappedFiles.length) {
    throw new Error('Payload content approval fileCount is malformed')
  }
  return {
    approvedAt: requiredString(record.approvedAt, 'approvedAt'),
    approvedBy: relationId(record.approvedBy, 'approvedBy'),
    artifactId: requiredString(record.artifactKey, 'artifactKey'),
    contentRevision: requiredString(record.contentRevision, 'contentRevision'),
    decision: 'approved',
    decisionFingerprint: requiredString(record.decisionFingerprint, 'decisionFingerprint'),
    decisionSequence: decisionSequence(record.decisionSequence),
    fileCount,
    files: mappedFiles,
    id: String(rawId),
    idempotencyKey: requiredString(record.idempotencyKey, 'idempotencyKey'),
    locale: locale as InternalBetaLocale,
    rightsPolicyVersion: requiredString(record.rightsPolicyVersion, 'rightsPolicyVersion'),
    rightsRevision: requiredString(record.rightsRevision, 'rightsRevision'),
    sourceRevision: requiredString(record.sourceRevision, 'sourceRevision'),
  }
}

export class PayloadContentApprovalRepository implements ContentApprovalRepository {
  private readonly payload: ContentApprovalPayloadLocalApi

  constructor(payload: ContentApprovalPayloadLocalApi) {
    this.payload = payload
  }

  async findByIdempotencyKey(key: string): Promise<ContentApprovalRecord | null> {
    const result = await this.payload.find({
      collection: 'content-approvals',
      depth: 0,
      limit: 1,
      overrideAccess: true,
      where: { idempotencyKey: { equals: key } },
    })
    const first = result.docs[0]
    return first === undefined ? null : mapRecord(first)
  }

  async latestDecisionSequence(artifactId: string): Promise<number> {
    return readLatestPayloadPublicationDecisionSequence(this.payload, artifactId)
  }

  async createApproved(input: ApprovedContentRevision): Promise<ContentApprovalRecord> {
    const artifacts = await this.payload.find({
      collection: 'prompt-artifacts',
      depth: 0,
      draft: true,
      limit: 2,
      overrideAccess: true,
      where: { artifactKey: { equals: input.artifactId } },
    })
    if (artifacts.docs.length !== 1) {
      throw new ContentApprovalInputError('artifactId must resolve to exactly one PromptArtifact draft')
    }
    const artifactId = object(artifacts.docs[0]).id
    if (typeof artifactId !== 'string' && typeof artifactId !== 'number') {
      throw new ContentApprovalInputError('PromptArtifact draft has no valid document id')
    }

    const decisionSequence = await allocatePayloadPublicationDecisionSequence(this.payload, {
      artifactDocumentId: artifactId,
      artifactId: input.artifactId,
      decidedAt: input.approvedAt,
      decidedBy: input.approvedBy,
      decisionFingerprint: input.decisionFingerprint,
      idempotencyKey: input.idempotencyKey,
      kind: 'approval',
      locale: input.locale,
    })

    const created = await this.payload.create({
      collection: 'content-approvals',
      data: {
        approvedAt: input.approvedAt,
        approvedBy: payloadRelationshipId(input.approvedBy),
        artifact: artifactId,
        artifactKey: input.artifactId,
        contentRevision: input.contentRevision,
        decision: input.decision,
        decisionFingerprint: input.decisionFingerprint,
        decisionSequence,
        fileCount: input.fileCount,
        files: input.files,
        idempotencyKey: input.idempotencyKey,
        locale: input.locale,
        rightsPolicyVersion: input.rightsPolicyVersion,
        rightsRevision: input.rightsRevision,
        sourceRevision: input.sourceRevision,
      },
      overrideAccess: true,
    })
    return mapRecord(created)
  }
}
