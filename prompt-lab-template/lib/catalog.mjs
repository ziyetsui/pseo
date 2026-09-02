import { createHash } from 'node:crypto'
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'

const ID = /^prm_[a-z0-9_]{3,64}$/
const TAXONOMY_ID = /^(?:cty|mdl)_[a-z0-9_]{3,64}$/
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const LOCALE = /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/
const PUBLIC_STATUS = 'published'
const REVIEW_READY = 'ready'

function json(value) {
  return `${JSON.stringify(value, null, 2)}\n`
}

function fail(errors) {
  if (errors.length > 0) throw new Error(`Prompt Lab validation failed:\n- ${errors.join('\n- ')}`)
}

async function filesBelow(root, predicate = () => true) {
  const found = []
  async function walk(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name)
      if (entry.isDirectory()) await walk(absolute)
      else if (entry.isFile() && predicate(absolute)) found.push(absolute)
    }
  }
  await walk(root)
  return found.sort((left, right) => left.localeCompare(right, 'en'))
}

function parseFrontmatter(source, file) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)
  if (!match) throw new Error(`${file}: expected JSON-compatible frontmatter between --- markers`)
  try {
    return { body: source.slice(match[0].length), data: JSON.parse(match[1]) }
  } catch (error) {
    throw new Error(`${file}: frontmatter must be valid JSON: ${error.message}`)
  }
}

function requiredString(value, field, file, errors) {
  if (typeof value !== 'string' || value.trim() === '') errors.push(`${file}: ${field} must be a non-empty string`)
}

function validUrl(value) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

function inside(parent, child) {
  const relative = path.relative(parent, child)
  return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative)
}

async function validateLinks(body, absoluteFile, displayFile, errors) {
  const linkPattern = /!?\[[^\]]*\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g
  for (const match of body.matchAll(linkPattern)) {
    const target = match[1]
    if (target.startsWith('#') || target.startsWith('mailto:') || validUrl(target)) continue
    let local
    try {
      local = decodeURIComponent(target.split('#')[0])
    } catch {
      errors.push(`${displayFile}: malformed Markdown link: ${target}`)
      continue
    }
    const resolved = path.resolve(path.dirname(absoluteFile), local)
    try {
      const info = await stat(resolved)
      if (!info.isFile()) errors.push(`${displayFile}: missing local Markdown link: ${target}`)
    } catch {
      errors.push(`${displayFile}: missing local Markdown link: ${target}`)
    }
  }
}

function validateSite(site, errors) {
  if (site?.schemaVersion !== 1) errors.push('content/site.json: schemaVersion must equal 1')
  requiredString(site?.siteName, 'siteName', 'content/site.json', errors)
  if (!Array.isArray(site?.locales) || site.locales.length === 0) errors.push('content/site.json: locales must be a non-empty array')
  if (!Array.isArray(site?.publishedLocales) || site.publishedLocales.length === 0) errors.push('content/site.json: publishedLocales must be a non-empty array')
  for (const locale of site?.locales ?? []) {
    if (typeof locale !== 'string' || !LOCALE.test(locale)) errors.push(`content/site.json: invalid locale ${JSON.stringify(locale)}`)
  }
  for (const locale of site?.publishedLocales ?? []) {
    if (!(site?.locales ?? []).includes(locale)) errors.push(`content/site.json: published locale ${locale} is not supported`)
  }
  if (new Set(site?.locales ?? []).size !== (site?.locales ?? []).length) errors.push('content/site.json: locales must be unique')
  if (new Set(site?.publishedLocales ?? []).size !== (site?.publishedLocales ?? []).length) errors.push('content/site.json: publishedLocales must be unique')
  if (!(site?.locales ?? []).includes(site?.defaultLocale)) errors.push('content/site.json: defaultLocale must be supported')
}

