import assert from 'node:assert/strict'
import test from 'node:test'

import { PublicationContentValidationError } from '../src/domain/errors.ts'
import { PayloadDraftContentValidator } from '../src/publication/payloadDraftContentValidator.ts'
import {
  buildWireframeSeedFixture,
  seedWireframeFixture,
  type SeedPayloadLocalApi,
} from '../src/seed/wireframe.ts'

type Document = Record<string, unknown>

function record(value: unknown): Document {
  return value as Document
}

class InMemorySeedPayload implements SeedPayloadLocalApi {
  readonly documents = new Map<string, Document[]>()
  readonly creates: Array<{ readonly collection: string; readonly data: Document; readonly draft?: boolean }> = []
  private nextId = 1

  async create(args: { readonly collection: string; readonly data: Document; readonly draft?: boolean }): Promise<Document> {
    this.creates.push(args)
    const document = { id: `${args.collection}-${this.nextId++}`, ...args.data }
    const collection = this.documents.get(args.collection) ?? []
    collection.push(document)
    this.documents.set(args.collection, collection)
    return document
  }

  async find(args: { readonly collection: string; readonly where?: Record<string, unknown> }): Promise<{ docs: Document[] }> {
    const docs = this.documents.get(args.collection) ?? []
    const [field, condition] = Object.entries(args.where ?? {})[0] ?? []
    const equals = typeof condition === 'object' && condition !== null
      ? (condition as Record<string, unknown>).equals
      : undefined
    return { docs: field === undefined ? docs : docs.filter((document) => document[field] === equals) }
  }
}

test('wireframe adapter imports the exact fixture universe as noindex needs-review drafts', () => {
  const fixture = buildWireframeSeedFixture()

  assert.equal(fixture.artifacts.length, 35)
  assert.equal(fixture.taxonomies.filter((item) => item.axis === 'creator').length, 21)
  assert.equal(fixture.taxonomies.filter((item) => item.axis === 'model').length, 11)
  assert.equal(fixture.taxonomies.filter((item) => item.axis === 'collection').length, 6)
  assert.deepEqual(
    [...new Set(fixture.taxonomies.map((item) => item.axis))].sort(),
    ['collection', 'creator', 'model', 'style', 'subject', 'technique', 'use_case'],
  )
  const taxonomyKeys = new Set(fixture.taxonomies.map((item) => item.naturalKey))
  for (const artifact of fixture.artifacts) {
    for (const relation of ['models', 'useCases', 'techniques', 'styles', 'subjects'] as const) {
      for (const key of artifact.data[relation] as string[]) assert.ok(taxonomyKeys.has(key))
    }
    assert.ok(taxonomyKeys.has(String(artifact.data.creator)))
  }

  const unknown = fixture.artifacts.find(
    (item) => ((item.data.betaPreview as { wireframe: { contentType: string } }).wireframe.contentType === 'unknown'),
  )
  assert.ok(unknown)
  assert.equal(unknown.data.contentType, 'other')
  assert.equal(unknown.data.draftWorkflowState, 'needs_review')
  assert.equal(unknown.data._status, 'draft')
  assert.equal(record(unknown.data.gitPublication).state, 'unpublished')
  assert.equal(unknown.variant.data.localeVariantKey, `${unknown.data.artifactKey}:zh-CN`)
  assert.equal(unknown.variant.data.indexable, false)
  assert.equal(record(unknown.variant.data.translation).translationStatus, 'draft')
  assert.equal(record(unknown.variant.data.seo).robots, 'noindex,nofollow')
})

