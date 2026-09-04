import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'

import type {
  ContentApprovalRecord,
  ContentWithdrawalRecord,
  PublicationFile,
} from '../src/domain/index.ts'
import {
  PublicSnapshotError,
  PublicSnapshotService,
  snapshotSha256,
  type PublicRightsMetadata,
  type PublicSnapshotReadSession,
  type PublicSnapshotSource,
  type PublicSnapshotValidatedApproval,
} from '../src/snapshot/index.ts'

const CONTENT_REVISION = `sha256:${'1'.repeat(64)}`
const SOURCE_REVISION = `sha256:${'2'.repeat(64)}`
const RIGHTS_REVISION = `sha256:${'3'.repeat(64)}`
const CONSUMER_MODULE = '../../prompt-lab/scripts/sync-cms-snapshot.mjs'
const SOURCE_URL = 'https://example.com/prompts/source-1'
const RIGHTS: PublicRightsMetadata = {
  basis: 'The owner explicitly approved this Prompt for public reuse.',
  evidenceUrl: 'https://example.com/rights/approval-1',
  licenseReference: 'CC BY 4.0',
  reviewedAt: '2026-09-03T03:30:00.000Z',
  sourceUrl: SOURCE_URL,
  status: 'cleared',
}

function promptData(
  artifactId = 'prm_snapshot_01',
  locale: 'en' | 'zh-CN' = 'en',
  sourceUrl = SOURCE_URL,
  sourceLocale: 'en' | 'zh-CN' = locale,
) {
  const artifactSuffix = artifactId === 'prm_snapshot_01' ? '' : `-${artifactId.slice(-2)}`
  return {
    schemaVersion: 1,
    id: artifactId,
    type: 'prompt',
    locale,
    sourceLocale,
    slug: locale === 'zh-CN' ? `xing-dong-ji-hua${artifactSuffix}` : `action-plan${artifactSuffix}`,
    title: locale === 'zh-CN' ? '可执行行动计划 Prompt' : 'Action plan Prompt',
    summary: locale === 'zh-CN'
      ? '把一个尚未拆解的目标转换成包含依赖关系、验收标准和风险提示的行动计划。'
      : 'Turn an unstructured goal into an action plan with dependencies, acceptance criteria, and risks.',
    status: 'draft',
    indexable: false,
    contentType: 'text',
    models: ['model-agnostic'],
    useCases: ['planning'],
    techniques: ['structured-output'],
    styles: ['concise'],
    subjects: ['productivity'],
    prompt: {
      language: locale,
      text: 'Create a concrete action plan for [GOAL], preserving every stated constraint, ordering dependencies, identifying risks, and defining objective acceptance criteria.',
      variables: [{
        key: '[GOAL]',
        label: 'Goal',
        required: true,
        defaultValue: null,
        options: [],
      }],
    },
    outcome: {
      outputType: 'text',
      purpose: 'Create an actionable and reviewable plan.',
      platforms: ['chat-interface'],
      characteristics: ['structured', 'reviewable'],
    },
    media: [],
    metrics: {
      likes: null,
      bookmarks: null,
      comments: null,
      reposts: null,
      views: null,
      observedAt: '2026-09-03T03:00:00.000Z',
    },
    inputs: { required: ['Goal'], optional: [] },
    parameters: [{
      key: 'GOAL',
      label: 'Goal',
      type: 'text',
      required: true,
      options: [],
    }],
    examples: [],
    workflow: [
      { position: 1, title: 'Describe goal', body: 'Provide the goal and constraints.' },
      { position: 2, title: 'Review plan', body: 'Verify dependencies and acceptance criteria.' },
    ],
    creator: null,
    relatedPromptIds: [],
    actions: { canCopy: true, tryUrl: null },
    source: {
      platform: 'manual',
      sourceId: 'source-1',
      url: sourceUrl,
      authorHandle: null,
      publishedDate: '2026-09-03',
      observedAt: '2026-09-03T03:00:00.000Z',
    },
    evidence: [{ type: 'source-post', url: sourceUrl, confidence: 1 }],
    seo: {
      title: 'Action plan Prompt for structured execution',
      description: 'Copy a structured Prompt that turns a goal into an ordered and objectively reviewable action plan.',
      canonical: `https://ancher.space/${locale}/prompts/action-plan`,
      robots: 'noindex,nofollow',
    },
    publication: {
      publishedAt: null,
      updatedAt: '2026-09-03T03:00:00.000Z',
      sourceRevision: SOURCE_REVISION,
    },
    translation: {
      status: 'ready',
      translatedFromRevision: locale === sourceLocale ? null : SOURCE_REVISION,
      reviewer: 'editorial-review',
    },
  }
}

