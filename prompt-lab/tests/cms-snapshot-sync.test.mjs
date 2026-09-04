import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtemp, mkdir, readFile, rename, rm, symlink, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import {
  MirrorSyncError,
  applyTransaction,
  isAllowedGeneratedChangePath,
  isAllowedGeneratedPath,
  publicErrorMessage,
  sha256,
  stableJson,
  syncCmsSnapshot,
  syncValidatedSnapshot,
  verifyGitMirror,
  validateSnapshotEnvelope,
  validateSnapshotUrl,
  verifyMirrorDirectory,
} from '../scripts/sync-cms-snapshot.mjs'
import { makeEnvelope as makeReusableCmsEnvelope } from './fixtures/cms-public-snapshot-fixture.mjs'
import { verifyRepositoryState } from '../scripts/verify-repository.mjs'

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const SOURCE_URL = 'https://example.com/prompts/country-poster'
const TAKEDOWN_URL = 'https://example.com/takedown'
const REVISION_HASH = `sha256:${'a'.repeat(64)}`

function richPrompt({ community = false } = {}) {
  const data = {
    schemaVersion: 1,
    id: 'prm_01jabcdef',
    type: 'prompt',
    locale: 'en',
    sourceLocale: 'en',
    slug: 'country-poster',
    title: 'Country poster Prompt',
    summary: 'Create a reusable country poster with one controlled variable and reproducible steps.',
    status: 'published',
    indexable: true,
    contentType: 'image',
    models: ['model-agnostic'],
    useCases: ['poster-design'],
    techniques: ['variable-template'],
    styles: ['photorealistic'],
    subjects: ['landmark'],
    prompt: {
      language: 'en',
      text: 'Create a detailed country poster for [COUNTRY] with a landmark, native plants, cultural clothing, local currency, a capital-city postmark, and consistent studio lighting.',
      variables: [{ key: '[COUNTRY]', label: 'Country', required: true, defaultValue: 'Japan', options: ['Japan'] }],
    },
    outcome: { outputType: 'image', purpose: 'Create a reusable country poster.', platforms: ['higgsfield'], characteristics: ['reproducible'] },
    media: [],
    metrics: { likes: null, bookmarks: null, comments: null, reposts: null, views: null, observedAt: '2026-09-02T00:00:00Z' },
    inputs: { required: ['Country name'], optional: [] },
    parameters: [{ key: 'COUNTRY', label: 'Country', type: 'enum', required: true, options: ['Japan'] }],
    examples: [],
    workflow: [
      { position: 1, title: 'Choose model', body: 'Choose the configured image model.' },
      { position: 2, title: 'Replace variable', body: 'Replace the country variable consistently.' },
    ],
    creator: null,
    relatedPromptIds: [],
    actions: { canCopy: true, tryUrl: null },
    source: {
      platform: 'x',
      sourceId: '123',
      url: SOURCE_URL,
      authorHandle: 'example-author',
      publishedDate: '2026-09-01',
      observedAt: '2026-09-02T00:00:00Z',
    },
    evidence: [{ type: 'source-post', url: SOURCE_URL, confidence: 1 }],
    seo: {
      title: 'Country poster Prompt example',
      description: 'Copy and customize a reproducible country poster Prompt with one explicit variable.',
      canonical: 'https://example.com/en/prompts/country-poster',
      robots: 'index,follow',
    },
    publication: { publishedAt: '2026-09-03T00:00:00Z', updatedAt: '2026-09-03T00:00:00Z', sourceRevision: REVISION_HASH },
    translation: { status: 'ready', translatedFromRevision: null, reviewer: 'reviewer-en' },
  }
  const rightsLines = community
    ? [
        'Author: example-author',
        `Original post: ${SOURCE_URL}`,
        'The author retains rights; this Prompt is not offered under the repository content license.',
        `Takedown: ${TAKEDOWN_URL}`,
      ]
    : [`Source: ${SOURCE_URL}`]
  return `---\n${JSON.stringify(data, null, 2)}\n---\n\n# Country poster\n\n${rightsLines.join('\n\n')}\n`
}

function richTaxonomy(axis) {
  const contentType = axis === 'content-type'
  const id = contentType ? 'cty_image' : 'mdl_model_agnostic'
  const slug = contentType ? 'image' : 'model-agnostic'
  return {
    schemaVersion: 1,
    id,
    type: 'taxonomy',
    axis,
    locale: 'en',
    sourceLocale: 'en',
    slug,
    name: contentType ? 'Image' : 'Model agnostic',
    description: contentType ? 'Published image Prompt collection.' : 'Prompts that work across supported models.',
    status: 'published',
    indexable: false,
    selector: { field: contentType ? 'contentType' : 'models', value: slug },
    surface: {
      level: contentType ? 'L2' : 'L3',
      kind: contentType ? 'content-type-gallery' : 'model-detail',
      path: contentType ? '/en/prompts/image' : '/en/prompts/models/model-agnostic',
    },
    model: contentType ? null : { officialUrl: null, capabilities: [], inputs: [], outputs: [], limitations: [] },
    sourceRef: SOURCE_URL,
    seo: {
      title: contentType ? 'Image Prompt collection' : 'Model agnostic Prompts',
      description: contentType ? 'Browse the approved public image Prompt collection.' : 'Browse approved Prompts that work across supported models.',
      canonical: contentType ? 'https://example.com/en/prompts/image' : 'https://example.com/en/prompts/models/model-agnostic',
      robots: 'noindex,nofollow',
    },
    publication: { publishedAt: '2026-09-03T00:00:00Z', updatedAt: '2026-09-03T00:00:00Z', sourceRevision: REVISION_HASH },
    translation: { status: 'ready', translatedFromRevision: null, reviewer: 'reviewer-en' },
  }
}

