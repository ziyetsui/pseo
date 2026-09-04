import assert from 'node:assert/strict'
import { cp, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import {
  buildStaticContent,
  ContentValidationError,
  repositoryRoot,
  validateContent,
} from '../lib/content-pipeline.mjs'
import { validateJsonSchema } from '../lib/json-schema.mjs'

async function temporaryRoot(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'pseo-content-test-'))
  t.after(() => rm(root, { force: true, recursive: true }))
  return root
}

async function fixture(t) {
  const root = await temporaryRoot(t)
  await Promise.all([
    cp(path.join(repositoryRoot, 'content'), path.join(root, 'content'), { recursive: true }),
    cp(path.join(repositoryRoot, 'schemas'), path.join(root, 'schemas'), { recursive: true }),
  ])
  return {
    contentRoot: path.join(root, 'content'),
    root,
    schemaRoot: path.join(root, 'schemas'),
  }
}

async function files(root, prefix = '') {
  const result = new Map()
  const entries = await readdir(root, { withFileTypes: true })
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name, 'en'))) {
    const relative = prefix === '' ? entry.name : `${prefix}/${entry.name}`
    if (entry.isDirectory()) {
      for (const [nested, bytes] of await files(path.join(root, entry.name), relative)) result.set(nested, bytes)
    } else if (entry.isFile()) result.set(relative, await readFile(path.join(root, entry.name)))
  }
  return result
}

async function diagnosticCodes(promise) {
  try {
    await promise
    assert.fail('validation unexpectedly succeeded')
  } catch (error) {
    assert.ok(error instanceof ContentValidationError)
    return error.diagnostics.map((item) => item.code)
  }
}

test('supported locales are independent and only the configured locale is published', async () => {
  const result = await validateContent()
  assert.equal(result.documents.length, 2)
  assert.deepEqual(
    result.documents.map((document) => document.frontmatter.locale).sort(),
    ['en', 'zh-CN'],
  )
  assert.equal(new Set(result.documents.map((document) => document.frontmatter.id)).size, 1)
  assert.equal(new Set(result.documents.map((document) => document.frontmatter.prompt.text)).size, 1)
  assert.deepEqual(result.site.locales, ['en', 'zh-CN'])
  assert.deepEqual(result.site.publishedLocales, ['zh-CN'])
  assert.equal(result.site.defaultLocale, 'zh-CN')
  assert.equal(result.documents.find((document) => document.frontmatter.locale === 'en').frontmatter.status, 'draft')
  const published = result.documents.find((document) => document.frontmatter.locale === 'zh-CN').frontmatter
  assert.deepEqual(published.media, [])
  assert.deepEqual(published.examples, [])
  assert.equal(published.creator, null)
  assert.deepEqual(published.relatedPromptIds, [])
  assert.deepEqual(
    ['likes', 'bookmarks', 'comments', 'reposts', 'views'].map((field) => published.metrics[field]),
    [null, null, null, null, null],
  )
  assert.deepEqual(published.actions, { canCopy: true, tryUrl: null })
  assert.equal(result.taxonomies.length, 4)
  assert.deepEqual(
    result.taxonomies
      .filter((record) => record.value.status === 'published')
      .map((record) => [record.value.id, record.value.locale]),
    [
      ['cty_image', 'zh-CN'],
      ['mdl_nano_banana_pro', 'zh-CN'],
    ],
  )
  assert.ok(result.taxonomies.filter((record) => record.value.locale === 'en').every((record) => record.value.status === 'draft'))
  assert.deepEqual(result.surfaces.map((surface) => surface.level), ['L1', 'L2', 'L3', 'L4'])
  assert.ok(result.surfaces.every((surface) => surface.locale === 'zh-CN' && surface.robots === 'noindex,nofollow'))
})

