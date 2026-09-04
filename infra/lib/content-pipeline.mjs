import { createHash } from 'node:crypto'
import { cp, mkdir, mkdtemp, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { validateJsonSchema } from './json-schema.mjs'

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const safeTokenPattern = /\[[A-Z][A-Z0-9_]{1,39}\]/g

export class ContentValidationError extends Error {
  constructor(diagnostics) {
    super(`${diagnostics.length} content validation error(s)`)
    this.diagnostics = diagnostics
  }
}

function digest(bytes) {
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`
}

function compareUtf8Binary(left, right) {
  return Buffer.compare(Buffer.from(left, 'utf8'), Buffer.from(right, 'utf8'))
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]))
  }
  return value
}

function jsonBytes(value) {
  return Buffer.from(`${JSON.stringify(canonical(value), null, 2)}\n`)
}

function relativeFromRoot(target) {
  const relative = path.relative(repositoryRoot, target)
  return relative === '' ? '.' : relative.split(path.sep).join('/')
}

function diagnostic(file, code, message) {
  return { file: relativeFromRoot(file), code, message }
}

async function readJson(file) {
  const bytes = await readFile(file)
  return { bytes, value: JSON.parse(bytes.toString('utf8')) }
}

async function regularFile(file, label) {
  const entry = await stat(file)
  if (!entry.isFile()) throw new Error(`${label} must be a regular file`)
}

async function promptFiles(contentRoot) {
  const root = path.join(contentRoot, 'prompts')
  const result = []
  let ids
  try {
    ids = await readdir(root, { withFileTypes: true })
  } catch (error) {
    if (error.code === 'ENOENT') return result
    throw error
  }
  for (const id of ids.sort((left, right) => left.name.localeCompare(right.name, 'en'))) {
    if (id.isSymbolicLink()) throw new Error(`Symlink is forbidden in content/prompts: ${id.name}`)
    if (!id.isDirectory()) throw new Error(`Only canonical ID directories are allowed in content/prompts: ${id.name}`)
    const directory = path.join(root, id.name)
    const locales = await readdir(directory, { withFileTypes: true })
    for (const locale of locales.sort((left, right) => left.name.localeCompare(right.name, 'en'))) {
      if (locale.isSymbolicLink()) throw new Error(`Symlink is forbidden in ${relativeFromRoot(directory)}`)
      if (!locale.isFile() || !locale.name.endsWith('.md')) {
        throw new Error(`Only locale Markdown files are allowed in ${relativeFromRoot(directory)}: ${locale.name}`)
      }
      result.push(path.join(directory, locale.name))
    }
  }
  return result
}

async function articleFiles(contentRoot) {
  const root = path.join(contentRoot, 'articles')
  const result = []
  let ids
  try {
    ids = await readdir(root, { withFileTypes: true })
  } catch (error) {
    if (error.code === 'ENOENT') return result
    throw error
  }
  for (const id of ids.sort((left, right) => left.name.localeCompare(right.name, 'en'))) {
    if (id.isSymbolicLink()) throw new Error(`Symlink is forbidden in content/articles: ${id.name}`)
    if (!id.isDirectory() || !/^art_[a-z0-9_]{8,64}$/.test(id.name)) {
      throw new Error(`Only immutable Article ID directories are allowed in content/articles: ${id.name}`)
    }
    const directory = path.join(root, id.name)
    const locales = await readdir(directory, { withFileTypes: true })
    for (const locale of locales.sort((left, right) => left.name.localeCompare(right.name, 'en'))) {
      if (locale.isSymbolicLink()) throw new Error(`Symlink is forbidden in ${relativeFromRoot(directory)}`)
      if (!locale.isFile() || !locale.name.endsWith('.md')) {
        throw new Error(`Only locale Markdown files are allowed in ${relativeFromRoot(directory)}: ${locale.name}`)
      }
      result.push(path.join(directory, locale.name))
    }
  }
  return result
}

async function taxonomyFileGroups(contentRoot) {
  const root = path.join(contentRoot, 'taxonomies')
  const result = { article: [], prompt: [] }
  const promptAxes = new Set(['content-type', 'model'])
  const articleAxes = new Set(['article-author', 'article-category', 'article-tag'])
  let axes
  try {
    axes = await readdir(root, { withFileTypes: true })
  } catch (error) {
    if (error.code === 'ENOENT') return result
    throw error
  }
  for (const axis of axes.sort((left, right) => left.name.localeCompare(right.name, 'en'))) {
    if (axis.isSymbolicLink()) throw new Error(`Symlink is forbidden in content/taxonomies: ${axis.name}`)
    if (!axis.isDirectory() || (!promptAxes.has(axis.name) && !articleAxes.has(axis.name))) {
      throw new Error(`Only supported taxonomy axis directories are allowed in content/taxonomies: ${axis.name}`)
    }
    const axisRoot = path.join(root, axis.name)
    const ids = await readdir(axisRoot, { withFileTypes: true })
    for (const id of ids.sort((left, right) => left.name.localeCompare(right.name, 'en'))) {
      if (id.isSymbolicLink()) throw new Error(`Symlink is forbidden in ${relativeFromRoot(axisRoot)}`)
      if (!id.isDirectory()) throw new Error(`Only taxonomy ID directories are allowed in ${relativeFromRoot(axisRoot)}: ${id.name}`)
      const directory = path.join(axisRoot, id.name)
      const locales = await readdir(directory, { withFileTypes: true })
      for (const locale of locales.sort((left, right) => left.name.localeCompare(right.name, 'en'))) {
        if (locale.isSymbolicLink()) throw new Error(`Symlink is forbidden in ${relativeFromRoot(directory)}`)
        if (!locale.isFile() || !locale.name.endsWith('.json')) {
          throw new Error(`Only locale JSON files are allowed in ${relativeFromRoot(directory)}: ${locale.name}`)
        }
        result[promptAxes.has(axis.name) ? 'prompt' : 'article'].push(path.join(directory, locale.name))
      }
    }
  }
  return result
}

function markdownLinks(body) {
  const links = []
  for (const match of body.matchAll(/(?<!!)\[[^\]]+\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g)) links.push(match[1])
  return links
}

function markdownImages(body) {
  const images = []
  for (const match of body.matchAll(/!\[([^\]]*)\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g)) {
    images.push({ alt: match[1], url: match[2] })
  }
  return images
}

export function parseMarkdown(source, file) {
  if (source.includes('\r')) throw new Error('Markdown must use LF line endings')
  if (!source.startsWith('---\n')) throw new Error('Markdown must start with a frontmatter delimiter')
  const closing = source.indexOf('\n---\n', 4)
  if (closing === -1) throw new Error('Markdown frontmatter closing delimiter is missing')
  const frontmatterText = source.slice(4, closing)
  const body = source.slice(closing + 5).trim()
  let frontmatter
  try {
    frontmatter = JSON.parse(frontmatterText)
  } catch (error) {
    throw new Error(`Frontmatter must be JSON-compatible YAML: ${error.message}`)
  }
  if (body === '') throw new Error('Markdown body must not be empty')
  return { body, file, frontmatter, links: markdownLinks(body), source }
}

function firstHeading(body) {
  return body.split('\n').find((line) => line.trim() !== '') ?? ''
}

function promptFence(body) {
  const matches = [...body.matchAll(/```prompt\n([\s\S]*?)\n```/g)]
  if (matches.length !== 1) return null
  return matches[0][1].trim()
}

function same(left, right) {
  return JSON.stringify(canonical(left)) === JSON.stringify(canonical(right))
}

function immutablePrompt(prompt) {
  return {
    language: prompt?.language,
    text: prompt?.text,
    variables: (prompt?.variables ?? []).map((variable) => ({
      defaultValue: variable.defaultValue,
      key: variable.key,
      options: variable.options,
      required: variable.required,
    })),
  }
}

function immutableMedia(media) {
  return (media ?? []).map((item) => ({
    assetId: item.assetId,
    height: item.height,
    posterUrl: item.posterUrl,
    type: item.type,
    url: item.url,
    width: item.width,
  }))
}

function immutableExamples(examples) {
  return (examples ?? []).map((example) => ({
    id: example.id,
    input: example.input,
    output: immutableMedia([example.output])[0],
  }))
}

function calculatedRecordRevision(value, body = '') {
  const record = structuredClone(value)
  delete record.translation
  if (record.publication) delete record.publication.sourceRevision
  const hash = createHash('sha256')
  hash.update(JSON.stringify(canonical(record)))
  hash.update('\0')
  hash.update(body)
  return `sha256:${hash.digest('hex')}`
}

function calculatedSourceRevision(document) {
  return calculatedRecordRevision(document.frontmatter, document.body)
}

function internalRoutes(surfaces, site, articleDocuments = [], articleTaxonomies = []) {
  const routes = new Set(['/sitemap.xml', '/robots.txt'])
  for (const locale of site.publishedLocales) {
    routes.add(`/${locale}/prompts/rss.xml`)
    routes.add(`/${locale}/blog/rss.xml`)
  }
  for (const surface of surfaces) routes.add(surface.path)
  const publicArticles = articlePublicDocuments(articleDocuments, site)
  for (const locale of site.publishedLocales) {
    if (publicArticles.some((document) => document.frontmatter.locale === locale)) routes.add(`/${locale}/blog`)
  }
  for (const document of publicArticles) routes.add(`/${document.frontmatter.locale}/blog/${document.frontmatter.slug}`)
  const localizedTaxonomies = new Map(
    articleTaxonomies.map((record) => [`${record.value.id}\u0000${record.value.locale}`, record.value]),
  )
  for (const document of publicArticles) {
    for (const categoryID of document.frontmatter.categoryIds ?? []) {
      const category = localizedTaxonomies.get(`${categoryID}\u0000${document.frontmatter.locale}`)
      if (category) routes.add(`/${document.frontmatter.locale}/blog/category/${category.slug}`)
    }
  }
  return routes
}

function validateDocument(document, schema, site, diagnostics) {
  const data = document.frontmatter
  for (const error of validateJsonSchema(schema, data)) {
    diagnostics.push(diagnostic(document.file, `schema:${error.keyword}`, `${error.path} ${error.message}`))
  }
  if (!data || typeof data !== 'object') return

  const parentID = path.basename(path.dirname(document.file))
  const fileLocale = path.basename(document.file, '.md')
  if (data.id !== parentID) {
    diagnostics.push(diagnostic(document.file, 'artifact_id_path_mismatch', 'id must equal its immutable directory name'))
  }
  if (data.locale !== fileLocale) {
    diagnostics.push(diagnostic(document.file, 'locale_path_mismatch', 'locale must equal the Markdown filename'))
  }
  if (!site.locales.includes(data.locale)) {
    diagnostics.push(diagnostic(document.file, 'unsupported_locale', `locale ${data.locale} is not enabled`))
  }
  if (firstHeading(document.body) !== `# ${data.title}`) {
    diagnostics.push(diagnostic(document.file, 'h1_mismatch', 'the first body heading must exactly match title'))
  }
  if (/<\/?[A-Za-z][^>]*>/.test(document.body)) {
    diagnostics.push(diagnostic(document.file, 'raw_html_forbidden', 'raw HTML is not allowed in Markdown bodies'))
  }
  if (promptFence(document.body) !== data.prompt?.text) {
    diagnostics.push(diagnostic(document.file, 'prompt_body_drift', 'the single ```prompt fence must equal prompt.text byte-for-byte'))
  }

  const usedTokens = [...new Set(data.prompt?.text?.match(safeTokenPattern) ?? [])].sort()
  const declaredTokens = [...new Set((data.prompt?.variables ?? []).map((variable) => variable.key))].sort()
  if (!same(usedTokens, declaredTokens)) {
    diagnostics.push(diagnostic(document.file, 'prompt_variable_mismatch', 'declared variables must exactly match Prompt tokens'))
  }
  const parameterTokens = [...new Set((data.parameters ?? []).map((parameter) => `[${parameter.key}]`))].sort()
  if (!same(parameterTokens, declaredTokens)) {
    diagnostics.push(diagnostic(document.file, 'parameter_variable_mismatch', 'parameters must exactly cover declared Prompt variables'))
  }
  const positions = (data.workflow ?? []).map((step) => step.position)
  const expectedPositions = positions.map((_, index) => index + 1)
  if (!same(positions, expectedPositions)) {
    diagnostics.push(diagnostic(document.file, 'workflow_order', 'workflow positions must be contiguous and start at 1'))
  }

  const expectedCanonical = `${site.canonicalOrigin}/${data.locale}/prompts/${data.slug}`
  if (data.seo?.canonical !== expectedCanonical) {
    diagnostics.push(diagnostic(document.file, 'canonical_mismatch', `seo.canonical must equal ${expectedCanonical}`))
  }
  const isPublic = data.status === 'published' && data.indexable === true
  if (isPublic) {
    if (!site.publishedLocales.includes(data.locale)) {
      diagnostics.push(diagnostic(document.file, 'locale_not_published', `${data.locale} is not an enabled published locale`))
    }
    if (data.translation?.status !== 'ready' || !data.translation?.reviewer) {
      diagnostics.push(diagnostic(document.file, 'locale_not_ready', 'published content requires a ready, reviewed locale'))
    }
    if (data.seo?.robots !== 'index,follow') {
      diagnostics.push(diagnostic(document.file, 'robots_mismatch', 'published indexable content must use index,follow'))
    }
  } else if (data.indexable || data.seo?.robots !== 'noindex,nofollow') {
    diagnostics.push(diagnostic(document.file, 'unpublished_indexable', 'non-published content must be noindex and not indexable'))
  }
  if (Date.parse(data.publication?.updatedAt) < Date.parse(data.publication?.publishedAt)) {
    diagnostics.push(diagnostic(document.file, 'publication_time_order', 'updatedAt cannot precede publishedAt'))
  }
  if (data.locale === data.sourceLocale) {
    if (data.translation?.translatedFromRevision !== null) {
      diagnostics.push(diagnostic(document.file, 'source_translation_revision', 'source locale must have null translatedFromRevision'))
    }
  } else if (data.translation?.translatedFromRevision !== data.publication?.sourceRevision) {
    diagnostics.push(diagnostic(document.file, 'stale_translation', 'translated locale must reference the current sourceRevision'))
  }
  if (!(data.evidence ?? []).some((item) => item.url === data.source?.url)) {
    diagnostics.push(diagnostic(document.file, 'source_evidence_missing', 'evidence must include the canonical source URL'))
  }
}

