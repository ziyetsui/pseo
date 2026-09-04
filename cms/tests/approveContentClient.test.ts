import assert from 'node:assert/strict'
import test from 'node:test'

import {
  approveSavedContentRevision,
  canApproveSavedRevision,
} from '../src/components/approveContentClient.ts'

const CONTENT_REVISION = `sha256:${'a'.repeat(64)}`
const SOURCE_REVISION = `sha256:${'b'.repeat(64)}`
const RIGHTS_REVISION = `sha256:${'d'.repeat(64)}`

test('client prepares then approves exact CMS revisions without any Git input', async () => {
  const calls: Array<{ init?: RequestInit; url: string }> = []
  const fetcher = async (url: string, init?: RequestInit): Promise<Response> => {
    calls.push(init ? { init, url } : { url })
    if (calls.length === 1) {
      return Response.json({ data: {
        artifactId: 'prm_one',
        expectedContentRevision: CONTENT_REVISION,
        expectedDecisionSequence: 0,
        expectedRightsPolicyVersion: 'rights-policy-2026-09',
        expectedRightsRevision: RIGHTS_REVISION,
        expectedSourceRevision: SOURCE_REVISION,
        fileCount: 1,
        locale: 'en',
      } })
    }
    return Response.json({ data: {
      approvedAt: '2026-09-03T10:00:00.000Z',
      artifactId: 'prm_one',
      contentRevision: CONTENT_REVISION,
      decision: 'approved',
      decisionSequence: 1,
      fileCount: 1,
      id: 'approval_0001',
      locale: 'en',
      rightsPolicyVersion: 'rights-policy-2026-09',
      rightsRevision: RIGHTS_REVISION,
      sourceRevision: SOURCE_REVISION,
    } }, { status: 201 })
  }

  const result = await approveSavedContentRevision({
    apiBase: 'http://localhost:3001/api/',
    artifactId: 'prm_one',
    fetcher,
    idempotencyKey: 'approval:prm_one:en:1',
    locale: 'en',
  })

  assert.equal(result.status, 'approved')
  assert.equal(result.approvalId, 'approval_0001')
  assert.equal(result.decisionSequence, 1)
  assert.equal(result.locale, 'en')
  assert.deepEqual(calls.map((call) => call.url), [
    'http://localhost:3001/api/internal/v1/artifacts/prm_one/approvals/prepare',
    'http://localhost:3001/api/internal/v1/artifacts/prm_one/approvals',
  ])
  assert.deepEqual(JSON.parse(String(calls[0]?.init?.body)), { locale: 'en' })
  const approveBody = JSON.parse(String(calls[1]?.init?.body)) as Record<string, unknown>
  assert.equal(approveBody.expectedContentRevision, CONTENT_REVISION)
  assert.equal(approveBody.expectedDecisionSequence, 0)
  assert.equal(approveBody.expectedSourceRevision, SOURCE_REVISION)
  assert.equal(approveBody.expectedRightsPolicyVersion, 'rights-policy-2026-09')
  assert.equal(approveBody.expectedRightsRevision, RIGHTS_REVISION)
  assert.equal('expectedBaseSha' in approveBody, false)
  assert.equal(new Headers(calls[1]?.init?.headers).get('idempotency-key'), 'approval:prm_one:en:1')
})

test('client fails closed when approval response differs from prepared revision', async () => {
  let call = 0
  const fetcher = async (): Promise<Response> => {
    call += 1
    return call === 1
      ? Response.json({ data: {
        artifactId: 'prm_one',
        expectedContentRevision: CONTENT_REVISION,
        expectedDecisionSequence: 0,
        expectedRightsPolicyVersion: 'rights-policy-2026-09',
        expectedRightsRevision: RIGHTS_REVISION,
        expectedSourceRevision: SOURCE_REVISION,
        fileCount: 1,
        locale: 'en',
      } })
      : Response.json({ data: {
        approvedAt: '2026-09-03T10:00:00.000Z',
        artifactId: 'prm_one',
        contentRevision: `sha256:${'c'.repeat(64)}`,
        decision: 'approved',
        decisionSequence: 1,
        fileCount: 1,
        id: 'approval_0001',
        locale: 'en',
        rightsPolicyVersion: 'rights-policy-2026-09',
        rightsRevision: RIGHTS_REVISION,
        sourceRevision: SOURCE_REVISION,
      } })
  }

  await assert.rejects(
    approveSavedContentRevision({
      apiBase: '/api',
      artifactId: 'prm_one',
      fetcher,
      idempotencyKey: 'approval:prm_one:en:1',
      locale: 'en',
    }),
    /changed after preparation/u,
  )
})

test('availability requires a saved, clean, idle document with artifact and locale', () => {
  const ready = {
    artifactId: 'prm_one',
    busy: false,
    documentId: '1',
    formInitializing: false,
    formModified: false,
    formProcessing: false,
    hasResult: false,
    locale: 'en' as const,
  }
  assert.equal(canApproveSavedRevision(ready), true)
  assert.equal(canApproveSavedRevision({ ...ready, formModified: true }), false)
  assert.equal(canApproveSavedRevision({ ...ready, documentId: null }), false)
})
