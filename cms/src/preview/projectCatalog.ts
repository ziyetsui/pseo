import { createHash } from 'node:crypto'

import type {
  CmsPreviewData,
  CmsPreviewEnvelope,
  Collection,
  Creator,
  PreviewCatalogDocuments,
  PreviewDocument,
  PreviewLocale,
  PromptParameter,
  PromptStep,
  PromptVariable,
  WireframeMediaRecord,
  WireframeModelRecord,
  WireframePromptRecord,
  WireframeTaxonomyRecord,
} from './types.ts'

const SNAPSHOT = {
  observedAt: '2026-08-20',
  indexVersion: 'wireframe-flow-proto',
  source: 'docs/wireframes/flow-proto.html',
} as const

const CONTENT_TYPE_TAXONOMIES: WireframeTaxonomyRecord[] = [
  {
    id: 'contentType:image',
    axis: 'contentType',
    slug: 'image',
    label: '图片',
    labelZh: '图片',
    aliases: [],
    wireframeDeclaredCount: 324,
    appearsOn: ['l2'],
  },
  {
    id: 'contentType:unknown',
    axis: 'contentType',
    slug: 'unknown',
    label: '未标注类型',
    labelZh: '未标注类型',
    aliases: [],
    wireframeDeclaredCount: null,
    appearsOn: ['l1'],
  },
  {
    id: 'contentType:video',
    axis: 'contentType',
    slug: 'video',
    label: '视频',
    labelZh: '视频',
    aliases: [],
    wireframeDeclaredCount: 479,
    appearsOn: ['l2'],
  },
]

function record(value: unknown): PreviewDocument | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as PreviewDocument)
    : null
}

function records(value: unknown): PreviewDocument[] {
  return Array.isArray(value) ? value.map(record).filter((item): item is PreviewDocument => item !== null) : []
}

