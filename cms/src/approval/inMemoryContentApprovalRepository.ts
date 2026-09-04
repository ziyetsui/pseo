import type {
  ApprovedContentRevision,
  ContentApprovalRecord,
  ContentApprovalRepository,
} from '../domain/index.ts'
import { allocateInMemoryPublicationDecisionSequence } from '../decision/index.ts'

export class InMemoryContentApprovalRepository implements ContentApprovalRepository {
  private readonly byIdempotencyKey = new Map<string, ContentApprovalRecord>()

  async createApproved(input: ApprovedContentRevision): Promise<ContentApprovalRecord> {
    if (this.byIdempotencyKey.has(input.idempotencyKey)) {
      throw new Error('duplicate content approval idempotency key')
    }
    const record: ContentApprovalRecord = {
      ...input,
      decisionSequence: allocateInMemoryPublicationDecisionSequence(),
      id: `approval_${String(this.byIdempotencyKey.size + 1).padStart(4, '0')}`,
    }
    this.byIdempotencyKey.set(input.idempotencyKey, record)
    return record
  }

  async findByIdempotencyKey(key: string): Promise<ContentApprovalRecord | null> {
    return this.byIdempotencyKey.get(key) ?? null
  }

  async latestDecisionSequence(artifactId: string): Promise<number> {
    let latest = 0
    for (const record of this.byIdempotencyKey.values()) {
      if (record.artifactId === artifactId && record.decisionSequence > latest) {
        latest = record.decisionSequence
      }
    }
    return latest
  }
}
