import assert from 'node:assert/strict'
import test from 'node:test'

import { CmsConfigurationError, readCmsEnvironment } from '../src/config/env.ts'
import { createPreviewCatalogEndpoint } from '../src/endpoints/previewCatalog.ts'
import {
  buildCmsPreviewEnvelope,
  projectPreviewCatalog,
  type PreviewCatalogDocuments,
} from '../src/preview/index.ts'
import { buildWireframeSeedFixture } from '../src/seed/wireframe.ts'

const validEnvironment: NodeJS.ProcessEnv = {
  CMS_GIT_PUBLISHER: 'mock',
  CMS_MOCK_GIT_BASE_SHA: '0000000000000000000000000000000000000000',
  DATABASE_URI: 'postgres://payload:payload@127.0.0.1:5432/pseo_cms',
  NODE_ENV: 'test',
  PAYLOAD_PUBLIC_SERVER_URL: 'http://localhost:3001/',
  PAYLOAD_SECRET: '01234567890123456789012345678901',
}

test('preview stays disabled without an explicit opt-in and retains no token', () => {
  const environment = readCmsEnvironment(validEnvironment)

  assert.equal(environment.previewEnabled, false)
  assert.equal(environment.previewToken, null)
})

test('preview configuration requires a server-only token of at least 32 characters', () => {
  assert.throws(
    () => readCmsEnvironment({ ...validEnvironment, CMS_PREVIEW_ENABLED: 'true' }),
    (error: unknown) =>
      error instanceof CmsConfigurationError &&
      error.message === 'CMS_PREVIEW_TOKEN must contain at least 32 characters when preview is enabled',
  )
  assert.throws(
    () =>
      readCmsEnvironment({
        ...validEnvironment,
        CMS_PREVIEW_ENABLED: 'true',
        CMS_PREVIEW_TOKEN: 'too-short',
      }),
    CmsConfigurationError,
  )

  const environment = readCmsEnvironment({
    ...validEnvironment,
    CMS_PREVIEW_ENABLED: 'true',
    CMS_PREVIEW_TOKEN: 'preview-token-that-is-at-least-32-characters',
  })
  assert.equal(environment.previewEnabled, true)
  assert.equal(environment.previewToken, 'preview-token-that-is-at-least-32-characters')
})

test('preview endpoint factory is exported from its implementation module', async () => {
  const exported = (await import('../src/endpoints/previewCatalog.ts').catch(() => ({}))) as Record<
    string,
    unknown
  >
  assert.equal(typeof exported.createPreviewCatalogEndpoint, 'function')
})

type Document = Record<string, unknown>

function taxonomyRecord(axis: string, slug: string): Document {
  return {
    id: `db-${axis}-${slug}`,
    taxonomyKey: `${axis}:${slug}`,
    axis,
    slug,
    name: `${axis} ${slug}`,
    description: `${axis} description ${slug}`,
    password: 'must-never-leak',
    betaPreview: {
      wireframe: {
        id: `${axis === 'use_case' ? 'useCase' : axis}:${slug}`,
        axis: axis === 'use_case' ? 'useCase' : axis,
        slug,
        label: `Original ${slug}`,
        labelZh: null,
        aliases: [],
        wireframeDeclaredCount: null,
        appearsOn: ['l1'],
      },
    },
  }
}