function promptFile(
  artifactId = 'prm_snapshot_01',
  locale: 'en' | 'zh-CN' = 'en',
  sourceUrl = SOURCE_URL,
  sourceLocale: 'en' | 'zh-CN' = locale,
): PublicationFile {
  const data = promptData(artifactId, locale, sourceUrl, sourceLocale)
  return {
    content: `---\n${JSON.stringify(data, null, 2)}\n---\n\n# ${data.title}\n\nUse the Prompt above to generate the plan.\n`,
    path: `content/prompts/${artifactId}/${locale}.md`,
  }
}

function taxonomyFile(locale: 'en' | 'zh-CN' = 'en'): PublicationFile {
  const id = 'cty_text'
  const data = {
    schemaVersion: 1,
    id,
    type: 'taxonomy',
    axis: 'content-type',
    locale,
    sourceLocale: locale,
    slug: 'text',
    name: locale === 'zh-CN' ? '文本' : 'Text',
    description: locale === 'zh-CN'
      ? '通过兼容模型生成结构化或自由文本内容的提示词分类。'
      : 'Prompts that produce structured or free-form text through a compatible model.',
    status: 'draft',
    indexable: false,
    selector: { field: 'contentType', value: 'text' },
    surface: {
      level: 'L2',
      kind: 'content-type-gallery',
      path: `/${locale}/prompts/text`,
    },
    model: null,
    sourceRef: SOURCE_URL,
    seo: {
      title: 'Text prompts',
      description: 'Browse reusable Prompts whose declared output type is text.',
      canonical: `https://ancher.space/content/taxonomies/content-type/${id}/${locale}.json`,
      robots: 'noindex,nofollow',
    },
    publication: {
      publishedAt: null,
      updatedAt: '2026-09-03T03:00:00.000Z',
      sourceRevision: SOURCE_REVISION,
    },
    translation: {
      status: 'draft',
      translatedFromRevision: null,
      reviewer: null,
    },
  }
  return {
    content: `${JSON.stringify(data, null, 2)}\n`,
    path: `content/taxonomies/content-type/${id}/${locale}.json`,
  }
}

function modelTaxonomyFile(locale: 'en' | 'zh-CN' = 'en'): PublicationFile {
  const id = 'mdl_model_agnostic'
  const data = {
    schemaVersion: 1,
    id,
    type: 'taxonomy',
    axis: 'model',
    locale,
    sourceLocale: locale,
    slug: 'model-agnostic',
    name: locale === 'zh-CN' ? '模型无关' : 'Model agnostic',
    description: locale === 'zh-CN'
      ? '不依赖某个指定模型或供应商即可使用的提示词分类。'
      : 'Prompts designed without a dependency on one named model or provider.',
    status: 'draft',
    indexable: false,
    selector: { field: 'models', value: 'model-agnostic' },
    surface: {
      level: 'L3',
      kind: 'model-detail',
      path: `/${locale}/prompts/models/model-agnostic`,
    },
    model: {
      officialUrl: null,
      capabilities: [],
      inputs: [],
      outputs: [],
      limitations: [],
    },
    sourceRef: SOURCE_URL,
    seo: {
      title: 'Model-agnostic prompts',
      description: 'Browse reusable Prompts designed without a named model dependency.',
      canonical: `https://ancher.space/content/taxonomies/model/${id}/${locale}.json`,
      robots: 'noindex,nofollow',
    },
    publication: {
      publishedAt: null,
      updatedAt: '2026-09-03T03:00:00.000Z',
      sourceRevision: SOURCE_REVISION,
    },
    translation: {
      status: 'draft',
      translatedFromRevision: null,
      reviewer: null,
    },
  }
  return {
    content: `${JSON.stringify(data, null, 2)}\n`,
    path: `content/taxonomies/model/${id}/${locale}.json`,
  }
}

function approvedBundle(): readonly PublicationFile[] {
  return [promptFile(), taxonomyFile(), modelTaxonomyFile()]
}

