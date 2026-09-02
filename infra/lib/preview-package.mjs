import { createHash } from 'node:crypto'
import { lstat, readFile, readdir } from 'node:fs/promises'
import path from 'node:path'

import { repositoryRoot, writeTree } from './content-pipeline.mjs'

const robotsMeta = '<meta name="robots" content="noindex,nofollow,noarchive">'

function digest(bytes) {
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`
}

function jsonBytes(value) {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`)
}

async function readTree(root, label) {
  const result = new Map()
  const rootEntry = await lstat(root)
  if (!rootEntry.isDirectory() || rootEntry.isSymbolicLink()) {
    throw new Error(`${label} must be a real directory`)
  }

  async function walk(directory, prefix = '') {
    const entries = await readdir(directory, { withFileTypes: true })
    for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name, 'en'))) {
      const relative = prefix === '' ? entry.name : `${prefix}/${entry.name}`
      const source = path.join(directory, entry.name)
      if (entry.isSymbolicLink()) throw new Error(`${label} cannot contain symlink ${relative}`)
      if (entry.isDirectory()) await walk(source, relative)
      else if (entry.isFile()) result.set(relative, await readFile(source))
      else throw new Error(`${label} contains unsupported entry ${relative}`)
    }
  }

  await walk(root)
  return result
}

function protectHtml(bytes, relative) {
  const source = bytes.toString('utf8')
  let replaced = false
  const withReplacement = source.replace(/<meta\b[^>]*>/gi, (tag) => {
    if (!/\bname\s*=\s*["']robots["']/i.test(tag)) return tag
    replaced = true
    return robotsMeta
  })
  if (replaced) return Buffer.from(withReplacement)
  if (!/<\/head>/i.test(source)) throw new Error(`${relative} has no </head>; cannot enforce Preview noindex`)
  return Buffer.from(source.replace(/<\/head>/i, `  ${robotsMeta}\n</head>`))
}

function verifyStaticManifest(files) {
  const required = ['build-manifest.json', 'robots.txt', 'route-manifest.json', 'sitemap.xml']
  for (const relative of required) {
    if (!files.has(relative)) throw new Error(`static content is missing ${relative}`)
  }
  let manifest
  try {
    manifest = JSON.parse(files.get('build-manifest.json').toString('utf8'))
  } catch (error) {
    throw new Error(`static build manifest is invalid JSON: ${error.message}`)
  }
  if (manifest.schemaVersion !== 1 || typeof manifest.contentRevision !== 'string') {
    throw new Error('static build manifest has an unsupported contract')
  }
  for (const record of manifest.files ?? []) {
    const bytes = files.get(record.path)
    if (!bytes) throw new Error(`static build manifest references missing ${record.path}`)
    if (bytes.byteLength !== record.bytes || digest(bytes) !== record.sha256) {
      throw new Error(`static build manifest integrity failed for ${record.path}`)
    }
  }
  for (const locale of manifest.publishedLocales ?? []) {
    for (const relative of [
      `${locale}/prompts/index.json`,
      `${locale}/prompts/rss.xml`,
      `${locale}/taxonomies/index.json`,
    ]) {
      if (!files.has(relative)) throw new Error(`static content is missing ${relative}`)
    }
  }
  let routeManifest
  try {
    routeManifest = JSON.parse(files.get('route-manifest.json').toString('utf8'))
  } catch (error) {
    throw new Error(`static route manifest is invalid JSON: ${error.message}`)
  }
  if (
    routeManifest.schemaVersion !== 1 ||
    routeManifest.contentRevision !== manifest.contentRevision ||
    JSON.stringify(routeManifest.publishedLocales) !== JSON.stringify(manifest.publishedLocales) ||
    !Array.isArray(routeManifest.routes)
  ) {
    throw new Error('static route manifest does not match the build manifest')
  }
  return { build: manifest, routes: routeManifest.routes }
}

function routeCandidates(route) {
  if (typeof route !== 'string' || !route.startsWith('/') || route.includes('?') || route.includes('#')) return []
  const segments = route.slice(1).split('/')
  if (segments.some((segment) => segment === '' || segment === '.' || segment === '..')) return []
  const relative = segments.join('/')
  return [`${relative}.html`, `${relative}/index.html`]
}

function verifyFrontendRoutes(frontendFiles, routes) {
  const missing = []
  for (const route of routes) {
    const candidates = routeCandidates(route.path)
    if (candidates.length === 0) throw new Error(`static route manifest contains unsafe path ${route.path}`)
    if (!candidates.some((candidate) => frontendFiles.has(candidate))) missing.push(route.path)
  }
  if (missing.length > 0) {
    throw new Error(`frontend export is missing published route(s): ${missing.sort().join(', ')}`)
  }
}

function mergeWithoutCollision(target, source, label, replaceable = new Set()) {
  for (const [relative, bytes] of source) {
    const prior = target.get(relative)
    if (prior && !prior.equals(bytes) && !replaceable.has(relative)) {
      throw new Error(`${label} collides with a different ${relative}`)
    }
    target.set(relative, bytes)
  }
}

export async function preparePreview(options = {}) {
  const frontendRoot = path.resolve(options.frontendRoot ?? path.join(repositoryRoot, 'frontend/out'))
  const staticContentRoot = path.resolve(options.staticContentRoot ?? path.join(repositoryRoot, 'infra/generated/static'))
  const outputRoot = path.resolve(options.outputRoot ?? path.join(repositoryRoot, 'infra/generated/preview-site'))
  if (outputRoot === frontendRoot || outputRoot === staticContentRoot) {
    throw new Error('Preview output must not overwrite an input tree')
  }

  const [frontendFiles, staticFiles] = await Promise.all([
    readTree(frontendRoot, 'frontend export'),
    readTree(staticContentRoot, 'static content'),
  ])
  if (!frontendFiles.has('404.html')) throw new Error('frontend export is missing 404.html')
  if (![...frontendFiles.keys()].some((relative) => relative.endsWith('.html'))) {
    throw new Error('frontend export contains no HTML')
  }
  const contentManifest = verifyStaticManifest(staticFiles)
  verifyFrontendRoutes(frontendFiles, contentManifest.routes)

  const files = new Map(frontendFiles)
  mergeWithoutCollision(files, staticFiles, 'static content', new Set(['robots.txt']))
  for (const [relative, bytes] of [...files]) {
    if (relative.endsWith('.html')) files.set(relative, protectHtml(bytes, relative))
  }
  files.set('robots.txt', Buffer.from('User-agent: *\nDisallow: /\n'))
  const inheritedHeaders = files.has('_headers') ? `${files.get('_headers').toString('utf8').trimEnd()}\n\n` : ''
  files.set(
    '_headers',
    Buffer.from(
      `${inheritedHeaders}/*\n  X-Robots-Tag: noindex, nofollow, noarchive\n  Cache-Control: no-store\n  X-Content-Type-Options: nosniff\n`,
    ),
  )

  const records = [...files.entries()]
    .sort(([left], [right]) => left.localeCompare(right, 'en'))
    .map(([relative, bytes]) => ({ bytes: bytes.byteLength, path: relative, sha256: digest(bytes) }))
  const previewManifest = {
    contentRevision: contentManifest.build.contentRevision,
    files: records,
    noindex: true,
    schemaVersion: 1,
  }
  files.set('preview-manifest.json', jsonBytes(previewManifest))
  await writeTree(outputRoot, files)
  return { ...previewManifest, outputRoot }
}