test('draft Prompt and taxonomy records may keep publication.publishedAt null', async (t) => {
  const paths = await fixture(t)
  const schema = JSON.parse(await readFile(path.join(paths.schemaRoot, 'content.schema.json'), 'utf8'))
  const publicationSchema = schema.$defs.publication
  assert.deepEqual(validateJsonSchema(publicationSchema, {
    publishedAt: null,
    updatedAt: '2026-09-03T00:00:00Z',
    sourceRevision: `sha256:${'0'.repeat(64)}`,
  }), [])
  const taxonomySchema = JSON.parse(await readFile(path.join(paths.schemaRoot, 'taxonomy.schema.json'), 'utf8'))
  const taxonomyPublicationSchema = {
    ...taxonomySchema.properties.publication,
    $defs: taxonomySchema.$defs,
  }
  assert.deepEqual(validateJsonSchema(taxonomyPublicationSchema, {
    publishedAt: null,
    updatedAt: '2026-09-03T00:00:00Z',
    sourceRevision: `sha256:${'0'.repeat(64)}`,
  }), [])
})

test('taxonomy sourceRef accepts only wireframes or owner evidence issues', async () => {
  const schema = JSON.parse(await readFile(path.join(repositoryRoot, 'schemas/taxonomy.schema.json'), 'utf8'))
  const sourceRefSchema = schema.properties.sourceRef
  for (const sourceRef of [
    'docs/wireframes/flow-proto.html#l2',
    'docs/wireframes/flow-proto.html#l3',
    'https://github.com/ziyetsui/prompt-lab/issues/1',
    'https://github.com/ziyetsui/prompt-lab/issues/987654',
  ]) {
    assert.deepEqual(validateJsonSchema(sourceRefSchema, sourceRef), [], sourceRef)
  }
  for (const sourceRef of [
    'https://example.com/ziyetsui/prompt-lab/issues/1',
    'https://github.com/another-owner/prompt-lab/issues/1',
    'https://github.com/ziyetsui/another-repo/issues/1',
    'https://github.com/ziyetsui/prompt-lab/issues/../1',
    'https://github.com/ziyetsui/prompt-lab/issues/0',
    'https://github.com/ziyetsui/prompt-lab/issues/01',
    'https://github.com/ziyetsui/prompt-lab/issues/-1',
    'https://github.com/ziyetsui/prompt-lab/issues/1?draft=true',
  ]) {
    assert.ok(validateJsonSchema(sourceRefSchema, sourceRef).some((error) => error.keyword === 'pattern'), sourceRef)
  }
})

test('static indexes, feeds, and sitemap are deterministic and reciprocal', async (t) => {
  const root = await temporaryRoot(t)
  const first = path.join(root, 'first')
  const second = path.join(root, 'second')
  const firstBuild = await buildStaticContent({ outputRoot: first })
  const secondBuild = await buildStaticContent({ outputRoot: second })
  assert.equal(firstBuild.contentRevision, secondBuild.contentRevision)

  const firstFiles = await files(first)
  const secondFiles = await files(second)
  assert.deepEqual([...firstFiles.keys()], [...secondFiles.keys()])
  for (const [relative, bytes] of firstFiles) assert.ok(bytes.equals(secondFiles.get(relative)), relative)

  assert.equal(firstFiles.has('en/prompts/index.json'), false)
  assert.equal(firstFiles.has('en/prompts/rss.xml'), false)
  const index = JSON.parse(firstFiles.get('zh-CN/prompts/index.json').toString('utf8'))
  assert.equal(index.total, 1)
  assert.deepEqual(index.items[0].localeVariants.map((variant) => variant.locale), ['zh-CN'])
  assert.doesNotMatch(firstFiles.get('zh-CN/prompts/rss.xml').toString('utf8'), /<item>/)
  const sitemap = firstFiles.get('sitemap.xml').toString('utf8')
  assert.doesNotMatch(sitemap, /<url>/)
  assert.doesNotMatch(sitemap, /hreflang="en"/)
  assert.doesNotMatch(sitemap, /\/en\/prompts/)
  assert.equal(firstFiles.get('robots.txt').toString('utf8'), 'User-agent: *\nDisallow: /\n')
  const taxonomyIndex = JSON.parse(firstFiles.get('zh-CN/taxonomies/index.json').toString('utf8'))
  assert.equal(taxonomyIndex.total, 2)
  assert.deepEqual(
    taxonomyIndex.items.map((item) => [item.id, item.memberCount, item.memberIds]),
    [
      ['cty_image', 1, ['prm_2063814043631280180']],
      ['mdl_nano_banana_pro', 0, []],
    ],
  )
  const routeManifest = JSON.parse(firstFiles.get('route-manifest.json').toString('utf8'))
  assert.deepEqual(routeManifest.publishedLocales, ['zh-CN'])
  assert.deepEqual(routeManifest.routes.map((route) => route.path), [
    '/zh-CN/prompts',
    '/zh-CN/prompts/image',
    '/zh-CN/prompts/models/nano-banana-pro',
    '/zh-CN/prompts/country-miniature-stamp-poster',
  ])
  assert.deepEqual(routeManifest.routes.map((route) => route.kind), [
    'prompt-hub',
    'content-type-gallery',
    'model-detail',
    'prompt-detail',
  ])
})