function snapshotSources({ community = false, empty = false } = {}) {
  const promptPath = 'content/prompts/prm_01jabcdef/en.md'
  const taxonomyEntries = empty
    ? []
    : [
        ['content/taxonomies/content-type/cty_image/en.json', richTaxonomy('content-type')],
        ['content/taxonomies/model/mdl_model_agnostic/en.json', richTaxonomy('model')],
      ]
  const rights = empty
    ? []
    : community
      ? [{
          id: 'prm_01jabcdef',
          locale: 'en',
          status: 'community_attributed',
          rightsRevision: REVISION_HASH,
          sourceUrl: SOURCE_URL,
          reviewedAt: '2026-09-03T00:00:00Z',
          authorName: 'example-author',
          authorUrl: 'https://example.com/authors/example-author',
          originalPostUrl: SOURCE_URL,
          policyVersion: 'community-v1',
          riskAcceptanceRevision: REVISION_HASH,
          takedownUrl: TAKEDOWN_URL,
          notice: 'The author retains rights; this Prompt is not offered under the repository content license.',
        }]
      : [{
          id: 'prm_01jabcdef',
          locale: 'en',
          status: 'cleared',
          rightsRevision: REVISION_HASH,
          sourceUrl: SOURCE_URL,
          reviewedAt: '2026-09-03T00:00:00Z',
          basis: 'The owner explicitly authorized public reuse.',
          evidenceUrl: 'https://example.com/rights/permission',
          licenseReference: 'CC BY 4.0',
        }]
  const items = empty
    ? []
    : [{
        id: 'prm_01jabcdef',
        locale: 'en',
        path: promptPath,
        slug: 'country-poster',
        title: 'Country poster Prompt',
        summary: 'Create a reusable country poster with one controlled variable and reproducible steps.',
        sourceUrl: SOURCE_URL,
        rightsStatus: community ? 'community_attributed' : 'cleared',
      }]
  const auditItems = empty
    ? []
    : [{
        approvalId: 'approval-0001',
        approvedAt: '2026-09-03T00:00:00Z',
        contentRevision: `sha256:${'b'.repeat(64)}`,
        id: 'prm_01jabcdef',
        locale: 'en',
        rightsRevision: REVISION_HASH,
        sourceRevision: REVISION_HASH,
      }]
  const localeReadme = community && !empty
    ? `# English Prompt Lab\n\nexample-author\n\n${SOURCE_URL}\n\nThe author retains rights; this Prompt is not offered under the repository content license.\n\n${TAKEDOWN_URL}\n`
    : '# English Prompt Lab\n'
  return {
    'README.md': '# Public Prompt Lab\n',
    'catalog.json': stableJson({ schemaVersion: 1, exportRevision: 'cmsrev_00000001', total: items.length, items }),
    'content/site.json': stableJson({ schemaVersion: 1, siteName: 'Test Prompt Lab', defaultLocale: 'en', locales: ['en'], publishedLocales: ['en'] }),
    ...(!empty ? { [promptPath]: richPrompt({ community }) } : {}),
    ...Object.fromEntries(taxonomyEntries.map(([relative, record]) => [relative, stableJson(record)])),
    'governance/content-rights.json': stableJson({ schemaVersion: 1, exportRevision: 'cmsrev_00000001', total: rights.length, items: rights }),
    'governance/publication-audit.json': stableJson({ schemaVersion: 1, exportRevision: 'cmsrev_00000001', total: auditItems.length, items: auditItems }),
    'locales/en/README.md': localeReadme,
    'locales/en/index.json': stableJson({ schemaVersion: 1, exportRevision: 'cmsrev_00000001', locale: 'en', total: items.length, items }),
    'locales/en/taxonomies.json': stableJson({
      schemaVersion: 1,
      exportRevision: 'cmsrev_00000001',
      locale: 'en',
      total: taxonomyEntries.length,
      items: taxonomyEntries.map(([relative, record]) => ({ path: relative, ...record })),
    }),
  }
}

function rewriteRevision(sources, exportRevision) {
  const rewritten = { ...sources }
  for (const relative of ['catalog.json', 'governance/content-rights.json', 'governance/publication-audit.json', 'locales/en/index.json', 'locales/en/taxonomies.json']) {
    if (rewritten[relative] === undefined) continue
    const value = JSON.parse(rewritten[relative])
    value.exportRevision = exportRevision
    rewritten[relative] = stableJson(value)
  }
  return rewritten
}

function makeEnvelope(overrides = {}) {
  const exportRevision = overrides.exportRevision ?? 'cmsrev_00000001'
  const exporterVersion = overrides.exporterVersion ?? '1.0.0'
  const sources = rewriteRevision(overrides.sources ?? snapshotSources(overrides), exportRevision)
  const files = Object.entries(sources)
    .sort(([left], [right]) => left.localeCompare(right, 'en'))
    .map(([relative, source]) => {
      const bytes = Buffer.isBuffer(source) ? source : Buffer.from(source)
      return {
        content: bytes.toString('base64'),
        encoding: 'base64',
        path: relative,
        sha256: sha256(bytes),
      }
    })
  const manifest = {
    schemaVersion: 1,
    exportRevision,
    exporterVersion,
    counts: overrides.counts ?? {
      locales: 1,
      prompts: Object.keys(sources).filter((relative) => relative.startsWith('content/prompts/')).length,
      taxonomies: Object.keys(sources).filter((relative) => relative.startsWith('content/taxonomies/')).length,
    },
    files: files.map(({ path: relative, sha256: digest, content }) => ({
      path: relative,
      sha256: digest,
      bytes: Buffer.from(content, 'base64').length,
    })),
  }
  return {
    schemaVersion: 1,
    exportRevision,
    exporterVersion,
    manifestSha256: sha256(Buffer.from(stableJson(manifest))),
    manifest,
    files,
  }
}

async function temporaryRoot(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'cms-snapshot-sync-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  return root
}

test('validated snapshot sync is deterministic, checkable, and a second run is a no-op', async (t) => {
  const root = await temporaryRoot(t)
  const snapshot = validateSnapshotEnvelope(makeEnvelope())

  const first = await syncValidatedSnapshot({ root, snapshot })
  assert.equal(first.status, 'synced')
  assert.equal(first.changes, snapshot.fileMap.size)
  assert.equal(await readFile(path.join(root, 'README.md'), 'utf8'), '# Public Prompt Lab\n')
  assert.equal(sha256(await readFile(path.join(root, 'mirror-manifest.json'))), snapshot.manifestSha256)

  const firstTree = await Promise.all(
    [...snapshot.fileMap].map(async ([relative]) => [relative, await readFile(path.join(root, ...relative.split('/')))]),
  )
  const second = await syncValidatedSnapshot({ root, snapshot })
  assert.equal(second.status, 'noop')
  assert.equal(second.changes, 0)
  await syncValidatedSnapshot({ root, snapshot, check: true })
  const secondTree = await Promise.all(
    [...snapshot.fileMap].map(async ([relative]) => [relative, await readFile(path.join(root, ...relative.split('/')))]),
  )
  assert.deepEqual(secondTree, firstTree)
})

test('reusable CMS producer fixture satisfies the exact public snapshot consumer contract', () => {
  assert.doesNotThrow(() => validateSnapshotEnvelope(makeReusableCmsEnvelope()))
  assert.doesNotThrow(() => validateSnapshotEnvelope(makeReusableCmsEnvelope({ locale: 'zh-CN' })))
  assert.doesNotThrow(() => validateSnapshotEnvelope(makeReusableCmsEnvelope({ community: true })))
  assert.doesNotThrow(() => validateSnapshotEnvelope(makeReusableCmsEnvelope({ empty: true })))
})

