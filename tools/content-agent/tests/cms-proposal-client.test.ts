import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CmsProposalClientError,
  submitCmsPromptProposal,
} from '../src/cms-proposal-client.ts'

const proposal = { schemaVersion: 1, operation: 'create_prompt' }

test('client sends a proposal only to the fixed CMS endpoint with scoped authentication', async () => {
  let observedUrl = ''
  let observedInit: RequestInit | undefined
  const result = await submitCmsPromptProposal({
    baseUrl: 'https://cms.example.test',
    apiKey: 'test-api-key-0000000000',
    accessClientId: 'access-id',
    accessClientSecret: 'access-secret',
    fetch: async (input, init) => {
      observedUrl = String(input)
      observedInit = init
      return Response.json({ data: {
        artifactId: 1,
        artifactKey: 'prm_01testprompt',
        auditId: 2,
        locale: 'zh-CN',
        localeVariantId: 3,
        replayed: false,
        rightsStatus: 'review_required',
        sourceEvidenceId: 4,
        state: 'draft',
      } }, { status: 201 })
    },
  }, proposal, 'proposal:test:00000000')

  assert.equal(observedUrl, 'https://cms.example.test/api/internal/v1/agent-proposals/prompts')
  assert.equal(observedInit?.method, 'POST')
  assert.equal(observedInit?.redirect, 'error')
  const headers = observedInit?.headers as Headers
  assert.equal(headers.get('authorization'), 'users API-Key test-api-key-0000000000')
  assert.equal(headers.get('idempotency-key'), 'proposal:test:00000000')
  assert.equal(headers.get('cf-access-client-id'), 'access-id')
  assert.equal(headers.get('cf-access-client-secret'), 'access-secret')
  assert.equal(result.state, 'draft')
  assert.equal(result.rightsStatus, 'review_required')
})

test('client rejects unsafe origins, incomplete Access credentials and malformed receipts', async () => {
  const cases = [
    submitCmsPromptProposal({ baseUrl: 'http://cms.example.test', apiKey: 'test-api-key-0000000000' }, proposal, 'proposal:test:00000001'),
    submitCmsPromptProposal({ baseUrl: 'https://cms.example.test/path', apiKey: 'test-api-key-0000000000' }, proposal, 'proposal:test:00000002'),
    submitCmsPromptProposal({ baseUrl: 'https://cms.example.test', apiKey: 'test-api-key-0000000000', accessClientId: 'only-id' }, proposal, 'proposal:test:00000003'),
    submitCmsPromptProposal({
      baseUrl: 'https://cms.example.test',
      apiKey: 'test-api-key-0000000000',
      fetch: async () => Response.json({ data: { state: 'released' } }),
    }, proposal, 'proposal:test:00000004'),
  ]

  for (const promise of cases) {
    await assert.rejects(promise, CmsProposalClientError)
  }
})

test('client returns a safe CMS error without including request content or credentials', async () => {
  await assert.rejects(
    submitCmsPromptProposal({
      baseUrl: 'https://cms.example.test',
      apiKey: 'secret-api-key-0000000',
      fetch: async () => Response.json({
        code: 'PROMPT_PROPOSAL_CONFLICT',
        detail: 'Artifact already exists',
      }, { status: 409 }),
    }, proposal, 'proposal:test:00000005'),
    (error: unknown) => {
      assert.ok(error instanceof CmsProposalClientError)
      assert.equal(error.code, 'PROMPT_PROPOSAL_CONFLICT')
      assert.equal(error.status, 409)
      assert.equal(error.message, 'Artifact already exists')
      assert.doesNotMatch(error.message, /secret-api-key/u)
      return true
    },
  )
})
