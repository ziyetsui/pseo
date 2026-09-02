import assert from 'node:assert/strict'
import test from 'node:test'

import {
  PublicationContentValidationError,
  type NormalizedPublicationRequestInput,
} from '../src/domain/index.ts'
import { PayloadDraftContentValidator } from '../src/publication/payloadDraftContentValidator.ts'
import type { PayloadLocalApi } from '../src/publication/payloadPublicationRequestRepository.ts'

const ARTIFACT_ID = 'prm_01jabcdef'
const BASE_SHA = '0'.repeat(40)
const PLACEHOLDER_REVISION = `sha256:${'0'.repeat(64)}`
const PROMPT = 'Create a detailed country poster for [COUNTRY] with a landmark, native plants, cultural clothing, local currency, a capital-city postmark, and consistent studio lighting.'
const SOURCE_URL = 'https://x.com/example/status/123'

function input(locales: NormalizedPublicationRequestInput['locales']): NormalizedPublicationRequestInput {
  return {
    artifactId: ARTIFACT_ID,
    commitMessage: 'content: submit deterministic validator fixture',
    expectedBaseSha: BASE_SHA,
    expectedContentRevision: PLACEHOLDER_REVISION,
    expectedSourceRevision: PLACEHOLDER_REVISION,
    idempotencyKey: 'validator:fixture:1',
    locales,
  }
}

function variant(locale: 'en' | 'zh-CN', translatedFromRevision: string | null): Record<string, unknown> {
  const localized = locale === 'en'
    ? {
        slug: 'country-poster',
        title: 'Country poster Prompt',
        summary: 'Create a reusable country poster with one controlled variable and reproducible steps.',
        purpose: 'Create a reusable country poster.',
        reviewer: 'reviewer-en',
      }
    : {
        slug: 'guojia-haibao',
        title: '国家主题海报 Prompt',
        summary: '通过一个受控变量和可复现步骤，生成可重复使用的国家主题海报内容。',
        purpose: '生成可重复使用的国家主题海报。',
        reviewer: 'reviewer-zh',
      }
  return {
    id: `loc_${locale}`,
    locale,
    sourceLocale: 'en',
    slug: localized.slug,
    title: localized.title,
    summary: localized.summary,
    indexable: false,
    bodyMarkdown: `# ${localized.title}\n\n\`\`\`prompt\n${PROMPT}\n\`\`\``,
    localizedOutcome: {
      purpose: localized.purpose,
      characteristics: [{ value: locale === 'en' ? 'reproducible' : '可复现' }],
    },
    workflow: [
      { position: 1, title: 'Choose model', body: 'Choose the configured image model.' },
      { position: 2, title: 'Replace variable', body: 'Replace the country variable consistently.' },
    ],
    translation: {
      translationStatus: 'ready',
      translatedFromRevision,
      reviewer: localized.reviewer,
    },
    seo: {
      title: localized.title,
      description: locale === 'en'
        ? 'Copy and customize a reproducible country poster Prompt with one explicit variable.'
        : '复制并定制一个包含明确变量、可以稳定复现的国家主题海报 Prompt。',
      robots: 'noindex,nofollow',
    },
  }
}

function artifact(): Record<string, unknown> {
  const taxonomy = (axis: string, slug: string) => [{
    id: `tax_${slug}`,
    taxonomyKey: `internal-${slug}`,
    axis,
    slug,
  }]
  return {
    id: 1,
    artifactKey: ARTIFACT_ID,
    contentType: 'image',
    sourceLocale: 'en',
    draftWorkflowState: 'validated',
    prompt: {
      language: 'en',
      text: PROMPT,
      variables: [{
        key: '[COUNTRY]',
        label: 'Country',
        required: true,
        defaultValue: 'Japan',
        options: [{ value: 'Japan' }],
      }],
    },
    outcome: { outputType: 'image', platforms: [{ value: 'higgsfield' }] },
    requiredInputs: [{ value: 'Country name' }],
    optionalInputs: [],
    parameters: [{
      key: 'COUNTRY',
      label: 'Country',
      valueType: 'enum',
      required: true,
      options: [{ value: 'Japan' }],
    }],
    models: taxonomy('model', 'gpt-image-2'),
    useCases: taxonomy('use_case', 'poster-design'),
    techniques: taxonomy('technique', 'variable-template'),
    styles: taxonomy('style', 'photorealistic'),
    subjects: taxonomy('subject', 'landmark'),
    media: [],
    metrics: {
      likes: null,
      bookmarks: null,
      comments: null,
      reposts: null,
      views: null,
      observedAt: '2026-09-02T00:00:00Z',
    },
    examples: [],
    creator: null,
    relatedPrompts: [],
    actions: { canCopy: true, tryUrl: null },
  }
}

