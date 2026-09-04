import assert from 'node:assert/strict'
import test from 'node:test'

import { PublicationDecisionSequences } from '../src/collections/PublicationDecisionSequences.ts'
import {
  allocatePayloadPublicationDecisionSequence,
  type AllocatePublicationDecisionInput,
} from '../src/decision/index.ts'

const input: AllocatePublicationDecisionInput = {
  artifactDocumentId: 1,
  artifactId: 'prm_sequence_01',
  decidedAt: '2026-09-03T10:00:00.000Z',
  decidedBy: '1',
  decisionFingerprint: `sha256:${'a'.repeat(64)}`,
  idempotencyKey: 'approval:prm_sequence_01:en:1',
  kind: 'approval',
  locale: 'en',
}

test('Payload reserves one reusable database publication decision sequence', async () => {
  const documents: Record<string, unknown>[] = []
  const payload = {
    find: async (args: Record<string, unknown>) => {
      const key = ((args.where as Record<string, Record<string, unknown>>).eventKey)?.equals
      return { docs: documents.filter((document) => document.eventKey === key) }
    },
    create: async (args: Record<string, unknown>) => {
      assert.equal(args.collection, 'publication-decision-sequences')
      const document = { id: documents.length + 1, ...(args.data as Record<string, unknown>) }
      documents.push(document)
      return document
    },
  }

  assert.equal(await allocatePayloadPublicationDecisionSequence(payload, input), 1)
  assert.equal(await allocatePayloadPublicationDecisionSequence(payload, input), 1)
  assert.equal(documents.length, 1)
  await assert.rejects(
    allocatePayloadPublicationDecisionSequence(payload, {
      ...input,
      decisionFingerprint: `sha256:${'b'.repeat(64)}`,
    }),
    /bound to another decision/u,
  )
})

async function accessResult(
  access: NonNullable<typeof PublicationDecisionSequences.access>['create'] | undefined,
  user: unknown,
) {
  if (typeof access !== 'function') throw new Error('Expected collection access function')
  return access({ req: { user } } as never)
}

test('publication decision sequences are append-only and reviewer-readable', async () => {
  assert.equal(await accessResult(PublicationDecisionSequences.access?.create, { roles: ['admin'] }), false)
  assert.equal(await accessResult(PublicationDecisionSequences.access?.update, { roles: ['admin'] }), false)
  assert.equal(await accessResult(PublicationDecisionSequences.access?.delete, { roles: ['admin'] }), false)
  assert.equal(await accessResult(PublicationDecisionSequences.access?.read, { roles: ['editor'] }), false)
  assert.equal(await accessResult(PublicationDecisionSequences.access?.read, { roles: ['reviewer'] }), true)
})