function approval(
  overrides: Partial<ContentApprovalRecord> = {},
  files: readonly PublicationFile[] = approvedBundle(),
): ContentApprovalRecord {
  return {
    approvedAt: '2026-09-03T04:00:00.000Z',
    approvedBy: 'reviewer-1',
    artifactId: 'prm_snapshot_01',
    contentRevision: CONTENT_REVISION,
    decision: 'approved',
    decisionFingerprint: `sha256:${'4'.repeat(64)}`,
    decisionSequence: 1,
    fileCount: files.length,
    files: files.map((file) => ({
      byteLength: Buffer.byteLength(file.content, 'utf8'),
      path: file.path,
      sha256: snapshotSha256(file.content).slice('sha256:'.length),
    })),
    id: 'approval-1',
    idempotencyKey: 'approval:snapshot:0001',
    locale: 'en',
    rightsPolicyVersion: 'promptlab-rights-v1',
    rightsRevision: RIGHTS_REVISION,
    sourceRevision: SOURCE_REVISION,
    ...overrides,
  }
}

function withdrawal(
  overrides: Partial<ContentWithdrawalRecord> = {},
): ContentWithdrawalRecord {
  return {
    artifactId: 'prm_snapshot_01',
    caseId: 'case-public-001',
    decision: 'takedown',
    decisionFingerprint: `sha256:${'e'.repeat(64)}`,
    decisionSequence: 2,
    id: 'withdrawal-1',
    idempotencyKey: 'withdrawal:snapshot:0001',
    locale: 'en',
    rightsRevision: `sha256:${'d'.repeat(64)}`,
    syncDispatchMode: 'disabled',
    syncEventRevision: `sha256:${'e'.repeat(64)}`,
    syncEventType: 'public_snapshot_withdrawal',
    syncPriority: 'urgent',
    syncRequestedAt: '2026-09-03T05:00:00.000Z',
    withdrawnAt: '2026-09-03T05:00:00.000Z',
    withdrawnBy: 'reviewer-2',
    ...overrides,
  }
}

function validated(
  overrides: Partial<PublicSnapshotValidatedApproval> = {},
  files: readonly PublicationFile[] = approvedBundle(),
): PublicSnapshotValidatedApproval {
  return {
    contentRevision: CONTENT_REVISION,
    files,
    rights: RIGHTS,
    rightsRevision: RIGHTS_REVISION,
    sourceRevision: SOURCE_REVISION,
    ...overrides,
  }
}

class TestSource implements PublicSnapshotSource {
  reads = 0
  private readonly approvals: readonly ContentApprovalRecord[]
  private readonly withdrawals: readonly ContentWithdrawalRecord[]
  private readonly validate: (approval: ContentApprovalRecord) => PublicSnapshotValidatedApproval

  constructor(
    approvals: readonly ContentApprovalRecord[],
    validate: (approval: ContentApprovalRecord) => PublicSnapshotValidatedApproval,
    withdrawals: readonly ContentWithdrawalRecord[] = [],
  ) {
    this.approvals = approvals
    this.validate = validate
    this.withdrawals = withdrawals
  }

  async readConsistently<T>(
    read: (session: PublicSnapshotReadSession) => Promise<T>,
  ): Promise<T> {
    this.reads += 1
    return read({
      listApprovals: async () => this.approvals,
      listWithdrawals: async () => this.withdrawals,
      validateApproval: async (entry) => this.validate(entry),
    })
  }
}

type Snapshot = Awaited<ReturnType<PublicSnapshotService['build']>>

function decodedFile(snapshot: Snapshot, pathName: string): string {
  const file = snapshot.files.find((candidate) => candidate.path === pathName)
  assert.ok(file, `missing ${pathName}`)
  return Buffer.from(file.content, 'base64').toString('utf8')
}

function decodedJson(snapshot: Snapshot, pathName: string): Record<string, unknown> {
  return JSON.parse(decodedFile(snapshot, pathName)) as Record<string, unknown>
}

function frontmatter(markdown: string): Record<string, unknown> {
  const match = markdown.match(/^---\n([\s\S]*?)\n---\n/u)
  assert.ok(match?.[1])
  return JSON.parse(match[1]) as Record<string, unknown>
}

