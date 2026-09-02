type RecordValue = Record<string, unknown>
type CmsAxis = 'collection' | 'creator' | 'model' | 'style' | 'subject' | 'technique' | 'use_case'

interface WireframePrompt {
  readonly id: string
  readonly slug: string
  readonly title: string
  readonly summary: string | null
  readonly promptText: string
  readonly contentType: string
  readonly modelSlugs: readonly string[]
  readonly useCaseSlugs: readonly string[]
  readonly techniqueSlugs: readonly string[]
  readonly styleSlugs: readonly string[]
  readonly subjectSlugs: readonly string[]
  readonly creatorId: string
  readonly handle: string
  readonly sourceUrl: string
  readonly publishedAt: string | null
  readonly likes: number | null
  readonly bookmarks: number | null
  readonly views: number | null
  readonly reposts: number | null
  readonly replies: number | null
  readonly metricsRounded: boolean
  readonly media: readonly { readonly id: string; readonly kind: 'image' | 'video'; readonly src: string; readonly alt: string }[]
  readonly variables: readonly { readonly token: string; readonly label: string; readonly defaultValue: string; readonly options: readonly string[] }[]
  readonly steps: readonly { readonly order: number; readonly title: string; readonly body: string }[]
  readonly requiredInputs: readonly string[]
  readonly optionalInputs: readonly string[]
  readonly parameters: readonly { readonly label: string; readonly value: string }[]
  readonly variations: readonly { readonly title: string; readonly variableValue: string }[]
}

interface WireframeTaxonomy {
  readonly id: string
  readonly axis: string
  readonly slug: string
  readonly label: string
  readonly labelZh: string | null
}

interface WireframeCreator {
  readonly id: string
  readonly handle: string
}

interface WireframeModel {
  readonly slug: string
  readonly label: string
}

interface WireframeCollection {
  readonly slug: string
  readonly title: string
  readonly subtitle: string
}

function frontendFixturePath(name: string): string {
  return `../../../frontend/src/data/wireframe/${name}.ts`
}

const { WIREFRAME_PROMPTS } = await import(frontendFixturePath('prompts')) as {
  readonly WIREFRAME_PROMPTS: readonly WireframePrompt[]
}
const { WIREFRAME_TAXONOMIES } = await import(frontendFixturePath('taxonomies')) as {
  readonly WIREFRAME_TAXONOMIES: readonly WireframeTaxonomy[]
}
const { WIREFRAME_CREATORS } = await import(frontendFixturePath('creators')) as {
  readonly WIREFRAME_CREATORS: readonly WireframeCreator[]
}
const { WIREFRAME_MODELS } = await import(frontendFixturePath('models')) as {
  readonly WIREFRAME_MODELS: readonly WireframeModel[]
}
const { WIREFRAME_COLLECTIONS } = await import(frontendFixturePath('collections')) as {
  readonly WIREFRAME_COLLECTIONS: readonly WireframeCollection[]
}
const { WIREFRAME_SNAPSHOT } = await import(frontendFixturePath('snapshot')) as {
  readonly WIREFRAME_SNAPSHOT: { readonly observedAt: string }
}

const ASSUMED_MEDIA_DIMENSIONS = { height: 360, width: 640 } as const
const DRAFT_STATE = {
  _status: 'draft',
  gitPublication: { state: 'unpublished' },
} as const

export interface SeedPayloadLocalApi {
  create(args: { readonly collection: string; readonly data: RecordValue; readonly draft?: boolean; readonly overrideAccess?: boolean }): Promise<RecordValue>
  find(args: { readonly collection: string; readonly where?: Record<string, unknown>; readonly limit?: number; readonly overrideAccess?: boolean }): Promise<{ docs: RecordValue[] }>
}

interface SeedTaxonomy {
  readonly axis: CmsAxis
  readonly data: RecordValue
  readonly naturalKey: string
}

interface SeedArtifact {
  readonly data: RecordValue
  readonly naturalKey: string
  readonly variant: { readonly data: RecordValue; readonly naturalKey: string }
}

interface SeedSource {
  readonly data: RecordValue
  readonly naturalKey: string
}

export interface WireframeSeedFixture {
  readonly artifacts: readonly SeedArtifact[]
  readonly sources: readonly SeedSource[]
  readonly taxonomies: readonly SeedTaxonomy[]
}

