import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { cp, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import {
  buildStaticContent,
  ContentValidationError,
  parseMarkdown,
  repositoryRoot,
  validateContent,
} from '../lib/content-pipeline.mjs'

const ARTICLE_ID = 'art_how_to_replace_prompt_variables'
const PUBLISHED_ARTICLE_ID = 'art_published_contract_fixture'

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]))
  }
  return value
}

function recordRevision(value, body = '') {
  const record = structuredClone(value)
  delete record.translation
  if (record.publication) delete record.publication.sourceRevision
  const hash = createHash('sha256')
  hash.update(JSON.stringify(canonical(record)))
  hash.update('\0')
  hash.update(body)
  return `sha256:${hash.digest('hex')}`
}

async function temporaryRoot(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'pseo-article-test-'))
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

async function readDocument(file) {
  return parseMarkdown(await readFile(file, 'utf8'), file)
}

async function writeDocument(file, frontmatter, body) {
  await writeFile(file, `---\n${JSON.stringify(frontmatter, null, 2)}\n---\n\n${body.trim()}\n`)
}

async function publishTaxonomy(file) {
  const data = JSON.parse(await readFile(file, 'utf8'))
  data.status = 'published'
  data.indexable = data.axis === 'article-category'
  data.fixture = false
  data.seo.robots = data.indexable ? 'index,follow' : 'noindex,nofollow'
  data.publication.publishedAt = '2026-09-03T00:00:00Z'
  data.publication.updatedAt = '2026-09-03T00:00:00Z'
  data.translation = { reviewer: 'test-reviewer', status: 'ready', translatedFromRevision: null }
  data.publication.sourceRevision = recordRevision(data)
  await writeFile(file, `${JSON.stringify(data, null, 2)}\n`)
}

async function publishReferencedTaxonomies(paths, data) {
  const taxonomyIDs = [data.authorId, ...data.categoryIds, ...data.tags]
  const taxonomyFiles = await files(path.join(paths.contentRoot, 'taxonomies'))
  for (const [relative] of taxonomyFiles) {
    if (taxonomyIDs.some((taxonomyID) => relative.includes(`/${taxonomyID}/`))) {
      await publishTaxonomy(path.join(paths.contentRoot, 'taxonomies', ...relative.split('/')))
    }
  }
}

async function publishArticle(paths, id = ARTICLE_ID) {
  const file = path.join(paths.contentRoot, 'articles', id, 'zh-CN.md')
  const document = await readDocument(file)
  const data = structuredClone(document.frontmatter)
  data.status = 'published'
  data.indexable = true
  data.provenance.fixture = false
  data.provenance.sourceRef = null
  data.seo.robots = 'index,follow'
  data.publication.publishedAt = '2026-09-03T00:00:00Z'
  data.publication.updatedAt = '2026-09-03T00:00:00Z'
  data.translation = { reviewer: 'test-reviewer', status: 'ready', translatedFromRevision: null }
  data.publication.sourceRevision = recordRevision(data, document.body)
  await writeDocument(file, data, document.body)

  await publishReferencedTaxonomies(paths, data)
  return file
}

async function installPublishedArticleFixture(paths) {
  const source = path.join(repositoryRoot, 'infra/tests/fixtures/article-published', PUBLISHED_ARTICLE_ID)
  const destination = path.join(paths.contentRoot, 'articles', PUBLISHED_ARTICLE_ID)
  await cp(source, destination, { recursive: true })
  const file = path.join(destination, 'zh-CN.md')
  const document = await readDocument(file)
  await publishReferencedTaxonomies(paths, document.frontmatter)
  return file
}