function buildDocuments(): PreviewCatalogDocuments {
  const modelDocuments = Array.from({ length: 11 }, (_, index) => {
    const slug = `model-${String(index + 1).padStart(2, '0')}`
    return {
      id: `db-model-${index}`,
      taxonomyKey: `model:${slug}`,
      axis: 'model',
      slug,
      name: index === 0 ? 'Edited Model Label' : `Model ${index + 1}`,
      description: '',
      betaPreview: {
        taxonomy: {
          id: `model:${slug}`,
          axis: 'model',
          slug,
          label: `Original Model ${index + 1}`,
          labelZh: null,
          aliases: [],
          wireframeDeclaredCount: index + 1,
          appearsOn: ['l2'],
        },
        model: {
          slug,
          label: `Original Model ${index + 1}`,
          wireframeHasPage: index === 0,
          wireframeDeclaredPromptCount: index + 1,
          wireframeDeclaredHotCount: null,
          declaredRelatedModelSlugs: [],
          declaredRelatedUseCaseSlugs: [],
        },
      },
    }
  })
  const taxonomyDocuments: Document[] = [
    ...modelDocuments,
    ...Array.from({ length: 8 }, (_, index) => taxonomyRecord('use_case', `use-case-${index + 1}`)),
    ...Array.from({ length: 8 }, (_, index) => taxonomyRecord('technique', `technique-${index + 1}`)),
    ...Array.from({ length: 7 }, (_, index) => taxonomyRecord('style', `style-${index + 1}`)),
    ...Array.from({ length: 5 }, (_, index) => taxonomyRecord('subject', `subject-${index + 1}`)),
    ...Array.from({ length: 21 }, (_, index) => ({
      id: `db-creator-${index}`,
      taxonomyKey: `creator:creator-${index + 1}`,
      axis: 'creator',
      slug: `creator-${index + 1}`,
      name: index === 0 ? '@EditedCreator' : `@Creator${index + 1}`,
      officialUrl: `https://x.com/creator${index + 1}`,
      betaPreview: {
        wireframe: {
          id: `creator-${index + 1}`,
          handle: `@OriginalCreator${index + 1}`,
          url: `https://x.com/original${index + 1}`,
          avatarUrl: null,
          followers: null,
          wireframeDeclaredPromptCount: null,
          wireframeDeclaredLikes: null,
          wireframeDeclaredBookmarks: null,
        },
      },
    })),
    ...Array.from({ length: 6 }, (_, index) => ({
      id: `db-collection-${index}`,
      taxonomyKey: `collection:collection-${index + 1}`,
      axis: 'collection',
      slug: `collection-${index + 1}`,
      name: index === 0 ? 'Edited Collection' : `Collection ${index + 1}`,
      description: `Edited subtitle ${index + 1}`,
      betaPreview: {
        wireframe: {
          id: `collection:collection-${index + 1}`,
          slug: `collection-${index + 1}`,
          title: `Original Collection ${index + 1}`,
          subtitle: `Original subtitle ${index + 1}`,
          rule: { type: 'regex', pattern: `collection-${index + 1}` },
        },
      },
    })),
  ]
  const firstUseCase = taxonomyDocuments.find(
    (item) => item.taxonomyKey === 'use_case:use-case-1',
  )
  assert.ok(firstUseCase)
  firstUseCase.name = 'CMS 中文分类'
  const firstUseCaseBeta = firstUseCase.betaPreview as { wireframe: Record<string, unknown> }
  firstUseCaseBeta.wireframe.labelZh = '旧分类名称'
  const firstCreator = taxonomyDocuments.find(
    (item) => item.taxonomyKey === 'creator:creator-1',
  )
  assert.ok(firstCreator)
  firstCreator.officialUrl = null

  const artifacts = Array.from({ length: 35 }, (_, index) => {
    const wireframeId = `prompt-${String(index + 1).padStart(2, '0')}`
    const contentType = index === 0 ? 'unknown' : index % 2 === 0 ? 'video' : 'image'
    return {
      id: `db-artifact-${index}`,
      artifactKey: `prm_${wireframeId}`,
      contentType: contentType === 'unknown' ? 'other' : contentType,
      prompt: {
        language: 'en',
        text: index === 0 ? 'Edited complete prompt text' : `Prompt text ${index + 1}`,
        variables:
          index === 0
            ? [{ key: '[SUBJECT]', label: 'Edited subject', defaultValue: 'tea', options: [{ value: 'tea' }] }]
            : index === 1
              ? [{ key: '[CITY]', label: 'City', defaultValue: 'Paris', options: [] }]
            : [],
      },
      requiredInputs: index === 0 ? [{ value: 'portrait' }] : [],
      optionalInputs: [],
      parameters:
        index === 0
          ? [
              { key: 'quality', label: 'Quality', value: null },
              { key: 'aspect-ratio', label: 'Aspect ratio', value: '16:9' },
            ]
          : [],
      models: ['db-model-0'],
      useCases: ['db-use_case-use-case-1'],
      techniques: [],
      styles: [],
      subjects: [],
      creator: 'db-creator-0',
      media:
        index === 0
          ? [
              {
                assetId: 'edited-media',
                mediaType: 'image',
                url: 'https://example.com/edited.jpg',
                width: 640,
                height: 360,
                alt: 'Edited media',
              },
            ]
          : [],
      metrics: {
        likes: index === 0 ? 9001 : null,
        bookmarks: null,
        comments: null,
        reposts: null,
        views: null,
      },
      publicationIdempotencyKey: 'must-never-leak',
      betaPreview: {
        wireframe: {
          id: wireframeId,
          slug: `original-${wireframeId}`,
          slugSource: 'wireframe-slug',
          title: `Original title ${index + 1}`,
          summary: null,
          promptText: `Original prompt ${index + 1}`,
          contentType,
          contentTypeReason: 'wireframe source',
          modelSlugs: [],
          useCaseSlugs: [],
          techniqueSlugs: [],
          styleSlugs: [],
          subjectSlugs: [],
          creatorId: `creator-${index + 1}`,
          handle: `@OriginalCreator${index + 1}`,
          sourceUrl: `https://x.com/source/status/${index + 1}`,
          publishedAt: null,
          likes: null,
          bookmarks: null,
          views: null,
          reposts: null,
          replies: null,
          quotes: null,
          metricsRounded: false,
          valueScore: null,
          highValue: false,
          media: [],
          appearsOn: ['l1'],
          featuredOn: [],
          variables:
            index === 0
              ? [{ token: '[SUBJECT]', label: 'Original subject', options: ['coffee'], defaultValue: 'coffee', note: 'Keep the source guidance.' }]
              : [],
          steps: [],
          requiredInputs: [],
          optionalInputs: [],
          parameters:
            index === 0
              ? [
                  { label: 'Aspect ratio', value: '4:3' },
                  { label: 'Quality', value: 'high' },
                ]
              : [],
          variations:
            index === 0
              ? [
                  {
                    title: 'Variation one',
                    variableValue: 'tea',
                    media: {
                      id: 'variation-media',
                      kind: 'image',
                      src: 'https://example.com/variation.jpg',
                      alt: 'Variation',
                      label: null,
                      durationSeconds: null,
                      index: 1,
                      total: 1,
                      password: 'must-never-leak',
                    },
                    status: 'pending',
                    session: 'must-never-leak',
                  },
                ]
              : [],
        },
      },
    }
  })

  return {
    artifacts,
    localeVariants: artifacts.map((artifact, index) => ({
      id: `db-variant-${index}`,
      artifact: artifact.id,
      locale: 'zh-CN',
      slug: index === 0 ? 'edited-slug' : `prompt-${index + 1}`,
      title: index === 0 ? 'CMS edited title' : `CMS title ${index + 1}`,
      summary: index === 0 ? 'CMS edited summary' : null,
      workflow: index === 0 ? [{ position: 1, title: 'Prepare', body: 'Prepare assets' }] : [],
      session: 'must-never-leak',
    })),
    sources: artifacts.map((artifact, index) => ({
      id: `db-source-${index}`,
      artifact: artifact.id,
      recordType: 'source',
      sourceId: `wireframe:prompt-${String(index + 1).padStart(2, '0')}`,
      sourcePlatform: 'x',
      sourceUrl: index === 0 ? 'https://x.com/edited/status/1' : `https://x.com/source/status/${index + 1}`,
      creatorHandle: index === 0 ? '@EditedCreator' : `@Creator${index + 1}`,
      sourcePublishedDate: null,
      betaPreview: { source: { wireframeId: `prompt-${String(index + 1).padStart(2, '0')}` } },
    })),
    taxonomies: taxonomyDocuments,
  }
}