test('builds deterministic rich public bytes and passes a full consumer sync plus check', async (t) => {
  const source = new TestSource([approval()], () => validated())
  const service = new PublicSnapshotService(source)

  const first = await service.build()
  const second = await service.build()
  assert.deepEqual(second, first)
  assert.equal(first.schemaVersion, 1)
  assert.equal(first.exporterVersion, 'cms-public-snapshot-v1')
  assert.match(first.exportRevision, /^sha256:[a-f0-9]{64}$/u)
  assert.match(first.manifestSha256, /^sha256:[a-f0-9]{64}$/u)
  assert.deepEqual(first.manifest.counts, { locales: 2, prompts: 1, taxonomies: 2 })
  assert.equal(first.files.some((file) => file.path === 'mirror-manifest.json'), false)
  assert.deepEqual(decodedJson(first, 'governance/publication-audit.json'), {
    schemaVersion: 1,
    exportRevision: first.exportRevision,
    total: 1,
    items: [{
      approvalId: 'approval-1',
      approvedAt: '2026-09-03T04:00:00.000Z',
      contentRevision: CONTENT_REVISION,
      id: 'prm_snapshot_01',
      locale: 'en',
      rightsRevision: RIGHTS_REVISION,
      sourceRevision: SOURCE_REVISION,
    }],
  })

  const draft = promptData()
  const published = frontmatter(decodedFile(first, 'content/prompts/prm_snapshot_01/en.md'))
  assert.deepEqual(published.prompt, draft.prompt)
  assert.deepEqual(published.source, draft.source)
  assert.equal(published.status, 'published')
  assert.equal(published.indexable, true)
  assert.equal((published.seo as Record<string, unknown>).robots, 'index,follow')
  assert.deepEqual(published.publication, {
    publishedAt: '2026-09-03T04:00:00.000Z',
    sourceRevision: SOURCE_REVISION,
    updatedAt: '2026-09-03T04:00:00.000Z',
  })
  assert.match(
    decodedFile(first, 'content/prompts/prm_snapshot_01/en.md'),
    /https:\/\/example\.com\/prompts\/source-1/u,
  )
  const taxonomy = decodedJson(first, 'content/taxonomies/content-type/cty_text/en.json')
  assert.equal(taxonomy.status, 'published')
  assert.equal(taxonomy.indexable, false)
  assert.equal((taxonomy.seo as Record<string, unknown>).robots, 'noindex,nofollow')
  assert.equal((taxonomy.publication as Record<string, unknown>).publishedAt, '2026-09-03T04:00:00.000Z')

  const consumer = await import(CONSUMER_MODULE) as {
    syncValidatedSnapshot(args: { root: string; snapshot: unknown; check?: boolean }): Promise<unknown>
    verifyMirrorDirectory(args: { root: string }): Promise<unknown>
    validatePublicMirrorFileMap(
      value: ReadonlyMap<string, Uint8Array>,
      options: { exportRevision: string; manifest: unknown },
    ): unknown
    validateSnapshotEnvelope(value: unknown): {
      exportRevision: string
      fileMap: ReadonlyMap<string, Uint8Array>
      manifest: unknown
    }
  }
  const consumed = consumer.validateSnapshotEnvelope(first)
  const root = await mkdtemp(path.join(tmpdir(), 'promptlab-snapshot-'))
  t.after(async () => rm(root, { force: true, recursive: true }))
  await consumer.syncValidatedSnapshot({ root, snapshot: consumed })
  await consumer.verifyMirrorDirectory({ root })
  await consumer.syncValidatedSnapshot({ root, snapshot: consumed, check: true })
  const actual = new Map<string, Uint8Array>()
  for (const relative of consumed.fileMap.keys()) {
    actual.set(relative, await readFile(path.join(root, ...relative.split('/'))))
  }
  consumer.validatePublicMirrorFileMap(actual, {
    exportRevision: consumed.exportRevision,
    manifest: consumed.manifest,
  })
})

test('selects the DB-latest approval even when its application clock is older', async () => {
  const old = approval({
    approvedAt: '2026-09-03T03:00:00.000Z',
    contentRevision: `sha256:${'5'.repeat(64)}`,
    decisionFingerprint: `sha256:${'6'.repeat(64)}`,
    id: 'approval-old',
  })
  const current = approval({
    approvedAt: '2026-09-03T02:00:00.000Z',
    decisionSequence: 2,
    id: 'approval-current',
  })
  const validatedIds: string[] = []
  const source = new TestSource([old, current], (entry) => {
    validatedIds.push(entry.id)
    return validated()
  })

  const snapshot = await new PublicSnapshotService(source).build()
  assert.deepEqual(validatedIds, ['approval-current'])
  assert.equal(snapshot.manifest.counts.prompts, 1)
})

