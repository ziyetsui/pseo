import assert from 'node:assert/strict'
import test from 'node:test'

import {
  PublicationContentValidationError,
  type PublicationDraftSelection,
} from '../src/domain/index.ts'
import {
  PayloadDraftContentValidator,
  type PayloadContentValidationApi,
} from '../src/publication/payloadDraftContentValidator.ts'
import { canonicalRecordRevision } from '../src/publication/canonicalPromptBundle.ts'

const ARTIFACT_ID = 'prm_01jabcdef'
const PROMPT = 'Create a detailed country poster for [COUNTRY] with a landmark, native plants, cultural clothing, local currency, a capital-city postmark, and consistent studio lighting.'
const SOURCE_URL = 'https://x.com/example/status/123'
const RIGHTS_EVIDENCE_URL = 'https://example.invalid/rights/owner-permission'

function input(locales: PublicationDraftSelection['locales']): PublicationDraftSelection {
  return {
    artifactId: ARTIFACT_ID,
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
    updatedAt: locale === 'en' ? '2026-09-03T01:00:00Z' : '2026-09-03T02:00:00Z',
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
    models: taxonomy('model', 'model-agnostic'),
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
      rightsStatus: 'cleared',
      basis: 'The owner authored this Prompt and explicitly approved public reuse.',
      reviewedBy: 'owner-reviewer',
      reviewedAt: '2026-09-03T00:00:00Z',
      evidenceUrl: RIGHTS_EVIDENCE_URL,
      licenseReference: 'CC BY 4.0',
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

class FakePayload implements PayloadContentValidationApi {
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

async function validationIssues(
  payload: FakePayload,
  locales: PublicationDraftSelection['locales'] = ['en'],
): Promise<PublicationContentValidationError['issues']> {
  try {
    await new PayloadDraftContentValidator(payload).validate(input(locales))
    assert.fail('Expected content contract validation to fail')
  } catch (error) {
    assert.ok(error instanceof PublicationContentValidationError)
    return error.issues
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
  assert.match(first.rightsRevision ?? '', /^sha256:[a-f0-9]{64}$/u)
  assert.deepEqual(first, second)
  assert.deepEqual(first.files.map((file) => file.path), [
    'content/prompts/prm_01jabcdef/en.md',
    'content/prompts/prm_01jabcdef/zh-CN.md',
    'content/taxonomies/content-type/cty_image/en.json',
    'content/taxonomies/content-type/cty_image/zh-CN.json',
    'content/taxonomies/model/mdl_model_agnostic/en.json',
    'content/taxonomies/model/mdl_model_agnostic/zh-CN.json',
  ])
  assert.ok(first.files.every((file) => file.content.endsWith('\n') && !file.content.includes('\r')))
  assert.ok(first.files.every((file) => !file.path.startsWith('governance/')))
  const sourceMarkdown = first.files.find((file) => file.path.endsWith('/en.md'))?.content ?? ''
  assert.ok(!sourceMarkdown.includes('owner-reviewer'))
  assert.ok(!sourceMarkdown.includes(RIGHTS_EVIDENCE_URL))
  const frontmatterEnd = sourceMarkdown.indexOf('\n---\n', 4)
  assert.ok(frontmatterEnd > 4)
  const frontmatter = JSON.parse(sourceMarkdown.slice(4, frontmatterEnd)) as Record<string, unknown>
  const body = sourceMarkdown.slice(frontmatterEnd + 5).trim()
  assert.equal(frontmatter.status, 'draft')
  assert.equal(frontmatter.indexable, false)
  assert.equal((frontmatter.seo as Record<string, unknown>).robots, 'noindex,nofollow')
  assert.equal(
    (frontmatter.seo as Record<string, unknown>).canonical,
    'https://github.com/ziyetsui/prompt-lab/blob/main/content/prompts/prm_01jabcdef/en.md',
  )
  assert.deepEqual(frontmatter.publication, {
    publishedAt: null,
    sourceRevision: (frontmatter.publication as Record<string, unknown>).sourceRevision,
    updatedAt: '2026-09-03T01:00:00Z',
  })
  assert.equal(
    (frontmatter.publication as Record<string, unknown>).sourceRevision,
    canonicalRecordRevision(frontmatter, body),
  )
  const taxonomyFile = first.files.find((file) => file.path === 'content/taxonomies/model/mdl_model_agnostic/en.json')
  assert.ok(taxonomyFile)
  const taxonomy = JSON.parse(taxonomyFile.content) as Record<string, unknown>
  assert.equal(taxonomy.sourceRef, SOURCE_URL)
  assert.equal(
    (taxonomy.seo as Record<string, unknown>).canonical,
    'https://github.com/ziyetsui/prompt-lab/blob/main/content/taxonomies/model/mdl_model_agnostic/en.json',
  )
  assert.equal((taxonomy.publication as Record<string, unknown>).publishedAt, null)
})

test('validator can approve one translated locale while binding it to the current source revision', async () => {
  const payload = new FakePayload()
  const validator = new PayloadDraftContentValidator(payload)
  const sourceOnly = await validator.validate(input(['en']))
  const zhTranslation = payload.variants[1]?.translation as Record<string, unknown>
  zhTranslation.translatedFromRevision = sourceOnly.sourceRevision

  const translatedOnly = await validator.validate(input(['zh-CN']))

  assert.equal(translatedOnly.sourceRevision, sourceOnly.sourceRevision)
  assert.deepEqual(translatedOnly.files.map((file) => file.path), [
    'content/prompts/prm_01jabcdef/zh-CN.md',
    'content/taxonomies/content-type/cty_image/en.json',
    'content/taxonomies/content-type/cty_image/zh-CN.json',
    'content/taxonomies/model/mdl_model_agnostic/en.json',
    'content/taxonomies/model/mdl_model_agnostic/zh-CN.json',
  ])
  const markdown = translatedOnly.files.find((file) => file.path.endsWith('/zh-CN.md'))?.content ?? ''
  const frontmatterEnd = markdown.indexOf('\n---\n', 4)
  assert.ok(frontmatterEnd > 4)
  const frontmatter = JSON.parse(markdown.slice(4, frontmatterEnd)) as Record<string, unknown>
  assert.equal(frontmatter.locale, 'zh-CN')
  assert.equal(frontmatter.sourceLocale, 'en')
  assert.equal(
    (frontmatter.translation as Record<string, unknown>).translatedFromRevision,
    sourceOnly.sourceRevision,
  )
  const englishTaxonomy = JSON.parse(
    translatedOnly.files.find((file) => file.path === 'content/taxonomies/content-type/cty_image/en.json')?.content ?? '{}',
  ) as Record<string, unknown>
  const translatedTaxonomy = JSON.parse(
    translatedOnly.files.find((file) => file.path === 'content/taxonomies/content-type/cty_image/zh-CN.json')?.content ?? '{}',
  ) as Record<string, unknown>
  const taxonomyRevision = (englishTaxonomy.publication as Record<string, unknown>).sourceRevision
  assert.equal(englishTaxonomy.sourceLocale, 'en')
  assert.equal(translatedTaxonomy.sourceLocale, 'en')
  assert.equal((translatedTaxonomy.publication as Record<string, unknown>).sourceRevision, taxonomyRevision)
  assert.equal((englishTaxonomy.translation as Record<string, unknown>).translatedFromRevision, null)
  assert.equal((translatedTaxonomy.translation as Record<string, unknown>).translatedFromRevision, taxonomyRevision)
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
    validator.validate(input(['en', 'zh-CN'])),
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
  delete payload.variants[0]?.updatedAt
  const validator = new PayloadDraftContentValidator(payload)

  await assert.rejects(
    validator.validate(input(['en'])),
    (error: unknown) =>
      error instanceof PublicationContentValidationError &&
      error.issues.some((issue) => issue.path === 'artifact.prompt.variables[0].label') &&
      error.issues.some((issue) => issue.path === 'source.publishedDate') &&
      error.issues.some((issue) => issue.path === 'locales.en.updatedAt'),
  )
})

test('validator fails closed unless the primary source has a complete human rights review', async () => {
  const payload = new FakePayload()
  const source = payload.sourceEvidence[0]
  assert.ok(source)
  source.rightsStatus = 'review_required'
  const validator = new PayloadDraftContentValidator(payload)

  await assert.rejects(
    validator.validate(input(['en'])),
    (error: unknown) =>
      error instanceof PublicationContentValidationError &&
      error.issues.some((issue) => issue.path === 'source.rightsStatus' && issue.code === 'RIGHTS_NOT_CLEARED'),
  )

  source.rightsStatus = 'cleared'
  delete source.reviewedBy
  source.reviewedAt = 'September 3, 2026'
  source.evidenceUrl = 'file:///tmp/permission.txt'
  source.licenseReference = '  '

  await assert.rejects(
    validator.validate(input(['en'])),
    (error: unknown) =>
      error instanceof PublicationContentValidationError &&
      ['source.rights.reviewedBy', 'source.rights.reviewedAt', 'source.rights.evidenceUrl', 'source.rights.licenseReference']
        .every((path) => error.issues.some((issue) => issue.path === path)),
  )
})

test('human rights review participates in the request revision without entering canonical files', async () => {
  const payload = new FakePayload()
  const validator = new PayloadDraftContentValidator(payload)
  const first = await validator.validate(input(['en']))
  const source = payload.sourceEvidence[0]
  assert.ok(source)
  source.basis = `${String(source.basis)} Additional human context.`
  const second = await validator.validate(input(['en']))

  assert.notEqual(first.contentRevision, second.contentRevision)
  assert.notEqual(first.rightsRevision, second.rightsRevision)
  assert.equal(first.sourceRevision, second.sourceRevision)
  assert.deepEqual(first.files, second.files)
})

test('community-attributed content carries public attribution and takedown notice without relicensing', async () => {
  const payload = new FakePayload()
  const source = payload.sourceEvidence[0]
  assert.ok(source)
  source.rightsStatus = 'community_attributed'
  source.authorName = 'Example Author'
  source.authorUrl = 'https://x.com/example'
  source.originalPostUrl = SOURCE_URL
  source.policyVersion = 'community-attribution-v1'
  source.riskAcceptedBy = 'owner-reviewer'
  source.riskAcceptedAt = '2026-09-03T00:00:00Z'
  source.takedownUrl = 'https://github.com/ziyetsui/prompt-lab/issues/new?template=takedown.yml'
  delete source.licenseReference

  const result = await new PayloadDraftContentValidator(payload).validate(input(['en']))
  const markdown = result.files.find((file) => file.path.endsWith('/en.md'))?.content ?? ''

  assert.match(markdown, /## Rights and attribution/u)
  assert.match(markdown, /\[Example Author\]\(https:\/\/x\.com\/example\)/u)
  assert.match(markdown, /The author retains rights/u)
  assert.match(markdown, /template=takedown\.yml/u)
  assert.doesNotMatch(markdown, /CC BY/u)
  assert.doesNotMatch(markdown, /owner-reviewer/u)
})

test('community-attributed content fails closed without risk and takedown evidence', async () => {
  const payload = new FakePayload()
  const source = payload.sourceEvidence[0]
  assert.ok(source)
  source.rightsStatus = 'community_attributed'
  source.authorName = 'Example Author'
  source.originalPostUrl = SOURCE_URL
  source.policyVersion = 'community-attribution-v1'
  delete source.licenseReference

  await assert.rejects(
    new PayloadDraftContentValidator(payload).validate(input(['en'])),
    (error: unknown) =>
      error instanceof PublicationContentValidationError &&
      [
        'source.rights.riskAcceptedBy',
        'source.rights.riskAcceptedAt',
        'source.rights.takedownUrl',
      ].every((path) => error.issues.some((issue) => issue.path === path)),
  )
})

test('validator never silently rewrites non-canonical variable syntax', async () => {
  const payload = new FakePayload()
  const prompt = payload.artifact.prompt as Record<string, unknown>
  const original = 'Create a detailed plan for {{goal}} while preserving this explicit user-authored variable syntax and returning concrete acceptance criteria.'
  prompt.text = original
  for (const candidate of payload.variants) {
    candidate.bodyMarkdown = `# ${String(candidate.title)}\n\n\`\`\`prompt\n${original}\n\`\`\``
  }
  const validator = new PayloadDraftContentValidator(payload)

  await assert.rejects(
    validator.validate(input(['en'])),
    (error: unknown) =>
      error instanceof PublicationContentValidationError &&
      error.issues.some((issue) => issue.code === 'VARIABLE_DRIFT'),
  )
  assert.equal(prompt.text, original)
})

test('validator rejects credentialed, local, private, reserved, and obfuscated public URLs', async () => {
  const unsafeUrls = [
    'https://user:secret@example.com/private',
    'https://localhost/private',
    'https://service.local/private',
    'https://service.internal/private',
    'https://intranet/private',
    'https://10.0.0.1/private',
    'https://192.0.2.1/private',
    'https://[::1]/private',
    'https://[fd00::1]/private',
    'https://[2001:db8::1]/private',
    'https://example.com/?next=java&#x73;cript:alert(1)',
  ]

  for (const unsafeUrl of unsafeUrls) {
    const payload = new FakePayload()
    const source = payload.sourceEvidence[0]
    const sourceEvidence = payload.sourceEvidence[1]
    assert.ok(source)
    assert.ok(sourceEvidence)
    source.sourceUrl = unsafeUrl
    sourceEvidence.evidenceUrl = unsafeUrl
    const issues = await validationIssues(payload)
    assert.ok(
      issues.some((issue) => issue.path === 'source.url' && issue.code === 'UNSAFE_PUBLIC_URL'),
      `Expected ${unsafeUrl} to be rejected`,
    )
  }
})

test('validator applies the safe public URL gate to action, evidence, and rights URLs', async () => {
  const unsafeUrl = 'https://127.0.0.1/private'
  const cases: Array<{
    readonly expectedPath: string
    readonly mutate: (payload: FakePayload) => void
  }> = [
    {
      expectedPath: 'artifact.actions.tryUrl',
      mutate(payload) {
        ;(payload.artifact.actions as Record<string, unknown>).tryUrl = unsafeUrl
      },
    },
    {
      expectedPath: 'source.rights.evidenceUrl',
      mutate(payload) {
        const source = payload.sourceEvidence[0]
        assert.ok(source)
        source.evidenceUrl = unsafeUrl
      },
    },
    {
      expectedPath: 'evidence[1].url',
      mutate(payload) {
        payload.sourceEvidence.push({
          id: 'ev_2',
          recordType: 'evidence',
          evidenceType: 'supporting-record',
          evidenceUrl: unsafeUrl,
          confidence: null,
        })
      },
    },
  ]

  for (const item of cases) {
    const payload = new FakePayload()
    item.mutate(payload)
    const issues = await validationIssues(payload)
    assert.ok(
      issues.some((issue) => issue.path === item.expectedPath && issue.code === 'UNSAFE_PUBLIC_URL'),
      `Expected ${item.expectedPath} to use the safe URL gate`,
    )
  }

  for (const expectedPath of [
    'source.rights.authorUrl',
    'source.rights.originalPostUrl',
    'source.rights.takedownUrl',
  ]) {
    const payload = new FakePayload()
    const source = payload.sourceEvidence[0]
    assert.ok(source)
    source.rightsStatus = 'community_attributed'
    source.authorName = 'Example Author'
    source.authorUrl = expectedPath === 'source.rights.authorUrl' ? unsafeUrl : 'https://x.com/example'
    source.originalPostUrl = expectedPath === 'source.rights.originalPostUrl' ? unsafeUrl : SOURCE_URL
    source.policyVersion = 'community-attribution-v1'
    source.riskAcceptedBy = 'owner-reviewer'
    source.riskAcceptedAt = '2026-09-03T00:00:00Z'
    source.takedownUrl = expectedPath === 'source.rights.takedownUrl'
      ? unsafeUrl
      : 'https://github.com/ziyetsui/prompt-lab/issues/new?template=takedown.yml'
    delete source.licenseReference
    const issues = await validationIssues(payload)
    assert.ok(
      issues.some((issue) => issue.path === expectedPath && issue.code === 'UNSAFE_PUBLIC_URL'),
      `Expected ${expectedPath} to use the safe URL gate`,
    )
  }
})

test('validator only accepts anchors and safe public HTTPS Markdown links', async () => {
  const validPayload = new FakePayload()
  validPayload.variants[0]!.bodyMarkdown = `${String(validPayload.variants[0]!.bodyMarkdown)}\n\n[Docs](https://example.com/docs) [Section](#details)`
  await new PayloadDraftContentValidator(validPayload).validate(input(['en']))

  for (const target of ['http://example.com/docs', './local.md', 'https://localhost/docs']) {
    const payload = new FakePayload()
    payload.variants[0]!.bodyMarkdown = `${String(payload.variants[0]!.bodyMarkdown)}\n\n[Unsafe](${target})`
    const issues = await validationIssues(payload)
    assert.ok(issues.some((issue) =>
      issue.path === 'locales.en.bodyMarkdown' && issue.code === 'UNSAFE_MARKDOWN_LINK'))
  }
})

test('validator aggregates rich Prompt contract bounds, uniqueness, and v1-empty violations', async () => {
  const payload = new FakePayload()
  const prompt = payload.artifact.prompt as Record<string, unknown>
  const promptText = `Create [COUNTRY] ${'x'.repeat(20_000)}`
  prompt.language = 'EN_US'
  prompt.text = promptText
  const variables = prompt.variables as Record<string, unknown>[]
  variables.push(structuredClone(variables[0]!))
  const parameters = payload.artifact.parameters as Record<string, unknown>[]
  parameters.push(structuredClone(parameters[0]!))
  ;(payload.artifact.outcome as Record<string, unknown>).platforms = [
    { value: 'higgsfield' },
    { value: 'higgsfield' },
  ]
  payload.artifact.requiredInputs = [{ value: 'Country name' }, { value: 'Country name' }]
  payload.artifact.optionalInputs = [{ value: 'x'.repeat(161) }]
  ;(payload.artifact.models as Record<string, unknown>[]).push(
    structuredClone((payload.artifact.models as Record<string, unknown>[])[0]!),
  )
  const metrics = payload.artifact.metrics as Record<string, unknown>
  metrics.likes = -1
  metrics.views = 1.5
  payload.artifact.media = [{ assetId: 'ast_unverified' }]
  payload.artifact.examples = [{ exampleId: 'ex_unverified' }]
  payload.artifact.relatedPrompts = [{ artifactKey: 'prm_01jrelated' }]
  ;(payload.artifact.actions as Record<string, unknown>).canCopy = 'true'

  const localized = payload.variants[0]!
  localized.title = 't'.repeat(121)
  localized.summary = 's'.repeat(321)
  localized.bodyMarkdown = `# ${String(localized.title)}\n\n\`\`\`prompt\n${promptText}\n\`\`\``
  ;(localized.localizedOutcome as Record<string, unknown>).purpose = 'p'.repeat(241)
  ;(localized.localizedOutcome as Record<string, unknown>).characteristics = [
    { value: 'repeatable' },
    { value: 'repeatable' },
  ]
  localized.workflow = Array.from({ length: 21 }, (_, index) => ({
    position: index === 0 ? 1.5 : index + 1,
    title: index === 0 ? 'x' : `Step ${index + 1}`,
    body: index === 0 ? 'bad' : `Complete step ${index + 1}.`,
  }))
  ;(localized.translation as Record<string, unknown>).reviewer = 'r'.repeat(81)
  ;(localized.seo as Record<string, unknown>).title = 't'.repeat(121)
  ;(localized.seo as Record<string, unknown>).description = 'd'.repeat(321)

  const issues = await validationIssues(payload)
  const expected: ReadonlyArray<readonly [string, string]> = [
    ['artifact.prompt.language', 'INVALID_LANGUAGE'],
    ['artifact.prompt.text', 'MAX_LENGTH'],
    ['artifact.prompt.variables[1].key', 'DUPLICATE_VARIABLE_KEY'],
    ['artifact.parameters[1].key', 'DUPLICATE_PARAMETER_KEY'],
    ['artifact.outcome.platforms[1]', 'DUPLICATE_VALUE'],
    ['artifact.requiredInputs[1]', 'DUPLICATE_VALUE'],
    ['artifact.optionalInputs[0]', 'MAX_LENGTH'],
    ['artifact.models[1].slug', 'DUPLICATE_VALUE'],
    ['artifact.metrics.likes', 'INVALID_METRIC'],
    ['artifact.metrics.views', 'INVALID_METRIC'],
    ['artifact.media', 'UNVERIFIED_MEDIA'],
    ['artifact.examples', 'UNVERIFIED_MEDIA'],
    ['artifact.relatedPrompts', 'UNRESOLVED_RELATED_PROMPT'],
    ['artifact.actions.canCopy', 'INVALID_TYPE'],
    ['locales.en.title', 'MAX_LENGTH'],
    ['locales.en.summary', 'MAX_LENGTH'],
    ['locales.en.localizedOutcome.purpose', 'MAX_LENGTH'],
    ['locales.en.localizedOutcome.characteristics[1]', 'DUPLICATE_VALUE'],
    ['locales.en.workflow[0].position', 'INVALID_POSITION'],
    ['locales.en.workflow[0].title', 'REQUIRED'],
    ['locales.en.workflow[0].body', 'REQUIRED'],
    ['locales.en.workflow[20].position', 'INVALID_POSITION'],
    ['locales.en.workflow', 'WORKFLOW_ORDER'],
    ['locales.en.translation.reviewer', 'MAX_LENGTH'],
    ['locales.en.seo.title', 'MAX_LENGTH'],
    ['locales.en.seo.description', 'MAX_LENGTH'],
  ]
  for (const [path, code] of expected) {
    assert.ok(
      issues.some((issue) => issue.path === path && issue.code === code),
      `Expected aggregated issue ${code} at ${path}`,
    )
  }
})

test('validator rejects duplicate evidence semantics even when confidence differs', async () => {
  const payload = new FakePayload()
  const existing = payload.sourceEvidence[1]
  assert.ok(existing)
  payload.sourceEvidence.push({ ...existing, id: 'ev_2', confidence: 0.9 })

  const issues = await validationIssues(payload)
  assert.ok(issues.some((issue) => issue.code === 'DUPLICATE_EVIDENCE'))
})