async function validatePrompt(record, contentRoot, errors) {
  const { body, data, absolute, file } = record
  const parts = file.split('/')
  const expectedId = parts.at(-2)
  const expectedLocale = parts.at(-1).replace(/\.md$/, '')
  if (data?.schemaVersion !== 1) errors.push(`${file}: schemaVersion must equal 1`)
  if (data?.type !== 'prompt') errors.push(`${file}: type must equal prompt`)
  if (typeof data?.id !== 'string' || !ID.test(data.id)) errors.push(`${file}: invalid id`)
  if (data?.id !== expectedId) errors.push(`${file}: id must match its directory`)
  if (typeof data?.locale !== 'string' || !LOCALE.test(data.locale)) errors.push(`${file}: invalid locale`)
  if (data?.locale !== expectedLocale) errors.push(`${file}: locale must match its filename`)
  if (typeof data?.slug !== 'string' || !SLUG.test(data.slug)) errors.push(`${file}: invalid slug`)
  for (const field of ['title', 'summary', 'status']) requiredString(data?.[field], field, file, errors)
  if (!['draft', 'review', 'published', 'tombstoned'].includes(data?.status)) errors.push(`${file}: unsupported status`)
  if (typeof data?.indexable !== 'boolean') errors.push(`${file}: indexable must be boolean`)
  requiredString(data?.contentType, 'contentType', file, errors)
  if (!Array.isArray(data?.models)) errors.push(`${file}: models must be an array`)
  else if (!data.models.every((model) => typeof model === 'string' && SLUG.test(model))) errors.push(`${file}: models must contain slugs`)
  requiredString(data?.prompt?.language, 'prompt.language', file, errors)
  requiredString(data?.prompt?.text, 'prompt.text', file, errors)
  if (!Array.isArray(data?.media)) errors.push(`${file}: media must be an array`)
  requiredString(data?.source?.platform, 'source.platform', file, errors)
  requiredString(data?.source?.sourceId, 'source.sourceId', file, errors)
  requiredString(data?.source?.authorHandle, 'source.authorHandle', file, errors)
  if (!validUrl(data?.source?.url)) errors.push(`${file}: source.url must be an absolute HTTP(S) URL`)
  requiredString(data?.publication?.publishedAt, 'publication.publishedAt', file, errors)
  requiredString(data?.publication?.updatedAt, 'publication.updatedAt', file, errors)
  requiredString(data?.translation?.status, 'translation.status', file, errors)
  if (!['draft', 'review', 'ready', 'stale'].includes(data?.translation?.status)) errors.push(`${file}: unsupported translation.status`)
  if (data?.translation?.status === REVIEW_READY) requiredString(data?.translation?.reviewer, 'translation.reviewer', file, errors)
  for (const [index, media] of (data?.media ?? []).entries()) {
    requiredString(media?.url, `media[${index}].url`, file, errors)
    requiredString(media?.alt, `media[${index}].alt`, file, errors)
    if (typeof media?.url === 'string' && !validUrl(media.url)) {
      const target = path.resolve(contentRoot, media.url)
      if (!inside(contentRoot, target)) {
        errors.push(`${file}: media reference must stay under content: ${media.url}`)
        continue
      }
      try {
        const info = await stat(target)
        if (!info.isFile()) errors.push(`${file}: media reference does not exist: ${media.url}`)
      } catch {
        errors.push(`${file}: media reference does not exist: ${media.url}`)
      }
    }
  }
  await validateLinks(body, absolute, file, errors)
}

