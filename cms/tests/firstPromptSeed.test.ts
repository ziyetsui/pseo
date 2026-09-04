import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildFirstPromptSeedFixture,
  firstPromptSeedConstants,
  seedFirstPrompt,
  type FirstPromptSeedPayloadApi,
} from '../src/seed/firstPrompt.ts'
import type { PublicationDraftSelection } from '../src/domain/publication.ts'
import { validateSourceEvidenceProjection } from '../src/hooks/validateEditorialProjection.ts'
import {
  PayloadDraftContentValidator,
  type PayloadContentValidationApi,
} from '../src/publication/payloadDraftContentValidator.ts'

const SOURCE_URL = 'https://github.com/ziyetsui/prompt-lab/issues/123'
const REVIEWED_AT = '2026-09-03T04:05:06Z'

class MemoryPayload implements FirstPromptSeedPayloadApi {
  readonly documents = new Map<string, Record<string, unknown>[]>()
  private id = 0

  async create(args: { readonly collection: string; readonly data: Record<string, unknown> }): Promise<Record<string, unknown>> {
    const document = { ...args.data, id: `doc-${++this.id}`, updatedAt: REVIEWED_AT }
    this.documents.set(args.collection, [...(this.documents.get(args.collection) ?? []), document])
    return document
  }

  async find(args: { readonly collection: string; readonly where?: Record<string, unknown> }): Promise<{ docs: Record<string, unknown>[] }> {
    const [field, condition] = Object.entries(args.where ?? {})[0] ?? []
    const expected = typeof condition === 'object' && condition !== null
      ? (condition as { equals?: unknown }).equals
      : undefined
    return {
      docs: (this.documents.get(args.collection) ?? []).filter((document) => document[field!] === expected).slice(0, 1),
    }
  }
}

test('golden Prompt fixture preserves the approved text and public rights evidence', () => {
  const fixture = buildFirstPromptSeedFixture({ reviewedAt: REVIEWED_AT, sourceUrl: SOURCE_URL })
  const prompt = fixture.artifact.data.prompt as { text: string; variables: { key: string }[] }
  assert.equal(prompt.text, firstPromptSeedConstants.promptText)
  assert.deepEqual(prompt.variables.map((item) => item.key), ['[GOAL]', '[CONTEXT]', '[DEADLINE]', '[CONSTRAINTS]'])
  assert.equal(fixture.artifact.data.draftWorkflowState, 'validated')
  assert.equal(fixture.localeVariant.data.indexable, false)
  assert.equal((fixture.localeVariant.data.seo as { robots: string }).robots, 'noindex,nofollow')
  assert.equal((fixture.localeVariant.data.translation as { reviewer: string }).reviewer, 'ziyetsui')
  assert.equal(fixture.sourceEvidence[0]?.data.rightsStatus, 'cleared')
  assert.equal(fixture.sourceEvidence[0]?.data.evidenceUrl, SOURCE_URL)
  assert.equal(
    fixture.sourceEvidence[0]?.data.sourcePublishedDate,
    '2026-09-03T00:00:00.000Z',
  )
  assert.match(String(fixture.sourceEvidence[0]?.data.licenseReference), /CC BY 4\.0/u)
  for (const evidence of fixture.sourceEvidence) {
    assert.doesNotThrow(() => validateSourceEvidenceProjection(evidence.data))
  }
})

test('golden Prompt seed rejects non-repository or non-Issue evidence URLs', () => {
  assert.throws(
    () => buildFirstPromptSeedFixture({ reviewedAt: REVIEWED_AT, sourceUrl: 'https://example.com/approval' }),
    /must be https:\/\/github\.com\/ziyetsui\/prompt-lab\/issues\/<number>/u,
  )
})

