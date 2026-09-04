import assert from 'node:assert/strict'
import test from 'node:test'

import {
  canWriteRightsDecision,
  canWriteRightsEvidenceUrl,
  EditorialProjectionValidationError,
  normalizeSourcePublishedDate,
  rightsDecisionFieldAccess,
  rightsEvidenceUrlFieldAccess,
  validateReadyTranslation,
  validateRightsDecision,
  validateSourceEvidence,
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
  assert.doesNotThrow(() =>
    validateSourceEvidenceProjection({
      recordType: 'source',
      sourcePlatform: 'x',
      sourceId: 'undated',
      observedAt: '2026-09-02T00:00:00Z',
      sourceUrl: 'https://x.com/example/status/undated',
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

test('source publication dates normalize to an explicit calendar date at UTC midnight', () => {
  assert.equal(normalizeSourcePublishedDate('2026-09-02'), '2026-09-02T00:00:00.000Z')
  assert.equal(
    normalizeSourcePublishedDate('2026-09-02T12:00:00.000Z'),
    '2026-09-02T00:00:00.000Z',
  )
  assert.equal(
    normalizeSourcePublishedDate('2026-09-02T23:30:00+08:00'),
    '2026-09-02T00:00:00.000Z',
  )
})

test('source publication dates reject invalid calendar days and timezone-less datetimes', () => {
  for (const invalid of [
    '2026-02-29',
    '2026-04-31',
    '2026-13-01',
    '2026-09-02T12:00:00',
    'not-a-date',
  ]) {
    assert.throws(
      () => normalizeSourcePublishedDate(invalid),
      /sourcePublishedDate must be a valid YYYY-MM-DD or timezone-qualified ISO datetime/u,
    )
  }
})

test('source evidence write hook stores the normalized UTC-midnight instant', () => {
  const data = {
    recordType: 'source',
    sourcePlatform: 'manual',
    sourceId: 'issue-1',
    observedAt: '2026-09-02T12:00:00.000Z',
    sourcePublishedDate: '2026-09-02T12:00:00.000Z',
    sourceUrl: 'https://github.com/ziyetsui/prompt-lab/issues/1',
  }

  const result = validateSourceEvidence(
    { data } as unknown as Parameters<typeof validateSourceEvidence>[0],
  )

  assert.equal(result, data)
  assert.equal(data.sourcePublishedDate, '2026-09-02T00:00:00.000Z')
})

test('cleared rights require a complete permission audit', () => {
  const decision = {
    recordType: 'source',
    rightsStatus: 'cleared',
    basis: 'The author granted explicit permission for public reuse.',
    reviewedBy: 'rights-reviewer',
    reviewedAt: '2026-09-03T02:00:00Z',
    evidenceUrl: 'https://example.com/rights/permission',
    licenseReference: 'CC BY 4.0',
  }

  assert.doesNotThrow(() => validateRightsDecision(decision))
  for (const field of [
    'basis',
    'reviewedBy',
    'reviewedAt',
    'evidenceUrl',
    'licenseReference',
  ] as const) {
    assert.throws(
      () => validateRightsDecision({ ...decision, [field]: '' }),
      EditorialProjectionValidationError,
    )
  }
  assert.throws(
    () => validateRightsDecision({ ...decision, reviewedAt: '2026-09-03T02:00:00+08:00' }),
    /reviewedAt must be an RFC 3339 UTC timestamp/u,
  )
})

test('community-attributed rights require attribution, review, risk, and takedown evidence', () => {
  const decision = {
    recordType: 'source',
    rightsStatus: 'community_attributed',
    authorName: 'Example Creator',
    authorUrl: 'https://x.com/example',
    authorHandle: '@example',
    originalPostUrl: 'https://x.com/example/status/123',
    reviewedBy: 'rights-reviewer',
    reviewedAt: '2026-09-03T02:00:00Z',
    policyVersion: 'community-rights-v1',
    riskAcceptedBy: 'owner',
    riskAcceptedAt: '2026-09-03T02:05:00Z',
    takedownUrl: 'https://example.com/takedown',
  }

  assert.doesNotThrow(() => validateRightsDecision(decision))
  assert.doesNotThrow(() =>
    validateRightsDecision({ ...decision, authorUrl: '', authorHandle: '@example' }),
  )
  for (const field of [
    'authorName',
    'originalPostUrl',
    'reviewedBy',
    'reviewedAt',
    'policyVersion',
    'riskAcceptedBy',
    'riskAcceptedAt',
    'takedownUrl',
  ] as const) {
    assert.throws(
      () => validateRightsDecision({ ...decision, [field]: '' }),
      EditorialProjectionValidationError,
    )
  }
  assert.throws(
    () => validateRightsDecision({ ...decision, authorUrl: '', authorHandle: '' }),
    /authorUrl or authorHandle/u,
  )
  assert.throws(
    () => validateRightsDecision({ ...decision, licenseReference: 'CC BY 4.0' }),
    /must not include a licenseReference/u,
  )
})

test('restricted and takedown decisions require their status-specific audit fields', () => {
  assert.doesNotThrow(() =>
    validateRightsDecision({
      recordType: 'source',
      rightsStatus: 'restricted',
      basis: 'The source terms explicitly prohibit republication.',
    }),
  )
  assert.throws(
    () => validateRightsDecision({ recordType: 'source', rightsStatus: 'restricted' }),
    /basis is required/u,
  )

  const takedown = {
    recordType: 'source',
    rightsStatus: 'takedown',
    takedownCaseId: 'case-2026-001',
    takedownHandledBy: 'rights-owner',
    takedownHandledAt: '2026-09-03T03:00:00Z',
    takedownScope: 'Prompt prm_123, all locales and public routes.',
  }
  assert.doesNotThrow(() => validateRightsDecision(takedown))
  for (const field of [
    'takedownCaseId',
    'takedownHandledBy',
    'takedownHandledAt',
    'takedownScope',
  ] as const) {
    assert.throws(
      () => validateRightsDecision({ ...takedown, [field]: '' }),
      EditorialProjectionValidationError,
    )
  }
})

test('rights decisions reject evidence rows and unsupported status values', () => {
  assert.doesNotThrow(() =>
    validateRightsDecision({ recordType: 'source', rightsStatus: 'review_required' }),
  )
  assert.doesNotThrow(() =>
    validateRightsDecision({ recordType: 'source', rightsStatus: 'unknown' }),
  )
  assert.throws(
    () =>
      validateRightsDecision({
        recordType: 'evidence',
        rightsStatus: 'restricted',
        basis: 'The source terms explicitly prohibit republication.',
      }),
    /only be recorded on source records/u,
  )
  assert.throws(
    () => validateRightsDecision({ recordType: 'source', rightsStatus: 'invented' }),
    /Unsupported rightsStatus/u,
  )
})

test('rights decision fields are writable only by reviewers and admins', async () => {
  const args = (roles: string[]) =>
    ({ req: { user: { roles } } }) as unknown as Parameters<typeof canWriteRightsDecision>[0]

  assert.equal(rightsDecisionFieldAccess.create, canWriteRightsDecision)
  assert.equal(rightsDecisionFieldAccess.update, canWriteRightsDecision)
  assert.equal(await rightsDecisionFieldAccess.create(args(['editor'])), false)
  assert.equal(await rightsDecisionFieldAccess.update(args(['publisher'])), false)
  assert.equal(await rightsDecisionFieldAccess.create(args(['reviewer'])), true)
  assert.equal(await rightsDecisionFieldAccess.update(args(['admin'])), true)
})

test('evidence URLs remain editor-writable only on ordinary evidence rows', async () => {
  assert.equal(rightsEvidenceUrlFieldAccess.create, canWriteRightsEvidenceUrl)
  assert.equal(rightsEvidenceUrlFieldAccess.update, canWriteRightsEvidenceUrl)

  const args = (
    roles: string[],
    recordType: 'evidence' | 'source',
  ): Parameters<typeof canWriteRightsEvidenceUrl>[0] =>
    ({ req: { user: { roles } }, data: { recordType } }) as unknown as Parameters<
      typeof canWriteRightsEvidenceUrl
    >[0]

  assert.equal(await rightsEvidenceUrlFieldAccess.create(args(['editor'], 'evidence')), true)
  assert.equal(await rightsEvidenceUrlFieldAccess.update(args(['editor'], 'source')), false)
  assert.equal(await rightsEvidenceUrlFieldAccess.update(args(['reviewer'], 'source')), true)
})