export interface SeedCounts {
  readonly artifacts: number
  readonly localeVariants: number
  readonly sourceEvidence: number
  readonly taxonomies: number
}

export interface WireframeSeedResult {
  readonly created: SeedCounts
  readonly skipped: SeedCounts
  readonly wouldCreate: SeedCounts
}

function asRecord(value: unknown): RecordValue {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as RecordValue
    : {}
}

function axisForWireframe(axis: string): CmsAxis | null {
  switch (axis) {
    case 'model':
    case 'technique':
    case 'style':
    case 'subject':
      return axis
    case 'useCase':
      return 'use_case'
    default:
      return null
  }
}

function contentType(value: string): 'image' | 'video' | 'other' {
  return value === 'image' || value === 'video' ? value : 'other'
}

function taxonomyKey(axis: CmsAxis, identity: string): string {
  return `${axis}:${identity}`
}

function taxonomyData(
  axis: CmsAxis,
  identity: string,
  slug: string,
  name: string,
  description: string | null,
  wireframe: unknown,
): SeedTaxonomy {
  return {
    axis,
    naturalKey: taxonomyKey(axis, identity),
    data: {
      ...DRAFT_STATE,
      taxonomyKey: taxonomyKey(axis, identity),
      axis,
      locale: 'zh-CN',
      sourceLocale: 'en',
      slug,
      name,
      description,
      translation: { translationStatus: 'draft' },
      seo: { robots: 'noindex,nofollow' },
      betaPreview: { wireframe },
    },
  }
}

function list(value: readonly string[]): RecordValue[] {
  return value.map((item) => ({ value: item }))
}

function counts(): SeedCounts {
  return { artifacts: 0, localeVariants: 0, sourceEvidence: 0, taxonomies: 0 }
}

function increment(current: SeedCounts, key: keyof SeedCounts): SeedCounts {
  return { ...current, [key]: current[key] + 1 }
}

function sortByNaturalKey<T extends { readonly naturalKey: string }>(items: readonly T[]): T[] {
  return [...items].sort((left, right) => left.naturalKey.localeCompare(right.naturalKey, 'en'))
}

/**
 * Purely maps the generated frontend wireframe fixture into incomplete Payload
 * drafts. It intentionally does not manufacture missing prompt parameters,
 * localization, source dates, SEO copy, or measured media dimensions.
 */