function provenance(): Record<string, unknown>[] {
  return [
    {
      id: 'src_1',
      recordType: 'source',
      isPrimarySource: true,
      sourcePlatform: 'x',
      sourceId: '123',
      sourceUrl: SOURCE_URL,
      creatorHandle: 'example',
      sourcePublishedDate: '2026-09-01',
      observedAt: '2026-09-02T00:00:00Z',
    },
    {
      id: 'ev_1',
      recordType: 'evidence',
      evidenceType: 'source-post',
      evidenceUrl: SOURCE_URL,
      confidence: 1,
    },
  ]
}

class FakePayload implements PayloadLocalApi {
  readonly artifact = artifact()
  readonly variants = [variant('en', null), variant('zh-CN', null)]
  readonly sourceEvidence = provenance()

  async find(args: Record<string, unknown>): Promise<{ docs: unknown[] }> {
    if (args.collection === 'prompt-artifacts') return { docs: [this.artifact] }
    if (args.collection === 'locale-variants') return { docs: this.variants }
    if (args.collection === 'source-evidence') return { docs: this.sourceEvidence }
    return { docs: [] }
  }

  async create(_args: Record<string, unknown>): Promise<unknown> {
    throw new Error('not used')
  }

  async update(_args: Record<string, unknown>): Promise<unknown> {
    throw new Error('not used')
  }
}

test('deterministic validator produces stable source/content revisions independent of locale order', async () => {
  const payload = new FakePayload()
  const validator = new PayloadDraftContentValidator(payload)
  const sourceOnly = await validator.validate(input(['en']))
  const zhTranslation = payload.variants[1]?.translation as Record<string, unknown>
  zhTranslation.translatedFromRevision = sourceOnly.sourceRevision

  const first = await validator.validate(input(['en', 'zh-CN']))
  const second = await validator.validate(input(['zh-CN', 'en']))
  assert.match(first.sourceRevision, /^sha256:[a-f0-9]{64}$/u)
  assert.match(first.contentRevision, /^sha256:[a-f0-9]{64}$/u)
  assert.deepEqual(first, second)
})

test('validator projects taxonomy slugs, not internal keys, and rejects axis drift', async () => {
  const payload = new FakePayload()
  const validator = new PayloadDraftContentValidator(payload)
  const baseline = await validator.validate(input(['en']))
  const model = (payload.artifact.models as Record<string, unknown>[])[0]
  assert.ok(model)

  model.taxonomyKey = 'a-different-internal-key'
  assert.deepEqual(await validator.validate(input(['en'])), baseline)

  model.axis = 'style'
  await assert.rejects(
    validator.validate(input(['en'])),
    (error: unknown) =>
      error instanceof PublicationContentValidationError &&
      error.issues.some((issue) => issue.code === 'TAXONOMY_AXIS_MISMATCH'),
  )
})

test('validator rejects a stale translated locale before publication', async () => {
  const payload = new FakePayload()
  const validator = new PayloadDraftContentValidator(payload)
  const sourceOnly = await validator.validate(input(['en']))
  const zhTranslation = payload.variants[1]?.translation as Record<string, unknown>
  zhTranslation.translatedFromRevision = sourceOnly.sourceRevision.replace(/.$/u, '1')

  await assert.rejects(
    validator.validate(input(['zh-CN'])),
    (error: unknown) =>
      error instanceof PublicationContentValidationError &&
      error.issues.some((issue) => issue.code === 'STALE_TRANSLATION'),
  )
})

test('validator rejects fields that cannot serialize to the Git content contract', async () => {
  const payload = new FakePayload()
  const variables = (payload.artifact.prompt as Record<string, unknown>).variables as Record<string, unknown>[]
  delete variables[0]?.label
  delete payload.sourceEvidence[0]?.sourcePublishedDate
  const validator = new PayloadDraftContentValidator(payload)

  await assert.rejects(
    validator.validate(input(['en'])),
    (error: unknown) =>
      error instanceof PublicationContentValidationError &&
      error.issues.some((issue) => issue.path === 'artifact.prompt.variables[0].label') &&
      error.issues.some((issue) => issue.path === 'source.publishedDate'),
  )
})