test('deduplicates shared taxonomies across Prompts approved at different times', async () => {
  const firstFiles = approvedBundle()
  const transientTaxonomy = (file: PublicationFile): PublicationFile => {
    const data = JSON.parse(file.content) as Record<string, unknown>
    return {
      ...file,
      content: `${JSON.stringify({
        ...data,
        sourceLocale: 'zh-CN',
        sourceRef: 'https://example.com/prompts/another-source',
        publication: {
          publishedAt: null,
          updatedAt: '2026-09-03T04:30:00.000Z',
          sourceRevision: `sha256:${'c'.repeat(64)}`,
        },
        translation: {
          status: 'draft',
          translatedFromRevision: `sha256:${'c'.repeat(64)}`,
          reviewer: null,
        },
      }, null, 2)}\n`,
    }
  }
  const secondSourceUrl = 'https://example.com/prompts/another-source'
  const secondFiles = [
    promptFile('prm_snapshot_02', 'en', secondSourceUrl, 'zh-CN'),
    transientTaxonomy(taxonomyFile()),
    transientTaxonomy(modelTaxonomyFile()),
  ]
  const firstApproval = approval({}, firstFiles)
  const secondApproval = approval({
    approvedAt: '2026-09-03T05:00:00.000Z',
    artifactId: 'prm_snapshot_02',
    decisionFingerprint: `sha256:${'a'.repeat(64)}`,
    decisionSequence: 2,
    id: 'approval-2',
    idempotencyKey: 'approval:snapshot:0002',
  }, secondFiles)
  const secondRights: PublicRightsMetadata = {
    ...RIGHTS,
    evidenceUrl: 'https://example.com/rights/approval-2',
    sourceUrl: secondSourceUrl,
  }
  const source = new TestSource([firstApproval, secondApproval], (entry) => (
    entry.artifactId === 'prm_snapshot_01'
      ? validated({}, firstFiles)
      : validated({ rights: secondRights }, secondFiles)
  ))
  const snapshot = await new PublicSnapshotService(source).build()
  const reversed = await new PublicSnapshotService(new TestSource(
    [secondApproval, firstApproval],
    (entry) => entry.artifactId === 'prm_snapshot_01'
      ? validated({}, firstFiles)
      : validated({ rights: secondRights }, secondFiles),
  )).build()
  assert.deepEqual(reversed, snapshot)
  assert.deepEqual(snapshot.manifest.counts, { locales: 2, prompts: 2, taxonomies: 2 })
  const taxonomy = decodedJson(snapshot, 'content/taxonomies/content-type/cty_text/en.json')
  assert.equal(taxonomy.sourceLocale, 'en')
  assert.deepEqual(taxonomy.publication, {
    publishedAt: '2026-09-03T05:00:00.000Z',
    sourceRevision: (taxonomy.publication as Record<string, unknown>).sourceRevision,
    updatedAt: '2026-09-03T05:00:00.000Z',
  })
  const consumer = await import(CONSUMER_MODULE) as {
    validateSnapshotEnvelope(value: unknown): unknown
  }
  assert.doesNotThrow(() => consumer.validateSnapshotEnvelope(snapshot))
})

test('binds translated taxonomy revisions to the canonical English taxonomy revision', async () => {
  const enFiles = approvedBundle()
  const zhFiles = [
    promptFile('prm_snapshot_01', 'zh-CN', SOURCE_URL, 'en'),
    taxonomyFile('en'),
    taxonomyFile('zh-CN'),
    modelTaxonomyFile('en'),
    modelTaxonomyFile('zh-CN'),
  ]
  const enApproval = approval({}, enFiles)
  const zhApproval = approval({
    approvedAt: '2026-09-03T04:30:00.000Z',
    decisionFingerprint: `sha256:${'a'.repeat(64)}`,
    decisionSequence: 2,
    id: 'approval-zh',
    idempotencyKey: 'approval:snapshot:zh',
    locale: 'zh-CN',
  }, zhFiles)
  const source = new TestSource([enApproval, zhApproval], (entry) => (
    entry.locale === 'en' ? validated({}, enFiles) : validated({}, zhFiles)
  ))
  const snapshot = await new PublicSnapshotService(source).build()
  for (const [axis, id] of [
    ['content-type', 'cty_text'],
    ['model', 'mdl_model_agnostic'],
  ] as const) {
    const english = decodedJson(snapshot, `content/taxonomies/${axis}/${id}/en.json`)
    const translated = decodedJson(snapshot, `content/taxonomies/${axis}/${id}/zh-CN.json`)
    const revision = (english.publication as Record<string, unknown>).sourceRevision
    assert.match(String(revision), /^sha256:[a-f0-9]{64}$/u)
    assert.equal((translated.publication as Record<string, unknown>).sourceRevision, revision)
    assert.equal((translated.translation as Record<string, unknown>).translatedFromRevision, revision)
    assert.equal((english.translation as Record<string, unknown>).translatedFromRevision, null)
  }
})