test('released frontend read set is complete, manifest-bound, and derivable without fixture data', () => {
  const envelope = makeReusableCmsEnvelope({ locale: 'zh-CN' })
  assert.doesNotThrow(() => validateSnapshotEnvelope(envelope))
  const records = new Map(envelope.files.map((file) => [file.path, file]))
  const manifestPaths = new Set(envelope.manifest.files.map((file) => file.path))
  const decodeJson = (relative) => JSON.parse(Buffer.from(records.get(relative).content, 'base64').toString('utf8'))
  const catalog = decodeJson('catalog.json')
  const taxonomy = decodeJson('locales/zh-CN/taxonomies.json')
  const required = ['catalog.json', 'locales/zh-CN/taxonomies.json', ...catalog.items.map((item) => item.path)]

  assert.equal(catalog.exportRevision, envelope.exportRevision)
  assert.equal(taxonomy.exportRevision, envelope.exportRevision)
  assert(required.every((relative) => manifestPaths.has(relative)))
  assert(taxonomy.items.every((item) => ['content-type', 'model'].includes(item.axis) && item.id && item.slug && item.name))
  for (const item of catalog.items) {
    assert.match(item.path, /^content\/prompts\/prm_[a-z0-9_]{8,64}\/zh-CN\.md$/)
    const source = Buffer.from(records.get(item.path).content, 'base64').toString('utf8')
    const prompt = JSON.parse(source.match(/^---\n([\s\S]*?)\n---(?:\n|$)/)[1])
    assert(['x', 'rss', 'url', 'manual'].includes(prompt.source.platform))
    assert.equal(typeof prompt.source.authorHandle, 'string')
    assert.equal(typeof prompt.prompt.language, 'string')
    assert(prompt.prompt.language.length > 0)
    assert(prompt.prompt.variables.every((variable) => variable.defaultValue === null || typeof variable.defaultValue === 'string'))
    assert.deepEqual(prompt.media, [])
  }
})

test('repository verifier accepts rich and zero mirrors and forbids a legacy downgrade after migration', async (t) => {
  for (const [index, options] of [{}, { empty: true }].entries()) {
    const root = await temporaryRoot(t)
    const snapshot = validateSnapshotEnvelope(makeEnvelope({
      ...options,
      exportRevision: `cmsrev_0000000${index + 1}`,
    }))
    await syncValidatedSnapshot({ root, snapshot })
    assert.equal((await verifyRepositoryState({ root })).mode, 'cms-mirror')
  }

  const migrated = await temporaryRoot(t)
  execFileSync('git', ['init', '-q'], { cwd: migrated })
  execFileSync('git', ['config', 'user.name', 'Verifier Test'], { cwd: migrated })
  execFileSync('git', ['config', 'user.email', 'verifier@example.test'], { cwd: migrated })
  await syncValidatedSnapshot({ root: migrated, snapshot: validateSnapshotEnvelope(makeEnvelope()) })
  execFileSync('git', ['add', '-A'], { cwd: migrated })
  execFileSync('git', ['commit', '-qm', 'install mirror'], { cwd: migrated })
  await rm(path.join(migrated, 'mirror-manifest.json'))
  await assert.rejects(
    verifyRepositoryState({ root: migrated }),
    /cannot fall back to the legacy validator/,
  )
})

test('repository verifier preserves the deployed PromptLab bootstrap validator until the first CMS mirror', async (t) => {
  const root = await temporaryRoot(t)
  await mkdir(path.join(root, 'scripts'), { recursive: true })
  await writeFile(
    path.join(root, 'scripts', 'content.mjs'),
    "export async function validateRepository() { return { diagnostics: [], documents: [], taxonomies: [] } }\n",
  )

  assert.deepEqual(await verifyRepositoryState({ root }), {
    files: 1,
    mode: 'legacy-bootstrap',
    prompts: 0,
    revision: 'not-mirrored',
  })
})

test('sync removes obsolete managed output but leaves non-managed repository files alone', async (t) => {
  const root = await temporaryRoot(t)
  await writeFile(path.join(root, 'package.json'), '{}\n')
  await writeFile(path.join(root, 'README_zh-CN.md'), 'obsolete\n')
  await mkdir(path.join(root, 'content'), { recursive: true })
  await mkdir(path.join(root, 'governance'), { recursive: true })
  await writeFile(path.join(root, 'content', 'README.md'), 'legacy content instructions\n')
  await writeFile(path.join(root, 'governance', 'README.md'), 'legacy governance instructions\n')
  await writeFile(path.join(root, 'governance', 'rights-clearances.json'), '{"schemaVersion":1,"clearances":[]}\n')
  const snapshot = validateSnapshotEnvelope(makeEnvelope())

  await syncValidatedSnapshot({ root, snapshot })

  await assert.rejects(readFile(path.join(root, 'README_zh-CN.md')), { code: 'ENOENT' })
  await assert.rejects(readFile(path.join(root, 'content', 'README.md')), { code: 'ENOENT' })
  await assert.rejects(readFile(path.join(root, 'governance', 'README.md')), { code: 'ENOENT' })
  await assert.rejects(readFile(path.join(root, 'governance', 'rights-clearances.json')), { code: 'ENOENT' })
  assert.equal(await readFile(path.join(root, 'package.json'), 'utf8'), '{}\n')
})

test('check reports drift without changing managed files', async (t) => {
  const root = await temporaryRoot(t)
  const snapshot = validateSnapshotEnvelope(makeEnvelope())
  await syncValidatedSnapshot({ root, snapshot })
  await writeFile(path.join(root, 'README.md'), 'local drift\n')

  await assert.rejects(
    syncValidatedSnapshot({ root, snapshot, check: true }),
    (error) => error instanceof MirrorSyncError && error.code === 'MIRROR_DRIFT',
  )
  assert.equal(await readFile(path.join(root, 'README.md'), 'utf8'), 'local drift\n')
})

test('an empty Prompt snapshot is valid and removes the last public Prompt and orphan taxonomies', async (t) => {
  const root = await temporaryRoot(t)
  const populated = validateSnapshotEnvelope(makeEnvelope())
  await syncValidatedSnapshot({ root, snapshot: populated })

  const empty = validateSnapshotEnvelope(makeEnvelope({
    empty: true,
    exportRevision: 'cmsrev_00000002',
  }))
  const result = await syncValidatedSnapshot({ root, snapshot: empty, seenRevisions: ['cmsrev_00000001'] })

  assert.equal(result.status, 'synced')
  await assert.rejects(readFile(path.join(root, 'content/prompts/prm_01jabcdef/en.md')), { code: 'ENOENT' })
  await assert.rejects(readFile(path.join(root, 'content/taxonomies/content-type/cty_image/en.json')), { code: 'ENOENT' })
  assert.deepEqual(JSON.parse(await readFile(path.join(root, 'catalog.json'), 'utf8')).items, [])
  assert.equal((await verifyMirrorDirectory({ root })).exportRevision, 'cmsrev_00000002')
})

