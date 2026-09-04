import assert from 'node:assert/strict'
import test from 'node:test'

import {
  DirectPayloadPublishError,
  enforceDraftProjection,
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

test('Payload-normalized unpublished defaults are allowed only for an initial projection', () => {
  const normalizedInitial = {
    state: 'unpublished',
    pullRequestNumber: null,
    pullRequestUrl: null,
    mergeSha: null,
    releasedAt: null,
  }

  assert.doesNotThrow(() =>
    enforceDraftProjection({
      data: { title: 'Imported draft', gitPublication: normalizedInitial },
      originalDoc: {},
    }),
  )
  assert.doesNotThrow(() =>
    enforceDraftProjection({
      data: { title: 'Imported draft', gitPublication: normalizedInitial },
      // Payload's group traversal mutates the otherwise-empty create doc to
      // this shape before collection beforeChange hooks run.
      originalDoc: { gitPublication: {} },
    }),
  )
  assert.doesNotThrow(() =>
    enforceDraftProjection({
      data: { title: 'Normalized draft', gitPublication: normalizedInitial },
      originalDoc: { gitPublication: { state: 'unpublished', mergeSha: null } },
    }),
  )
  const establishedProjections = [
    { state: 'pr_open', pullRequestNumber: 42 },
    { state: 'merged', mergeSha: 'abc1234' },
    { state: 'released', mergeSha: 'abc1234', releasedAt: '2026-09-02T12:00:00.000Z' },
  ]
  for (const gitPublication of establishedProjections) {
    assert.throws(
      () =>
        enforceDraftProjection({
          data: { gitPublication: normalizedInitial },
          originalDoc: { gitPublication },
        }),
      GitProjectionMutationError,
    )
  }
})

test('legacy Git audit state has no internal mutation bypass', () => {
  assert.throws(
    () => enforceDraftProjection({
      data: { gitPublication: { state: 'pr_open', pullRequestNumber: 42 } },
    }),
    GitProjectionMutationError,
  )
})