test('fails closed when shared taxonomy candidates conflict on semantic fields', async () => {
  const firstFiles = approvedBundle()
  const conflicting = taxonomyFile()
  const data = JSON.parse(conflicting.content) as Record<string, unknown>
  const conflictingTaxonomy = {
    ...conflicting,
    content: `${JSON.stringify({
      ...data,
      description: 'A conflicting semantic taxonomy description that must not be selected silently.',
    }, null, 2)}\n`,
  }
  const secondFiles = [
    promptFile('prm_snapshot_02'),
    conflictingTaxonomy,
    modelTaxonomyFile(),
  ]
  const approvals = [
    approval({}, firstFiles),
    approval({
      approvedAt: '2026-09-03T05:00:00.000Z',
      artifactId: 'prm_snapshot_02',
      decisionFingerprint: `sha256:${'a'.repeat(64)}`,
      decisionSequence: 2,
      id: 'approval-2',
      idempotencyKey: 'approval:snapshot:0002',
    }, secondFiles),
  ]
  const source = new TestSource(approvals, (entry) => (
    entry.artifactId === 'prm_snapshot_01'
      ? validated({}, firstFiles)
      : validated({}, secondFiles)
  ))
  await assert.rejects(
    new PublicSnapshotService(source).build(),
    (error) => error instanceof PublicSnapshotError && error.code === 'BUNDLE_PATH_CONFLICT',
  )
})

test('rejects duplicate public slugs within one locale', async () => {
  const original = promptFile('prm_snapshot_02')
  const parsed = frontmatter(original.content)
  parsed.slug = 'action-plan'
  const body = original.content.slice(original.content.indexOf('\n---\n', 4) + 5).replace(/^\n/u, '')
  const duplicatePrompt = {
    ...original,
    content: `---\n${JSON.stringify(parsed, null, 2)}\n---\n\n${body}`,
  }
  const secondFiles = [duplicatePrompt, taxonomyFile(), modelTaxonomyFile()]
  const secondApproval = approval({
    artifactId: 'prm_snapshot_02',
    decisionFingerprint: `sha256:${'a'.repeat(64)}`,
    decisionSequence: 2,
    id: 'approval-2',
    idempotencyKey: 'approval:snapshot:0002',
  }, secondFiles)
  const source = new TestSource([approval(), secondApproval], (entry) => (
    entry.artifactId === 'prm_snapshot_01' ? validated() : validated({}, secondFiles)
  ))
  await assert.rejects(
    new PublicSnapshotService(source).build(),
    (error) => error instanceof PublicSnapshotError && error.code === 'DUPLICATE_PUBLIC_SLUG',
  )
})

test('projects community attribution without relicensing or exposing reviewer identity', async () => {
  const notice = 'The author retains rights; this Prompt is not offered under the repository content license.'
  const takedownUrl = 'https://example.com/takedown'
  const base = promptFile()
  const communityPrompt = {
    ...base,
    content: `${base.content.trimEnd()}\n\n## Rights and attribution\n\nOriginal author: Example Author\n\nOriginal post: ${SOURCE_URL}\n\n${notice}\n\nRequest correction or removal: ${takedownUrl}\n`,
  }
  const files = [communityPrompt, taxonomyFile(), modelTaxonomyFile()]
  const rights: PublicRightsMetadata = {
    authorName: 'Example Author',
    authorUrl: null,
    notice,
    originalPostUrl: SOURCE_URL,
    policyVersion: 'community-attribution-v1',
    reviewedAt: '2026-09-03T03:30:00.000Z',
    riskAcceptanceRevision: `sha256:${'b'.repeat(64)}`,
    sourceUrl: SOURCE_URL,
    status: 'community_attributed',
    takedownUrl,
  }
  const source = new TestSource(
    [approval({}, files)],
    () => validated({ rights }, files),
  )
  const snapshot = await new PublicSnapshotService(source).build()
  const registry = decodedJson(snapshot, 'governance/content-rights.json')
  const item = (registry.items as Record<string, unknown>[])[0]
  assert.ok(item)
  assert.equal(item.status, 'community_attributed')
  assert.equal(item.authorName, 'Example Author')
  assert.equal(item.riskAcceptanceRevision, `sha256:${'b'.repeat(64)}`)
  assert.equal('reviewer' in item, false)
  assert.equal('licenseReference' in item, false)
  const localeReadme = decodedFile(snapshot, 'locales/en/README.md')
  for (const expected of ['Example Author', SOURCE_URL, notice, takedownUrl]) {
    assert.ok(localeReadme.includes(expected))
  }

  const consumer = await import(CONSUMER_MODULE) as {
    validateSnapshotEnvelope(value: unknown): unknown
  }
  assert.doesNotThrow(() => consumer.validateSnapshotEnvelope(snapshot))
})