function validateTaxonomy(record, errors) {
  const { data, file } = record
  const parts = file.split('/')
  const expectedAxis = parts.at(-3)
  const expectedId = parts.at(-2)
  const expectedLocale = parts.at(-1).replace(/\.json$/, '')
  if (data?.schemaVersion !== 1) errors.push(`${file}: schemaVersion must equal 1`)
  if (data?.type !== 'taxonomy') errors.push(`${file}: type must equal taxonomy`)
  if (typeof data?.id !== 'string' || !TAXONOMY_ID.test(data.id)) errors.push(`${file}: invalid taxonomy id`)
  if (data?.id !== expectedId || data?.axis !== expectedAxis || data?.locale !== expectedLocale) errors.push(`${file}: taxonomy identity must match its path`)
  if (!['content-type', 'model'].includes(data?.axis)) errors.push(`${file}: unsupported taxonomy axis`)
  if (typeof data?.slug !== 'string' || !SLUG.test(data.slug)) errors.push(`${file}: invalid slug`)
  for (const field of ['name', 'description', 'status']) requiredString(data?.[field], field, file, errors)
  if (!['draft', 'review', 'published', 'tombstoned'].includes(data?.status)) errors.push(`${file}: unsupported status`)
  if (!['contentType', 'models'].includes(data?.selector?.field)) errors.push(`${file}: invalid selector.field`)
  requiredString(data?.selector?.value, 'selector.value', file, errors)
  requiredString(data?.translation?.status, 'translation.status', file, errors)
  if (!['draft', 'review', 'ready', 'stale'].includes(data?.translation?.status)) errors.push(`${file}: unsupported translation.status`)
  if (data?.translation?.status === REVIEW_READY) requiredString(data?.translation?.reviewer, 'translation.reviewer', file, errors)
}

function publicRecord(data, publishedLocales) {
  return publishedLocales.includes(data.locale) && data.status === PUBLIC_STATUS && data.translation?.status === REVIEW_READY
}

export async function validateRepository({ root }) {
  const repositoryRoot = path.resolve(root)
  const contentRoot = path.join(repositoryRoot, 'content')
  const errors = []
  let site
  try {
    site = JSON.parse(await readFile(path.join(contentRoot, 'site.json'), 'utf8'))
  } catch (error) {
    throw new Error(`content/site.json: ${error.message}`)
  }
  validateSite(site, errors)

  const promptRoot = path.join(contentRoot, 'prompts')
  const promptFiles = await filesBelow(promptRoot, (file) => file.endsWith('.md'))
  const prompts = []
  for (const absolute of promptFiles) {
    const file = path.relative(repositoryRoot, absolute).split(path.sep).join('/')
    try {
      const parsed = parseFrontmatter(await readFile(absolute, 'utf8'), file)
      const record = { ...parsed, absolute, file }
      prompts.push(record)
      await validatePrompt(record, contentRoot, errors)
    } catch (error) {
      errors.push(error.message)
    }
  }
  if (prompts.length === 0) errors.push('content/prompts: at least one Prompt Markdown file is required')

  const taxonomyRoot = path.join(contentRoot, 'taxonomies')
  const taxonomyFiles = await filesBelow(taxonomyRoot, (file) => file.endsWith('.json'))
  const taxonomies = []
  for (const absolute of taxonomyFiles) {
    const file = path.relative(repositoryRoot, absolute).split(path.sep).join('/')
    try {
      const data = JSON.parse(await readFile(absolute, 'utf8'))
      const record = { absolute, data, file }
      taxonomies.push(record)
      validateTaxonomy(record, errors)
    } catch (error) {
      errors.push(`${file}: invalid JSON: ${error.message}`)
    }
  }

  const identities = new Set()
  const slugs = new Set()
  for (const { data, file } of prompts) {
    const identity = `${data.id}\0${data.locale}`
    const slug = `${data.locale}\0${data.slug}`
    if (identities.has(identity)) errors.push(`${file}: duplicate Prompt id and locale`)
    if (slugs.has(slug)) errors.push(`${file}: duplicate published slug in locale`)
    identities.add(identity)
    slugs.add(slug)
    if (!(site.locales ?? []).includes(data.locale)) errors.push(`${file}: locale is not declared in content/site.json`)
  }

  const taxonomyIdentities = new Set()
  const taxonomySlugs = new Set()
  for (const { data, file } of taxonomies) {
    const identity = `${data.id}\0${data.locale}`
    const slug = `${data.axis}\0${data.locale}\0${data.slug}`
    if (taxonomyIdentities.has(identity)) errors.push(`${file}: duplicate taxonomy id and locale`)
    if (taxonomySlugs.has(slug)) errors.push(`${file}: duplicate taxonomy slug in locale and axis`)
    taxonomyIdentities.add(identity)
    taxonomySlugs.add(slug)
    if (!(site.locales ?? []).includes(data.locale)) errors.push(`${file}: locale is not declared in content/site.json`)
    const expectedField = data.axis === 'content-type' ? 'contentType' : 'models'
    if (data.selector?.field !== expectedField) errors.push(`${file}: selector.field must match taxonomy axis`)
  }

  const publishedTaxonomies = taxonomies.filter(({ data }) => publicRecord(data, site.publishedLocales))
  for (const { data, file } of prompts.filter(({ data }) => publicRecord(data, site.publishedLocales))) {
    const expected = [
      ['contentType', data.contentType],
      ...(data.models ?? []).map((model) => ['models', model]),
    ]
    for (const [field, value] of expected) {
      if (!publishedTaxonomies.some(({ data: taxonomy }) => taxonomy.locale === data.locale && taxonomy.selector?.field === field && taxonomy.selector?.value === value)) {
        errors.push(`${file}: no reviewed taxonomy for ${field}=${value}`)
      }
    }
  }
  fail(errors)
  return { contentRoot, prompts, repositoryRoot, site, taxonomies }
}

