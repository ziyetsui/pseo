import { sha256, stableJson } from '../../scripts/sync-cms-snapshot.mjs'

export const SOURCE_URL = 'https://example.com/prompts/country-poster'
export const TAKEDOWN_URL = 'https://example.com/takedown'
export const REVISION_HASH = `sha256:${'a'.repeat(64)}`

export function richPrompt({ community = false, locale = 'en' } = {}) {
  const data = {
    schemaVersion: 1,
    id: 'prm_01jabcdef',
    type: 'prompt',
    locale,
    sourceLocale: locale,
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
    outcome: {
      outputType: 'image',
      purpose: 'Create a reusable country poster.',
      platforms: ['higgsfield'],
      characteristics: ['reproducible'],
    },
    media: [],
    metrics: {
      likes: null,
      bookmarks: null,
      comments: null,
      reposts: null,
      views: null,
      observedAt: '2026-09-02T00:00:00Z',
    },
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
      canonical: `https://example.com/${locale}/prompts/country-poster`,
      robots: 'index,follow',
    },
    publication: {
      publishedAt: '2026-09-03T00:00:00Z',
      updatedAt: '2026-09-03T00:00:00Z',
      sourceRevision: REVISION_HASH,
    },
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

export function richTaxonomy(axis, { locale = 'en' } = {}) {
  const contentType = axis === 'content-type'
  const id = contentType ? 'cty_image' : 'mdl_model_agnostic'
  const slug = contentType ? 'image' : 'model-agnostic'
  return {
    schemaVersion: 1,
    id,
    type: 'taxonomy',
    axis,
    locale,
    sourceLocale: locale,
    slug,
    name: contentType ? 'Image' : 'Model agnostic',
    description: contentType ? 'Published image Prompt collection.' : 'Prompts that work across supported models.',
    status: 'published',
    indexable: false,
    selector: { field: contentType ? 'contentType' : 'models', value: slug },
    surface: {
      level: contentType ? 'L2' : 'L3',
      kind: contentType ? 'content-type-gallery' : 'model-detail',
      path: contentType ? `/${locale}/prompts/image` : `/${locale}/prompts/models/model-agnostic`,
    },
    model: contentType ? null : { officialUrl: null, capabilities: [], inputs: [], outputs: [], limitations: [] },
    sourceRef: SOURCE_URL,
    seo: {
      title: contentType ? 'Image Prompt collection' : 'Model agnostic Prompts',
      description: contentType ? 'Browse the approved public image Prompt collection.' : 'Browse approved Prompts that work across supported models.',
      canonical: contentType ? `https://example.com/${locale}/prompts/image` : `https://example.com/${locale}/prompts/models/model-agnostic`,
      robots: 'noindex,nofollow',
    },
    publication: {
      publishedAt: '2026-09-03T00:00:00Z',
      updatedAt: '2026-09-03T00:00:00Z',
      sourceRevision: REVISION_HASH,
    },
    translation: { status: 'ready', translatedFromRevision: null, reviewer: 'reviewer-en' },
  }
}

export function snapshotSources({ community = false, empty = false, locale = 'en' } = {}) {
  const promptPath = `content/prompts/prm_01jabcdef/${locale}.md`
  const taxonomyEntries = empty
    ? []
    : [
        [`content/taxonomies/content-type/cty_image/${locale}.json`, richTaxonomy('content-type', { locale })],
        [`content/taxonomies/model/mdl_model_agnostic/${locale}.json`, richTaxonomy('model', { locale })],
      ]
  const rights = empty
    ? []
    : community
      ? [{
          id: 'prm_01jabcdef',
          locale,
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
          locale,
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
        locale,
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
        locale,
        rightsRevision: REVISION_HASH,
        sourceRevision: REVISION_HASH,
      }]
  const localeReadme = community && !empty
    ? `# English Prompt Lab\n\nexample-author\n\n${SOURCE_URL}\n\nThe author retains rights; this Prompt is not offered under the repository content license.\n\n${TAKEDOWN_URL}\n`
    : '# English Prompt Lab\n'
  return {
    'README.md': '# Public Prompt Lab\n',
    'catalog.json': stableJson({ schemaVersion: 1, exportRevision: 'cmsrev_00000001', total: items.length, items }),
    'content/site.json': stableJson({ schemaVersion: 1, siteName: 'Test Prompt Lab', defaultLocale: locale, locales: [locale], publishedLocales: [locale] }),
    ...(!empty ? { [promptPath]: richPrompt({ community, locale }) } : {}),
    ...Object.fromEntries(taxonomyEntries.map(([relative, record]) => [relative, stableJson(record)])),
    'governance/content-rights.json': stableJson({ schemaVersion: 1, exportRevision: 'cmsrev_00000001', total: rights.length, items: rights }),
    'governance/publication-audit.json': stableJson({ schemaVersion: 1, exportRevision: 'cmsrev_00000001', total: auditItems.length, items: auditItems }),
    [`locales/${locale}/README.md`]: localeReadme,
    [`locales/${locale}/index.json`]: stableJson({ schemaVersion: 1, exportRevision: 'cmsrev_00000001', locale, total: items.length, items }),
    [`locales/${locale}/taxonomies.json`]: stableJson({
      schemaVersion: 1,
      exportRevision: 'cmsrev_00000001',
      locale,
      total: taxonomyEntries.length,
      items: taxonomyEntries.map(([relative, record]) => ({ path: relative, ...record })),
    }),
  }
}

function rewriteRevision(sources, exportRevision) {
  const rewritten = { ...sources }
  for (const relative of Object.keys(rewritten).filter((path) =>
    ['catalog.json', 'governance/content-rights.json', 'governance/publication-audit.json'].includes(path)
      || /^locales\/(?:en|zh-CN)\/(?:index|taxonomies)\.json$/.test(path))) {
    if (rewritten[relative] === undefined) continue
    const value = JSON.parse(rewritten[relative])
    value.exportRevision = exportRevision
    rewritten[relative] = stableJson(value)
  }
  return rewritten
}

export function makeEnvelope(overrides = {}) {
  const exportRevision = overrides.exportRevision ?? 'cmsrev_00000001'
  const exporterVersion = overrides.exporterVersion ?? '1.0.0'
  const sources = rewriteRevision(overrides.sources ?? snapshotSources(overrides), exportRevision)
  const files = Object.entries(sources)
    .sort(([left], [right]) => left.localeCompare(right, 'en'))
    .map(([relative, source]) => {
      const bytes = Buffer.isBuffer(source) ? source : Buffer.from(source)
      return { content: bytes.toString('base64'), encoding: 'base64', path: relative, sha256: sha256(bytes) }
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
    files: files.map(({ path, sha256, content }) => ({ path, sha256, bytes: Buffer.from(content, 'base64').length })),
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