test('taxonomy locale, slug, and route drift fail closed', async (t) => {
  const paths = await fixture(t)
  const taxonomyPath = path.join(paths.contentRoot, 'taxonomies/content-type/cty_image/zh-CN.json')
  const taxonomy = JSON.parse(await readFile(taxonomyPath, 'utf8'))
  taxonomy.locale = 'en'
  taxonomy.slug = 'video'
  taxonomy.surface.path = '/zh-CN/prompts/video'
  await writeFile(taxonomyPath, `${JSON.stringify(taxonomy, null, 2)}\n`)
  const codes = await diagnosticCodes(validateContent(paths))
  assert.ok(codes.includes('taxonomy_path_mismatch'))
  assert.ok(codes.includes('taxonomy_surface_mismatch'))
  assert.ok(codes.includes('surface_target_missing'))
})

test('surface targets and complete L1-L4 coverage fail closed', async (t) => {
  const paths = await fixture(t)
  const surfacesPath = path.join(paths.contentRoot, 'surfaces.json')
  const contract = JSON.parse(await readFile(surfacesPath, 'utf8'))
  contract.surfaces = contract.surfaces
    .filter((surface) => surface.level !== 'L3')
    .map((surface) => surface.level === 'L2' ? { ...surface, targetId: 'cty_missing' } : surface)
  await writeFile(surfacesPath, `${JSON.stringify(contract, null, 2)}\n`)
  const codes = await diagnosticCodes(validateContent(paths))
  assert.ok(codes.includes('schema:minItems'))
  assert.ok(codes.includes('surface_target_missing'))
  assert.ok(codes.includes('surface_level_missing'))
  assert.ok(codes.includes('published_taxonomy_surface_missing'))
})

test('a missing published locale fails closed', async (t) => {
  const paths = await fixture(t)
  await rm(path.join(paths.contentRoot, 'prompts/prm_2063814043631280180/zh-CN.md'))
  const enPath = path.join(paths.contentRoot, 'prompts/prm_2063814043631280180/en.md')
  const source = await readFile(enPath, 'utf8')
  await writeFile(
    enPath,
    source
      .replace('"status": "draft",', '"status": "published",')
      .replace('"indexable": false,', '"indexable": true,')
      .replace('"robots": "noindex,nofollow"', '"robots": "index,follow"')
      .replace('"status": "draft",\n    "translatedFromRevision": null,\n    "reviewer": null', '"status": "ready",\n    "translatedFromRevision": null,\n    "reviewer": "reviewer"'),
  )
  const codes = await diagnosticCodes(validateContent(paths))
  assert.ok(codes.includes('published_locale_set'))
  assert.ok(codes.includes('locale_not_published'))
})