test('golden Prompt seed is idempotent and creates one complete record set', async () => {
  const payload = new MemoryPayload()
  const first = await seedFirstPrompt(payload, { reviewedAt: REVIEWED_AT, sourceUrl: SOURCE_URL })
  assert.deepEqual(first.created, {
    'locale-variants': 1,
    'prompt-artifacts': 1,
    'source-evidence': 2,
    taxonomies: 5,
  })
  assert.equal(payload.documents.get('prompt-artifacts')?.length, 1)
  assert.equal(payload.documents.get('locale-variants')?.length, 1)
  assert.equal(payload.documents.get('source-evidence')?.length, 2)
  assert.equal(payload.documents.get('taxonomies')?.length, 5)

  const repeated = await seedFirstPrompt(payload, { reviewedAt: REVIEWED_AT, sourceUrl: SOURCE_URL })
  assert.deepEqual(repeated.created, {
    'locale-variants': 0,
    'prompt-artifacts': 0,
    'source-evidence': 0,
    taxonomies: 0,
  })
  assert.deepEqual(repeated.skipped, {
    'locale-variants': 1,
    'prompt-artifacts': 1,
    'source-evidence': 2,
    taxonomies: 5,
  })
})

test('golden Prompt fixture passes the real CMS compiler and emits a draft-only public bundle', async () => {
  const fixture = buildFirstPromptSeedFixture({ reviewedAt: REVIEWED_AT, sourceUrl: SOURCE_URL })
  const taxonomyByAxis = new Map(
    fixture.taxonomies.map((item, index) => [
      String(item.data.axis),
      { ...item.data, id: `taxonomy-${index + 1}`, updatedAt: REVIEWED_AT },
    ]),
  )
  const artifact = {
    ...fixture.artifact.data,
    id: 'artifact-1',
    updatedAt: REVIEWED_AT,
    models: [taxonomyByAxis.get('model')],
    useCases: [taxonomyByAxis.get('use_case')],
    techniques: [taxonomyByAxis.get('technique')],
    styles: [taxonomyByAxis.get('style')],
    subjects: [taxonomyByAxis.get('subject')],
  }
  const variant = {
    ...fixture.localeVariant.data,
    id: 'variant-1',
    artifact: 'artifact-1',
    updatedAt: REVIEWED_AT,
  }
  const sourceEvidence = fixture.sourceEvidence.map((item, index) => ({
    ...item.data,
    id: `source-${index + 1}`,
    artifact: 'artifact-1',
    updatedAt: REVIEWED_AT,
  }))
  const payload = {
    async find(args: Record<string, unknown>): Promise<{ docs: unknown[] }> {
      if (args.collection === 'prompt-artifacts') return { docs: [artifact] }
      if (args.collection === 'locale-variants') return { docs: [variant] }
      if (args.collection === 'source-evidence') return { docs: sourceEvidence }
      return { docs: [] }
    },
    async create(): Promise<never> { throw new Error('not used') },
    async update(): Promise<never> { throw new Error('not used') },
  } as PayloadContentValidationApi
  const input: PublicationDraftSelection = {
    artifactId: firstPromptSeedConstants.artifactKey,
    locales: ['zh-CN'],
  }

  const result = await new PayloadDraftContentValidator(payload).validate(input)
  assert.match(result.contentRevision, /^sha256:[a-f0-9]{64}$/u)
  assert.match(result.sourceRevision, /^sha256:[a-f0-9]{64}$/u)
  assert.deepEqual(result.files.map((file) => file.path), [
    `content/prompts/${firstPromptSeedConstants.artifactKey}/zh-CN.md`,
    'content/taxonomies/content-type/cty_text/en.json',
    'content/taxonomies/content-type/cty_text/zh-CN.json',
    'content/taxonomies/model/mdl_model_agnostic/en.json',
    'content/taxonomies/model/mdl_model_agnostic/zh-CN.json',
  ])
  const promptFile = result.files[0]!
  assert.match(promptFile.content, /"status": "draft"/u)
  assert.match(promptFile.content, /"publishedAt": null/u)
  assert.match(promptFile.content, /"publishedDate": "2026-09-03"/u)
  assert.doesNotMatch(promptFile.content, /Owner-authored|rightsStatus|reviewedBy/u)
})