function validateClusters(documents, site, diagnostics) {
  const clusters = new Map()
  const uniqueByLocale = new Map()
  for (const document of documents) {
    const data = document.frontmatter
    const cluster = clusters.get(data.id) ?? []
    cluster.push(document)
    clusters.set(data.id, cluster)
    for (const [field, value] of [
      ['slug', data.slug],
      ['title', data.title],
      ['seo.title', data.seo?.title],
      ['seo.description', data.seo?.description],
    ]) {
      const key = `${data.locale}\u0000${field}\u0000${value}`
      const prior = uniqueByLocale.get(key)
      if (prior) {
        diagnostics.push(diagnostic(document.file, 'locale_value_conflict', `${field} conflicts with ${relativeFromRoot(prior)}`))
      } else uniqueByLocale.set(key, document.file)
    }
  }

  for (const [canonicalID, cluster] of clusters) {
    const published = cluster.filter((document) => document.frontmatter.status === 'published')
    if (published.length === 0) continue
    const actualLocales = published.map((document) => document.frontmatter.locale).sort()
    const expectedLocales = [...site.publishedLocales].sort()
    if (!same(actualLocales, expectedLocales)) {
      diagnostics.push(diagnostic(cluster[0].file, 'published_locale_set', `${canonicalID} must publish exactly ${expectedLocales.join(', ')}`))
    }
    const source = cluster.find((document) => document.frontmatter.locale === document.frontmatter.sourceLocale)
    if (!source) {
      diagnostics.push(diagnostic(cluster[0].file, 'source_locale_missing', `${canonicalID} has no source locale file`))
      continue
    }
    const sourceData = source.frontmatter
    const expectedSourceRevision = calculatedSourceRevision(source)
    if (sourceData.publication?.sourceRevision !== expectedSourceRevision) {
      diagnostics.push(
        diagnostic(
          source.file,
          'source_revision_mismatch',
          `sourceRevision must equal the source locale content hash ${expectedSourceRevision}`,
        ),
      )
    }
    for (const sibling of cluster) {
      const data = sibling.frontmatter
      for (const field of ['type', 'sourceLocale', 'contentType']) {
        if (!same(data[field], sourceData[field])) {
          diagnostics.push(diagnostic(sibling.file, 'locale_cluster_drift', `${field} must match the source locale`))
        }
      }
      for (const field of [
        'models',
        'useCases',
        'techniques',
        'styles',
        'subjects',
        'metrics',
        'relatedPromptIds',
        'actions',
        'source',
      ]) {
        if (!same(data[field], sourceData[field])) {
          diagnostics.push(diagnostic(sibling.file, 'locale_cluster_drift', `${field} must match the source locale`))
        }
      }
      if (!same(immutablePrompt(data.prompt), immutablePrompt(sourceData.prompt))) {
        diagnostics.push(
          diagnostic(
            sibling.file,
            'locale_cluster_drift',
            'Prompt text, language, variable keys, defaults, options, and required flags must match the source locale',
          ),
        )
      }
      if (!same(immutableMedia(data.media), immutableMedia(sourceData.media))) {
        diagnostics.push(diagnostic(sibling.file, 'locale_cluster_drift', 'media asset identity must match the source locale'))
      }
      if (!same(immutableExamples(data.examples), immutableExamples(sourceData.examples))) {
        diagnostics.push(diagnostic(sibling.file, 'locale_cluster_drift', 'example identity and output assets must match the source locale'))
      }
      if (!same(data.creator && { id: data.creator.id, slug: data.creator.slug }, sourceData.creator && { id: sourceData.creator.id, slug: sourceData.creator.slug })) {
        diagnostics.push(diagnostic(sibling.file, 'locale_cluster_drift', 'creator identity must match the source locale'))
      }
      if (data.publication?.sourceRevision !== sourceData.publication?.sourceRevision) {
        diagnostics.push(diagnostic(sibling.file, 'source_revision_drift', 'all locales must share sourceRevision'))
      }
    }
  }

  for (const document of documents) {
    for (const relatedID of document.frontmatter.relatedPromptIds ?? []) {
      if (!clusters.has(relatedID)) {
        diagnostics.push(diagnostic(document.file, 'related_prompt_missing', `${relatedID} has no content directory`))
      }
    }
  }
}

function safeRepositoryReference(value) {
  if (value === null) return true
  if (typeof value !== 'string' || path.isAbsolute(value) || value.includes('\\')) return false
  if (value.split('/').includes('..')) return false
  const normalized = path.posix.normalize(value)
  return normalized !== '..' && !normalized.startsWith('../') && !normalized.split('/').includes('..')
}