async function contentRevision(validated) {
  const inputFiles = await filesBelow(validated.contentRoot)
  const hash = createHash('sha256')
  for (const absolute of inputFiles) {
    const relative = path.relative(validated.contentRoot, absolute).split(path.sep).join('/')
    hash.update(relative).update('\0').update(await readFile(absolute)).update('\0')
  }
  return `sha256:${hash.digest('hex')}`
}

function promptItem(record, revision) {
  const data = record.data
  return {
    attribution: {
      authorHandle: data.source.authorHandle,
      platform: data.source.platform,
      sourceUrl: data.source.url,
    },
    contentRevision: revision,
    contentType: data.contentType,
    id: data.id,
    locale: data.locale,
    media: data.media,
    models: data.models,
    prompt: data.prompt,
    publishedAt: data.publication.publishedAt,
    slug: data.slug,
    source: data.source,
    summary: data.summary,
    title: data.title,
    updatedAt: data.publication.updatedAt,
  }
}

function taxonomyItem(record, items) {
  const data = record.data
  const memberIds = items
    .filter((item) => item.locale === data.locale)
    .filter((item) => data.selector.field === 'contentType' ? item.contentType === data.selector.value : item.models.includes(data.selector.value))
    .map((item) => item.id)
    .sort((left, right) => left.localeCompare(right, 'en'))
  return {
    axis: data.axis,
    description: data.description,
    id: data.id,
    locale: data.locale,
    memberCount: memberIds.length,
    memberIds,
    name: data.name,
    selector: data.selector,
    slug: data.slug,
  }
}

function localeReadme(site, locale, items, revision) {
  const title = locale === 'zh-CN' ? `${site.siteName} · 中文` : `${site.siteName} · ${locale}`
  const empty = locale === 'zh-CN' ? '当前没有已审核并发布的 Prompt。' : 'No reviewed, published prompts are available yet.'
  const rows = items.length === 0
    ? empty
    : ['| Prompt | Type | Source |', '| --- | --- | --- |', ...items.map((item) => `| [${item.title}](../../content/prompts/${item.id}/${item.locale}.md) | ${item.contentType} | [${item.attribution.authorHandle}](${item.source.url}) |`)].join('\n')
  return `<!-- GENERATED FILE. Run npm run generate; do not edit directly. -->\n\n# ${title}\n\nContent revision: \`${revision}\`\n\n${rows}\n`
}