export function buildWireframeSeedFixture(): WireframeSeedFixture {
  const taxonomies = new Map<string, SeedTaxonomy>()
  const addTaxonomy = (taxonomy: SeedTaxonomy): void => {
    taxonomies.set(taxonomy.naturalKey, taxonomy)
  }

  for (const term of WIREFRAME_TAXONOMIES) {
    const axis = axisForWireframe(term.axis)
    if (axis === null) continue
    addTaxonomy(taxonomyData(axis, term.slug, term.slug, term.labelZh ?? term.label, null, term))
  }
  for (const creator of WIREFRAME_CREATORS) {
    addTaxonomy(taxonomyData('creator', creator.id, creator.id, creator.handle, null, creator))
  }
  for (const model of WIREFRAME_MODELS) {
    const key = taxonomyKey('model', model.slug)
    const existing = taxonomies.get(key)
    const taxonomy = asRecord(existing?.data.betaPreview).wireframe ?? null
    addTaxonomy({
      ...taxonomyData('model', model.slug, model.slug, model.label, null, model),
      data: {
        ...existing?.data,
        betaPreview: { model, taxonomy },
      },
    })
  }
  for (const collection of WIREFRAME_COLLECTIONS) {
    addTaxonomy(taxonomyData('collection', collection.slug, collection.slug, collection.title, collection.subtitle, collection))
  }

  const artifacts: SeedArtifact[] = WIREFRAME_PROMPTS.map((prompt) => {
    const artifactKey = `prm_${prompt.id}`
    const mappedContentType = contentType(prompt.contentType)
    return {
      naturalKey: artifactKey,
      data: {
        ...DRAFT_STATE,
        artifactKey,
        contentType: mappedContentType,
        sourceLocale: 'en',
        draftWorkflowState: 'needs_review',
        prompt: {
          language: 'en',
          text: prompt.promptText,
          variables: prompt.variables.map((variable) => ({
            key: variable.token,
            label: variable.label,
            required: false,
            defaultValue: variable.defaultValue,
            options: list(variable.options),
          })),
        },
        outcome: { outputType: mappedContentType, platforms: [] },
        requiredInputs: list(prompt.requiredInputs),
        optionalInputs: list(prompt.optionalInputs),
        parameters: prompt.parameters.map((parameter) => ({
          // The extract supplies a display label/value but no machine key or
          // type. Retain the source label as the key and describe its known
          // string representation instead of inventing a semantic key/type.
          key: parameter.label,
          label: parameter.label,
          value: parameter.value,
          valueType: 'text',
          required: false,
          options: [],
        })),
        models: prompt.modelSlugs.map((slug) => taxonomyKey('model', slug)),
        useCases: prompt.useCaseSlugs.map((slug) => taxonomyKey('use_case', slug)),
        techniques: prompt.techniqueSlugs.map((slug) => taxonomyKey('technique', slug)),
        styles: prompt.styleSlugs.map((slug) => taxonomyKey('style', slug)),
        subjects: prompt.subjectSlugs.map((slug) => taxonomyKey('subject', slug)),
        media: prompt.media.map((media) => ({
          assetId: media.id,
          mediaType: media.kind,
          url: media.src,
          // Canonical fields are intentionally null: the wireframe did not
          // measure these dimensions. The preview-only assumption is below.
          width: null,
          height: null,
          alt: media.alt,
          posterUrl: null,
        })),
        metrics: {
          likes: prompt.likes,
          bookmarks: prompt.bookmarks,
          comments: prompt.replies,
          reposts: prompt.reposts,
          views: prompt.views,
          observedAt: `${WIREFRAME_SNAPSHOT.observedAt}T00:00:00Z`,
        },
        examples: [],
        creator: taxonomyKey('creator', prompt.creatorId),
        relatedPrompts: [],
        actions: { canCopy: true, tryUrl: null },
        betaPreview: {
          // Variations remain here because the beta schema has no editable
          // variation model. The preview projector treats this as its source.
          wireframe: prompt,
          mediaAssumptions: {
            dimensions: ASSUMED_MEDIA_DIMENSIONS,
            provenance: 'wireframe-assumption',
          },
        },
      },
      variant: {
        naturalKey: `${artifactKey}:zh-CN`,
        data: {
          ...DRAFT_STATE,
          localeVariantKey: `${artifactKey}:zh-CN`,
          locale: 'zh-CN',
          sourceLocale: 'en',
          slug: prompt.slug,
          title: prompt.title,
          summary: prompt.summary,
          indexable: false,
          bodyMarkdown: '',
          localizedOutcome: { purpose: null, characteristics: [] },
          workflow: prompt.steps.map((step) => ({
            position: step.order,
            title: step.title,
            body: step.body,
          })),
          translation: { translationStatus: 'draft' },
          seo: { robots: 'noindex,nofollow' },
          betaPreview: { source: 'wireframe-flow-proto', wireframeId: prompt.id },
        },
      },
    }
  })

  const sources: SeedSource[] = WIREFRAME_PROMPTS.map((prompt) => ({
    naturalKey: `wireframe:${prompt.id}`,
    data: {
      ...DRAFT_STATE,
      recordType: 'source',
      sourcePlatform: 'x',
      sourceUrl: prompt.sourceUrl,
      sourceId: `wireframe:${prompt.id}`,
      creatorHandle: prompt.handle,
      sourcePublishedDate: prompt.publishedAt,
      observedAt: `${WIREFRAME_SNAPSHOT.observedAt}T00:00:00Z`,
      rightsStatus: 'review_required',
      isPrimarySource: true,
      betaPreview: {
        source: { metricsRounded: prompt.metricsRounded, publishedAt: prompt.publishedAt, wireframeId: prompt.id },
        wireframe: { handle: prompt.handle, sourceUrl: prompt.sourceUrl },
      },
    },
  }))

  return {
    artifacts: sortByNaturalKey(artifacts),
    sources: sortByNaturalKey(sources),
    taxonomies: sortByNaturalKey([...taxonomies.values()]),
  }
}

async function findExisting(
  payload: SeedPayloadLocalApi,
  collection: string,
  field: string,
  value: string,
): Promise<RecordValue | null> {
  const result = await payload.find({
    collection,
    where: { [field]: { equals: value } },
    limit: 1,
    overrideAccess: true,
  })
  return result.docs[0] ?? null
}