function validateArticleDocument(document, schema, site, diagnostics) {
  const data = document.frontmatter
  for (const error of validateJsonSchema(schema, data)) {
    diagnostics.push(diagnostic(document.file, `article_schema:${error.keyword}`, `${error.path} ${error.message}`))
  }
  if (!data || typeof data !== 'object') return

  const parentID = path.basename(path.dirname(document.file))
  const fileLocale = path.basename(document.file, '.md')
  if (data.id !== parentID) {
    diagnostics.push(diagnostic(document.file, 'article_id_path_mismatch', 'id must equal its immutable Article directory name'))
  }
  if (data.locale !== fileLocale) {
    diagnostics.push(diagnostic(document.file, 'article_locale_path_mismatch', 'locale must equal the Article Markdown filename'))
  }
  if (!site.locales.includes(data.locale)) {
    diagnostics.push(diagnostic(document.file, 'article_unsupported_locale', `locale ${data.locale} is not enabled`))
  }
  if (firstHeading(document.body) !== `# ${data.title}`) {
    diagnostics.push(diagnostic(document.file, 'article_h1_mismatch', 'the first body heading must exactly match title'))
  }
  const proseWithoutCodeFences = document.body.replace(/```[\s\S]*?```/g, '')
  if (/<\/?[A-Za-z][^>]*>/.test(proseWithoutCodeFences)) {
    diagnostics.push(diagnostic(document.file, 'article_raw_html_forbidden', 'raw HTML is not allowed in Article Markdown'))
  }
  if ((document.body.match(/^```/gm)?.length ?? 0) % 2 !== 0) {
    diagnostics.push(diagnostic(document.file, 'article_unclosed_code_fence', 'Article Markdown code fences must be closed'))
  }
  if (!safeRepositoryReference(data.provenance?.sourceRef)) {
    diagnostics.push(diagnostic(document.file, 'article_provenance_path', 'provenance.sourceRef must stay inside the repository'))
  }

  const expectedCanonical = `${site.canonicalOrigin}/${data.locale}/blog/${data.slug}`
  if (data.seo?.canonical !== expectedCanonical) {
    diagnostics.push(diagnostic(document.file, 'article_canonical_mismatch', `seo.canonical must equal ${expectedCanonical}`))
  }
  const isPublished = data.status === 'published'
  if (isPublished) {
    if (!site.publishedLocales.includes(data.locale)) {
      diagnostics.push(diagnostic(document.file, 'article_locale_not_published', `${data.locale} is not an enabled published locale`))
    }
    if (data.translation?.status !== 'ready' || !data.translation?.reviewer) {
      diagnostics.push(diagnostic(document.file, 'article_locale_not_ready', 'published Article requires a ready, reviewed locale'))
    }
    if (!data.publication?.publishedAt) {
      diagnostics.push(diagnostic(document.file, 'article_published_at_missing', 'published Article requires publication.publishedAt'))
    }
    if (data.indexable && data.seo?.robots !== 'index,follow') {
      diagnostics.push(diagnostic(document.file, 'article_robots_mismatch', 'indexable Article must use index,follow'))
    }
    if (!data.indexable && data.seo?.robots !== 'noindex,nofollow') {
      diagnostics.push(diagnostic(document.file, 'article_robots_mismatch', 'non-indexable Article must use noindex,nofollow'))
    }
    if (data.provenance?.fixture) {
      diagnostics.push(diagnostic(document.file, 'article_fixture_published', 'fixture Article cannot be published'))
    }
  } else {
    if (data.indexable || data.seo?.robots !== 'noindex,nofollow') {
      diagnostics.push(diagnostic(document.file, 'article_unpublished_indexable', 'non-published Article must be noindex and not indexable'))
    }
    if (data.publication?.publishedAt !== null) {
      diagnostics.push(diagnostic(document.file, 'article_unpublished_date', 'non-published Article must have a null publishedAt'))
    }
  }
  if (data.indexable && !isPublished) {
    diagnostics.push(diagnostic(document.file, 'article_indexability_state', 'only published Article may be indexable'))
  }
  if (data.publication?.publishedAt && Date.parse(data.publication.updatedAt) < Date.parse(data.publication.publishedAt)) {
    diagnostics.push(diagnostic(document.file, 'article_publication_time_order', 'updatedAt cannot precede publishedAt'))
  }
  if (data.locale === data.sourceLocale && data.translation?.translatedFromRevision !== null) {
    diagnostics.push(diagnostic(document.file, 'article_source_translation_revision', 'source locale must have null translatedFromRevision'))
  }
  if (data.provenance?.origin === 'sourced') {
    if (!data.source) {
      diagnostics.push(diagnostic(document.file, 'article_source_missing', 'sourced Article requires a source'))
    } else if (!(data.citations ?? []).some((citation) => citation.url === data.source.url)) {
      diagnostics.push(diagnostic(document.file, 'article_source_citation_missing', 'citations must include the sourced Article URL'))
    }
  }
}

function validateArticleClusters(documents, site, diagnostics) {
  const clusters = new Map()
  const slugs = new Map()
  for (const document of documents) {
    const data = document.frontmatter
    const cluster = clusters.get(data.id) ?? []
    cluster.push(document)
    clusters.set(data.id, cluster)
    const slugKey = `${data.locale}\u0000${data.slug}`
    const prior = slugs.get(slugKey)
    if (prior) {
      diagnostics.push(diagnostic(document.file, 'article_slug_conflict', `slug conflicts with ${relativeFromRoot(prior)}`))
    } else slugs.set(slugKey, document.file)
  }

  for (const [canonicalID, cluster] of clusters) {
    const published = cluster.filter((document) => document.frontmatter.status === 'published')
    if (published.length === 0) continue
    const actualLocales = published.map((document) => document.frontmatter.locale).sort()
    const expectedLocales = [...site.publishedLocales].sort()
    if (!same(actualLocales, expectedLocales)) {
      diagnostics.push(
        diagnostic(cluster[0].file, 'article_published_locale_set', `${canonicalID} must publish exactly ${expectedLocales.join(', ')}`),
      )
    }
    const source = cluster.find((document) => document.frontmatter.locale === document.frontmatter.sourceLocale)
    if (!source) {
      diagnostics.push(diagnostic(cluster[0].file, 'article_source_locale_missing', `${canonicalID} has no source locale file`))
      continue
    }
    const sourceData = source.frontmatter
    const expectedSourceRevision = calculatedSourceRevision(source)
    if (sourceData.publication?.sourceRevision !== expectedSourceRevision) {
      diagnostics.push(
        diagnostic(
          source.file,
          'article_source_revision_mismatch',
          `sourceRevision must equal the source locale content hash ${expectedSourceRevision}`,
        ),
      )
    }
    for (const sibling of cluster) {
      const data = sibling.frontmatter
      for (const field of [
        'type',
        'sourceLocale',
        'authorId',
        'categoryIds',
        'tags',
        'cover',
        'provenance',
        'source',
        'relatedArticleIds',
      ]) {
        if (!same(data[field], sourceData[field])) {
          diagnostics.push(diagnostic(sibling.file, 'article_locale_cluster_drift', `${field} must match the source locale`))
        }
      }
      const citationIdentity = (data.citations ?? []).map((citation) => ({ accessedAt: citation.accessedAt, url: citation.url }))
      const sourceCitationIdentity = (sourceData.citations ?? []).map((citation) => ({
        accessedAt: citation.accessedAt,
        url: citation.url,
      }))
      if (!same(citationIdentity, sourceCitationIdentity)) {
        diagnostics.push(diagnostic(sibling.file, 'article_locale_cluster_drift', 'citation URLs and access dates must match the source locale'))
      }
      if (data.publication?.sourceRevision !== expectedSourceRevision) {
        diagnostics.push(diagnostic(sibling.file, 'article_source_revision_drift', 'all Article locales must share the source revision'))
      }
      if (
        data.locale !== data.sourceLocale &&
        ['review', 'ready'].includes(data.translation?.status) &&
        data.translation?.translatedFromRevision !== expectedSourceRevision
      ) {
        diagnostics.push(diagnostic(sibling.file, 'article_stale_translation', 'reviewed translation must reference the current source revision'))
      }
    }
  }
  return clusters
}

function articleTaxonomySchema(articleSchema) {
  return { ...articleSchema.$defs.articleTaxonomy, $defs: articleSchema.$defs }
}

function articleTaxonomyExpected(data) {
  if (data.axis === 'article-category') {
    return {
      canonical: `/${data.locale}/blog/category/${data.slug}`,
      idPrefix: 'atc_',
    }
  }
  const query = data.axis === 'article-author' ? 'author' : 'tag'
  return {
    canonical: `/${data.locale}/blog?${query}=${data.slug}`,
    idPrefix: data.axis === 'article-author' ? 'ata_' : 'att_',
  }
}

function validateArticleTaxonomy(record, schema, site, contentRoot, diagnostics) {
  const data = record.value
  for (const error of validateJsonSchema(schema, data)) {
    diagnostics.push(diagnostic(record.file, `article_taxonomy_schema:${error.keyword}`, `${error.path} ${error.message}`))
  }
  if (!data || typeof data !== 'object') return

  const relative = path.relative(path.join(contentRoot, 'taxonomies'), record.file).split(path.sep)
  const [pathAxis, pathID, filename] = relative
  const pathLocale = path.basename(filename ?? '', '.json')
  if (relative.length !== 3 || data.axis !== pathAxis || data.id !== pathID || data.locale !== pathLocale) {
    diagnostics.push(
      diagnostic(record.file, 'article_taxonomy_path_mismatch', 'axis, id, and locale must exactly match the taxonomy file path'),
    )
  }
  if (!site.locales.includes(data.locale)) {
    diagnostics.push(diagnostic(record.file, 'article_taxonomy_unsupported_locale', `locale ${data.locale} is not enabled`))
  }
  const expected = articleTaxonomyExpected(data)
  if (!data.id?.startsWith(expected.idPrefix)) {
    diagnostics.push(
      diagnostic(record.file, 'article_taxonomy_id_axis_mismatch', `${data.axis} IDs must start with ${expected.idPrefix}`),
    )
  }
  const expectedCanonical = `${site.canonicalOrigin}${expected.canonical}`
  if (data.seo?.canonical !== expectedCanonical) {
    diagnostics.push(
      diagnostic(record.file, 'article_taxonomy_canonical_mismatch', `seo.canonical must equal ${expectedCanonical}`),
    )
  }
  if (data.axis !== 'article-author' && data.url !== null) {
    diagnostics.push(diagnostic(record.file, 'article_taxonomy_url_axis', 'only Article authors may have a profile URL'))
  }
  if (data.indexable && data.axis !== 'article-category') {
    diagnostics.push(diagnostic(record.file, 'article_taxonomy_indexability_axis', 'only Article categories may be indexable'))
  }
  if (!safeRepositoryReference(data.sourceRef)) {
    diagnostics.push(diagnostic(record.file, 'article_taxonomy_source_ref', 'sourceRef must stay inside the repository'))
  }

  const isPublished = data.status === 'published'
  if (isPublished) {
    if (!site.publishedLocales.includes(data.locale)) {
      diagnostics.push(diagnostic(record.file, 'article_taxonomy_locale_not_published', `${data.locale} is not published`))
    }
    if (data.translation?.status !== 'ready' || !data.translation?.reviewer) {
      diagnostics.push(diagnostic(record.file, 'article_taxonomy_locale_not_ready', 'published taxonomy requires review'))
    }
    if (!data.publication?.publishedAt) {
      diagnostics.push(diagnostic(record.file, 'article_taxonomy_published_at_missing', 'published taxonomy requires publishedAt'))
    }
    const expectedRobots = data.indexable ? 'index,follow' : 'noindex,nofollow'
    if (data.seo?.robots !== expectedRobots) {
      diagnostics.push(diagnostic(record.file, 'article_taxonomy_robots_mismatch', `robots must be ${expectedRobots}`))
    }
    if (data.fixture) {
      diagnostics.push(diagnostic(record.file, 'article_taxonomy_fixture_published', 'fixture taxonomy cannot be published'))
    }
  } else {
    if (data.indexable || data.seo?.robots !== 'noindex,nofollow') {
      diagnostics.push(diagnostic(record.file, 'article_taxonomy_unpublished_indexable', 'draft taxonomy must be noindex'))
    }
    if (data.publication?.publishedAt !== null) {
      diagnostics.push(diagnostic(record.file, 'article_taxonomy_unpublished_date', 'draft taxonomy must have null publishedAt'))
    }
  }
  if (data.publication?.publishedAt && Date.parse(data.publication.updatedAt) < Date.parse(data.publication.publishedAt)) {
    diagnostics.push(diagnostic(record.file, 'article_taxonomy_time_order', 'updatedAt cannot precede publishedAt'))
  }
  if (data.locale === data.sourceLocale && data.translation?.translatedFromRevision !== null) {
    diagnostics.push(diagnostic(record.file, 'article_taxonomy_source_translation_revision', 'source locale revision must be null'))
  }
}

function validateArticleTaxonomyClusters(records, site, diagnostics) {
  const clusters = new Map()
  const slugs = new Map()
  for (const record of records) {
    const data = record.value
    const cluster = clusters.get(data.id) ?? []
    cluster.push(record)
    clusters.set(data.id, cluster)
    const slugKey = `${data.locale}\u0000${data.axis}\u0000${data.slug}`
    const prior = slugs.get(slugKey)
    if (prior) {
      diagnostics.push(diagnostic(record.file, 'article_taxonomy_slug_conflict', `slug conflicts with ${relativeFromRoot(prior)}`))
    } else slugs.set(slugKey, record.file)
  }

  for (const [canonicalID, cluster] of clusters) {
    const published = cluster.filter((record) => record.value.status === 'published')
    if (published.length === 0) continue
    const actualLocales = published.map((record) => record.value.locale).sort()
    const expectedLocales = [...site.publishedLocales].sort()
    if (!same(actualLocales, expectedLocales)) {
      diagnostics.push(
        diagnostic(cluster[0].file, 'article_taxonomy_published_locale_set', `${canonicalID} must publish exactly ${expectedLocales.join(', ')}`),
      )
    }
    const source = cluster.find((record) => record.value.locale === record.value.sourceLocale)
    if (!source) {
      diagnostics.push(
        diagnostic(cluster[0].file, 'article_taxonomy_source_locale_missing', `${canonicalID} has no source locale record`),
      )
      continue
    }
    const expectedSourceRevision = calculatedRecordRevision(source.value)
    if (source.value.publication?.sourceRevision !== expectedSourceRevision) {
      diagnostics.push(
        diagnostic(source.file, 'article_taxonomy_source_revision_mismatch', `sourceRevision must equal ${expectedSourceRevision}`),
      )
    }
    for (const sibling of cluster) {
      const data = sibling.value
      for (const field of ['type', 'axis', 'sourceLocale', 'fixture', 'sourceRef']) {
        if (!same(data[field], source.value[field])) {
          diagnostics.push(diagnostic(sibling.file, 'article_taxonomy_locale_cluster_drift', `${field} must match source locale`))
        }
      }
      if (data.publication?.sourceRevision !== expectedSourceRevision) {
        diagnostics.push(
          diagnostic(sibling.file, 'article_taxonomy_source_revision_drift', 'all taxonomy locales must share sourceRevision'),
        )
      }
      if (
        data.locale !== data.sourceLocale &&
        ['review', 'ready'].includes(data.translation?.status) &&
        data.translation?.translatedFromRevision !== expectedSourceRevision
      ) {
        diagnostics.push(diagnostic(sibling.file, 'article_taxonomy_stale_translation', 'translation revision is stale'))
      }
    }
  }
}

function validateArticleReferences(documents, taxonomies, site, diagnostics) {
  const clusters = new Map()
  for (const document of documents) {
    const cluster = clusters.get(document.frontmatter.id) ?? []
    cluster.push(document)
    clusters.set(document.frontmatter.id, cluster)
  }
  const localizedTaxonomies = new Map(
    taxonomies.map((record) => [`${record.value.id}\u0000${record.value.locale}`, record]),
  )
  for (const document of documents) {
    const data = document.frontmatter
    const isPublicCandidate = data.status === 'published' && data.indexable === true
    const references = [data.authorId, ...(data.categoryIds ?? []), ...(data.tags ?? [])]
    for (const taxonomyID of references) {
      const record = localizedTaxonomies.get(`${taxonomyID}\u0000${data.locale}`)
      if (!record) {
        diagnostics.push(diagnostic(document.file, 'article_taxonomy_missing', `${taxonomyID} has no ${data.locale} taxonomy record`))
        continue
      }
      if (isPublicCandidate && !readyPublished(record.value, site)) {
        diagnostics.push(diagnostic(document.file, 'article_taxonomy_not_ready', `${taxonomyID} is not ready and published`))
      }
      if (isPublicCandidate && record.value.axis === 'article-category' && !record.value.indexable) {
        diagnostics.push(diagnostic(document.file, 'article_category_not_indexable', `${taxonomyID} is not indexable`))
      }
    }
    for (const relatedID of data.relatedArticleIds ?? []) {
      if (!clusters.has(relatedID)) {
        diagnostics.push(diagnostic(document.file, 'related_article_missing', `${relatedID} has no content directory`))
      }
      if (relatedID === data.id) {
        diagnostics.push(diagnostic(document.file, 'related_article_self', 'Article cannot relate to itself'))
      }
    }
  }
}

function validateTaxonomy(record, schema, site, contentRoot, diagnostics) {
  const data = record.value
  for (const error of validateJsonSchema(schema, data)) {
    diagnostics.push(diagnostic(record.file, `schema:${error.keyword}`, `${error.path} ${error.message}`))
  }
  if (!data || typeof data !== 'object') return

  const relative = path.relative(path.join(contentRoot, 'taxonomies'), record.file).split(path.sep)
  const [pathAxis, pathID, filename] = relative
  const pathLocale = path.basename(filename ?? '', '.json')
  if (relative.length !== 3 || data.axis !== pathAxis || data.id !== pathID || data.locale !== pathLocale) {
    diagnostics.push(diagnostic(record.file, 'taxonomy_path_mismatch', 'axis, id, and locale must exactly match the taxonomy file path'))
  }
  if (!site.locales.includes(data.locale)) {
    diagnostics.push(diagnostic(record.file, 'unsupported_locale', `locale ${data.locale} is not enabled`))
  }

  const expected = data.axis === 'content-type'
    ? {
        idPrefix: 'cty_',
        kind: 'content-type-gallery',
        level: 'L2',
        path: `/${data.locale}/prompts/${data.slug}`,
        selector: 'contentType',
      }
    : {
        idPrefix: 'mdl_',
        kind: 'model-detail',
        level: 'L3',
        path: `/${data.locale}/prompts/models/${data.slug}`,
        selector: 'models',
      }
  if (!data.id?.startsWith(expected.idPrefix)) {
    diagnostics.push(diagnostic(record.file, 'taxonomy_id_axis_mismatch', `${data.axis} IDs must start with ${expected.idPrefix}`))
  }
  if (data.selector?.field !== expected.selector || data.selector?.value !== data.slug) {
    diagnostics.push(diagnostic(record.file, 'taxonomy_selector_mismatch', `selector must be ${expected.selector}=${data.slug}`))
  }
  if (data.surface?.level !== expected.level || data.surface?.kind !== expected.kind || data.surface?.path !== expected.path) {
    diagnostics.push(diagnostic(record.file, 'taxonomy_surface_mismatch', `taxonomy surface must be ${expected.level} ${expected.kind} ${expected.path}`))
  }
  if ((data.axis === 'model') !== (data.model !== null && typeof data.model === 'object')) {
    diagnostics.push(diagnostic(record.file, 'taxonomy_model_shape', 'only model taxonomy records may contain model metadata'))
  }
  const expectedCanonical = `${site.canonicalOrigin}${expected.path}`
  if (data.seo?.canonical !== expectedCanonical) {
    diagnostics.push(diagnostic(record.file, 'canonical_mismatch', `seo.canonical must equal ${expectedCanonical}`))
  }
  if (data.indexable !== false || data.seo?.robots !== 'noindex,nofollow') {
    diagnostics.push(diagnostic(record.file, 'internal_beta_indexable', 'internal-beta taxonomy records must be noindex and not indexable'))
  }
  if (data.status === 'published') {
    if (!site.publishedLocales.includes(data.locale)) {
      diagnostics.push(diagnostic(record.file, 'locale_not_published', `${data.locale} is not an enabled published locale`))
    }
    if (data.translation?.status !== 'ready' || !data.translation?.reviewer) {
      diagnostics.push(diagnostic(record.file, 'locale_not_ready', 'published taxonomy requires a ready, reviewed locale'))
    }
  }
  if (Date.parse(data.publication?.updatedAt) < Date.parse(data.publication?.publishedAt)) {
    diagnostics.push(diagnostic(record.file, 'publication_time_order', 'updatedAt cannot precede publishedAt'))
  }
  if (data.locale === data.sourceLocale) {
    if (data.translation?.translatedFromRevision !== null) {
      diagnostics.push(diagnostic(record.file, 'source_translation_revision', 'source locale must have null translatedFromRevision'))
    }
  } else if (data.translation?.translatedFromRevision !== data.publication?.sourceRevision) {
    diagnostics.push(diagnostic(record.file, 'stale_translation', 'translated taxonomy must reference the current sourceRevision'))
  }
}

function validateTaxonomyClusters(records, site, diagnostics) {
  const clusters = new Map()
  const uniqueByLocale = new Map()
  for (const record of records) {
    const data = record.value
    const cluster = clusters.get(data.id) ?? []
    cluster.push(record)
    clusters.set(data.id, cluster)
    for (const [field, value] of [
      ['slug', data.slug],
      ['surface.path', data.surface?.path],
    ]) {
      const key = `${data.locale}\u0000${field}\u0000${value}`
      const prior = uniqueByLocale.get(key)
      if (prior) diagnostics.push(diagnostic(record.file, 'taxonomy_locale_conflict', `${field} conflicts with ${relativeFromRoot(prior)}`))
      else uniqueByLocale.set(key, record.file)
    }
  }

  for (const [canonicalID, cluster] of clusters) {
    const published = cluster.filter((record) => record.value.status === 'published')
    if (published.length > 0) {
      const actualLocales = published.map((record) => record.value.locale).sort()
      const expectedLocales = [...site.publishedLocales].sort()
      if (!same(actualLocales, expectedLocales)) {
        diagnostics.push(diagnostic(cluster[0].file, 'taxonomy_published_locale_set', `${canonicalID} must publish exactly ${expectedLocales.join(', ')}`))
      }
    }
    const source = cluster.find((record) => record.value.locale === record.value.sourceLocale)
    if (!source) {
      diagnostics.push(diagnostic(cluster[0].file, 'taxonomy_source_locale_missing', `${canonicalID} has no source locale file`))
      continue
    }
    const sourceData = source.value
    const expectedSourceRevision = calculatedRecordRevision(sourceData)
    if (sourceData.publication?.sourceRevision !== expectedSourceRevision) {
      diagnostics.push(diagnostic(source.file, 'taxonomy_source_revision_mismatch', `sourceRevision must equal ${expectedSourceRevision}`))
    }
    for (const sibling of cluster) {
      const data = sibling.value
      for (const field of ['type', 'axis', 'sourceLocale', 'selector', 'model', 'sourceRef']) {
        if (!same(data[field], sourceData[field])) {
          diagnostics.push(diagnostic(sibling.file, 'taxonomy_locale_cluster_drift', `${field} must match the source locale`))
        }
      }
      if (data.publication?.sourceRevision !== sourceData.publication?.sourceRevision) {
        diagnostics.push(diagnostic(sibling.file, 'taxonomy_source_revision_drift', 'all locales must share sourceRevision'))
      }
    }
  }
  return clusters
}

function readyPublished(data, site) {
  return site.publishedLocales.includes(data.locale) && data.status === 'published' && data.translation?.status === 'ready'
}

function validateSurfaces(surfaceRecord, schema, site, documents, taxonomies, diagnostics) {
  for (const error of validateJsonSchema(schema, surfaceRecord.value)) {
    diagnostics.push(diagnostic(surfaceRecord.file, `schema:${error.keyword}`, `${error.path} ${error.message}`))
  }
  const contract = surfaceRecord.value
  if (!contract || typeof contract !== 'object' || !Array.isArray(contract.surfaces)) return []
  if (!same(contract.publishedLocales, site.publishedLocales)) {
    diagnostics.push(diagnostic(surfaceRecord.file, 'surface_locale_set', 'surface publishedLocales must exactly match site.publishedLocales'))
  }

  const promptTargets = new Map(documents.map((document) => [`${document.frontmatter.id}\u0000${document.frontmatter.locale}`, document]))
  const taxonomyTargets = new Map(taxonomies.map((record) => [`${record.value.id}\u0000${record.value.locale}`, record]))
  const ids = new Map()
  const paths = new Map()
  const coverage = new Map()
  const exposedTargets = new Set()
  const releaseSurfaces = []
  const hasPublicPrompt = documents.some((document) => readyPublished(document.frontmatter, site))
  const expectedShape = {
    L1: ['prompt-hub', 'hub'],
    L2: ['content-type-gallery', 'taxonomy'],
    L3: ['model-detail', 'taxonomy'],
    L4: ['prompt-detail', 'prompt'],
  }

  for (const surface of contract.surfaces) {
    for (const [field, value, seen] of [
      ['id', surface.id, ids],
      ['path', surface.path, paths],
    ]) {
      const prior = seen.get(value)
      if (prior) diagnostics.push(diagnostic(surfaceRecord.file, 'surface_conflict', `${field} ${value} is duplicated`))
      else seen.set(value, surface)
    }
    if (!site.publishedLocales.includes(surface.locale)) {
      diagnostics.push(diagnostic(surfaceRecord.file, 'surface_locale_not_published', `${surface.path} uses an unpublished locale`))
    }
    const coverageKey = `${surface.locale}\u0000${surface.level}`
    if (coverage.has(coverageKey)) {
      diagnostics.push(diagnostic(surfaceRecord.file, 'surface_level_conflict', `${surface.locale} has more than one ${surface.level} surface`))
    } else coverage.set(coverageKey, surface)
    const shape = expectedShape[surface.level]
    if (!shape || surface.kind !== shape[0] || surface.targetType !== shape[1]) {
      diagnostics.push(diagnostic(surfaceRecord.file, 'surface_level_kind_mismatch', `${surface.level} has an invalid kind or targetType`))
      continue
    }

    if (surface.level === 'L1') {
      if (surface.targetId !== null || surface.path !== `/${surface.locale}/prompts`) {
        diagnostics.push(diagnostic(surfaceRecord.file, 'surface_target_mismatch', 'L1 must target the locale Prompt hub with no targetId'))
      }
      releaseSurfaces.push(surface)
      continue
    }

    const key = `${surface.targetId}\u0000${surface.locale}`
    const target = surface.targetType === 'taxonomy' ? taxonomyTargets.get(key) : promptTargets.get(key)
    if (!target) {
      // A full removal snapshot may leave the reviewed noindex surface contract
      // in place while its generated targets disappear. Keep validating the
      // contract shape, but never emit an unresolved target as a release route.
      if (hasPublicPrompt || surface.robots !== 'noindex,nofollow') {
        diagnostics.push(diagnostic(surfaceRecord.file, 'surface_target_missing', `${surface.path} target ${surface.targetId} has no localized mirror record`))
      }
      continue
    }
    const data = target.value ?? target.frontmatter
    exposedTargets.add(key)
    if (!readyPublished(data, site)) {
      if (hasPublicPrompt || surface.robots !== 'noindex,nofollow') {
        diagnostics.push(diagnostic(surfaceRecord.file, 'surface_target_unpublished', `${surface.path} target is not a ready published locale`))
      }
    } else {
      releaseSurfaces.push(surface)
    }
    const expectedPath = surface.targetType === 'taxonomy' ? data.surface?.path : `/${data.locale}/prompts/${data.slug}`
    if (surface.path !== expectedPath) {
      diagnostics.push(diagnostic(surfaceRecord.file, 'surface_target_path_mismatch', `${surface.path} must equal target path ${expectedPath}`))
    }
    if (surface.level === 'L2' && (data.axis !== 'content-type' || data.surface?.level !== 'L2')) {
      diagnostics.push(diagnostic(surfaceRecord.file, 'surface_target_type_mismatch', 'L2 must target an L2 content-type taxonomy'))
    }
    if (surface.level === 'L3' && (data.axis !== 'model' || data.surface?.level !== 'L3')) {
      diagnostics.push(diagnostic(surfaceRecord.file, 'surface_target_type_mismatch', 'L3 must target an L3 model taxonomy'))
    }
  }

  for (const locale of site.publishedLocales) {
    for (const level of ['L1', 'L2', 'L3', 'L4']) {
      if (!coverage.has(`${locale}\u0000${level}`)) {
        diagnostics.push(diagnostic(surfaceRecord.file, 'surface_level_missing', `${locale} must declare exactly one ${level} internal-beta surface`))
      }
    }
  }
  for (const record of taxonomies) {
    if (readyPublished(record.value, site) && !exposedTargets.has(`${record.value.id}\u0000${record.value.locale}`)) {
      diagnostics.push(diagnostic(record.file, 'published_taxonomy_surface_missing', 'published taxonomy has no release surface'))
    }
  }
  for (const document of documents) {
    if (readyPublished(document.frontmatter, site) && !exposedTargets.has(`${document.frontmatter.id}\u0000${document.frontmatter.locale}`)) {
      diagnostics.push(diagnostic(document.file, 'published_prompt_surface_missing', 'published Prompt has no release surface'))
    }
  }
  return releaseSurfaces
}

function validateLinks(documents, surfaces, site, diagnostics, articleDocuments = [], articleTaxonomies = []) {
  const routes = internalRoutes(surfaces, site, articleDocuments, articleTaxonomies)
  for (const document of documents) {
    for (const link of document.links) {
      if (link.startsWith('#')) continue
      if (link.startsWith('/')) {
        const pathname = link.split('#', 1)[0]
        if (!routes.has(pathname)) diagnostics.push(diagnostic(document.file, 'broken_internal_link', `${link} has no published target`))
        continue
      }
      try {
        const url = new URL(link)
        if (url.protocol !== 'https:') throw new Error('not https')
      } catch {
        diagnostics.push(diagnostic(document.file, 'unsafe_external_link', `${link} must be an absolute HTTPS URL`))
      }
    }
  }
}

function validateArticleLinks(documents, surfaces, site, articleTaxonomies, diagnostics) {
  const routes = internalRoutes(surfaces, site, documents, articleTaxonomies)

  function validateTarget(document, target, unsafeCode, brokenCode) {
    if (target.startsWith('#')) return
    if (target.startsWith('/')) {
      const pathname = target.split(/[?#]/, 1)[0]
      if (!routes.has(pathname)) {
        diagnostics.push(diagnostic(document.file, brokenCode, `${target} has no published target`))
      }
      return
    }
    try {
      const url = new URL(target)
      if (url.protocol !== 'https:') throw new Error('not https')
    } catch {
      diagnostics.push(diagnostic(document.file, unsafeCode, `${target} must be an internal path or absolute HTTPS URL`))
    }
  }

  function validateImageTarget(document, target) {
    if (/^\/(?!\/)[^\s\\]+$/.test(target)) return
    try {
      const url = new URL(target)
      if (url.protocol !== 'https:') throw new Error('not https')
    } catch {
      diagnostics.push(
        diagnostic(document.file, 'article_unsafe_image', `${target} must be a repository-root path or absolute HTTPS URL`),
      )
    }
  }

  for (const document of documents) {
    for (const link of document.links) {
      validateTarget(document, link, 'article_unsafe_external_link', 'article_broken_internal_link')
    }
    for (const image of markdownImages(document.body)) validateImageTarget(document, image.url)
    for (const citation of document.frontmatter.citations ?? []) {
      validateTarget(document, citation.url, 'article_unsafe_citation', 'article_broken_citation')
    }
  }
}

export async function validateContent(options = {}) {
  const contentRoot = path.resolve(options.contentRoot ?? path.join(repositoryRoot, 'content'))
  const schemaRoot = path.resolve(options.schemaRoot ?? path.join(repositoryRoot, 'schemas'))
  const sitePath = path.join(contentRoot, 'site.json')
  const surfacesPath = path.join(contentRoot, 'surfaces.json')
  const contentSchemaPath = path.join(schemaRoot, 'content.schema.json')
  const articleSchemaPath = path.join(schemaRoot, 'article.schema.json')
  const siteSchemaPath = path.join(schemaRoot, 'site.schema.json')
  const surfacesSchemaPath = path.join(schemaRoot, 'surfaces.schema.json')
  const taxonomySchemaPath = path.join(schemaRoot, 'taxonomy.schema.json')
  const [files, articlePaths, taxonomyGroups] = await Promise.all([
    promptFiles(contentRoot),
    articleFiles(contentRoot),
    taxonomyFileGroups(contentRoot),
  ])
  const usesArticleContract = articlePaths.length > 0 || taxonomyGroups.article.length > 0
  const requiredFiles = [
    regularFile(sitePath, 'content/site.json'),
    regularFile(surfacesPath, 'content/surfaces.json'),
    regularFile(contentSchemaPath, 'schemas/content.schema.json'),
    regularFile(siteSchemaPath, 'schemas/site.schema.json'),
    regularFile(surfacesSchemaPath, 'schemas/surfaces.schema.json'),
    regularFile(taxonomySchemaPath, 'schemas/taxonomy.schema.json'),
  ]
  if (usesArticleContract) requiredFiles.push(regularFile(articleSchemaPath, 'schemas/article.schema.json'))
  await Promise.all(requiredFiles)
  const [
    siteRecord,
    surfacesRecord,
    contentSchemaRecord,
    siteSchemaRecord,
    surfacesSchemaRecord,
    taxonomySchemaRecord,
  ] = await Promise.all([
    readJson(sitePath),
    readJson(surfacesPath),
    readJson(contentSchemaPath),
    readJson(siteSchemaPath),
    readJson(surfacesSchemaPath),
    readJson(taxonomySchemaPath),
  ])
  const articleSchemaRecord = usesArticleContract ? await readJson(articleSchemaPath) : null
  const diagnostics = []
  for (const error of validateJsonSchema(siteSchemaRecord.value, siteRecord.value)) {
    diagnostics.push(diagnostic(sitePath, `schema:${error.keyword}`, `${error.path} ${error.message}`))
  }
  const supportedLocales = Array.isArray(siteRecord.value.locales) ? siteRecord.value.locales : []
  const publishedLocales = Array.isArray(siteRecord.value.publishedLocales) ? siteRecord.value.publishedLocales : []
  if (!supportedLocales.includes(siteRecord.value.defaultLocale)) {
    diagnostics.push(diagnostic(sitePath, 'default_locale_missing', 'defaultLocale must be included in locales'))
  }
  if (!publishedLocales.includes(siteRecord.value.defaultLocale)) {
    diagnostics.push(diagnostic(sitePath, 'default_locale_not_published', 'defaultLocale must be included in publishedLocales'))
  }
  for (const locale of publishedLocales) {
    if (!supportedLocales.includes(locale)) {
      diagnostics.push(diagnostic(sitePath, 'published_locale_unsupported', `${locale} must also be included in locales`))
    }
  }
  if (diagnostics.length > 0) throw new ContentValidationError(diagnostics)
  const documents = []
  const revisionInputs = [
    ['content/site.json', siteRecord.bytes],
    ['content/surfaces.json', surfacesRecord.bytes],
    ['schemas/content.schema.json', contentSchemaRecord.bytes],
    ['schemas/site.schema.json', siteSchemaRecord.bytes],
    ['schemas/surfaces.schema.json', surfacesSchemaRecord.bytes],
    ['schemas/taxonomy.schema.json', taxonomySchemaRecord.bytes],
  ]
  if (articleSchemaRecord) revisionInputs.push(['schemas/article.schema.json', articleSchemaRecord.bytes])
  for (const file of files) {
    const bytes = await readFile(file)
    revisionInputs.push([`content/${path.relative(contentRoot, file).split(path.sep).join('/')}`, bytes])
    try {
      const document = parseMarkdown(bytes.toString('utf8'), file)
      documents.push(document)
      validateDocument(document, contentSchemaRecord.value, siteRecord.value, diagnostics)
    } catch (error) {
      diagnostics.push(diagnostic(file, 'markdown_parse', error.message))
    }
  }
  validateClusters(documents, siteRecord.value, diagnostics)
  const articleDocuments = []
  for (const file of articlePaths) {
    const bytes = await readFile(file)
    revisionInputs.push([`content/${path.relative(contentRoot, file).split(path.sep).join('/')}`, bytes])
    try {
      const document = parseMarkdown(bytes.toString('utf8'), file)
      articleDocuments.push(document)
      validateArticleDocument(document, articleSchemaRecord.value, siteRecord.value, diagnostics)
    } catch (error) {
      diagnostics.push(diagnostic(file, 'article_markdown_parse', error.message))
    }
  }
  validateArticleClusters(articleDocuments, siteRecord.value, diagnostics)
  const taxonomies = []
  for (const file of taxonomyGroups.prompt) {
    const record = await readJson(file)
    record.file = file
    taxonomies.push(record)
    revisionInputs.push([`content/${path.relative(contentRoot, file).split(path.sep).join('/')}`, record.bytes])
    validateTaxonomy(record, taxonomySchemaRecord.value, siteRecord.value, contentRoot, diagnostics)
  }
  validateTaxonomyClusters(taxonomies, siteRecord.value, diagnostics)
  const articleTaxonomies = []
  const localizedArticleTaxonomySchema = articleSchemaRecord ? articleTaxonomySchema(articleSchemaRecord.value) : null
  for (const file of taxonomyGroups.article) {
    const record = await readJson(file)
    record.file = file
    articleTaxonomies.push(record)
    revisionInputs.push([`content/${path.relative(contentRoot, file).split(path.sep).join('/')}`, record.bytes])
    validateArticleTaxonomy(
      record,
      localizedArticleTaxonomySchema,
      siteRecord.value,
      contentRoot,
      diagnostics,
    )
  }
  validateArticleTaxonomyClusters(articleTaxonomies, siteRecord.value, diagnostics)
  validateArticleReferences(articleDocuments, articleTaxonomies, siteRecord.value, diagnostics)
  const surfaceRecord = { ...surfacesRecord, file: surfacesPath }
  const surfaces = validateSurfaces(
    surfaceRecord,
    surfacesSchemaRecord.value,
    siteRecord.value,
    documents,
    taxonomies,
    diagnostics,
  )
  validateLinks(documents, surfaces, siteRecord.value, diagnostics, articleDocuments, articleTaxonomies)
  validateArticleLinks(articleDocuments, surfaces, siteRecord.value, articleTaxonomies, diagnostics)
  if (diagnostics.length > 0) throw new ContentValidationError(diagnostics)

  const hash = createHash('sha256')
  for (const [logicalPath, bytes] of revisionInputs.sort(([left], [right]) => compareUtf8Binary(left, right))) {
    hash.update(logicalPath)
    hash.update('\0')
    hash.update(bytes)
    hash.update('\0')
  }
  return {
    contentRevision: `sha256:${hash.digest('hex')}`,
    articleDocuments,
    articleTaxonomies,
    documents,
    site: siteRecord.value,
    surfaces,
    taxonomies,
  }
}

function xml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

function releaseDocuments(documents, site) {
  return documents.filter((document) => {
    const data = document.frontmatter
    return (
      site.publishedLocales.includes(data.locale) &&
      data.status === 'published' &&
      data.translation.status === 'ready'
    )
  })
}

function indexableDocuments(documents, site) {
  return releaseDocuments(documents, site).filter((document) => {
    const data = document.frontmatter
    return data.indexable && data.seo?.robots === 'index,follow'
  })
}

function articlePublicDocuments(documents, site) {
  return documents.filter((document) => {
    const data = document.frontmatter
    return (
      site.publishedLocales.includes(data.locale) &&
      data.status === 'published' &&
      data.indexable === true &&
      data.translation?.status === 'ready' &&
      Boolean(data.translation?.reviewer) &&
      data.seo?.robots === 'index,follow'
    )
  })
}

function localeVariants(cluster, site) {
  const ready = cluster
    .filter((document) => document.frontmatter.status === 'published' && document.frontmatter.translation.status === 'ready')
    .sort((left, right) => left.frontmatter.locale.localeCompare(right.frontmatter.locale, 'en'))
  return ready.map((document) => ({
    href: `/${document.frontmatter.locale}/prompts/${document.frontmatter.slug}`,
    locale: document.frontmatter.locale,
    slug: document.frontmatter.slug,
    url: `${site.canonicalOrigin}/${document.frontmatter.locale}/prompts/${document.frontmatter.slug}`,
  }))
}

function articleLocaleVariants(cluster, site) {
  return articlePublicDocuments(cluster, site)
    .sort((left, right) => left.frontmatter.locale.localeCompare(right.frontmatter.locale, 'en'))
    .map((document) => ({
      href: `/${document.frontmatter.locale}/blog/${document.frontmatter.slug}`,
      locale: document.frontmatter.locale,
      slug: document.frontmatter.slug,
      url: `${site.canonicalOrigin}/${document.frontmatter.locale}/blog/${document.frontmatter.slug}`,
    }))
}

function articleTaxonomyHref(data) {
  if (data.axis === 'article-category') return `/${data.locale}/blog/category/${data.slug}`
  if (data.axis === 'article-author') return `/${data.locale}/blog?author=${data.slug}`
  return `/${data.locale}/blog?tag=${data.slug}`
}

function articleTaxonomyRef(record) {
  const data = record.value
  return {
    href: articleTaxonomyHref(data),
    id: data.id,
    name: data.name,
    slug: data.slug,
  }
}

function articleReadingTime(body) {
  const text = body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
  const cjk = text.match(/\p{Script=Han}/gu)?.length ?? 0
  const words = text.match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g)?.length ?? 0
  return Math.max(1, Math.ceil(cjk / 300 + words / 200))
}

function html(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function styledInlineText(value) {
  return html(value)
    .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_\n]+)__/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>')
}

function inlineMarkdown(value) {
  const pattern = /(`[^`\n]+`|!\[[^\]\n]*\]\([^\s)]+\)|\[[^\]\n]+\]\([^\s)]+\))/g
  let cursor = 0
  let output = ''
  for (const match of value.matchAll(pattern)) {
    output += styledInlineText(value.slice(cursor, match.index))
    const token = match[0]
    if (token.startsWith('`')) {
      output += `<code>${html(token.slice(1, -1))}</code>`
    } else if (token.startsWith('!')) {
      const parts = /^!\[([^\]]*)\]\(([^)]+)\)$/.exec(token)
      output += `<img src="${html(parts[2])}" alt="${html(parts[1])}" loading="lazy">`
    } else {
      const parts = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token)
      output += `<a href="${html(parts[2])}">${styledInlineText(parts[1])}</a>`
    }
    cursor = match.index + token.length
  }
  return output + styledInlineText(value.slice(cursor))
}