function enabledEnvironment() {
  return readCmsEnvironment({
    ...validEnvironment,
    CMS_PREVIEW_ENABLED: 'true',
    CMS_PREVIEW_TOKEN: 'preview-token-that-is-at-least-32-characters',
  })
}

function requestFor(
  endpoint: ReturnType<typeof createPreviewCatalogEndpoint>,
  options: { authorization?: string; locale?: string; payload?: unknown } = {},
) {
  const query = options.locale === undefined ? 'zh-CN' : options.locale
  const headers = new Headers()
  if (options.authorization !== undefined) headers.set('authorization', options.authorization)
  return endpoint.handler({
    headers,
    payload: options.payload ?? { find: async () => ({ docs: [] }) },
    url: `http://localhost:3001/api/internal/v1/preview-catalog?locale=${encodeURIComponent(query)}`,
  } as never)
}

test('preview endpoint hides while disabled and rejects missing or invalid bearer credentials', async () => {
  const disabled = createPreviewCatalogEndpoint(readCmsEnvironment(validEnvironment))
  assert.equal((await requestFor(disabled)).status, 404)

  const enabled = createPreviewCatalogEndpoint(enabledEnvironment())
  assert.equal((await requestFor(enabled)).status, 401)
  assert.equal((await requestFor(enabled, { authorization: 'Bearer wrong' })).status, 401)
})

