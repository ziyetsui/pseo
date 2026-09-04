export type PreviewLocale = 'zh-CN'

export type PreviewDocument = Record<string, unknown>

export interface PreviewCatalogDocuments {
  readonly artifacts: PreviewDocument[]
  readonly localeVariants: PreviewDocument[]
  readonly sources: PreviewDocument[]
  readonly taxonomies: PreviewDocument[]
}

export interface WireframeMediaRecord {
  readonly id: string
  readonly kind: 'image' | 'video'
  readonly src: string
  readonly srcSet: string | null
  readonly alt: string
  readonly label: string | null
  readonly durationSeconds: number | null
  readonly index: number
  readonly total: number
}

export interface PromptVariable {
  readonly token: string
  readonly label: string
  readonly options: string[]
  readonly defaultValue: string
  readonly note: string | null
}

export interface PromptStep {
  readonly order: number
  readonly title: string
  readonly body: string
}

export interface PromptParameter {
  readonly label: string
  readonly value: string
}

export interface WireframePromptRecord {
  readonly id: string
  readonly slug: string
  readonly slugSource: 'wireframe-slug' | 'derived' | 'curated'
  readonly title: string
  readonly summary: string | null
  readonly promptText: string
  readonly contentType: 'image' | 'video' | 'unknown'
  readonly contentTypeReason: string
  readonly modelSlugs: string[]
  readonly useCaseSlugs: string[]
  readonly techniqueSlugs: string[]
  readonly styleSlugs: string[]
  readonly subjectSlugs: string[]
  readonly creatorId: string
  readonly handle: string
  readonly sourceUrl: string
  readonly publishedAt: string | null
  readonly likes: number | null
  readonly bookmarks: number | null
  readonly views: number | null
  readonly reposts: number | null
  readonly replies: number | null
  readonly quotes: number | null
  readonly metricsRounded: boolean
  readonly valueScore: number | null
  readonly highValue: boolean
  readonly media: WireframeMediaRecord[]
  readonly appearsOn: Array<'l1' | 'l2' | 'l3' | 'l4'>
  readonly featuredOn: Array<'l1' | 'l2'>
  readonly variables: PromptVariable[]
  readonly steps: PromptStep[]
  readonly requiredInputs: string[]
  readonly optionalInputs: string[]
  readonly parameters: PromptParameter[]
  readonly variations: PreviewDocument[]
}

export interface WireframeTaxonomyRecord {
  readonly id: string
  readonly axis: 'model' | 'useCase' | 'technique' | 'style' | 'subject' | 'contentType'
  readonly slug: string
  readonly label: string
  readonly labelZh: string | null
  readonly aliases: string[]
  readonly wireframeDeclaredCount: number | null
  readonly appearsOn: Array<'l1' | 'l2' | 'l3' | 'l4'>
}

export interface Creator {
  readonly id: string
  readonly handle: string
  readonly url: string
  readonly avatarUrl: string | null
  readonly followers: number | null
  readonly wireframeDeclaredPromptCount: number | null
  readonly wireframeDeclaredLikes: number | null
  readonly wireframeDeclaredBookmarks: number | null
}

export interface WireframeModelRecord {
  readonly slug: string
  readonly label: string
  readonly wireframeHasPage: boolean
  readonly wireframeDeclaredPromptCount: number | null
  readonly wireframeDeclaredHotCount: number | null
  readonly declaredRelatedModelSlugs: string[]
  readonly declaredRelatedUseCaseSlugs: string[]
}

export interface Collection {
  readonly id: string
  readonly slug: string
  readonly title: string
  readonly subtitle: string
  readonly rule:
    | { readonly type: 'axis-all'; readonly conditions: Array<{ readonly axis: string; readonly value: string }> }
    | { readonly type: 'regex'; readonly pattern: string }
}

export interface Snapshot {
  readonly observedAt: string
  readonly indexVersion: string
  readonly source: string
}

export interface CmsPreviewData {
  readonly prompts: WireframePromptRecord[]
  readonly taxonomies: WireframeTaxonomyRecord[]
  readonly creators: Creator[]
  readonly models: WireframeModelRecord[]
  readonly collections: Collection[]
  readonly snapshot: Snapshot
}

export interface CmsPreviewEnvelope {
  readonly data: CmsPreviewData
  readonly meta: {
    readonly contentRevision: `sha256:${string}`
    readonly generatedAt: string
    readonly mode: 'cms-preview'
  }
}