function headingID(label, seen) {
  const base = label
    .normalize('NFKC')
    .toLocaleLowerCase('en')
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-|-$/g, '') || 'section'
  const count = (seen.get(base) ?? 0) + 1
  seen.set(base, count)
  return count === 1 ? base : `${base}-${count}`
}

function articleBodyProjection(body) {
  const lines = body.split('\n')
  const firstContent = lines.findIndex((line) => line.trim() !== '')
  const rendered = []
  const toc = []
  const headingIDs = new Map()
  let paragraph = []
  let list = null
  let quote = []
  let codeFence = null

  function flushParagraph() {
    if (paragraph.length === 0) return
    rendered.push(`<p>${inlineMarkdown(paragraph.join(' '))}</p>`)
    paragraph = []
  }

  function flushList() {
    if (!list) return
    rendered.push(`<${list.type}>\n${list.items.map((item) => `<li>${inlineMarkdown(item)}</li>`).join('\n')}\n</${list.type}>`)
    list = null
  }

  function flushQuote() {
    if (quote.length === 0) return
    rendered.push(`<blockquote><p>${inlineMarkdown(quote.join(' '))}</p></blockquote>`)
    quote = []
  }

  function flushBlocks() {
    flushParagraph()
    flushList()
    flushQuote()
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    if (index === firstContent && line.startsWith('# ')) continue
    if (codeFence) {
      if (line === '```') {
        const className = codeFence.language === '' ? '' : ` class="language-${html(codeFence.language)}"`
        rendered.push(`<pre><code${className}>${html(codeFence.lines.join('\n'))}</code></pre>`)
        codeFence = null
      } else codeFence.lines.push(line)
      continue
    }
    const fence = /^```([A-Za-z0-9_-]*)\s*$/.exec(line)
    if (fence) {
      flushBlocks()
      codeFence = { language: fence[1], lines: [] }
      continue
    }
    const heading = /^(#{2,6})\s+(.+)$/.exec(line)
    if (heading) {
      flushBlocks()
      const level = heading[1].length
      const label = heading[2].trim()
      const id = headingID(label, headingIDs)
      toc.push({ id, label, level })
      rendered.push(`<h${level} id="${html(id)}">${inlineMarkdown(label)}</h${level}>`)
      continue
    }
    const unordered = /^\s*[-*+]\s+(.+)$/.exec(line)
    const ordered = /^\s*\d+[.)]\s+(.+)$/.exec(line)
    if (unordered || ordered) {
      flushParagraph()
      flushQuote()
      const type = ordered ? 'ol' : 'ul'
      if (list && list.type !== type) flushList()
      list ??= { items: [], type }
      list.items.push((ordered ?? unordered)[1])
      continue
    }
    const blockquote = /^>\s?(.*)$/.exec(line)
    if (blockquote) {
      flushParagraph()
      flushList()
      quote.push(blockquote[1])
      continue
    }
    if (/^\s{0,3}(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      flushBlocks()
      rendered.push('<hr>')
      continue
    }
    if (line.trim() === '') {
      flushBlocks()
      continue
    }
    flushList()
    flushQuote()
    paragraph.push(line.trim())
  }
  flushBlocks()
  return { bodyHtml: rendered.join('\n'), toc }
}

function articleSummaryRecord(document, localizedTaxonomies) {
  const data = document.frontmatter
  const taxonomy = (id) => localizedTaxonomies.get(`${id}\u0000${data.locale}`)
  return {
    author: articleTaxonomyRef(taxonomy(data.authorId)),
    category: articleTaxonomyRef(taxonomy(data.categoryIds[0])),
    cover: data.cover,
    excerpt: data.summary,
    href: `/${data.locale}/blog/${data.slug}`,
    id: data.id,
    locale: data.locale,
    publishedAt: data.publication.publishedAt,
    readingTimeMinutes: articleReadingTime(document.body),
    slug: data.slug,
    tags: data.tags.map((id) => articleTaxonomyRef(taxonomy(id))),
    title: data.title,
    updatedAt: data.publication.updatedAt,
  }
}

function articleFacets(documents, taxonomies) {
  const definitions = [
    ['authors', 'article-author', (data) => [data.authorId]],
    ['categories', 'article-category', (data) => data.categoryIds],
    ['tags', 'article-tag', (data) => data.tags],
  ]
  return Object.fromEntries(definitions.map(([name, axis, idsFor]) => {
    const records = taxonomies
      .filter((record) => record.value.axis === axis)
      .map((record) => {
        const count = documents.filter((document) => (
          document.frontmatter.locale === record.value.locale && idsFor(document.frontmatter).includes(record.value.id)
        )).length
        return {
          count,
          id: record.value.id,
          label: record.value.name,
          selected: false,
          slug: record.value.slug,
        }
      })
      .filter((record) => record.count > 0)
      .sort((left, right) => left.slug.localeCompare(right.slug, 'en'))
    return [name, records]
  }))
}

function articleDetailRecord(document, cluster, publicDocuments, localizedTaxonomies, site) {
  const data = document.frontmatter
  const summary = articleSummaryRecord(document, localizedTaxonomies)
  const projected = articleBodyProjection(document.body)
  const relatedByID = new Map(
    publicDocuments
      .filter((candidate) => candidate.frontmatter.locale === data.locale)
      .map((candidate) => [candidate.frontmatter.id, candidate]),
  )
  const related = (data.relatedArticleIds ?? [])
    .map((id) => relatedByID.get(id))
    .filter(Boolean)
    .map((candidate) => articleSummaryRecord(candidate, localizedTaxonomies))
  const variants = articleLocaleVariants(cluster, site)
  return {
    ...projected,
    citations: data.citations,
    localeVariants: variants.map(({ url: _url, ...variant }) => variant),
    related,
    revision: digest(Buffer.from(document.source)),
    seo: {
      canonicalUrl: data.seo.canonical,
      description: data.seo.description,
      hreflang: Object.fromEntries(variants.map((variant) => [variant.locale, variant.url])),
      robots: data.seo.robots,
      title: data.seo.title,
    },
    source: data.source,
    summary,
  }
}

function indexRecord(document, variants) {
  const data = document.frontmatter
  return {
    creator: data.creator === null ? null : {
      href: `/${data.locale}/prompts/creators/${data.creator.slug}`,
      id: data.creator.id,
      name: data.creator.name,
      slug: data.creator.slug,
    },
    id: data.id,
    contentType: data.contentType,
    excerpt: data.summary,
    href: `/${data.locale}/prompts/${data.slug}`,
    locale: data.locale,
    localeVariants: variants,
    models: data.models,
    media: data.media,
    metrics: data.metrics,
    publishedAt: data.publication.publishedAt,
    promptPreview: data.prompt.text,
    relatedPromptIds: data.relatedPromptIds,
    slug: data.slug,
    source: data.source,
    styles: data.styles,
    subjects: data.subjects,
    summary: data.summary,
    techniques: data.techniques,
    title: data.title,
    updatedAt: data.publication.updatedAt,
    useCases: data.useCases,
  }
}

function taxonomyMembers(taxonomy, documents) {
  const selector = taxonomy.selector
  return documents.filter((document) => {
    const data = document.frontmatter
    if (data.locale !== taxonomy.locale) return false
    if (selector.field === 'contentType') return data.contentType === selector.value
    if (selector.field === 'models') return data.models.includes(selector.value)
    return false
  })
}

function taxonomyIndexRecord(record, documents) {
  const data = record.value
  const members = taxonomyMembers(data, documents)
    .map((document) => document.frontmatter.id)
    .sort((left, right) => left.localeCompare(right, 'en'))
  return {
    axis: data.axis,
    description: data.description,
    href: data.surface.path,
    id: data.id,
    locale: data.locale,
    memberCount: members.length,
    memberIds: members,
    model: data.model,
    name: data.name,
    selector: data.selector,
    seo: data.seo,
    slug: data.slug,
    updatedAt: data.publication.updatedAt,
  }
}

function rssFor(locale, items, site, contentRevision) {
  const self = `${site.canonicalOrigin}/${locale}/prompts/rss.xml`
  const channel = `${site.canonicalOrigin}/${locale}/prompts`
  const records = items.map((document) => {
    const data = document.frontmatter
    return [
      '    <item>',
      `      <title>${xml(data.title)}</title>`,
      `      <link>${xml(data.seo.canonical)}</link>`,
      `      <guid isPermaLink="false">${xml(`${data.id}:${data.locale}`)}</guid>`,
      `      <description>${xml(data.summary)}</description>`,
      `      <pubDate>${new Date(data.publication.publishedAt).toUTCString()}</pubDate>`,
      '    </item>',
    ].join('\n')
  })
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '  <channel>',
    `    <title>${xml(`${site.siteName} · ${locale}`)}</title>`,
    `    <link>${xml(channel)}</link>`,
    `    <description>${xml(`Published Prompt content for ${locale}`)}</description>`,
    `    <language>${xml(locale)}</language>`,
    `    <atom:link href="${xml(self)}" rel="self" type="application/rss+xml"/>`,
    `    <generator>pseo-content ${xml(contentRevision)}</generator>`,
    ...records,
    '  </channel>',
    '</rss>',
    '',
  ].join('\n')
}

function articleRssFor(locale, items, site, contentRevision) {
  const self = `${site.canonicalOrigin}/${locale}/blog/rss.xml`
  const channel = `${site.canonicalOrigin}/${locale}/blog`
  const records = items.map((document) => {
    const data = document.frontmatter
    return [
      '    <item>',
      `      <title>${xml(data.title)}</title>`,
      `      <link>${xml(data.seo.canonical)}</link>`,
      `      <guid isPermaLink="false">${xml(`${data.id}:${data.locale}`)}</guid>`,
      `      <description>${xml(data.summary)}</description>`,
      `      <pubDate>${new Date(data.publication.publishedAt).toUTCString()}</pubDate>`,
      '    </item>',
    ].join('\n')
  })
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '  <channel>',
    `    <title>${xml(`${site.siteName} Blog · ${locale}`)}</title>`,
    `    <link>${xml(channel)}</link>`,
    `    <description>${xml(`Published Article content for ${locale}`)}</description>`,
    `    <language>${xml(locale)}</language>`,
    `    <atom:link href="${xml(self)}" rel="self" type="application/rss+xml"/>`,
    `    <generator>pseo-content ${xml(contentRevision)}</generator>`,
    ...records,
    '  </channel>',
    '</rss>',
    '',
  ].join('\n')
}

function sitemapFor(documents, surfaces, site, articleDocuments = [], articleTaxonomies = []) {
  const byCanonicalID = new Map()
  for (const document of documents) {
    const group = byCanonicalID.get(document.frontmatter.id) ?? []
    group.push(document)
    byCanonicalID.set(document.frontmatter.id, group)
  }
  const records = []
  for (const locale of site.publishedLocales) {
    if (!surfaces.some((surface) => surface.locale === locale && surface.level === 'L1' && surface.robots === 'index,follow')) continue
    const latest = documents
      .filter((document) => document.frontmatter.locale === locale)
      .map((document) => document.frontmatter.publication.updatedAt)
      .sort()
      .at(-1)
    records.push([
      '  <url>',
      `    <loc>${xml(`${site.canonicalOrigin}/${locale}/prompts`)}</loc>`,
      ...(latest ? [`    <lastmod>${xml(latest)}</lastmod>`] : []),
      '  </url>',
    ].join('\n'))
  }
  for (const document of [...documents].sort((left, right) => left.frontmatter.seo.canonical.localeCompare(right.frontmatter.seo.canonical, 'en'))) {
    const data = document.frontmatter
    const path = `/${data.locale}/prompts/${data.slug}`
    if (!surfaces.some((surface) => surface.path === path && surface.robots === 'index,follow')) continue
    const alternates = localeVariants(byCanonicalID.get(data.id), site)
      .map((variant) => `    <xhtml:link rel="alternate" hreflang="${xml(variant.locale)}" href="${xml(variant.url)}"/>`)
    records.push([
      '  <url>',
      `    <loc>${xml(data.seo.canonical)}</loc>`,
      ...alternates,
      `    <lastmod>${xml(data.publication.updatedAt)}</lastmod>`,
      '  </url>',
    ].join('\n'))
  }
  const articleByCanonicalID = new Map()
  for (const document of articleDocuments) {
    const group = articleByCanonicalID.get(document.frontmatter.id) ?? []
    group.push(document)
    articleByCanonicalID.set(document.frontmatter.id, group)
  }
  const localizedTaxonomies = new Map(
    articleTaxonomies.map((record) => [`${record.value.id}\u0000${record.value.locale}`, record]),
  )
  for (const locale of site.publishedLocales) {
    const localized = articleDocuments.filter((document) => document.frontmatter.locale === locale)
    if (localized.length === 0) continue
    const latest = localized.map((document) => document.frontmatter.publication.updatedAt).sort().at(-1)
    records.push([
      '  <url>',
      `    <loc>${xml(`${site.canonicalOrigin}/${locale}/blog`)}</loc>`,
      ...(latest ? [`    <lastmod>${xml(latest)}</lastmod>`] : []),
      '  </url>',
    ].join('\n'))
  }
  for (const document of [...articleDocuments].sort((left, right) => (
    left.frontmatter.seo.canonical.localeCompare(right.frontmatter.seo.canonical, 'en')
  ))) {
    const data = document.frontmatter
    const alternates = articleLocaleVariants(articleByCanonicalID.get(data.id), site)
      .map((variant) => `    <xhtml:link rel="alternate" hreflang="${xml(variant.locale)}" href="${xml(variant.url)}"/>`)
    records.push([
      '  <url>',
      `    <loc>${xml(data.seo.canonical)}</loc>`,
      ...alternates,
      `    <lastmod>${xml(data.publication.updatedAt)}</lastmod>`,
      '  </url>',
    ].join('\n'))
  }
  const categories = new Map()
  for (const document of articleDocuments) {
    for (const categoryID of document.frontmatter.categoryIds) {
      const key = `${categoryID}\u0000${document.frontmatter.locale}`
      const group = categories.get(key) ?? []
      group.push(document)
      categories.set(key, group)
    }
  }
  for (const [key, categoryDocuments] of [...categories.entries()].sort(([left], [right]) => left.localeCompare(right, 'en'))) {
    const taxonomy = localizedTaxonomies.get(key)
    if (!taxonomy?.value.indexable || taxonomy.value.seo?.robots !== 'index,follow') continue
    const latest = categoryDocuments.map((document) => document.frontmatter.publication.updatedAt).sort().at(-1)
    records.push([
      '  <url>',
      `    <loc>${xml(taxonomy.value.seo.canonical)}</loc>`,
      ...(latest ? [`    <lastmod>${xml(latest)}</lastmod>`] : []),
      '  </url>',
    ].join('\n'))
  }
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...records,
    '</urlset>',
    '',
  ].join('\n')
}

function isInside(parent, child) {
  const relative = path.relative(parent, child)
  return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative)
}

function assertSafeOutput(outputRoot) {
  const generatedRoot = path.join(repositoryRoot, 'infra/generated')
  const temporaryRoot = path.resolve(os.tmpdir())
  if (!isInside(generatedRoot, outputRoot) && outputRoot !== generatedRoot && !isInside(temporaryRoot, outputRoot)) {
    throw new Error('Output must stay under infra/generated or the operating-system temporary directory')
  }
}

export async function writeTree(outputRoot, files) {
  assertSafeOutput(outputRoot)
  const parent = path.dirname(outputRoot)
  await mkdir(parent, { recursive: true })
  const temporary = await mkdtemp(path.join(parent, '.pseo-static-'))
  try {
    for (const [relative, bytes] of [...files.entries()].sort(([left], [right]) => left.localeCompare(right, 'en'))) {
      const destination = path.join(temporary, ...relative.split('/'))
      await mkdir(path.dirname(destination), { recursive: true })
      await writeFile(destination, bytes, { flag: 'wx' })
    }
    await rm(outputRoot, { force: true, recursive: true })
    await rename(temporary, outputRoot)
  } catch (error) {
    await rm(temporary, { force: true, recursive: true })
    throw error
  }
}

export async function buildStaticContent(options = {}) {
  const validated = await validateContent(options)
  const documents = releaseDocuments(validated.documents, validated.site)
  const indexable = indexableDocuments(validated.documents, validated.site)
  const articleDocuments = articlePublicDocuments(validated.articleDocuments, validated.site)
  const articleTaxonomies = validated.articleTaxonomies.filter((record) => readyPublished(record.value, validated.site))
  const byCanonicalID = new Map()
  for (const document of documents) {
    const group = byCanonicalID.get(document.frontmatter.id) ?? []
    group.push(document)
    byCanonicalID.set(document.frontmatter.id, group)
  }
  const articlesByCanonicalID = new Map()
  for (const document of articleDocuments) {
    const group = articlesByCanonicalID.get(document.frontmatter.id) ?? []
    group.push(document)
    articlesByCanonicalID.set(document.frontmatter.id, group)
  }
  const localizedArticleTaxonomies = new Map(
    articleTaxonomies.map((record) => [`${record.value.id}\u0000${record.value.locale}`, record]),
  )
  const files = new Map()
  for (const locale of validated.site.publishedLocales) {
    const localized = documents
      .filter((document) => document.frontmatter.locale === locale)
      .sort((left, right) => left.frontmatter.slug.localeCompare(right.frontmatter.slug, 'en'))
    const items = localized.map((document) => indexRecord(document, localeVariants(byCanonicalID.get(document.frontmatter.id), validated.site)))
    files.set(`${locale}/prompts/index.json`, jsonBytes({
      contentRevision: validated.contentRevision,
      items,
      locale,
      schemaVersion: 1,
      total: items.length,
    }))
    const indexablePaths = new Set(
      validated.surfaces
        .filter((surface) => surface.locale === locale && surface.robots === 'index,follow')
        .map((surface) => surface.path),
    )
    const feedItems = indexable.filter((document) => indexablePaths.has(`/${locale}/prompts/${document.frontmatter.slug}`))
    files.set(`${locale}/prompts/rss.xml`, Buffer.from(rssFor(locale, feedItems, validated.site, validated.contentRevision)))
    const taxonomyItems = validated.taxonomies
      .filter((record) => readyPublished(record.value, validated.site) && record.value.locale === locale)
      .sort((left, right) => {
        const axis = left.value.axis.localeCompare(right.value.axis, 'en')
        return axis === 0 ? left.value.slug.localeCompare(right.value.slug, 'en') : axis
      })
      .map((record) => taxonomyIndexRecord(record, documents))
    files.set(`${locale}/taxonomies/index.json`, jsonBytes({
      contentRevision: validated.contentRevision,
      items: taxonomyItems,
      locale,
      schemaVersion: 1,
      total: taxonomyItems.length,
    }))

    const localizedArticles = articleDocuments
      .filter((document) => document.frontmatter.locale === locale)
      .sort((left, right) => {
        const published = right.frontmatter.publication.publishedAt.localeCompare(left.frontmatter.publication.publishedAt, 'en')
        return published === 0 ? left.frontmatter.slug.localeCompare(right.frontmatter.slug, 'en') : published
      })
    const localizedArticleTaxonomyRecords = articleTaxonomies.filter((record) => record.value.locale === locale)
    const articleItems = localizedArticles.map((document) => articleSummaryRecord(document, localizedArticleTaxonomies))
    files.set(`${locale}/articles/index.json`, jsonBytes({
      data: articleItems,
      facets: articleFacets(localizedArticles, localizedArticleTaxonomyRecords),
      meta: {
        contentRevision: validated.contentRevision,
        indexVersion: validated.contentRevision,
        rankingVersion: 'article-newest-v1',
        requestId: `static-build:${validated.contentRevision}`,
      },
      page: {
        hasMore: false,
        limit: articleItems.length,
        nextCursor: null,
        total: articleItems.length,
      },
    }))
    files.set(
      `${locale}/blog/rss.xml`,
      Buffer.from(articleRssFor(locale, localizedArticles, validated.site, validated.contentRevision)),
    )
    for (const document of localizedArticles) {
      files.set(
        `${locale}/articles/by-slug/${document.frontmatter.slug}.json`,
        jsonBytes(articleDetailRecord(
          document,
          articlesByCanonicalID.get(document.frontmatter.id),
          articleDocuments,
          localizedArticleTaxonomies,
          validated.site,
        )),
      )
    }
    const categoryGroups = new Map()
    for (const document of localizedArticles) {
      for (const categoryID of document.frontmatter.categoryIds) {
        const group = categoryGroups.get(categoryID) ?? []
        group.push(document)
        categoryGroups.set(categoryID, group)
      }
    }
    for (const [categoryID, categoryDocuments] of [...categoryGroups.entries()].sort(([left], [right]) => left.localeCompare(right, 'en'))) {
      const categoryRecord = localizedArticleTaxonomies.get(`${categoryID}\u0000${locale}`)
      if (!categoryRecord) continue
      const data = categoryRecord.value
      const variants = articleTaxonomies
        .filter((record) => record.value.id === categoryID)
        .sort((left, right) => left.value.locale.localeCompare(right.value.locale, 'en'))
        .map((record) => ({
          href: articleTaxonomyHref(record.value),
          locale: record.value.locale,
          slug: record.value.slug,
          url: record.value.seo.canonical,
        }))
      const items = categoryDocuments.map((document) => articleSummaryRecord(document, localizedArticleTaxonomies))
      files.set(`${locale}/article-categories/${data.slug}.json`, jsonBytes({
        entity: {
          articleCount: items.length,
          description: data.description,
          id: data.id,
          localeVariants: variants.map(({ url: _url, ...variant }) => variant),
          name: data.name,
          seo: {
            canonicalUrl: data.seo.canonical,
            description: data.seo.description,
            hreflang: Object.fromEntries(variants.map((variant) => [variant.locale, variant.url])),
            title: data.seo.title,
          },
          slug: data.slug,
          updatedAt: data.publication.updatedAt,
        },
        items,
        page: {
          hasMore: false,
          limit: items.length,
          nextCursor: null,
          total: items.length,
        },
        schemaVersion: 1,
      }))
    }
  }
  const indexableSurfaceExists = (
    validated.surfaces.some((surface) => surface.robots === 'index,follow') || articleDocuments.length > 0
  )
  files.set(
    'robots.txt',
    Buffer.from(indexableSurfaceExists
      ? `User-agent: *\nAllow: /\nSitemap: ${validated.site.canonicalOrigin}/sitemap.xml\n`
      : 'User-agent: *\nDisallow: /\n'),
  )
  files.set(
    'sitemap.xml',
    Buffer.from(sitemapFor(indexable, validated.surfaces, validated.site, articleDocuments, articleTaxonomies)),
  )
  const levelOrder = new Map(['L1', 'L2', 'L3', 'L4'].map((level, index) => [level, index]))
  const routes = [...validated.surfaces]
    .sort((left, right) => {
      const level = levelOrder.get(left.level) - levelOrder.get(right.level)
      return level === 0 ? left.path.localeCompare(right.path, 'en') : level
    })
    .map((surface) => ({
      ...(surface.targetId === null ? {} : { artifactId: surface.targetId }),
      kind: surface.kind,
      locale: surface.locale,
      path: surface.path,
    }))
  for (const locale of validated.site.publishedLocales) {
    const localizedArticles = articleDocuments.filter((document) => document.frontmatter.locale === locale)
    if (localizedArticles.length === 0) continue
    routes.push({ kind: 'blog-index', locale, path: `/${locale}/blog` })
    const categories = new Map()
    for (const document of localizedArticles) {
      routes.push({
        artifactId: document.frontmatter.id,
        kind: 'article-detail',
        locale,
        path: `/${locale}/blog/${document.frontmatter.slug}`,
      })
      for (const categoryID of document.frontmatter.categoryIds) categories.set(categoryID, true)
    }
    for (const categoryID of [...categories.keys()].sort((left, right) => left.localeCompare(right, 'en'))) {
      const category = localizedArticleTaxonomies.get(`${categoryID}\u0000${locale}`)
      if (!category) continue
      routes.push({
        artifactId: categoryID,
        kind: 'article-category',
        locale,
        path: `/${locale}/blog/category/${category.value.slug}`,
      })
    }
  }
  files.set('route-manifest.json', jsonBytes({
    contentRevision: validated.contentRevision,
    publishedLocales: validated.site.publishedLocales,
    routes,
    schemaVersion: 1,
  }))

  const listedFiles = [...files.entries()]
    .sort(([left], [right]) => left.localeCompare(right, 'en'))
    .map(([file, bytes]) => ({ bytes: bytes.byteLength, path: file, sha256: digest(bytes) }))
  const manifest = {
    contentRevision: validated.contentRevision,
    counts: Object.fromEntries(validated.site.publishedLocales.map((locale) => [locale, documents.filter((document) => document.frontmatter.locale === locale).length])),
    files: listedFiles,
    publishedLocales: validated.site.publishedLocales,
    schemaVersion: 1,
    supportedLocales: validated.site.locales,
  }
  files.set('build-manifest.json', jsonBytes(manifest))
  const outputRoot = path.resolve(options.outputRoot ?? path.join(repositoryRoot, 'infra/generated/static'))
  await writeTree(outputRoot, files)
  return { ...manifest, outputRoot }
}

export async function copyTree(source, destination) {
  await cp(source, destination, { recursive: true })
}

export { repositoryRoot }