function rootReadme(site, counts, revision) {
  const rows = site.locales.map((locale) => `| [${locale}](locales/${locale}/README.md) | ${counts[locale]} |`).join('\n')
  return `<!-- GENERATED FILE. Run npm run generate; do not edit directly. -->\n\n# ${site.siteName}\n\nA public, Git-reviewed library of reusable prompts. Every catalog entry comes from checked-in Markdown; draft CMS data is never read by this build.\n\nContent revision: \`${revision}\`\n\n## Language editions\n\n| Locale | Reviewed prompts |\n| --- | ---: |\n${rows}\n\nMachine-readable consumers can use [catalog.json](catalog.json). See the [content contract](docs/CONTENT-CONTRACT.md) for the publication gate.\n\n## Contribute\n\nUse the issue forms to propose a prompt, correction, or translation. Issues create review candidates only; maintainers publish content through a reviewed pull request. See [CONTRIBUTING.md](CONTRIBUTING.md).\n\nBefore creating a real public repository, complete the [bootstrap checklist](docs/BOOTSTRAP.md), [security setup](SECURITY.md), and [license decision](LICENSE-DECISION.md).\n`
}

export async function buildCatalog({ root }) {
  const validated = await validateRepository({ root })
  const revision = await contentRevision(validated)
  const items = validated.prompts
    .filter(({ data }) => publicRecord(data, validated.site.publishedLocales))
    .map((record) => promptItem(record, revision))
    .sort((left, right) => left.locale.localeCompare(right.locale, 'en') || left.slug.localeCompare(right.slug, 'en') || left.id.localeCompare(right.id, 'en'))
  const taxonomies = validated.taxonomies
    .filter(({ data }) => publicRecord(data, validated.site.publishedLocales))
    .map((record) => taxonomyItem(record, items))
    .sort((left, right) => left.locale.localeCompare(right.locale, 'en') || left.axis.localeCompare(right.axis, 'en') || left.slug.localeCompare(right.slug, 'en'))
  const counts = Object.fromEntries(validated.site.locales.map((locale) => [locale, items.filter((item) => item.locale === locale).length]))
  const catalog = {
    contentRevision: revision,
    counts,
    items,
    locales: [...validated.site.locales],
    schemaVersion: 1,
    total: items.length,
  }
  const files = new Map([['catalog.json', json(catalog)]])
  files.set('README.md', rootReadme(validated.site, counts, revision))
  for (const locale of validated.site.locales) {
    const localized = items.filter((item) => item.locale === locale)
    const localizedTaxonomies = taxonomies.filter((item) => item.locale === locale)
    files.set(`locales/${locale}/README.md`, localeReadme(validated.site, locale, localized, revision))
    files.set(`locales/${locale}/index.json`, json({ contentRevision: revision, items: localized, locale, schemaVersion: 1, total: localized.length }))
    files.set(`locales/${locale}/taxonomies.json`, json({ contentRevision: revision, items: localizedTaxonomies, locale, schemaVersion: 1, total: localizedTaxonomies.length }))
  }
  return { catalog, contentRevision: revision, files, taxonomies }
}

export async function writeGenerated({ root }) {
  const repositoryRoot = path.resolve(root)
  const result = await buildCatalog({ root: repositoryRoot })
  for (const [relative, source] of result.files) {
    const destination = path.join(repositoryRoot, ...relative.split('/'))
    await mkdir(path.dirname(destination), { recursive: true })
    await writeFile(destination, source)
  }
  return result
}

export async function checkGenerated({ root }) {
  const repositoryRoot = path.resolve(root)
  const result = await buildCatalog({ root: repositoryRoot })
  const stale = []
  for (const [relative, source] of result.files) {
    try {
      if (await readFile(path.join(repositoryRoot, ...relative.split('/')), 'utf8') !== source) stale.push(relative)
    } catch {
      stale.push(relative)
    }
  }
  if (stale.length > 0) throw new Error(`generated output is stale: ${stale.sort().join(', ')}; run npm run generate`)
  return result
}