test('an empty removal snapshot is a valid complete consumer contract', async () => {
  const source = new TestSource([], () => {
    throw new Error('no approval should be validated')
  })
  const snapshot = await new PublicSnapshotService(source).build()
  assert.deepEqual(snapshot.manifest.counts, { locales: 2, prompts: 0, taxonomies: 0 })
  assert.deepEqual((decodedJson(snapshot, 'content/site.json').publishedLocales as unknown[]), [])
  const consumer = await import(CONSUMER_MODULE) as {
    validateSnapshotEnvelope(value: unknown): unknown
  }
  assert.doesNotThrow(() => consumer.validateSnapshotEnvelope(snapshot))
})

for (const [field, value] of [
  ['contentRevision', `sha256:${'7'.repeat(64)}`],
  ['sourceRevision', `sha256:${'8'.repeat(64)}`],
  ['rightsRevision', `sha256:${'9'.repeat(64)}`],
] as const) {
  test(`aborts the whole snapshot on stale ${field} instead of deleting public content`, async () => {
    const source = new TestSource([approval()], () => validated({ [field]: value }))
    await assert.rejects(
      new PublicSnapshotService(source).build(),
      (error) => error instanceof PublicSnapshotError && error.code === 'APPROVAL_REVISION_MISMATCH',
    )
  })
}

test('aborts the whole snapshot when approved bytes drift', async () => {
  const original = promptFile()
  const changed = { ...original, content: `${original.content}changed\n` }
  const source = new TestSource([approval()], () => validated({}, [changed]))
  await assert.rejects(
    new PublicSnapshotService(source).build(),
    (error) => error instanceof PublicSnapshotError && error.code === 'APPROVAL_FILE_MISMATCH',
  )
})

test('aborts the whole snapshot on ordinary rights validation failure', async () => {
  const secondFiles = [promptFile('prm_snapshot_02'), taxonomyFile(), modelTaxonomyFile()]
  const secondApproval = approval({
    artifactId: 'prm_snapshot_02',
    decisionFingerprint: `sha256:${'a'.repeat(64)}`,
    decisionSequence: 2,
    id: 'approval-2',
    idempotencyKey: 'approval:snapshot:0002',
  }, secondFiles)
  const source = new TestSource([approval(), secondApproval], (entry) => {
    if (entry.artifactId === 'prm_snapshot_01') {
      throw new PublicSnapshotError('APPROVED_RIGHTS_NOT_PUBLIC', 'not public', 409)
    }
    return validated({}, secondFiles)
  })
  await assert.rejects(
    new PublicSnapshotService(source).build(),
    (error) => error instanceof PublicSnapshotError && error.code === 'APPROVED_RIGHTS_NOT_PUBLIC',
  )
})

test('only an explicit newer durable withdrawal produces a removal snapshot', async () => {
  const validatedIds: string[] = []
  const source = new TestSource(
    [approval()],
    (entry) => {
      validatedIds.push(entry.id)
      throw new Error('a superseded approval must not be revalidated')
    },
    [withdrawal()],
  )
  const snapshot = await new PublicSnapshotService(source).build()
  assert.deepEqual(validatedIds, [])
  assert.equal(snapshot.manifest.counts.prompts, 0)
  assert.deepEqual(decodedJson(snapshot, 'governance/publication-audit.json').items, [])
  assert.deepEqual(decodedJson(snapshot, 'governance/content-rights.json').items, [])
})

test('one artifact-wide rights withdrawal removes every approved locale', async () => {
  const zhFiles = [
    promptFile('prm_snapshot_01', 'zh-CN', SOURCE_URL, 'en'),
    taxonomyFile('en'),
    taxonomyFile('zh-CN'),
    modelTaxonomyFile('en'),
    modelTaxonomyFile('zh-CN'),
  ]
  const zhApproval = approval({
    decisionFingerprint: `sha256:${'a'.repeat(64)}`,
    decisionSequence: 2,
    id: 'approval-zh',
    idempotencyKey: 'approval:snapshot:zh',
    locale: 'zh-CN',
  }, zhFiles)
  const snapshot = await new PublicSnapshotService(new TestSource(
    [approval(), zhApproval],
    () => { throw new Error('artifact-wide withdrawn approvals must not be revalidated') },
    [withdrawal({ decisionSequence: 3 })],
  )).build()
  assert.equal(snapshot.manifest.counts.prompts, 0)
  assert.deepEqual(decodedJson(snapshot, 'governance/publication-audit.json').items, [])
})

