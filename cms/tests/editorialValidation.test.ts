import assert from 'node:assert/strict'
import test from 'node:test'

import {
  EditorialProjectionValidationError,
  validateReadyTranslation,
  validateSourceEvidenceProjection,
} from '../src/hooks/validateEditorialProjection.ts'

test('ready translations require a reviewer and the source revision', () => {
  assert.throws(
    () =>
      validateReadyTranslation({
        locale: 'zh-CN',
        sourceLocale: 'en',
        translationStatus: 'ready',
        reviewer: 'bo',
      }),
    EditorialProjectionValidationError,
  )
  assert.doesNotThrow(() =>
    validateReadyTranslation({
      locale: 'zh-CN',
      sourceLocale: 'en',
      translationStatus: 'ready',
      reviewer: 'bo',
      translatedFromRevision: 'sha256:abc',
    }),
  )
})

test('source records require typed provenance and safe absolute URLs', () => {
  assert.throws(
    () =>
      validateSourceEvidenceProjection({
        recordType: 'source',
        sourcePlatform: 'x',
        sourceId: '123',
        observedAt: '2026-09-02T00:00:00Z',
        sourcePublishedDate: '2026-09-01',
        sourceUrl: 'javascript:alert(1)',
      }),
    EditorialProjectionValidationError,
  )
  assert.doesNotThrow(() =>
    validateSourceEvidenceProjection({
      recordType: 'source',
      sourcePlatform: 'x',
      sourceId: '123',
      observedAt: '2026-09-02T00:00:00Z',
      sourcePublishedDate: '2026-09-01',
      sourceUrl: 'https://x.com/example/status/123',
    }),
  )
  assert.throws(
    () =>
      validateSourceEvidenceProjection({
        recordType: 'evidence',
        evidenceType: 'example-output',
        evidenceUrl: 'file:///private/evidence.png',
      }),
    EditorialProjectionValidationError,
  )
  assert.throws(
    () =>
      validateSourceEvidenceProjection({
        recordType: 'evidence',
        evidenceType: 'source-post',
      }),
    EditorialProjectionValidationError,
  )
})