test('rich CMS Prompt contract is closed and rejects simplified or unknown frontmatter', () => {
  assert.doesNotThrow(() => validateSnapshotEnvelope(makeEnvelope()))

  for (const mutation of [
    (data) => { delete data.sourceLocale },
    (data) => { data.unreviewedField = true },
  ]) {
    const sources = snapshotSources()
    const promptPath = 'content/prompts/prm_01jabcdef/en.md'
    const parsed = sources[promptPath].match(/^---\n([\s\S]*?)\n---\n/)
    const data = JSON.parse(parsed[1])
    mutation(data)
    sources[promptPath] = `---\n${JSON.stringify(data, null, 2)}\n---\n${sources[promptPath].slice(parsed[0].length)}`
    assert.throws(() => validateSnapshotEnvelope(makeEnvelope({ sources })), { code: 'INVALID_PUBLIC_PROMPT' })
  }
})

test('Prompt slugs are unique per locale and translation revisions bind the source revision', () => {
  const translated = snapshotSources()
  const promptPath = 'content/prompts/prm_01jabcdef/en.md'
  const translatedMatch = translated[promptPath].match(/^---\n([\s\S]*?)\n---\n/)
  const translatedData = JSON.parse(translatedMatch[1])
  translatedData.sourceLocale = 'zh-CN'
  translatedData.translation.translatedFromRevision = `sha256:${'c'.repeat(64)}`
  translated[promptPath] = `---\n${JSON.stringify(translatedData, null, 2)}\n---\n${translated[promptPath].slice(translatedMatch[0].length)}`
  assert.throws(
    () => validateSnapshotEnvelope(makeEnvelope({ sources: translated })),
    { code: 'TRANSLATION_REVISION_MISMATCH' },
  )

  const duplicate = snapshotSources()
  const duplicateId = 'prm_01jsecond'
  const duplicatePath = `content/prompts/${duplicateId}/en.md`
  const promptMatch = duplicate[promptPath].match(/^---\n([\s\S]*?)\n---\n/)
  const promptData = JSON.parse(promptMatch[1])
  promptData.id = duplicateId
  duplicate[duplicatePath] = `---\n${JSON.stringify(promptData, null, 2)}\n---\n${duplicate[promptPath].slice(promptMatch[0].length)}`
  const catalog = JSON.parse(duplicate['catalog.json'])
  catalog.items.push({ ...catalog.items[0], id: duplicateId, path: duplicatePath })
  catalog.items.sort((left, right) => `${left.id}\0${left.locale}`.localeCompare(`${right.id}\0${right.locale}`, 'en'))
  catalog.total = catalog.items.length
  duplicate['catalog.json'] = stableJson(catalog)
  const rights = JSON.parse(duplicate['governance/content-rights.json'])
  rights.items.push({ ...rights.items[0], id: duplicateId })
  rights.items.sort((left, right) => `${left.id}\0${left.locale}`.localeCompare(`${right.id}\0${right.locale}`, 'en'))
  rights.total = rights.items.length
  duplicate['governance/content-rights.json'] = stableJson(rights)
  const audit = JSON.parse(duplicate['governance/publication-audit.json'])
  audit.items.push({ ...audit.items[0], approvalId: 'approval-0002', id: duplicateId })
  audit.items.sort((left, right) => `${left.id}\0${left.locale}`.localeCompare(`${right.id}\0${right.locale}`, 'en'))
  audit.total = audit.items.length
  duplicate['governance/publication-audit.json'] = stableJson(audit)
  const localeIndex = JSON.parse(duplicate['locales/en/index.json'])
  localeIndex.items = catalog.items
  localeIndex.total = catalog.total
  duplicate['locales/en/index.json'] = stableJson(localeIndex)
  assert.throws(
    () => validateSnapshotEnvelope(makeEnvelope({ sources: duplicate })),
    { code: 'DUPLICATE_PROMPT_SLUG' },
  )
})

test('taxonomy locale variants bind the same canonical source revision', () => {
  const sources = snapshotSources()
  const sourcePath = 'content/taxonomies/content-type/cty_image/en.json'
  const translatedPath = 'content/taxonomies/content-type/cty_image/zh-CN.json'
  const translated = JSON.parse(sources[sourcePath])
  translated.locale = 'zh-CN'
  translated.surface.path = '/zh-CN/prompts/image'
  translated.seo.canonical = 'https://example.com/zh-CN/prompts/image'
  translated.publication.sourceRevision = `sha256:${'c'.repeat(64)}`
  translated.translation.translatedFromRevision = translated.publication.sourceRevision
  sources[translatedPath] = stableJson(translated)
  const site = JSON.parse(sources['content/site.json'])
  site.locales.push('zh-CN')
  sources['content/site.json'] = stableJson(site)

  assert.throws(
    () => validateSnapshotEnvelope(makeEnvelope({ counts: { locales: 2, prompts: 1, taxonomies: 3 }, sources })),
    { code: 'TRANSLATION_REVISION_MISMATCH' },
  )
})

test('rights projection is one-to-one and fail-closed for cleared and community paths', () => {
  assert.doesNotThrow(() => validateSnapshotEnvelope(makeEnvelope({ community: true })))

  const missingCleared = snapshotSources()
  const clearedRegistry = JSON.parse(missingCleared['governance/content-rights.json'])
  delete clearedRegistry.items[0].evidenceUrl
  missingCleared['governance/content-rights.json'] = stableJson(clearedRegistry)
  assert.throws(() => validateSnapshotEnvelope(makeEnvelope({ sources: missingCleared })), { code: 'INVALID_RIGHTS_REGISTRY' })

  const relicensedCommunity = snapshotSources({ community: true })
  const communityRegistry = JSON.parse(relicensedCommunity['governance/content-rights.json'])
  communityRegistry.items[0].licenseReference = 'CC BY 4.0'
  relicensedCommunity['governance/content-rights.json'] = stableJson(communityRegistry)
  assert.throws(() => validateSnapshotEnvelope(makeEnvelope({ sources: relicensedCommunity })), { code: 'INVALID_RIGHTS_REGISTRY' })

  const uncovered = snapshotSources()
  uncovered['governance/content-rights.json'] = stableJson({ schemaVersion: 1, exportRevision: 'cmsrev_00000001', total: 0, items: [] })
  assert.throws(() => validateSnapshotEnvelope(makeEnvelope({ sources: uncovered })), { code: 'RIGHTS_COVERAGE_MISMATCH' })

  const missingNotice = snapshotSources({ community: true })
  missingNotice['content/prompts/prm_01jabcdef/en.md'] = missingNotice['content/prompts/prm_01jabcdef/en.md']
    .replace('The author retains rights; this Prompt is not offered under the repository content license.', 'Community content.')
  assert.throws(() => validateSnapshotEnvelope(makeEnvelope({ sources: missingNotice })), { code: 'MISSING_COMMUNITY_NOTICE' })

  const relicensedMarkdown = snapshotSources({ community: true })
  relicensedMarkdown['content/prompts/prm_01jabcdef/en.md'] += '\nLicensed as CC-BY 4.0.\n'
  assert.throws(
    () => validateSnapshotEnvelope(makeEnvelope({ sources: relicensedMarkdown })),
    { code: 'COMMUNITY_LICENSE_FORBIDDEN' },
  )
})