test('a removal snapshot may contain zero public Prompts while preserving safe locale outputs', async (t) => {
  const paths = await fixture(t)
  await rm(path.join(paths.contentRoot, 'prompts'), { force: true, recursive: true })
  await rm(path.join(paths.contentRoot, 'articles'), { force: true, recursive: true })
  await rm(path.join(paths.contentRoot, 'taxonomies'), { force: true, recursive: true })

  const validated = await validateContent(paths)
  assert.equal(validated.documents.length, 0)
  assert.equal(validated.taxonomies.length, 0)
  assert.deepEqual(validated.site.publishedLocales, ['zh-CN'])
  assert.deepEqual(validated.surfaces.map((surface) => surface.level), ['L1'])

  const outputRoot = path.join(paths.root, 'generated')
  const manifest = await buildStaticContent({ ...paths, outputRoot })
  assert.deepEqual(manifest.publishedLocales, ['zh-CN'])
  assert.deepEqual(manifest.counts, { 'zh-CN': 0 })
  assert.deepEqual(
    JSON.parse(await readFile(path.join(outputRoot, 'zh-CN/prompts/index.json'), 'utf8')).items,
    [],
  )
  assert.deepEqual(
    JSON.parse(await readFile(path.join(outputRoot, 'zh-CN/taxonomies/index.json'), 'utf8')).items,
    [],
  )
  assert.doesNotMatch(await readFile(path.join(outputRoot, 'zh-CN/prompts/rss.xml'), 'utf8'), /<item>/)
  assert.doesNotMatch(await readFile(path.join(outputRoot, 'sitemap.xml'), 'utf8'), /\/prompts\//)
  assert.equal(await readFile(path.join(outputRoot, 'robots.txt'), 'utf8'), 'User-agent: *\nDisallow: /\n')
  const routeManifest = JSON.parse(await readFile(path.join(outputRoot, 'route-manifest.json'), 'utf8'))
  assert.deepEqual(routeManifest.publishedLocales, ['zh-CN'])
  assert.deepEqual(routeManifest.routes.map((route) => route.kind), ['prompt-hub'])
})

test('Prompt body drift and stale translation are rejected', async (t) => {
  const paths = await fixture(t)
  const zhPath = path.join(paths.contentRoot, 'prompts/prm_2063814043631280180/zh-CN.md')
  const source = await readFile(zhPath, 'utf8')
  await writeFile(
    zhPath,
    source
      .replace('highly detailed miniature art.\n```', 'highly detailed miniature artwork.\n```')
      .replace(/"translatedFromRevision": "sha256:[a-f0-9]{64}"/, `"translatedFromRevision": "sha256:${'0'.repeat(64)}"`),
  )
  const codes = await diagnosticCodes(validateContent(paths))
  assert.ok(codes.includes('prompt_body_drift'))
  assert.ok(codes.includes('stale_translation'))
})

test('editing the source locale requires a new content hash and translation review', async (t) => {
  const paths = await fixture(t)
  const enPath = path.join(paths.contentRoot, 'prompts/prm_2063814043631280180/en.md')
  const source = await readFile(enPath, 'utf8')
  await writeFile(enPath, source.replace('Use one country name', 'Use a single country name'))
  const codes = await diagnosticCodes(validateContent(paths))
  assert.ok(codes.includes('source_revision_mismatch'))
})

test('unknown fields, duplicate localized slugs, and broken links are rejected', async (t) => {
  const paths = await fixture(t)
  const sourceDirectory = path.join(paths.contentRoot, 'prompts/prm_2063814043631280180')
  const duplicateDirectory = path.join(paths.contentRoot, 'prompts/prm_duplicate0001')
  await cp(sourceDirectory, duplicateDirectory, { recursive: true })
  for (const locale of ['en', 'zh-CN']) {
    const file = path.join(duplicateDirectory, `${locale}.md`)
    const source = await readFile(file, 'utf8')
    await writeFile(
      file,
      source
        .replaceAll('prm_2063814043631280180', 'prm_duplicate0001')
        .replace('"schemaVersion": 1,', '"schemaVersion": 1,\n  "unexpected": true,')
        .replace(/\n$/, '\n\n[Broken](/en/prompts/not-published)\n'),
    )
  }
  const codes = await diagnosticCodes(validateContent(paths))
  assert.ok(codes.includes('schema:additionalProperties'))
  assert.ok(codes.includes('locale_value_conflict'))
  assert.ok(codes.includes('broken_internal_link'))
})