test('validates the three honest fixture Articles as draft/noindex and excludes them from every public surface', async (t) => {
  const result = await validateContent()
  assert.equal(result.articleDocuments.length, 3)
  assert.ok(result.articleDocuments.every((document) => document.frontmatter.status === 'draft'))
  assert.ok(result.articleDocuments.every((document) => document.frontmatter.indexable === false))
  assert.ok(result.articleDocuments.every((document) => document.frontmatter.provenance.fixture === true))
  assert.equal(result.articleTaxonomies.length, 4)

  const outputRoot = path.join(await temporaryRoot(t), 'static')
  await buildStaticContent({ outputRoot })
  const output = await files(outputRoot)
  const articleIndex = JSON.parse(output.get('zh-CN/articles/index.json').toString('utf8'))
  assert.deepEqual(Object.keys(articleIndex).sort(), ['data', 'facets', 'meta', 'page'])
  assert.equal(articleIndex.page.total, 0)
  assert.deepEqual(articleIndex.data, [])
  assert.equal(articleIndex.meta.contentRevision, result.contentRevision)
  assert.equal(articleIndex.meta.indexVersion, result.contentRevision)
  assert.equal(articleIndex.meta.rankingVersion, 'article-newest-v1')
  assert.doesNotMatch(output.get('zh-CN/blog/rss.xml').toString('utf8'), /<item>/)
  assert.doesNotMatch(output.get('sitemap.xml').toString('utf8'), /how-to-replace-prompt-variables/)
  const routeManifest = JSON.parse(output.get('route-manifest.json').toString('utf8'))
  assert.ok(routeManifest.routes.every((route) => !route.path.includes('/blog')))
  const buildManifest = JSON.parse(output.get('build-manifest.json').toString('utf8'))
  assert.deepEqual(Object.keys(buildManifest).sort(), [
    'contentRevision',
    'counts',
    'files',
    'publishedLocales',
    'schemaVersion',
    'supportedLocales',
  ])

  const legacy = await fixture(t)
  await Promise.all([
    rm(path.join(legacy.contentRoot, 'articles'), { recursive: true }),
    rm(path.join(legacy.contentRoot, 'taxonomies/article-author'), { recursive: true }),
    rm(path.join(legacy.contentRoot, 'taxonomies/article-category'), { recursive: true }),
    rm(path.join(legacy.schemaRoot, 'article.schema.json')),
  ])
  const promptOnly = await validateContent(legacy)
  assert.deepEqual(promptOnly.articleDocuments, [])
  assert.deepEqual(promptOnly.articleTaxonomies, [])
})

test('a reviewed published Article produces complete derived Blog projections without declared counts', async (t) => {
  const paths = await fixture(t)
  const publishedFile = await installPublishedArticleFixture(paths)
  const publishedDocument = await readDocument(publishedFile)
  publishedDocument.body += [
    '',
    '## 安全 Markdown 投影',
    '',
    '- **加粗列表项**',
    '- *斜体列表项*',
    '',
    '1. 第一项',
    '2. 第二项',
    '',
    '> 这是引用。',
    '',
    '#### 深层标题',
    '',
    '```text',
    '<fixture-safe>',
    '```',
    '',
    '![示例图](https://example.com/article-fixture.png)',
  ].join('\n')
  publishedDocument.frontmatter.publication.sourceRevision = recordRevision(
    publishedDocument.frontmatter,
    publishedDocument.body,
  )
  await writeDocument(publishedFile, publishedDocument.frontmatter, publishedDocument.body)
  const validated = await validateContent(paths)
  assert.equal(validated.articleDocuments.filter((document) => document.frontmatter.status === 'published').length, 1)

  const outputRoot = path.join(paths.root, 'static')
  await buildStaticContent({ ...paths, outputRoot })
  const index = JSON.parse(await readFile(path.join(outputRoot, 'zh-CN/articles/index.json'), 'utf8'))
  assert.equal(index.page.total, 1)
  assert.equal(index.data[0].id, PUBLISHED_ARTICLE_ID)
  assert.equal(index.data[0].href, '/zh-CN/blog/published-contract-fixture')
  assert.equal(index.data[0].author.id, 'ata_fixture_editor')
  assert.equal(index.data[0].category.id, 'atc_guides')
  assert.ok(index.data[0].readingTimeMinutes >= 1)
  assert.deepEqual(index.facets.categories.map((item) => [item.id, item.count]), [['atc_guides', 1]])
  assert.deepEqual(index.page, { hasMore: false, limit: 1, nextCursor: null, total: 1 })
  assert.equal(typeof index.meta.requestId, 'string')

  const detail = JSON.parse(
    await readFile(path.join(outputRoot, 'zh-CN/articles/by-slug/published-contract-fixture.json'), 'utf8'),
  )
  assert.equal(detail.summary.id, PUBLISHED_ARTICLE_ID)
  assert.match(detail.bodyHtml, /<p>/)
  assert.match(detail.bodyHtml, /<ul>[\s\S]*<strong>加粗列表项<\/strong>/)
  assert.match(detail.bodyHtml, /<ol>[\s\S]*第一项/)
  assert.match(detail.bodyHtml, /<blockquote><p>这是引用。<\/p><\/blockquote>/)
  assert.match(detail.bodyHtml, /<h4 id="深层标题">/)
  assert.match(detail.bodyHtml, /<pre><code class="language-text">&lt;fixture-safe&gt;<\/code><\/pre>/)
  assert.match(detail.bodyHtml, /<img src="https:\/\/example\.com\/article-fixture\.png" alt="示例图" loading="lazy">/)
  assert.deepEqual(detail.related, [])
  assert.equal(detail.citations[0].url, '/zh-CN/prompts')

  const category = JSON.parse(await readFile(path.join(outputRoot, 'zh-CN/article-categories/guides.json'), 'utf8'))
  assert.equal(category.entity.articleCount, 1)
  assert.equal(category.page.total, 1)
  assert.equal(category.items[0].id, PUBLISHED_ARTICLE_ID)
  assert.match(await readFile(path.join(outputRoot, 'zh-CN/blog/rss.xml'), 'utf8'), /<item>/)
  assert.match(await readFile(path.join(outputRoot, 'sitemap.xml'), 'utf8'), /\/zh-CN\/blog\/published-contract-fixture/)
  const routes = JSON.parse(await readFile(path.join(outputRoot, 'route-manifest.json'), 'utf8')).routes
  assert.ok(routes.some((route) => route.kind === 'blog-index' && route.path === '/zh-CN/blog'))
  assert.ok(routes.some((route) => route.kind === 'article-detail' && route.path.endsWith('/published-contract-fixture')))
  assert.ok(routes.some((route) => route.kind === 'article-category' && route.path.endsWith('/category/guides')))
})