test('publication audit is closed, one-to-one, and revision-bound without reviewer identity', () => {
  const missing = snapshotSources()
  delete missing['governance/publication-audit.json']
  assert.throws(() => validateSnapshotEnvelope(makeEnvelope({ sources: missing })), { code: 'INCOMPLETE_SNAPSHOT' })

  for (const [field, value] of [
    ['rightsRevision', `sha256:${'c'.repeat(64)}`],
    ['sourceRevision', `sha256:${'d'.repeat(64)}`],
    ['approvedAt', '2026-09-03T00:00:01Z'],
  ]) {
    const sources = snapshotSources()
    const audit = JSON.parse(sources['governance/publication-audit.json'])
    audit.items[0][field] = value
    sources['governance/publication-audit.json'] = stableJson(audit)
    assert.throws(
      () => validateSnapshotEnvelope(makeEnvelope({ sources })),
      { code: 'INVALID_PUBLICATION_AUDIT' },
    )
  }

  const reviewerLeak = snapshotSources()
  const audit = JSON.parse(reviewerLeak['governance/publication-audit.json'])
  audit.items[0].reviewer = 'private-reviewer'
  reviewerLeak['governance/publication-audit.json'] = stableJson(audit)
  assert.throws(
    () => validateSnapshotEnvelope(makeEnvelope({ sources: reviewerLeak })),
    { code: 'INVALID_PUBLICATION_AUDIT' },
  )
})

test('taxonomy references resolve exactly once and orphan or duplicate selectors fail closed', () => {
  const semanticOrder = snapshotSources()
  const promptPath = 'content/prompts/prm_01jabcdef/en.md'
  const parsedPrompt = semanticOrder[promptPath].match(/^---\n([\s\S]*?)\n---\n/)
  const prompt = JSON.parse(parsedPrompt[1])
  prompt.models = ['model-agnostic', 'alpha-model', 'zulu-model']
  semanticOrder[promptPath] = `---\n${JSON.stringify(prompt, null, 2)}\n---\n${semanticOrder[promptPath].slice(parsedPrompt[0].length)}`
  const extraTaxonomies = [
    ['content/taxonomies/model/mdl_zzzzzzzz/en.json', 'mdl_zzzzzzzz', 'alpha-model'],
    ['content/taxonomies/model/mdl_aaaaaaaa/en.json', 'mdl_aaaaaaaa', 'zulu-model'],
  ]
  const semanticIndex = JSON.parse(semanticOrder['locales/en/taxonomies.json'])
  for (const [relative, id, slug] of extraTaxonomies) {
    const record = richTaxonomy('model')
    record.id = id
    record.slug = slug
    record.name = slug
    record.selector.value = slug
    record.surface.path = `/en/prompts/models/${slug}`
    record.seo.title = `${slug} Prompts`
    record.seo.canonical = `https://example.com/en/prompts/models/${slug}`
    semanticOrder[relative] = stableJson(record)
    semanticIndex.items.push({ path: relative, ...record })
  }
  semanticIndex.items.sort((left, right) => (
    left.axis.localeCompare(right.axis, 'en')
    || left.slug.localeCompare(right.slug, 'en')
    || left.path.localeCompare(right.path, 'en')
  ))
  semanticIndex.total = semanticIndex.items.length
  semanticOrder['locales/en/taxonomies.json'] = stableJson(semanticIndex)
  assert.doesNotThrow(() => validateSnapshotEnvelope(makeEnvelope({ sources: semanticOrder })))

  const missing = snapshotSources()
  delete missing['content/taxonomies/model/mdl_model_agnostic/en.json']
  const taxonomyIndex = JSON.parse(missing['locales/en/taxonomies.json'])
  taxonomyIndex.items = taxonomyIndex.items.filter((item) => item.id !== 'mdl_model_agnostic')
  taxonomyIndex.total = taxonomyIndex.items.length
  missing['locales/en/taxonomies.json'] = stableJson(taxonomyIndex)
  assert.throws(() => validateSnapshotEnvelope(makeEnvelope({ sources: missing })), { code: 'MISSING_PUBLIC_TAXONOMY' })

  const duplicate = snapshotSources()
  const duplicateRecord = richTaxonomy('model')
  duplicateRecord.id = 'mdl_model_duplicate'
  duplicate['content/taxonomies/model/mdl_model_duplicate/en.json'] = stableJson(duplicateRecord)
  const duplicateIndex = JSON.parse(duplicate['locales/en/taxonomies.json'])
  duplicateIndex.items.push({ path: 'content/taxonomies/model/mdl_model_duplicate/en.json', ...duplicateRecord })
  duplicateIndex.items.sort((left, right) => left.path.localeCompare(right.path, 'en'))
  duplicateIndex.total = duplicateIndex.items.length
  duplicate['locales/en/taxonomies.json'] = stableJson(duplicateIndex)
  assert.throws(() => validateSnapshotEnvelope(makeEnvelope({ sources: duplicate })), { code: 'DUPLICATE_TAXONOMY' })
})

test('related Prompt references and Prompt-body local links are excluded from the beta public contract', () => {
  for (const mutate of [
    (data, body) => { data.relatedPromptIds = ['prm_01jmissing']; return body },
    (data, body) => `${body}\n[missing](../prm_01jmissing/en.md)\n`,
    (data, body) => `${body}\n[missing]: ../prm_01jmissing/en.md\n`,
    (data, body) => `${body}\n<a href="../prm_01jmissing/en.md">missing</a>\n`,
  ]) {
    const sources = snapshotSources()
    const promptPath = 'content/prompts/prm_01jabcdef/en.md'
    const parsed = sources[promptPath].match(/^---\n([\s\S]*?)\n---\n/)
    const data = JSON.parse(parsed[1])
    const body = mutate(data, sources[promptPath].slice(parsed[0].length))
    sources[promptPath] = `---\n${JSON.stringify(data, null, 2)}\n---\n${body}`
    assert.throws(
      () => validateSnapshotEnvelope(makeEnvelope({ sources })),
      (error) => error.code === 'UNRESOLVED_RELATED_PROMPT' || error.code === 'LOCAL_LINK_FORBIDDEN',
    )
  }
})

test('generated README local links must resolve inside the same manifest', () => {
  const valid = snapshotSources()
  valid['README.md'] = '# Public Prompt Lab\n\n[Catalog](catalog.json)\n'
  valid['locales/en/README.md'] = '# English Prompt Lab\n\n[Country poster](../../content/prompts/prm_01jabcdef/en.md)\n'
  assert.doesNotThrow(() => validateSnapshotEnvelope(makeEnvelope({ sources: valid })))

  const dangling = { ...valid }
  dangling['locales/en/README.md'] += '\n[Removed Prompt](../../content/prompts/prm_01jmissing/en.md)\n'
  assert.throws(
    () => validateSnapshotEnvelope(makeEnvelope({ sources: dangling })),
    { code: 'DANGLING_LOCAL_LINK' },
  )

  const undeclaredLocale = snapshotSources()
  undeclaredLocale['locales/zh-CN/README.md'] = '# 未声明的 locale\n'
  assert.throws(
    () => validateSnapshotEnvelope(makeEnvelope({ sources: undeclaredLocale })),
    { code: 'UNDECLARED_LOCALE_OUTPUT' },
  )
})