test('a DB-later approval with a newly reviewed revision can republish despite clock skew', async () => {
  const newContentRevision = `sha256:${'5'.repeat(64)}`
  const newRightsRevision = `sha256:${'6'.repeat(64)}`
  const newApproval = approval({
    approvedAt: '2026-09-03T03:00:00.000Z',
    contentRevision: newContentRevision,
    decisionFingerprint: `sha256:${'f'.repeat(64)}`,
    decisionSequence: 3,
    id: 'approval-after-withdrawal',
    idempotencyKey: 'approval:snapshot:after-withdrawal',
    rightsRevision: newRightsRevision,
  })
  const snapshot = await new PublicSnapshotService(
    new TestSource([approval(), newApproval], (entry) => entry.id === newApproval.id
      ? validated({
          contentRevision: newContentRevision,
          rights: { ...RIGHTS, reviewedAt: '2026-09-03T07:00:00.000Z' },
          rightsRevision: newRightsRevision,
        })
      : validated(), [withdrawal()]),
  ).build()
  assert.equal(snapshot.manifest.counts.prompts, 1)
  const audit = decodedJson(snapshot, 'governance/publication-audit.json')
  assert.equal((audit.items as Record<string, unknown>[])[0]?.approvalId, 'approval-after-withdrawal')
})

test('forbids reapproval of the exact revision superseded by an artifact withdrawal', async () => {
  const replay = approval({
    approvedAt: '2026-09-03T07:00:00.000Z',
    decisionFingerprint: `sha256:${'f'.repeat(64)}`,
    decisionSequence: 3,
    id: 'approval-replayed-after-withdrawal',
    idempotencyKey: 'approval:snapshot:replayed-after-withdrawal',
  })
  await assert.rejects(
    new PublicSnapshotService(new TestSource(
      [approval(), replay],
      () => validated(),
      [withdrawal()],
    )).build(),
    (error) => error instanceof PublicSnapshotError && error.code === 'WITHDRAWN_REVISION_REAPPROVAL',
  )
})

test('forbids content-only reapproval that reuses pre-withdrawal rights evidence', async () => {
  const changedContentRevision = `sha256:${'7'.repeat(64)}`
  const replay = approval({
    approvedAt: '2026-09-03T07:00:00.000Z',
    contentRevision: changedContentRevision,
    decisionFingerprint: `sha256:${'f'.repeat(64)}`,
    decisionSequence: 3,
    id: 'approval-reused-rights-after-withdrawal',
    idempotencyKey: 'approval:snapshot:reused-rights-after-withdrawal',
  })
  await assert.rejects(
    new PublicSnapshotService(new TestSource(
      [approval(), replay],
      () => validated({ contentRevision: changedContentRevision }),
      [withdrawal()],
    )).build(),
    (error) => error instanceof PublicSnapshotError && error.code === 'WITHDRAWN_REVISION_REAPPROVAL',
  )
})

test('fails closed when approval and withdrawal reuse one database sequence', async () => {
  await assert.rejects(
    new PublicSnapshotService(new TestSource(
      [approval()],
      () => validated(),
      [withdrawal({ decisionSequence: 1 })],
    )).build(),
    (error) => error instanceof PublicSnapshotError &&
      error.code === 'DUPLICATE_PUBLICATION_DECISION_SEQUENCE',
  )
})

test('keeps structural CMS failures fail closed for the whole snapshot', async () => {
  const failure = new PublicSnapshotError('MALFORMED_CMS_RECORD', 'Malformed CMS record', 500)
  const source = new TestSource([approval()], () => { throw failure })
  await assert.rejects(new PublicSnapshotService(source).build(), (error) => error === failure)
})

test('rejects credentials and executable HTML without echoing content', async () => {
  for (const unsafe of [
    `Authorization: Bearer ${'s'.repeat(32)}`,
    '<script>privatePrompt()</script>',
  ]) {
    const original = promptFile()
    const file = { ...original, content: `${original.content}${unsafe}\n` }
    const source = new TestSource([approval({}, [file])], () => validated({}, [file]))
    let error: unknown
    try {
      await new PublicSnapshotService(source).build()
    } catch (candidate) {
      error = candidate
    }
    assert.ok(error instanceof PublicSnapshotError)
    assert.doesNotMatch(error.publicDetail, new RegExp(unsafe.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')))
  }
})