function stringValue(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function nullableString(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function nullableNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function booleanValue(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function textList(value: unknown): string[] {
  return records(value)
    .map((item) => stringValue(item.value))
    .filter(Boolean)
}

function relationshipId(value: unknown): string | null {
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  const relationship = record(value)
  const id = relationship?.id
  return typeof id === 'string' || typeof id === 'number' ? String(id) : null
}

function relationshipIds(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map(relationshipId).filter((item): item is string => item !== null)
    : []
}

function betaRecord(document: PreviewDocument, name = 'wireframe'): PreviewDocument | null {
  return record(record(document.betaPreview)?.[name])
}

function taxonomyAxis(value: unknown): WireframeTaxonomyRecord['axis'] | null {
  if (value === 'use_case' || value === 'useCase') return 'useCase'
  return value === 'model' || value === 'technique' || value === 'style' || value === 'subject'
    ? value
    : null
}

function taxonomyProjection(document: PreviewDocument): WireframeTaxonomyRecord | null {
  const base = betaRecord(document) ?? betaRecord(document, 'taxonomy')
  const axis = taxonomyAxis(base?.axis ?? document.axis)
  if (!base || !axis) return null
  const slug = stringValue(document.slug)
  if (!slug) return null
  return {
    id: `${axis}:${slug}`,
    axis,
    slug,
    label: stringValue(base.label, stringValue(document.name)),
    labelZh: stringValue(document.name),
    aliases: stringArray(base.aliases),
    wireframeDeclaredCount: nullableNumber(base.wireframeDeclaredCount),
    appearsOn: stringArray(base.appearsOn).filter(
      (item): item is 'l1' | 'l2' | 'l3' | 'l4' => item === 'l1' || item === 'l2' || item === 'l3' || item === 'l4',
    ),
  }
}

function creatorProjection(document: PreviewDocument): Creator | null {
  if (document.axis !== 'creator') return null
  const base = betaRecord(document)
  if (!base) return null
  return {
    id: stringValue(base.id),
    handle: stringValue(document.name),
    url: stringValue(document.officialUrl),
    avatarUrl: nullableString(base.avatarUrl),
    followers: nullableNumber(base.followers),
    wireframeDeclaredPromptCount: nullableNumber(base.wireframeDeclaredPromptCount),
    wireframeDeclaredLikes: nullableNumber(base.wireframeDeclaredLikes),
    wireframeDeclaredBookmarks: nullableNumber(base.wireframeDeclaredBookmarks),
  }
}

function modelProjection(document: PreviewDocument): WireframeModelRecord | null {
  if (document.axis !== 'model') return null
  const base = betaRecord(document, 'model') ?? betaRecord(document)
  if (!base || typeof base.wireframeHasPage !== 'boolean') return null
  return {
    slug: stringValue(document.slug),
    label: stringValue(document.name),
    wireframeHasPage: booleanValue(base.wireframeHasPage),
    wireframeDeclaredPromptCount: nullableNumber(base.wireframeDeclaredPromptCount),
    wireframeDeclaredHotCount: nullableNumber(base.wireframeDeclaredHotCount),
    declaredRelatedModelSlugs: stringArray(base.declaredRelatedModelSlugs),
    declaredRelatedUseCaseSlugs: stringArray(base.declaredRelatedUseCaseSlugs),
  }
}

function collectionProjection(document: PreviewDocument): Collection | null {
  if (document.axis !== 'collection') return null
  const base = betaRecord(document)
  const rule = record(base?.rule)
  if (!base || !rule) return null
  const projectedRule: Collection['rule'] =
    rule.type === 'axis-all'
      ? {
          type: 'axis-all',
          conditions: records(rule.conditions).map((condition) => ({
            axis: stringValue(condition.axis),
            value: stringValue(condition.value),
          })),
        }
      : { type: 'regex', pattern: stringValue(rule.pattern) }
  return {
    id: stringValue(base.id),
    slug: stringValue(document.slug),
    title: stringValue(document.name),
    subtitle: stringValue(document.description),
    rule: projectedRule,
  }
}

function mediaProjection(value: unknown, baseMedia: WireframeMediaRecord[]): WireframeMediaRecord[] {
  const media = records(value)
  return media.map((item, index) => {
    const id = stringValue(item.assetId)
    const base = baseMedia.find((candidate) => candidate.id === id) ?? baseMedia[index]
    const mediaType = item.mediaType
    return {
      id,
      kind: mediaType === 'video' ? 'video' : 'image',
      src: stringValue(item.url),
      alt: stringValue(item.alt),
      label: nullableString(item.label) ?? base?.label ?? null,
      durationSeconds: nullableNumber(item.durationSeconds) ?? base?.durationSeconds ?? null,
      index: index + 1,
      total: media.length,
    }
  })
}

function variablesProjection(value: unknown): PromptVariable[] {
  return records(value).map((item) => ({
    token: stringValue(item.key),
    label: stringValue(item.label),
    options: Array.isArray(item.options)
      ? item.options
          .map((option) => (typeof option === 'string' ? option : stringValue(record(option)?.value)))
          .filter(Boolean)
      : [],
    defaultValue: stringValue(item.defaultValue),
  }))
}

function parameterProjection(value: unknown): PromptParameter[] {
  return records(value).map((item) => ({
    label: stringValue(item.label),
    value: stringValue(item.value),
  }))
}

function workflowProjection(value: unknown): PromptStep[] {
  return records(value)
    .map((item) => ({
      order: nullableNumber(item.position) ?? 0,
      title: stringValue(item.title),
      body: stringValue(item.body),
    }))
    .sort((left, right) => left.order - right.order)
}

function previewMedia(value: unknown): WireframeMediaRecord | null {
  const media = record(value)
  if (!media) return null
  return {
    id: stringValue(media.id),
    kind: media.kind === 'video' ? 'video' : 'image',
    src: stringValue(media.src),
    alt: stringValue(media.alt),
    label: nullableString(media.label),
    durationSeconds: nullableNumber(media.durationSeconds),
    index: nullableNumber(media.index) ?? 1,
    total: nullableNumber(media.total) ?? 1,
  }
}

function safeBasePrompt(value: unknown): WireframePromptRecord | null {
  const base = record(value)
  if (!base) return null
  const contentType = base.contentType
  if (contentType !== 'image' && contentType !== 'video' && contentType !== 'unknown') return null
  return {
    id: stringValue(base.id),
    slug: stringValue(base.slug),
    slugSource:
      base.slugSource === 'wireframe-slug' || base.slugSource === 'curated' ? base.slugSource : 'derived',
    title: stringValue(base.title),
    summary: nullableString(base.summary),
    promptText: stringValue(base.promptText),
    contentType,
    contentTypeReason: stringValue(base.contentTypeReason),
    modelSlugs: stringArray(base.modelSlugs),
    useCaseSlugs: stringArray(base.useCaseSlugs),
    techniqueSlugs: stringArray(base.techniqueSlugs),
    styleSlugs: stringArray(base.styleSlugs),
    subjectSlugs: stringArray(base.subjectSlugs),
    creatorId: stringValue(base.creatorId),
    handle: stringValue(base.handle),
    sourceUrl: stringValue(base.sourceUrl),
    publishedAt: nullableString(base.publishedAt),
    likes: nullableNumber(base.likes),
    bookmarks: nullableNumber(base.bookmarks),
    views: nullableNumber(base.views),
    reposts: nullableNumber(base.reposts),
    replies: nullableNumber(base.replies),
    quotes: nullableNumber(base.quotes),
    metricsRounded: booleanValue(base.metricsRounded),
    valueScore: nullableNumber(base.valueScore),
    highValue: booleanValue(base.highValue),
    media: [],
    appearsOn: stringArray(base.appearsOn).filter(
      (item): item is 'l1' | 'l2' | 'l3' | 'l4' => item === 'l1' || item === 'l2' || item === 'l3' || item === 'l4',
    ),
    featuredOn: stringArray(base.featuredOn).filter((item): item is 'l1' | 'l2' => item === 'l1' || item === 'l2'),
    variables: [],
    steps: [],
    requiredInputs: [],
    optionalInputs: [],
    parameters: records(base.parameters).map((item) => ({
      label: stringValue(item.label),
      value: stringValue(item.value),
    })),
    variations: records(base.variations).map((variation) => ({
      title: stringValue(variation.title),
      variableValue: stringValue(variation.variableValue),
      media: previewMedia(variation.media),
      status: 'pending',
    })),
  }
}

function sortBy<T>(values: T[], key: (value: T) => string): T[] {
  return values.sort((left, right) => key(left).localeCompare(key(right), 'en'))
}

function projectPrompts(documents: PreviewCatalogDocuments, locale: PreviewLocale): WireframePromptRecord[] {
  const taxonomyByDocumentId = new Map<string, PreviewDocument>()
  for (const taxonomy of documents.taxonomies) {
    const id = relationshipId(taxonomy.id)
    if (id) taxonomyByDocumentId.set(id, taxonomy)
  }

  const variantsByArtifactId = new Map<string, PreviewDocument>()
  for (const variant of documents.localeVariants) {
    if (variant.locale !== locale) continue
    const artifactId = relationshipId(variant.artifact)
    if (artifactId && !variantsByArtifactId.has(artifactId)) variantsByArtifactId.set(artifactId, variant)
  }

  const sourcesByArtifactId = new Map<string, PreviewDocument>()
  for (const source of documents.sources) {
    if (source.recordType !== 'source') continue
    const artifactId = relationshipId(source.artifact)
    if (artifactId && !sourcesByArtifactId.has(artifactId)) sourcesByArtifactId.set(artifactId, source)
  }

  const relationshipSlugs = (value: unknown, axis: string): string[] =>
    relationshipIds(value)
      .map((id) => taxonomyByDocumentId.get(id))
      .filter((item): item is PreviewDocument => item?.axis === axis)
      .map((item) => stringValue(item.slug))
      .filter(Boolean)
      .sort((left, right) => left.localeCompare(right, 'en'))

  return sortBy(
    documents.artifacts.flatMap((artifact) => {
      const base = safeBasePrompt(betaRecord(artifact)?.wireframe ?? record(artifact.betaPreview)?.wireframe)
      const artifactId = relationshipId(artifact.id)
      if (!base || !artifactId) return []
      const variant = variantsByArtifactId.get(artifactId)
      if (!variant) return []
      const source = sourcesByArtifactId.get(artifactId)
      const prompt = record(artifact.prompt)
      const metrics = record(artifact.metrics)
      const normalizedContentType = artifact.contentType
      const creator = relationshipId(artifact.creator)
      const creatorDocument = creator ? taxonomyByDocumentId.get(creator) : undefined
      const creatorBase = creatorDocument ? betaRecord(creatorDocument) : null
      const creatorId = creatorBase ? stringValue(creatorBase.id) : ''
      const creatorHandle = creatorDocument ? stringValue(creatorDocument.name) : ''
      const sourceHandle = source ? stringValue(source.creatorHandle, creatorHandle) : creatorHandle
      const baseMedia = records(record(record(artifact.betaPreview)?.wireframe)?.media).map((item, index, all) => ({
        id: stringValue(item.id),
        kind: item.kind === 'video' ? 'video' as const : 'image' as const,
        src: stringValue(item.src),
        alt: stringValue(item.alt),
        label: nullableString(item.label),
        durationSeconds: nullableNumber(item.durationSeconds),
        index: nullableNumber(item.index) ?? index + 1,
        total: nullableNumber(item.total) ?? all.length,
      }))
      const contentType =
        normalizedContentType === 'image' || normalizedContentType === 'video'
          ? normalizedContentType
          : base.contentType === 'unknown'
            ? 'unknown'
            : 'unknown'
      return [{
        ...base,
        slug: stringValue(variant.slug),
        slugSource: stringValue(variant.slug) === base.slug ? base.slugSource : 'curated',
        title: stringValue(variant.title),
        summary: nullableString(variant.summary),
        promptText: stringValue(prompt?.text),
        contentType,
        modelSlugs: relationshipSlugs(artifact.models, 'model'),
        useCaseSlugs: relationshipSlugs(artifact.useCases, 'use_case'),
        techniqueSlugs: relationshipSlugs(artifact.techniques, 'technique'),
        styleSlugs: relationshipSlugs(artifact.styles, 'style'),
        subjectSlugs: relationshipSlugs(artifact.subjects, 'subject'),
        creatorId,
        handle: sourceHandle,
        sourceUrl: source ? stringValue(source.sourceUrl) : '',
        publishedAt: source ? nullableString(source.sourcePublishedDate) : null,
        likes: nullableNumber(metrics?.likes),
        bookmarks: nullableNumber(metrics?.bookmarks),
        views: nullableNumber(metrics?.views),
        reposts: nullableNumber(metrics?.reposts),
        replies: nullableNumber(metrics?.comments),
        media: mediaProjection(artifact.media, baseMedia),
        variables: variablesProjection(prompt?.variables),
        steps: workflowProjection(variant.workflow),
        requiredInputs: textList(artifact.requiredInputs),
        optionalInputs: textList(artifact.optionalInputs),
        parameters: parameterProjection(artifact.parameters),
      }]
    }),
    (prompt) => prompt.id,
  )
}

export function projectPreviewCatalog(
  documents: PreviewCatalogDocuments,
  locale: PreviewLocale,
): CmsPreviewData {
  const taxonomies = documents.taxonomies
  return {
    prompts: projectPrompts(documents, locale),
    taxonomies: sortBy(
      [...CONTENT_TYPE_TAXONOMIES, ...taxonomies.map(taxonomyProjection).filter((item): item is WireframeTaxonomyRecord => item !== null)],
      (item) => item.id,
    ),
    creators: sortBy(taxonomies.map(creatorProjection).filter((item): item is Creator => item !== null), (item) => item.id),
    models: sortBy(taxonomies.map(modelProjection).filter((item): item is WireframeModelRecord => item !== null), (item) => item.slug),
    collections: sortBy(
      taxonomies.map(collectionProjection).filter((item): item is Collection => item !== null),
      (item) => item.id,
    ),
    snapshot: SNAPSHOT,
  }
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize)
  const object = record(value)
  if (!object) return value
  return Object.fromEntries(
    Object.keys(object)
      .sort((left, right) => left.localeCompare(right, 'en'))
      .map((key) => [key, canonicalize(object[key])]),
  )
}

export function buildCmsPreviewEnvelope(data: CmsPreviewData, generatedAt: string): CmsPreviewEnvelope {
  const revisionInput = JSON.stringify(canonicalize({ data, mode: 'cms-preview' }))
  const contentRevision = `sha256:${createHash('sha256').update(revisionInput).digest('hex')}` as const
  return {
    data,
    meta: { contentRevision, generatedAt, mode: 'cms-preview' },
  }
}