test('same revision equivocation and historical revision replay are rejected while exact current identity is a no-op', async (t) => {
  const root = await temporaryRoot(t)
  const first = validateSnapshotEnvelope(makeEnvelope())
  await syncValidatedSnapshot({ root, snapshot: first })
  assert.equal((await syncValidatedSnapshot({ root, snapshot: first, seenRevisions: ['cmsrev_00000001'] })).status, 'noop')

  const equivocalSources = snapshotSources()
  equivocalSources['README.md'] = '# Equivocal mirror\n'
  const equivocal = validateSnapshotEnvelope(makeEnvelope({ sources: equivocalSources }))
  await assert.rejects(syncValidatedSnapshot({ root, snapshot: equivocal }), { code: 'REVISION_EQUIVOCATION' })

  const second = validateSnapshotEnvelope(makeEnvelope({ exportRevision: 'cmsrev_00000002' }))
  await syncValidatedSnapshot({ root, snapshot: second, seenRevisions: ['cmsrev_00000001'] })
  await assert.rejects(
    syncValidatedSnapshot({ root, snapshot: first, seenRevisions: ['cmsrev_00000001', 'cmsrev_00000002'] }),
    { code: 'REVISION_REPLAY' },
  )
})

test('rollback failure preserves the transaction backup and reports a recovery boundary', async (t) => {
  const root = await temporaryRoot(t)
  const stageRoot = await temporaryRoot(t)
  const backupRoot = await temporaryRoot(t)
  await writeFile(path.join(root, 'README.md'), 'previous\n')
  await writeFile(path.join(stageRoot, 'README.md'), 'next\n')
  let renameCalls = 0
  const operations = {
    rename: async (from, to) => {
      renameCalls += 1
      if (renameCalls === 1) return rename(from, to)
      throw new Error('injected rename failure')
    },
    rm,
  }

  await assert.rejects(
    applyTransaction({
      root,
      stageRoot,
      backupRoot,
      fileMap: new Map([['README.md', Buffer.from('next\n')]]),
      existing: new Set(['README.md']),
      changes: { changed: ['README.md'], obsolete: [], total: 1 },
      operations,
    }),
    (error) => error.code === 'ROLLBACK_FAILED' && error.preserveBackup === true,
  )
  assert.equal(await readFile(path.join(backupRoot, 'README.md'), 'utf8'), 'previous\n')
})

test('prospective Git index and clean HEAD must exactly match manifest paths and bytes', async (t) => {
  const root = await temporaryRoot(t)
  execFileSync('git', ['init', '-b', 'main', root], { stdio: 'ignore' })
  execFileSync('git', ['-C', root, 'config', 'user.name', 'Mirror Test'], { stdio: 'ignore' })
  execFileSync('git', ['-C', root, 'config', 'user.email', 'mirror@example.test'], { stdio: 'ignore' })
  const snapshot = validateSnapshotEnvelope(makeEnvelope())
  await syncValidatedSnapshot({ root, snapshot })
  execFileSync('git', ['-C', root, 'add', '-A'], { stdio: 'ignore' })
  assert.equal((await verifyGitMirror({ root, kind: 'index' })).exportRevision, 'cmsrev_00000001')
  execFileSync('git', ['-C', root, '-c', 'core.hooksPath=/dev/null', 'commit', '-m', 'mirror fixture'], { stdio: 'ignore' })
  assert.equal((await verifyGitMirror({ root, kind: 'tree' })).exportRevision, 'cmsrev_00000001')

  await writeFile(path.join(root, 'README.md'), 'tampered\n')
  await assert.rejects(verifyGitMirror({ root, kind: 'tree' }), { code: 'DIRTY_GIT_CHECKOUT' })
  execFileSync('git', ['-C', root, 'add', 'README.md'], { stdio: 'ignore' })
  await assert.rejects(verifyGitMirror({ root, kind: 'index' }), { code: 'MANIFEST_TREE_MISMATCH' })
})

test('path traversal, non-allowlisted files, and hash mismatches fail before writing', async (t) => {
  const root = await temporaryRoot(t)
  const traversal = makeEnvelope()
  traversal.files[0].path = '../outside.md'
  traversal.manifest.files[0].path = '../outside.md'
  traversal.manifestSha256 = sha256(Buffer.from(stableJson(traversal.manifest)))
  assert.throws(() => validateSnapshotEnvelope(traversal), { code: 'UNSAFE_PATH' })

  const workflow = makeEnvelope()
  workflow.files[0].path = '.github/workflows/injected.yml'
  workflow.manifest.files[0].path = '.github/workflows/injected.yml'
  workflow.manifestSha256 = sha256(Buffer.from(stableJson(workflow.manifest)))
  assert.throws(() => validateSnapshotEnvelope(workflow), { code: 'UNSAFE_PATH' })

  const badHash = makeEnvelope()
  badHash.files[0].sha256 = `sha256:${'0'.repeat(64)}`
  badHash.manifest.files[0].sha256 = badHash.files[0].sha256
  badHash.manifestSha256 = sha256(Buffer.from(stableJson(badHash.manifest)))
  assert.throws(() => validateSnapshotEnvelope(badHash), { code: 'FILE_HASH_MISMATCH' })
  assert.deepEqual(await readFile(path.join(root, 'README.md')).catch((error) => error.code), 'ENOENT')
})

test('existing symlinks in managed output are rejected without touching their targets', async (t) => {
  const root = await temporaryRoot(t)
  const outside = await temporaryRoot(t)
  const target = path.join(outside, 'target.md')
  await writeFile(target, 'outside\n')
  await symlink(target, path.join(root, 'README.md'))
  const snapshot = validateSnapshotEnvelope(makeEnvelope())

  await assert.rejects(
    syncValidatedSnapshot({ root, snapshot }),
    (error) => error instanceof MirrorSyncError && error.code === 'UNSAFE_SYMLINK',
  )
  assert.equal(await readFile(target, 'utf8'), 'outside\n')
})

test('snapshot URL is HTTPS-only and rejects credentials and local/private hosts', () => {
  assert.equal(validateSnapshotUrl('https://cms.example.test/api/public-snapshots/cmsrev_00000001').protocol, 'https:')
  for (const unsafe of [
    'http://cms.example.test/snapshot',
    'https://user:password@cms.example.test/snapshot',
    'https://localhost/snapshot',
    'https://localhost./snapshot',
    'https://127.0.0.1/snapshot',
    'https://10.0.0.8/snapshot',
    'https://cms.internal/snapshot',
    'https://cms.internal./snapshot',
    'https://cms.local./snapshot',
  ]) {
    assert.throws(() => validateSnapshotUrl(unsafe), { code: 'INVALID_URL' })
  }
})