test('adapter preserves missing source dates, editable workflow facts, and assumptions only in preview metadata', () => {
  const fixture = buildWireframeSeedFixture()
  const undated = fixture.sources.find((source) => source.data.sourcePublishedDate === null)
  assert.ok(undated)
  assert.equal(record(record(undated.data.betaPreview).source).publishedAt, null)

  for (const artifact of fixture.artifacts) {
    const prompt = record(record(artifact.data.betaPreview).wireframe)
    assert.deepEqual(
      artifact.data.parameters,
      (prompt.parameters as readonly unknown[]).map((parameter) => {
        const item = record(parameter)
        return {
          key: item.label,
          label: item.label,
          value: item.value,
          valueType: 'text',
          required: false,
          options: [],
        }
      }),
    )
    assert.deepEqual(
      artifact.variant.data.workflow,
      (prompt.steps as readonly unknown[]).map((step) => {
        const item = record(step)
        return { position: item.order, title: item.title, body: item.body }
      }),
    )
    assert.deepEqual(record(artifact.data.betaPreview).wireframe, prompt)
  }

  const firstMedia = fixture.artifacts.flatMap((artifact) => artifact.data.media)[0]
  assert.deepEqual(
    firstMedia,
    {
      assetId: '1992826251220754540-1',
      mediaType: 'image',
      url: 'https://pbs.twimg.com/media/G6fw59VXYAAHd8R.jpg?name=small',
      width: null,
      height: null,
      alt: '来源帖媒体（图片 1/2）',
      posterUrl: null,
    },
  )
  assert.deepEqual(record(record(fixture.artifacts[0]?.data.betaPreview).mediaAssumptions), {
    dimensions: { height: 360, width: 640 },
    provenance: 'wireframe-assumption',
  })
})

test('seeding is a dry-run when requested and reruns skip edited natural keys', async () => {
  const payload = new InMemorySeedPayload()
  const dryRun = await seedWireframeFixture(payload, { dryRun: true })
  assert.deepEqual(dryRun.wouldCreate, {
    artifacts: 35,
    localeVariants: 35,
    sourceEvidence: 35,
    taxonomies: 66,
  })
  assert.equal(payload.documents.size, 0)

  const first = await seedWireframeFixture(payload)
  assert.deepEqual(first.created, {
    artifacts: 35,
    localeVariants: 35,
    sourceEvidence: 35,
    taxonomies: 66,
  })
  assert.ok(payload.creates.every((create) => create.draft === true))
  const edited = payload.documents.get('prompt-artifacts')?.[0]
  assert.ok(edited)
  edited.prompt = { language: 'en', text: 'Human edit must survive reruns.' }

  const second = await seedWireframeFixture(payload)
  assert.deepEqual(second.created, {
    artifacts: 0,
    localeVariants: 0,
    sourceEvidence: 0,
    taxonomies: 0,
  })
  assert.deepEqual(second.skipped, {
    artifacts: 35,
    localeVariants: 35,
    sourceEvidence: 35,
    taxonomies: 66,
  })
  assert.deepEqual(edited.prompt, { language: 'en', text: 'Human edit must survive reruns.' })
})

test('the strict publication validator rejects an incomplete seeded draft', async () => {
  const fixture = buildWireframeSeedFixture()
  const artifact = { id: 'artifact-1', ...fixture.artifacts[0]?.data }
  const variant = { id: 'variant-1', artifact: 'artifact-1', ...fixture.artifacts[0]?.variant.data }
  const source = { id: 'source-1', artifact: 'artifact-1', ...fixture.sources[0]?.data }
  const validator = new PayloadDraftContentValidator({
    async find(args) {
      if (args.collection === 'prompt-artifacts') return { docs: [artifact] }
      if (args.collection === 'locale-variants') return { docs: [variant] }
      return { docs: [source] }
    },
    async create() { throw new Error('not used') },
    async update() { throw new Error('not used') },
  })

  await assert.rejects(
    validator.validate({
      artifactId: String(record(artifact).artifactKey),
      commitMessage: 'content: should not publish a wireframe draft',
      expectedBaseSha: '0'.repeat(40),
      expectedContentRevision: `sha256:${'0'.repeat(64)}`,
      expectedSourceRevision: `sha256:${'0'.repeat(64)}`,
      idempotencyKey: 'wireframe-draft-must-not-publish',
      locales: ['zh-CN'],
    }),
    (error: unknown) => error instanceof PublicationContentValidationError &&
      error.issues.some((issue) => issue.code === 'NOT_VALIDATED') &&
      error.issues.some((issue) => issue.code === 'LOCALE_NOT_READY'),
  )
})
