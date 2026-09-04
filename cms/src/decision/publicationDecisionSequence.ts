import type { InternalBetaLocale } from '../domain/index.ts'

export type PublicationDecisionKind = 'approval' | 'withdrawal'

export interface PublicationDecisionPayloadLocalApi {
  create(args: Record<string, unknown>): Promise<unknown>
  find(args: Record<string, unknown>): Promise<{ docs: unknown[] }>
}

export interface AllocatePublicationDecisionInput {
  readonly artifactDocumentId: string | number
  readonly artifactId: string
  readonly decidedAt: string
  readonly decidedBy: string
  readonly decisionFingerprint: string
  readonly idempotencyKey: string
  readonly kind: PublicationDecisionKind
  readonly locale: InternalBetaLocale
}

let nextInMemorySequence = 0

export function allocateInMemoryPublicationDecisionSequence(): number {
  nextInMemorySequence += 1
  return nextInMemorySequence
}

export async function readLatestPayloadPublicationDecisionSequence(
  payload: PublicationDecisionPayloadLocalApi,
  artifactId: string,
): Promise<number> {
  const result = await payload.find({
    collection: 'publication-decision-sequences',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    pagination: false,
    sort: '-id',
    where: { artifactKey: { equals: artifactId } },
  })
  const latest = result.docs[0]
  return latest === undefined ? 0 : sequenceId(latest)
}

function object(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Payload publication decision sequence is malformed')
  }
  return value as Record<string, unknown>
}

function sequenceId(value: unknown): number {
  const id = object(value).id
  const numeric = typeof id === 'number' ? id : typeof id === 'string' ? Number(id) : Number.NaN
  if (!Number.isSafeInteger(numeric) || numeric < 1) {
    throw new Error('Payload publication decision sequence id is malformed')
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

function eventKey(input: AllocatePublicationDecisionInput): string {
  return `${input.kind}:${input.idempotencyKey}`
}

function reuseSequence(
  value: unknown,
  input: AllocatePublicationDecisionInput,
): number {
  const record = object(value)
  if (
    record.artifactKey !== input.artifactId ||
    record.locale !== input.locale ||
    record.kind !== input.kind ||
    record.eventKey !== eventKey(input) ||
    record.decisionFingerprint !== input.decisionFingerprint
  ) {
    throw new Error('Publication decision sequence key is bound to another decision')
  }
  return sequenceId(record)
}

async function findExisting(
  payload: PublicationDecisionPayloadLocalApi,
  input: AllocatePublicationDecisionInput,
): Promise<unknown | null> {
  const result = await payload.find({
    collection: 'publication-decision-sequences',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    where: { eventKey: { equals: eventKey(input) } },
  })
  return result.docs[0] ?? null
}

/**
 * Reserves one DB-generated monotonic ordering token. The reservation is
 * immutable and safely reusable after a partial failure; a gap has no public
 * effect because snapshots only consume sequences referenced by an approval
 * or withdrawal audit record.
 */
export async function allocatePayloadPublicationDecisionSequence(
  payload: PublicationDecisionPayloadLocalApi,
  input: AllocatePublicationDecisionInput,
): Promise<number> {
  const existing = await findExisting(payload, input)
  if (existing !== null) return reuseSequence(existing, input)

  try {
    const created = await payload.create({
      collection: 'publication-decision-sequences',
      data: {
        artifact: input.artifactDocumentId,
        artifactKey: input.artifactId,
        decidedAt: input.decidedAt,
        decidedBy: payloadRelationshipId(input.decidedBy),
        decisionFingerprint: input.decisionFingerprint,
        eventKey: eventKey(input),
        kind: input.kind,
        locale: input.locale,
      },
      overrideAccess: true,
    })
    return sequenceId(created)
  } catch (error: unknown) {
    const concurrent = await findExisting(payload, input)
    if (concurrent !== null) return reuseSequence(concurrent, input)
    throw error
  }
}