test('direct CLI/library network fetch is retired before any Bearer token can reach repository code', async () => {
  const token = 'cms-export-secret-token'
  const url = 'https://cms.example.test/snapshot?signature=private-query'
  let output = ''
  await assert.rejects(
    syncCmsSnapshot({ url, token }),
    (error) => {
      output = publicErrorMessage(error)
      return error.code === 'NETWORK_FETCH_DISABLED'
    },
  )
  assert.doesNotMatch(output, new RegExp(token))
  assert.doesNotMatch(output, /private-query/)
})

test('decoded snapshot files must be fatal UTF-8, NUL-free, and LF-only', () => {
  const invalidFiles = [
    Buffer.from([0xc3, 0x28]),
    Buffer.from('# Prompt\0hidden\n'),
    Buffer.from('# Prompt\r\n'),
  ]
  const expectedCodes = ['INVALID_TEXT_ENCODING', 'INVALID_TEXT_FORMAT', 'INVALID_TEXT_FORMAT']

  for (let index = 0; index < invalidFiles.length; index += 1) {
    const envelope = makeEnvelope({
      sources: {
        'README.md': invalidFiles[index],
        'catalog.json': '{}\n',
        'content/site.json': '{}\n',
        'governance/content-rights.json': '{}\n',
      },
    })
    assert.throws(() => validateSnapshotEnvelope(envelope), { code: expectedCodes[index] })
  }
})