test('missing and stale Article translations fail the publication gate instead of falling back', async (t) => {
  const missing = await fixture(t)
  const missingFile = await publishArticle(missing)
  const missingDocument = await readDocument(missingFile)
  missingDocument.frontmatter.translation = {
    reviewer: null,
    status: 'missing',
    translatedFromRevision: null,
  }
  await writeDocument(missingFile, missingDocument.frontmatter, missingDocument.body)
  const missingCodes = await diagnosticCodes(validateContent(missing))
  assert.ok(missingCodes.includes('article_locale_not_ready'))

  const stale = await fixture(t)
  const zhFile = await publishArticle(stale)
  const zhDocument = await readDocument(zhFile)
  const enFile = path.join(stale.contentRoot, 'articles', ARTICLE_ID, 'en.md')
  const enData = structuredClone(zhDocument.frontmatter)
  enData.locale = 'en'
  enData.sourceLocale = 'en'
  enData.slug = 'source-locale-article'
  enData.title = 'Source locale Article fixture'
  enData.summary = 'A source-locale test record used only to prove stale translation gates.'
  enData.status = 'draft'
  enData.indexable = false
  enData.seo = {
    canonical: 'https://ancher.space/en/blog/source-locale-article',
    description: 'A source-locale test record used only for revision validation.',
    robots: 'noindex,nofollow',
    title: 'Source locale Article fixture',
  }
  enData.publication = {
    publishedAt: null,
    sourceRevision: null,
    updatedAt: '2026-09-03T00:00:00Z',
  }
  enData.translation = { reviewer: null, status: 'draft', translatedFromRevision: null }
  const enBody = zhDocument.body.replace(/^# .*$/m, '# Source locale Article fixture')
  enData.publication.sourceRevision = recordRevision(enData, enBody)
  await writeDocument(enFile, enData, enBody)

  zhDocument.frontmatter.sourceLocale = 'en'
  zhDocument.frontmatter.publication.sourceRevision = enData.publication.sourceRevision
  zhDocument.frontmatter.translation = {
    reviewer: 'test-reviewer',
    status: 'ready',
    translatedFromRevision: `sha256:${'0'.repeat(64)}`,
  }
  await writeDocument(zhFile, zhDocument.frontmatter, zhDocument.body)
  const staleCodes = await diagnosticCodes(validateContent(stale))
  assert.ok(staleCodes.includes('article_stale_translation'))
})

test('Article immutable paths, localized slugs, Markdown links, and citations fail closed', async (t) => {
  const paths = await fixture(t)
  const sourceDirectory = path.join(paths.contentRoot, 'articles', ARTICLE_ID)
  const duplicateID = 'art_duplicate_article_fixture'
  const duplicateDirectory = path.join(paths.contentRoot, 'articles', duplicateID)
  await cp(sourceDirectory, duplicateDirectory, { recursive: true })
  const duplicateFile = path.join(duplicateDirectory, 'zh-CN.md')
  const duplicate = await readDocument(duplicateFile)
  duplicate.frontmatter.id = duplicateID
  duplicate.frontmatter.unexpected = true
  delete duplicate.frontmatter.categoryIds
  duplicate.frontmatter.status = 'published'
  duplicate.frontmatter.indexable = true
  duplicate.frontmatter.provenance.fixture = false
  duplicate.frontmatter.provenance.sourceRef = 'frontend/../.env'
  duplicate.frontmatter.seo.robots = 'index,follow'
  duplicate.frontmatter.publication.publishedAt = '2026-08-20T00:00:00Z'
  duplicate.frontmatter.translation = { reviewer: 'test-reviewer', status: 'ready', translatedFromRevision: null }
  duplicate.frontmatter.citations[0].url = 'javascript:alert(1)'
  duplicate.body += [
    '',
    '[Broken Article](/zh-CN/blog/not-published)',
    '',
    '![Unsafe](javascript:alert(1))',
    '',
    '![Protocol relative](//evil.example/fixture.png)',
  ].join('\n')
  await writeDocument(duplicateFile, duplicate.frontmatter, duplicate.body)

  const originalFile = path.join(sourceDirectory, 'zh-CN.md')
  const original = await readDocument(originalFile)
  original.frontmatter.id = 'art_path_does_not_match'
  await writeDocument(originalFile, original.frontmatter, original.body)

  const localeID = 'art_locale_path_fixture'
  const localeDirectory = path.join(paths.contentRoot, 'articles', localeID)
  await cp(sourceDirectory, localeDirectory, { recursive: true })
  const localeFile = path.join(localeDirectory, 'zh-CN.md')
  const localeDocument = await readDocument(localeFile)
  localeDocument.frontmatter.id = localeID
  localeDocument.frontmatter.locale = 'en'
  localeDocument.frontmatter.slug = 'locale-path-fixture'
  localeDocument.frontmatter.seo.canonical = 'https://ancher.space/en/blog/locale-path-fixture'
  await writeDocument(localeFile, localeDocument.frontmatter, localeDocument.body)

  const codes = await diagnosticCodes(validateContent(paths))
  assert.ok(codes.includes('article_schema:additionalProperties'))
  assert.ok(codes.includes('article_schema:required'))
  assert.ok(codes.includes('article_id_path_mismatch'))
  assert.ok(codes.includes('article_locale_path_mismatch'))
  assert.ok(codes.includes('article_slug_conflict'))
  assert.ok(codes.includes('article_provenance_path'))
  assert.ok(codes.includes('article_unsafe_citation'))
  assert.equal(codes.filter((code) => code === 'article_unsafe_image').length, 2)
  assert.ok(codes.includes('article_broken_internal_link'))
})

test('published Article projections rebuild byte-for-byte deterministically', async (t) => {
  const paths = await fixture(t)
  await installPublishedArticleFixture(paths)
  const firstRoot = path.join(paths.root, 'first')
  const secondRoot = path.join(paths.root, 'second')
  const first = await buildStaticContent({ ...paths, outputRoot: firstRoot })
  const second = await buildStaticContent({ ...paths, outputRoot: secondRoot })
  assert.equal(first.contentRevision, second.contentRevision)
  const firstFiles = await files(firstRoot)
  const secondFiles = await files(secondRoot)
  assert.deepEqual([...firstFiles.keys()], [...secondFiles.keys()])
  for (const [relative, bytes] of firstFiles) assert.ok(bytes.equals(secondFiles.get(relative)), relative)
})