test('preview endpoint rejects unsupported locales before querying Payload', async () => {
  let queried = false
  const endpoint = createPreviewCatalogEndpoint(enabledEnvironment())
  const response = await requestFor(endpoint, {
    authorization: 'Bearer preview-token-that-is-at-least-32-characters',
    locale: 'en',
    payload: { find: async () => { queried = true; return { docs: [] } } },
  })

  assert.equal(response.status, 400)
  assert.equal(queried, false)
})

test('preview endpoint fails closed when the seeded catalog is incomplete', async () => {
  const endpoint = createPreviewCatalogEndpoint(enabledEnvironment())
  const response = await requestFor(endpoint, {
    authorization: 'Bearer preview-token-that-is-at-least-32-characters',
  })

  assert.equal(response.status, 500)
  assert.equal(response.headers.get('cache-control'), 'no-store, private')
  assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow, noarchive')
})

test('projector returns the complete fixture universe with normal editable CMS fields winning', () => {
  const projected = projectPreviewCatalog(buildDocuments(), 'zh-CN')

  assert.equal(projected.prompts.length, 35)
  assert.equal(projected.taxonomies.length, 42)
  assert.equal(projected.creators.length, 21)
  assert.equal(projected.models.length, 11)
  assert.equal(projected.collections.length, 6)
  assert.deepEqual(projected.taxonomies.map((item) => item.id).slice(0, 3), [
    'contentType:image',
    'contentType:unknown',
    'contentType:video',
  ])

  const first = projected.prompts.find((prompt) => prompt.id === 'prompt-01')
  assert.ok(first)
  assert.equal(first.title, 'CMS edited title')
  assert.equal(first.summary, 'CMS edited summary')
  assert.equal(first.slug, 'edited-slug')
  assert.equal(first.promptText, 'Edited complete prompt text')
  assert.equal(first.contentType, 'unknown')
  assert.deepEqual(first.modelSlugs, ['model-01'])
  assert.deepEqual(first.useCaseSlugs, ['use-case-1'])
  assert.equal(first.creatorId, 'creator-1')
  assert.equal(first.handle, '@EditedCreator')
  assert.equal(first.sourceUrl, 'https://x.com/edited/status/1')
  assert.equal(first.likes, 9001)
  assert.equal(first.media[0]?.src, 'https://example.com/edited.jpg')
  assert.deepEqual(first.variables, [
    {
      token: '[SUBJECT]',
      label: 'Edited subject',
      options: ['tea'],
      defaultValue: 'tea',
      note: 'Keep the source guidance.',
    },
  ])
  const second = projected.prompts.find((prompt) => prompt.id === 'prompt-02')
  assert.ok(second)
  assert.deepEqual(second.variables, [
    { token: '[CITY]', label: 'City', options: [], defaultValue: 'Paris', note: null },
  ])
  assert.deepEqual(first.requiredInputs, ['portrait'])
  assert.deepEqual(first.steps, [{ order: 1, title: 'Prepare', body: 'Prepare assets' }])
})

test('zh-CN taxonomy edits replace stale imported localized labels', () => {
  const projected = projectPreviewCatalog(buildDocuments(), 'zh-CN')
  const editedUseCase = projected.taxonomies.find((item) => item.id === 'useCase:use-case-1')
  assert.ok(editedUseCase)
  assert.equal(editedUseCase.labelZh, 'CMS 中文分类')
})

test('clearing a creator official URL stays empty instead of reviving import metadata', () => {
  const projected = projectPreviewCatalog(buildDocuments(), 'zh-CN')
  assert.equal(projected.creators.find((creator) => creator.id === 'creator-1')?.url, '')
})

test('normal CMS parameter rows stay authoritative when reordered or cleared', () => {
  const projected = projectPreviewCatalog(buildDocuments(), 'zh-CN')
  const first = projected.prompts.find((prompt) => prompt.id === 'prompt-01')
  assert.ok(first)
  assert.deepEqual(first.parameters, [
    { label: 'Quality', value: '' },
    { label: 'Aspect ratio', value: '16:9' },
  ])
})

test('an edited slug receives curated provenance instead of stale wireframe provenance', () => {
  const projected = projectPreviewCatalog(buildDocuments(), 'zh-CN')
  const first = projected.prompts.find((prompt) => prompt.id === 'prompt-01')
  assert.ok(first)
  assert.equal(first.slug, 'edited-slug')
  assert.equal(first.slugSource, 'curated')
})