test('high-confidence credentials are rejected without echoing their values', () => {
  const credentials = [
    '-----BEGIN PRIVATE KEY-----\nnot-a-real-key\n-----END PRIVATE KEY-----',
    `github_pat_${'A'.repeat(64)}`,
    `sk-proj-${'a'.repeat(40)}`,
    `AKIA${'A'.repeat(16)}`,
    `Authorization: Bearer ${'b'.repeat(32)}`,
    `https://mirror-user:${'p'.repeat(24)}@cms.example.test/snapshot`,
  ]

  for (const credential of credentials) {
    const envelope = makeEnvelope({
      sources: {
        'README.md': `${credential}\n`,
        'catalog.json': '{}\n',
        'content/site.json': '{}\n',
        'governance/content-rights.json': '{}\n',
      },
    })
    let message
    try {
      validateSnapshotEnvelope(envelope)
      assert.fail('expected credential safety gate to fail')
    } catch (error) {
      assert.equal(error.code, 'SECRET_DETECTED')
      message = publicErrorMessage(error)
    }
    assert.doesNotMatch(message, new RegExp(credential.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  }
})

test('executable HTML and scriptable URLs are rejected', () => {
  for (const executable of [
    '<script>alert(1)</script>',
    '<iframe src="https://example.test"></iframe>',
    '<object data="payload"></object>',
    '<embed src="payload">',
    '<style>body{display:none}</style>',
    '<img src="x" onerror="alert(1)">',
    '[click](javascript:alert(1))',
    '<a href="data:text/html;base64,PHNjcmlwdD4=">click</a>',
    '&lt;script&gt;alert(1)&lt;/script&gt;',
    '[click](java&#x73;cript:alert(1))',
    '<a href="data&colon;text/html,unsafe">click</a>',
  ]) {
    const envelope = makeEnvelope({
      sources: {
        'README.md': `${executable}\n`,
        'catalog.json': '{}\n',
        'content/site.json': '{}\n',
        'governance/content-rights.json': '{}\n',
      },
    })
    assert.throws(() => validateSnapshotEnvelope(envelope), { code: 'UNSAFE_HTML' })
  }
})

test('content safety failures in snapshot files happen before any managed file is written', async (t) => {
  const cases = [
    ['SECRET_DETECTED', `Bearer ${'s'.repeat(32)}`],
    ['UNSAFE_HTML', '<script>privatePrompt()</script>'],
    ['INVALID_TEXT_FORMAT', '# Prompt\r\n'],
  ]
  const parent = await temporaryRoot(t)

  for (let index = 0; index < cases.length; index += 1) {
    const [expectedCode, unsafe] = cases[index]
    const root = path.join(parent, `case-${index}`)
    await mkdir(root)
    const envelope = makeEnvelope({
      exportRevision: `cmsrev_0000000${index + 2}`,
      sources: {
        'README.md': `${unsafe}\n`,
        'catalog.json': '{}\n',
        'content/site.json': '{}\n',
        'governance/content-rights.json': '{}\n',
      },
    })
    assert.throws(
      () => validateSnapshotEnvelope(envelope),
      (error) => error instanceof MirrorSyncError && error.code === expectedCode,
    )
    await assert.rejects(readFile(path.join(root, 'README.md')), { code: 'ENOENT' })
    await assert.rejects(readFile(path.join(root, 'mirror-manifest.json')), { code: 'ENOENT' })
  }
})

test('generated path helper allows mirror files and rejects control-plane paths', () => {
  for (const relative of [
    'README.md',
    'README_zh-CN.md',
    'catalog.json',
    'mirror-manifest.json',
    'content/prompts/prm_01jexample/en.md',
    'content/taxonomies/model/mdl_example/en.json',
    'content/site.json',
    'governance/content-rights.json',
    'governance/publication-audit.json',
    'locales/zh-CN/README.md',
    'locales/zh-CN/index.json',
    'locales/zh-CN/taxonomies.json',
  ]) assert.equal(isAllowedGeneratedPath(relative), true, relative)

  for (const relative of [
    '../README.md',
    '/README.md',
    '.github/workflows/sync.yml',
    '.gitmodules',
    'content/prompts/prm_01jexample/.gitkeep',
    'content/prompts/prm_01jexample/en.txt',
    'content/articles/art_example/en.md',
    'content/surfaces.json',
    'scripts/sync.mjs',
    'LICENSE',
    'locales/zh-CN/arbitrary.json',
    'content/private.json',
  ]) assert.equal(isAllowedGeneratedPath(relative), false, relative)

  for (const relative of [
    'content/README.md',
    'governance/README.md',
    'governance/rights-clearances.json',
  ]) {
    assert.equal(isAllowedGeneratedPath(relative), false, relative)
    assert.equal(isAllowedGeneratedChangePath(relative), true, relative)
  }
  assert.equal(isAllowedGeneratedChangePath('governance/rights-clearances-copy.json'), false)
})

test('mirror workflow isolates a repository deploy key on fresh runners and performs a normal CAS main push', async () => {
  const workflow = await readFile(path.join(repositoryRoot, '.github/workflows/sync-cms-snapshot.yml'), 'utf8')
  assert.match(workflow, /schedule:/)
  assert.match(workflow, /workflow_dispatch:/)
  assert.match(workflow, /repository_dispatch:/)
  assert.match(workflow, /cms-publication-approved/)
  assert.match(workflow, /cms-publication-takedown/)
  assert.match(workflow, /contents: read/)
  assert.doesNotMatch(workflow, /contents: write/)
  assert.match(workflow, /concurrency:/)
  assert.match(workflow, /\n  prepare:/)
  assert.match(workflow, /\n  push:/)
  assert.match(workflow, /\n  verify-pushed-main:/)
  assert.match(workflow, /persist-credentials: false/)
  assert.match(workflow, /actions\/checkout@11bd71901bbe5b1630ceea73d27597364c9af683/)
  assert.match(workflow, /actions\/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020/)
  assert.match(workflow, /actions\/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02/)
  assert.match(workflow, /actions\/download-artifact@d3f86a106a0bac45b974a628896c90dbdf5c8093/)
  assert.match(workflow, /--seen-revisions-stdin/)
  assert.match(workflow, /--verify-worktree/)
  assert.match(workflow, /--verify-git-index/)
  assert.match(workflow, /--verify-git-tree/)
  assert.match(workflow, /git bundle create/)
  assert.match(workflow, /git -c credential\.helper= -c core\.hooksPath=\/dev\/null push origin refs\/heads\/candidate:refs\/heads\/main/)
  assert.match(workflow, /MIRROR_DEPLOY_KEY: \$\{\{ secrets\.MIRROR_DEPLOY_KEY \}\}/)
  assert.equal((workflow.match(/secrets\.MIRROR_DEPLOY_KEY/g) ?? []).length, 1)
  assert.doesNotMatch(workflow, /MIRROR_PUSH_TOKEN|x-access-token|prompt-lab-git-askpass/)
  assert.doesNotMatch(workflow, /github\.token/)
  assert.match(workflow, /lookup\(host, \{ all: true, verbatim: true \}\)/)
  assert.match(workflow, /new BlockList\(\)/)
  assert.match(workflow, /denied\.check\(address/)
  assert.match(workflow, /prompt-lab-curl-resolve\.conf/)
  const fetchStep = workflow.slice(
    workflow.indexOf('- name: Fetch immutable CMS snapshot'),
    workflow.indexOf('- name: Validate and transactionally apply snapshot'),
  )
  assert.match(fetchStep, /CMS_SNAPSHOT_TOKEN/)
  assert.match(fetchStep, /CF_ACCESS_CLIENT_ID: \$\{\{ secrets\.CF_ACCESS_CLIENT_ID \}\}/)
  assert.match(fetchStep, /CF_ACCESS_CLIENT_SECRET: \$\{\{ secrets\.CF_ACCESS_CLIENT_SECRET \}\}/)
  assert.match(fetchStep, /if \[\[ -n "\$CF_ACCESS_CLIENT_ID" \|\| -n "\$CF_ACCESS_CLIENT_SECRET" \]\]; then/)
  assert.match(fetchStep, /test -n "\$CF_ACCESS_CLIENT_ID"/)
  assert.match(fetchStep, /test -n "\$CF_ACCESS_CLIENT_SECRET"/)
  assert.match(fetchStep, /\^\[a-f0-9\]\{32\}\\\.access\$/)
  assert.match(fetchStep, /\^\[a-f0-9\]\{64\}\$/)
  assert.match(fetchStep, /\^cfast_\[A-Za-z0-9\]\{48\}\$/)
  assert.match(fetchStep, /header = "CF-Access-Client-Id: %s"/)
  assert.match(fetchStep, /header = "CF-Access-Client-Secret: %s"/)
  assert.match(fetchStep, /curl --disable/)
  assert.doesNotMatch(fetchStep, /scripts\/sync-cms-snapshot|npm run/)
  const afterFetchStep = workflow.slice(workflow.indexOf('- name: Validate and transactionally apply snapshot'))
  assert.doesNotMatch(afterFetchStep, /CF_ACCESS_CLIENT_(?:ID|SECRET)/)
  const prepareJob = workflow.slice(workflow.indexOf('\n  prepare:'), workflow.indexOf('\n  push:'))
  assert.doesNotMatch(prepareJob, /MIRROR_DEPLOY_KEY/)
  const pushStep = workflow.slice(
    workflow.indexOf('- name: Verify inert bundle and compare-and-swap fast-forward main'),
    workflow.indexOf('\n  verify-pushed-main:'),
  )
  assert.match(pushStep, /MIRROR_DEPLOY_KEY/)
  assert.match(pushStep, /test "\$GITHUB_REPOSITORY" = 'ziyetsui\/prompt-lab'/)
  assert.match(pushStep, /git@github\.com:ziyetsui\/prompt-lab\.git/)
  assert.match(pushStep, /\/usr\/bin\/timeout 5 \/usr\/bin\/ssh-keygen -y/)
  assert.match(pushStep, /github\.com ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm0SdG6UOoqKLsabgH5C9okWi0dh2l9GKJl/)
  assert.match(pushStep, /SHA256:\+DiY3wvvV6TuJJhbpZisF\/zLDA0zPMSvHdkr4UvCOqU/)
  assert.match(pushStep, /StrictHostKeyChecking=yes/)
  assert.match(pushStep, /IdentitiesOnly=yes/)
  assert.match(pushStep, /BatchMode=yes/)
  assert.match(pushStep, /unset MIRROR_DEPLOY_KEY/)
  assert.doesNotMatch(pushStep, /ssh-keyscan/)
  assert.match(pushStep, /BASH_ENV: \/dev\/null/)
  assert.match(pushStep, /GIT_CONFIG_GLOBAL: \/dev\/null/)
  assert.match(pushStep, /PATH: \/usr\/bin:\/bin/)
  assert.match(pushStep, /\/usr\/bin\/python3 -I/)
  assert.match(pushStep, /candidate changed-path set is invalid/)
  assert.doesNotMatch(pushStep, /allowed = re\.compile\([^\n]*\\\.github/)
  assert.doesNotMatch(pushStep, /actions\/checkout|node scripts|npm run/)
  assert.doesNotMatch(workflow, /git push[^\n]*(?:--force|-f(?:\s|$))/)
  assert.doesNotMatch(workflow, /pull_request_target|create-pull-request/)
})

test('active validation workflow pins actions and delegates to repository-mode verification', async () => {
  const workflow = await readFile(path.join(repositoryRoot, '.github/workflows/validate.yml'), 'utf8')
  assert.match(workflow, /actions\/checkout@11bd71901bbe5b1630ceea73d27597364c9af683/)
  assert.match(workflow, /actions\/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020/)
  assert.match(workflow, /persist-credentials: false/)
  assert.match(workflow, /npm run verify/)
  assert.doesNotMatch(workflow, /catalog\.mjs (?:validate|check)/)
})
