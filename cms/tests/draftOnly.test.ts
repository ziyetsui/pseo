import assert from 'node:assert/strict'
import test from 'node:test'

import {
  DirectPayloadPublishError,
  enforceDraftProjection,
  GIT_PROJECTION_CONTEXT_KEY,
  GitProjectionMutationError,
} from '../src/hooks/enforceDraftOnly.ts'

test('Payload direct publish is always rejected', () => {
  assert.throws(
    () => enforceDraftProjection({ data: { _status: 'published', title: 'Unsafe' } }),
    DirectPayloadPublishError,
  )
})

test('ordinary saves remain drafts and cannot mutate Git publication state', () => {
  const originalDoc = {
    _status: 'draft',
    gitPublication: { state: 'pr_open', pullRequestNumber: 42 },
  }

  const saved = enforceDraftProjection({
    data: { title: 'Edited draft' },
    originalDoc,
  })
  assert.equal(saved._status, 'draft')
  assert.deepEqual(saved.gitPublication, originalDoc.gitPublication)

  assert.throws(
    () =>
      enforceDraftProjection({
        data: { gitPublication: { state: 'released', mergeSha: 'abc1234' } },
        originalDoc,
      }),
    GitProjectionMutationError,
  )
})

test('verified Git projection context may update Git fields but never Payload _status', () => {
  const saved = enforceDraftProjection({
    context: { [GIT_PROJECTION_CONTEXT_KEY]: true },
    data: {
      _status: 'draft',
      gitPublication: { state: 'released', mergeSha: 'abc1234' },
    },
  })
  assert.equal(saved._status, 'draft')
  assert.deepEqual(saved.gitPublication, { state: 'released', mergeSha: 'abc1234' })
})