test('preview revision is stable across clocks and changes when editable content changes', () => {
  const documents = buildDocuments()
  const before = buildCmsPreviewEnvelope(projectPreviewCatalog(documents, 'zh-CN'), '2026-09-02T01:00:00.000Z')
  const later = buildCmsPreviewEnvelope(projectPreviewCatalog(documents, 'zh-CN'), '2026-09-02T02:00:00.000Z')
  assert.equal(before.meta.contentRevision, later.meta.contentRevision)
  assert.notEqual(before.meta.generatedAt, later.meta.generatedAt)

  const editedDocuments = structuredClone(documents)
  const firstVariant = editedDocuments.localeVariants[0]
  assert.ok(firstVariant)
  firstVariant.title = 'A later CMS edit'
  const edited = buildCmsPreviewEnvelope(
    projectPreviewCatalog(editedDocuments, 'zh-CN'),
    '2026-09-02T03:00:00.000Z',
  )
  assert.notEqual(before.meta.contentRevision, edited.meta.contentRevision)
  assert.equal(edited.data.prompts[0]?.title, 'A later CMS edit')
})

test('projector consumes Task 1 natural keys and merged model metadata without database ids', () => {
  const fixture = buildWireframeSeedFixture()
  const taxonomies = fixture.taxonomies.map((item) => ({ id: item.naturalKey, ...item.data }))
  const artifacts = fixture.artifacts.map((item) => ({ id: item.naturalKey, ...item.data }))
  const documents: PreviewCatalogDocuments = {
    taxonomies,
    artifacts,
    localeVariants: fixture.artifacts.map((item) => ({
      id: item.variant.naturalKey,
      artifact: item.naturalKey,
      ...item.variant.data,
    })),
    sources: fixture.sources.map((item) => ({
      id: item.naturalKey,
      artifact: `prm_${item.naturalKey.slice('wireframe:'.length)}`,
      ...item.data,
    })),
  }

  const projected = projectPreviewCatalog(documents, 'zh-CN')
  assert.equal(projected.prompts.length, 35)
  assert.equal(projected.taxonomies.length, 42)
  assert.equal(projected.creators.length, 21)
  assert.equal(projected.models.length, 11)
  assert.equal(projected.collections.length, 6)
  assert.ok(projected.prompts.some((prompt) => prompt.contentType === 'unknown'))
  assert.ok(projected.models.every((model) => model.slug.length > 0 && model.label.length > 0))
  assert.ok(projected.creators.every((creator) => creator.url.startsWith('https://')))
  assert.ok(projected.prompts.every((prompt) => !prompt.creatorId.startsWith('db-')))
})

test('successful endpoint response uses safe headers, stable Local API queries and a secret-free DTO', async () => {
  const documents = buildDocuments()
  const calls: Document[] = []
  const payload = {
    async find(args: Document) {
      calls.push(args)
      const collection = args.collection
      if (collection === 'prompt-artifacts') return { docs: documents.artifacts }
      if (collection === 'locale-variants') return { docs: documents.localeVariants }
      if (collection === 'taxonomies') return { docs: documents.taxonomies }
      if (collection === 'source-evidence') return { docs: documents.sources }
      throw new Error('unexpected collection')
    },
  }
  const endpoint = createPreviewCatalogEndpoint(enabledEnvironment(), {
    now: () => '2026-09-02T04:00:00.000Z',
  })
  const response = await requestFor(endpoint, {
    authorization: 'Bearer preview-token-that-is-at-least-32-characters',
    payload,
  })

  assert.equal(response.status, 200)
  assert.equal(response.headers.get('cache-control'), 'no-store, private')
  assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow, noarchive')
  assert.match(response.headers.get('x-content-revision') ?? '', /^sha256:[a-f0-9]{64}$/u)
  assert.deepEqual(
    calls.map((call) => [call.collection, call.depth, call.draft, call.overrideAccess, call.sort]),
    [
      ['prompt-artifacts', 0, true, true, 'artifactKey'],
      ['locale-variants', 0, true, true, 'localeVariantKey'],
      ['taxonomies', 0, true, true, 'taxonomyKey'],
      ['source-evidence', 0, true, true, 'sourceId'],
    ],
  )
  const body = await response.text()
  assert.doesNotMatch(body, /preview-token-that-is-at-least-32-characters/u)
  assert.doesNotMatch(body, /must-never-leak/u)
  assert.doesNotMatch(body, /db-artifact|db-source|db-variant|db-model/u)
})