async function createMissing(
  payload: SeedPayloadLocalApi,
  collection: string,
  field: string,
  naturalKey: string,
  data: RecordValue,
  dryRun: boolean,
): Promise<{ readonly created: boolean; readonly document: RecordValue | null }> {
  const existing = await findExisting(payload, collection, field, naturalKey)
  if (existing !== null) return { created: false, document: existing }
  if (dryRun) return { created: true, document: null }
  return {
    created: true,
    document: await payload.create({ collection, data, draft: true, overrideAccess: true }),
  }
}

function relationIds(data: RecordValue, taxonomyIds: ReadonlyMap<string, string | number>): RecordValue {
  const relations = ['models', 'useCases', 'techniques', 'styles', 'subjects'] as const
  const mapped = { ...data }
  for (const relation of relations) {
    mapped[relation] = (Array.isArray(data[relation]) ? data[relation] : []).map((key) => taxonomyIds.get(String(key)) ?? key)
  }
  const creator = data.creator
  mapped.creator = typeof creator === 'string' ? (taxonomyIds.get(creator) ?? creator) : creator
  return mapped
}

export async function seedWireframeFixture(
  payload: SeedPayloadLocalApi,
  options: { readonly dryRun?: boolean } = {},
): Promise<WireframeSeedResult> {
  const fixture = buildWireframeSeedFixture()
  const dryRun = options.dryRun === true
  let created = counts()
  let skipped = counts()
  let wouldCreate = counts()
  const taxonomyIds = new Map<string, string | number>()
  const artifactIds = new Map<string, string | number>()

  for (const taxonomy of fixture.taxonomies) {
    const result = await createMissing(payload, 'taxonomies', 'taxonomyKey', taxonomy.naturalKey, taxonomy.data, dryRun)
    if (result.created) {
      created = dryRun ? created : increment(created, 'taxonomies')
      wouldCreate = dryRun ? increment(wouldCreate, 'taxonomies') : wouldCreate
    } else {
      skipped = increment(skipped, 'taxonomies')
    }
    const id = result.document?.id
    if (typeof id === 'string' || typeof id === 'number') taxonomyIds.set(taxonomy.naturalKey, id)
  }

  for (const artifact of fixture.artifacts) {
    const result = await createMissing(
      payload,
      'prompt-artifacts',
      'artifactKey',
      artifact.naturalKey,
      relationIds(artifact.data, taxonomyIds),
      dryRun,
    )
    if (result.created) {
      created = dryRun ? created : increment(created, 'artifacts')
      wouldCreate = dryRun ? increment(wouldCreate, 'artifacts') : wouldCreate
    } else {
      skipped = increment(skipped, 'artifacts')
    }
    const id = result.document?.id
    if (typeof id === 'string' || typeof id === 'number') artifactIds.set(artifact.naturalKey, id)
  }

  for (const artifact of fixture.artifacts) {
    const artifactId = artifactIds.get(artifact.naturalKey)
    if (artifactId === undefined && !dryRun) continue
    const result = await createMissing(
      payload,
      'locale-variants',
      'localeVariantKey',
      artifact.variant.naturalKey,
      { ...artifact.variant.data, artifact: artifactId ?? artifact.naturalKey },
      dryRun,
    )
    if (result.created) {
      created = dryRun ? created : increment(created, 'localeVariants')
      wouldCreate = dryRun ? increment(wouldCreate, 'localeVariants') : wouldCreate
    } else {
      skipped = increment(skipped, 'localeVariants')
    }
  }

  for (const source of fixture.sources) {
    const artifactKey = `prm_${source.naturalKey.slice('wireframe:'.length)}`
    const result = await createMissing(
      payload,
      'source-evidence',
      'sourceId',
      source.naturalKey,
      { ...source.data, artifact: artifactIds.get(artifactKey) ?? artifactKey },
      dryRun,
    )
    if (result.created) {
      created = dryRun ? created : increment(created, 'sourceEvidence')
      wouldCreate = dryRun ? increment(wouldCreate, 'sourceEvidence') : wouldCreate
    } else {
      skipped = increment(skipped, 'sourceEvidence')
    }
  }

  return { created, skipped, wouldCreate }
}
