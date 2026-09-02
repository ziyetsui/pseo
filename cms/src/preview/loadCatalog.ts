import type { PreviewCatalogDocuments, PreviewDocument, PreviewLocale } from './types.ts'

export interface PreviewPayloadLocalApi {
  find(args: {
    readonly collection: string
    readonly depth: number
    readonly draft: true
    readonly limit: number
    readonly overrideAccess: true
    readonly sort: string
    readonly where?: Record<string, unknown>
  }): Promise<{ readonly docs: unknown[] }>
}

function documents(value: unknown[]): PreviewDocument[] {
  return value.filter(
    (item): item is PreviewDocument => typeof item === 'object' && item !== null && !Array.isArray(item),
  )
}

export async function loadPreviewCatalogDocuments(
  payload: PreviewPayloadLocalApi,
  locale: PreviewLocale,
): Promise<PreviewCatalogDocuments> {
  const [artifacts, localeVariants, taxonomies, sources] = await Promise.all([
    payload.find({
      collection: 'prompt-artifacts',
      depth: 0,
      draft: true,
      limit: 1000,
      overrideAccess: true,
      sort: 'artifactKey',
    }),
    payload.find({
      collection: 'locale-variants',
      depth: 0,
      draft: true,
      limit: 1000,
      overrideAccess: true,
      sort: 'localeVariantKey',
      where: { locale: { equals: locale } },
    }),
    payload.find({
      collection: 'taxonomies',
      depth: 0,
      draft: true,
      limit: 1000,
      overrideAccess: true,
      sort: 'taxonomyKey',
    }),
    payload.find({
      collection: 'source-evidence',
      depth: 0,
      draft: true,
      limit: 1000,
      overrideAccess: true,
      sort: 'sourceId',
      where: { recordType: { equals: 'source' } },
    }),
  ])
  return {
    artifacts: documents(artifacts.docs),
    localeVariants: documents(localeVariants.docs),
    taxonomies: documents(taxonomies.docs),
    sources: documents(sources.docs),
  }
}
