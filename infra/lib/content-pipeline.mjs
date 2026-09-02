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
  const ids = await readdir(root, { withFileTypes: true })
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

async function taxonomyFiles(contentRoot) {
  const root = path.join(contentRoot, 'taxonomies')
  const result = []
  const allowedAxes = new Set(['content-type', 'model'])
  const axes = await readdir(root, { withFileTypes: true })
  for (const axis of axes.sort((left, right) => left.name.localeCompare(right.name, 'en'))) {
    if (axis.isSymbolicLink()) throw new Error(`Symlink is forbidden in content/taxonomies: ${axis.name}`)
    if (!axis.isDirectory() || !allowedAxes.has(axis.name)) {
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
        result.push(path.join(directory, locale.name))
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

function internalRoutes(surfaces, site) {
  const routes = new Set(['/sitemap.xml', '/robots.txt'])
  for (const locale of site.publishedLocales) {
    routes.add(`/${locale}/prompts/rss.xml`)
  }
  for (const surface of surfaces) routes.add(surface.path)
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
      continue
    }

    const key = `${surface.targetId}\u0000${surface.locale}`
    const target = surface.targetType === 'taxonomy' ? taxonomyTargets.get(key) : promptTargets.get(key)
    if (!target) {
      diagnostics.push(diagnostic(surfaceRecord.file, 'surface_target_missing', `${surface.path} target ${surface.targetId} has no localized Git record`))
      continue
    }
    const data = target.value ?? target.frontmatter
    exposedTargets.add(key)
    if (!readyPublished(data, site)) {
      diagnostics.push(diagnostic(surfaceRecord.file, 'surface_target_unpublished', `${surface.path} target is not a ready published locale`))
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
  return contract.surfaces
}

function validateLinks(documents, surfaces, site, diagnostics) {
  const routes = internalRoutes(surfaces, site)
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

export async function validateContent(options = {}) {
  const contentRoot = path.resolve(options.contentRoot ?? path.join(repositoryRoot, 'content'))
  const schemaRoot = path.resolve(options.schemaRoot ?? path.join(repositoryRoot, 'schemas'))
  const sitePath = path.join(contentRoot, 'site.json')
  const surfacesPath = path.join(contentRoot, 'surfaces.json')
  const contentSchemaPath = path.join(schemaRoot, 'content.schema.json')
  const siteSchemaPath = path.join(schemaRoot, 'site.schema.json')
  const surfacesSchemaPath = path.join(schemaRoot, 'surfaces.schema.json')
  const taxonomySchemaPath = path.join(schemaRoot, 'taxonomy.schema.json')
  await Promise.all([
    regularFile(sitePath, 'content/site.json'),
    regularFile(surfacesPath, 'content/surfaces.json'),
    regularFile(contentSchemaPath, 'schemas/content.schema.json'),
    regularFile(siteSchemaPath, 'schemas/site.schema.json'),
    regularFile(surfacesSchemaPath, 'schemas/surfaces.schema.json'),
    regularFile(taxonomySchemaPath, 'schemas/taxonomy.schema.json'),
  ])
  const [
    siteRecord,
    surfacesRecord,
    contentSchemaRecord,
    siteSchemaRecord,
    surfacesSchemaRecord,
    taxonomySchemaRecord,
    files,
    taxonomyPaths,
  ] = await Promise.all([
    readJson(sitePath),
    readJson(surfacesPath),
    readJson(contentSchemaPath),
    readJson(siteSchemaPath),
    readJson(surfacesSchemaPath),
    readJson(taxonomySchemaPath),
    promptFiles(contentRoot),
    taxonomyFiles(contentRoot),
  ])
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
  if (documents.length === 0) diagnostics.push(diagnostic(contentRoot, 'content_empty', 'at least one Prompt locale is required'))
  validateClusters(documents, siteRecord.value, diagnostics)
  const taxonomies = []
  for (const file of taxonomyPaths) {
    const record = await readJson(file)
    record.file = file
    taxonomies.push(record)
    revisionInputs.push([`content/${path.relative(contentRoot, file).split(path.sep).join('/')}`, record.bytes])
    validateTaxonomy(record, taxonomySchemaRecord.value, siteRecord.value, contentRoot, diagnostics)
  }
  if (taxonomies.length === 0) diagnostics.push(diagnostic(contentRoot, 'taxonomy_empty', 'at least one localized taxonomy record is required'))
  validateTaxonomyClusters(taxonomies, siteRecord.value, diagnostics)
  const surfaceRecord = { ...surfacesRecord, file: surfacesPath }
  const surfaces = validateSurfaces(
    surfaceRecord,
    surfacesSchemaRecord.value,
    siteRecord.value,
    documents,
    taxonomies,
    diagnostics,
  )
  validateLinks(documents, surfaces, siteRecord.value, diagnostics)
  if (!releaseDocuments(documents, siteRecord.value).length) {
    diagnostics.push(diagnostic(contentRoot, 'published_content_empty', 'at least one ready Prompt must be published'))
  }
  if (diagnostics.length > 0) throw new ContentValidationError(diagnostics)

  const hash = createHash('sha256')
  for (const [logicalPath, bytes] of revisionInputs.sort(([left], [right]) => left.localeCompare(right, 'en'))) {
    hash.update(logicalPath)
    hash.update('\0')
    hash.update(bytes)
    hash.update('\0')
  }
  return {
    contentRevision: `sha256:${hash.digest('hex')}`,
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

function sitemapFor(documents, surfaces, site) {
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
  const byCanonicalID = new Map()
  for (const document of documents) {
    const group = byCanonicalID.get(document.frontmatter.id) ?? []
    group.push(document)
    byCanonicalID.set(document.frontmatter.id, group)
  }
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
  }
  const indexableSurfaceExists = validated.surfaces.some((surface) => surface.robots === 'index,follow')
  files.set(
    'robots.txt',
    Buffer.from(indexableSurfaceExists
      ? `User-agent: *\nAllow: /\nSitemap: ${validated.site.canonicalOrigin}/sitemap.xml\n`
      : 'User-agent: *\nDisallow: /\n'),
  )
  files.set('sitemap.xml', Buffer.from(sitemapFor(indexable, validated.surfaces, validated.site)))
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
