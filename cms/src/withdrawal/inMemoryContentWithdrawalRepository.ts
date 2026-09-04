import type {
  ApprovedContentWithdrawal,
  ContentWithdrawalRecord,
  ContentWithdrawalRepository,
} from '../domain/index.ts'
import { allocateInMemoryPublicationDecisionSequence } from '../decision/index.ts'

export class InMemoryContentWithdrawalRepository implements ContentWithdrawalRepository {
  private readonly byIdempotencyKey = new Map<string, ContentWithdrawalRecord>()

  async createWithdrawal(input: ApprovedContentWithdrawal): Promise<ContentWithdrawalRecord> {
    if (this.byIdempotencyKey.has(input.idempotencyKey)) {
      throw new Error('duplicate content withdrawal idempotency key')
    }
    const record: ContentWithdrawalRecord = {
      ...input,
      decisionSequence: allocateInMemoryPublicationDecisionSequence(),
      id: `withdrawal_${String(this.byIdempotencyKey.size + 1).padStart(4, '0')}`,
    }
    this.byIdempotencyKey.set(input.idempotencyKey, record)
    return record
  }

  async findByIdempotencyKey(key: string): Promise<ContentWithdrawalRecord | null> {
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
