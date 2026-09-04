type RecordValue = Record<string, unknown>

const ARTIFACT_KEY = 'prm_80934ec28db44eec9c8a500111072136'
const REVIEWED_BY = 'ziyetsui'
const RIGHTS_BASIS = '内容所有者已审阅并明确授权公开此原创 Prompt，并允许将该 GitHub Issue 作为权利审核依据。'
const LICENSE_REFERENCE = 'CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/)'

const PROMPT_TEXT = `你是一名执行规划助手。请把以下目标转化为可立即执行、可以验收的最小计划。

目标：[GOAL]
现有条件：[CONTEXT]
截止时间：[DEADLINE]
限制条件：[CONSTRAINTS]

要求：
1. 用一句话定义最终可验收结果。
2. 只列出完成目标必需的步骤，并按依赖关系排序。
3. 每一步写明输入、输出、预计时间和验收标准。
4. 标出阻塞项、主要风险和必须由人决定的问题。
5. 给出今天可以立即开始的前三项行动。
6. 不得虚构事实；信息不足时明确标记“待确认”。

请以 Markdown 输出，依次包含：目标、已知条件、关键假设、执行计划、风险、待确认问题、今日行动。`

const BODY_MARKDOWN = `# 把模糊目标转化为可执行计划

把一个尚未拆解的目标整理成按依赖排序、带时间估算和验收标准的最小执行计划。

\`\`\`prompt
${PROMPT_TEXT}
\`\`\`

## 使用方法

依次填写目标、现有条件、截止时间和限制条件；信息不完整时保留“待确认”，不要要求模型自行猜测。

## 输出检查

确认输出包含可验收结果、依赖顺序、每步输入与输出、风险、待确认问题，以及今天可以开始的三项行动。`

const TAXONOMIES = [
  {
    axis: 'model',
    slug: 'model-agnostic',
    name: '模型无关',
    description: '不依赖特定模型或供应商即可使用的提示词。',
  },
  {
    axis: 'use_case',
    slug: 'task-planning',
    name: '任务规划',
    description: '将目标拆解为可以执行和验收的任务计划。',
  },
  {
    axis: 'technique',
    slug: 'structured-decomposition',
    name: '结构化拆解',
    description: '用明确结构拆分目标、依赖、风险和行动。',
  },
  {
    axis: 'style',
    slug: 'concise',
    name: '简洁',
    description: '优先保留必要信息和可操作步骤的表达风格。',
  },
  {
    axis: 'subject',
    slug: 'project-execution',
    name: '项目执行',
    description: '围绕项目落地、阻塞识别和结果验收的主题。',
  },
] as const

const DRAFT_STATE = { _status: 'draft' } as const

export interface FirstPromptSeedOptions {
  readonly reviewedAt: string
  readonly sourceUrl: string
}

export interface FirstPromptSeedPayloadApi {
  create(args: {
    readonly collection: string
    readonly data: RecordValue
    readonly draft?: boolean
    readonly overrideAccess?: boolean
  }): Promise<RecordValue>
  find(args: {
    readonly collection: string
    readonly where?: Record<string, unknown>
    readonly limit?: number
    readonly overrideAccess?: boolean
  }): Promise<{ readonly docs: RecordValue[] }>
}

interface SeedRecord {
  readonly collection: 'locale-variants' | 'prompt-artifacts' | 'source-evidence' | 'taxonomies'
  readonly data: RecordValue
  readonly keyField: string
  readonly naturalKey: string
}

export interface FirstPromptSeedFixture {
  readonly artifact: SeedRecord
  readonly localeVariant: SeedRecord
  readonly sourceEvidence: readonly SeedRecord[]
  readonly taxonomies: readonly SeedRecord[]
}

export interface FirstPromptSeedResult {
  readonly artifactKey: string
  readonly created: Readonly<Record<SeedRecord['collection'], number>>
  readonly skipped: Readonly<Record<SeedRecord['collection'], number>>
}

function list(values: readonly string[]): RecordValue[] {
  return values.map((value) => ({ value }))
}

function validateSourceUrl(value: string): string {
  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    throw new Error('sourceUrl must be an absolute GitHub Issue URL')
  }
  if (
    parsed.protocol !== 'https:' ||
    parsed.hostname !== 'github.com' ||
    !/^\/ziyetsui\/prompt-lab\/issues\/[1-9][0-9]*$/u.test(parsed.pathname) ||
    parsed.search !== '' ||
    parsed.hash !== ''
  ) {
    throw new Error('sourceUrl must be https://github.com/ziyetsui/prompt-lab/issues/<number>')
  }
  return parsed.toString()
}

function validateReviewedAt(value: string): string {
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/u.test(value) ||
    Number.isNaN(Date.parse(value))
  ) {
    throw new Error('reviewedAt must be an RFC 3339 UTC timestamp')
  }
  return value
}

function taxonomyRecord(item: typeof TAXONOMIES[number]): SeedRecord {
  const naturalKey = `${item.axis}:${item.slug}`
  return {
    collection: 'taxonomies',
    keyField: 'taxonomyKey',
    naturalKey,
    data: {
      ...DRAFT_STATE,
      taxonomyKey: naturalKey,
      axis: item.axis,
      locale: 'zh-CN',
      sourceLocale: 'zh-CN',
      slug: item.slug,
      name: item.name,
      description: item.description,
      translation: {
        translationStatus: 'draft',
        translatedFromRevision: null,
        reviewer: null,
      },
      seo: {
        title: `${item.name}提示词`,
        description: `${item.description}浏览和审核归入该分类的 Prompt 内容。`,
        robots: 'noindex,nofollow',
      },
    },
  }
}

/**
 * Owner-approved Day-1 golden record. The public Issue is required so source
 * and rights evidence remain reviewable outside the local CMS.
 */
export function buildFirstPromptSeedFixture(options: FirstPromptSeedOptions): FirstPromptSeedFixture {
  const sourceUrl = validateSourceUrl(options.sourceUrl)
  const reviewedAt = validateReviewedAt(options.reviewedAt)
  const issueNumber = new URL(sourceUrl).pathname.split('/').at(-1)!
  const taxonomies = TAXONOMIES.map(taxonomyRecord)
  const taxonomyKey = (axis: string): string => taxonomies.find((item) => item.data.axis === axis)!.naturalKey

  return {
    taxonomies,
    artifact: {
      collection: 'prompt-artifacts',
      keyField: 'artifactKey',
      naturalKey: ARTIFACT_KEY,
      data: {
        ...DRAFT_STATE,
        artifactKey: ARTIFACT_KEY,
        contentType: 'text',
        sourceLocale: 'zh-CN',
        draftWorkflowState: 'validated',
        prompt: {
          language: 'zh-CN',
          text: PROMPT_TEXT,
          variables: [
            { key: '[GOAL]', label: '目标', required: true, defaultValue: null, options: [] },
            { key: '[CONTEXT]', label: '现有条件', required: true, defaultValue: null, options: [] },
            { key: '[DEADLINE]', label: '截止时间', required: true, defaultValue: null, options: [] },
            { key: '[CONSTRAINTS]', label: '限制条件', required: true, defaultValue: null, options: [] },
          ],
        },
        outcome: {
          outputType: 'text',
          platforms: list(['chat-interface']),
        },
        requiredInputs: list(['目标', '现有条件', '截止时间', '限制条件']),
        optionalInputs: [],
        parameters: [
          { key: 'GOAL', label: '目标', value: null, valueType: 'text', required: true, options: [] },
          { key: 'CONTEXT', label: '现有条件', value: null, valueType: 'text', required: true, options: [] },
          { key: 'DEADLINE', label: '截止时间', value: null, valueType: 'text', required: true, options: [] },
          { key: 'CONSTRAINTS', label: '限制条件', value: null, valueType: 'text', required: true, options: [] },
        ],
        models: [taxonomyKey('model')],
        useCases: [taxonomyKey('use_case')],
        techniques: [taxonomyKey('technique')],
        styles: [taxonomyKey('style')],
        subjects: [taxonomyKey('subject')],
        media: [],
        metrics: {
          likes: null,
          bookmarks: null,
          comments: null,
          reposts: null,
          views: null,
          observedAt: reviewedAt,
        },
        examples: [],
        creator: null,
        relatedPrompts: [],
        actions: { canCopy: true, tryUrl: null },
      },
    },
    localeVariant: {
      collection: 'locale-variants',
      keyField: 'localeVariantKey',
      naturalKey: `${ARTIFACT_KEY}:zh-CN`,
      data: {
        ...DRAFT_STATE,
        localeVariantKey: `${ARTIFACT_KEY}:zh-CN`,
        locale: 'zh-CN',
        sourceLocale: 'zh-CN',
        slug: 'turn-goal-into-action-plan',
        title: '把模糊目标转化为可执行计划',
        summary: '把尚未拆解的目标转化为按依赖排序、包含时间估算、验收标准、风险和今日行动的最小执行计划。',
        indexable: false,
        bodyMarkdown: BODY_MARKDOWN,
        localizedOutcome: {
          purpose: '生成可立即执行并可由人验收的最小目标计划。',
          characteristics: list(['结构化', '可执行', '可验收']),
        },
        workflow: [
          { position: 1, title: '补全输入', body: '填写目标、现有条件、截止时间和限制条件。' },
          { position: 2, title: '生成计划', body: '运行 Prompt，并保留所有标记为待确认的问题。' },
          { position: 3, title: '人工验收', body: '检查步骤依赖、时间估算、验收标准和今日行动是否真实可行。' },
        ],
        translation: {
          translationStatus: 'ready',
          translatedFromRevision: null,
          reviewer: REVIEWED_BY,
        },
        seo: {
          title: '把模糊目标转化为可执行计划｜PromptLab',
          description: '使用结构化 Prompt 把模糊目标拆成有依赖顺序、输入输出、时间估算、验收标准、风险与今日行动的最小计划。',
          robots: 'noindex,nofollow',
        },
      },
    },
    sourceEvidence: [
      {
        collection: 'source-evidence',
        keyField: 'sourceId',
        naturalKey: `promptlab-owner-approval-issue-${issueNumber}`,
        data: {
          ...DRAFT_STATE,
          recordType: 'source',
          sourcePlatform: 'manual',
          sourceUrl,
          sourceId: `promptlab-owner-approval-issue-${issueNumber}`,
          creatorHandle: REVIEWED_BY,
          sourcePublishedDate: `${reviewedAt.slice(0, 10)}T00:00:00.000Z`,
          observedAt: reviewedAt,
          evidenceUrl: sourceUrl,
          rightsStatus: 'cleared',
          basis: RIGHTS_BASIS,
          reviewedBy: REVIEWED_BY,
          reviewedAt,
          licenseReference: LICENSE_REFERENCE,
          notes: 'Owner-authored Prompt; public publication and use of this Issue as rights evidence were explicitly authorized.',
          isPrimarySource: true,
        },
      },
      {
        collection: 'source-evidence',
        keyField: 'sourceId',
        naturalKey: `promptlab-owner-approval-issue-${issueNumber}:evidence`,
        data: {
          ...DRAFT_STATE,
          recordType: 'evidence',
          sourceId: `promptlab-owner-approval-issue-${issueNumber}:evidence`,
          evidenceType: 'owner-authorization',
          evidenceUrl: sourceUrl,
          confidence: 1,
          rightsStatus: 'review_required',
          notes: 'Public GitHub record of the owner authorization used for this first Prompt.',
          isPrimarySource: false,
        },
      },
    ],
  }
}

async function findExisting(
  payload: FirstPromptSeedPayloadApi,
  item: SeedRecord,
): Promise<RecordValue | null> {
  const result = await payload.find({
    collection: item.collection,
    where: { [item.keyField]: { equals: item.naturalKey } },
    limit: 1,
    overrideAccess: true,
  })
  return result.docs[0] ?? null
}

async function createMissing(
  payload: FirstPromptSeedPayloadApi,
  item: SeedRecord,
  data: RecordValue,
  dryRun: boolean,
): Promise<{ readonly created: boolean; readonly document: RecordValue | null }> {
  const existing = await findExisting(payload, item)
  if (existing) return { created: false, document: existing }
  if (dryRun) return { created: true, document: null }
  return {
    created: true,
    document: await payload.create({
      collection: item.collection,
      data,
      draft: true,
      overrideAccess: true,
    }),
  }
}

function idOf(document: RecordValue | null): string | number | null {
  return typeof document?.id === 'string' || typeof document?.id === 'number' ? document.id : null
}

function emptyCounts(): Record<SeedRecord['collection'], number> {
  return { 'locale-variants': 0, 'prompt-artifacts': 0, 'source-evidence': 0, taxonomies: 0 }
}

/** Idempotently creates only this approved golden record and never updates an existing document. */
export async function seedFirstPrompt(
  payload: FirstPromptSeedPayloadApi,
  options: FirstPromptSeedOptions & { readonly dryRun?: boolean },
): Promise<FirstPromptSeedResult> {
  const fixture = buildFirstPromptSeedFixture(options)
  const dryRun = options.dryRun === true
  const created = emptyCounts()
  const skipped = emptyCounts()
  const taxonomyIds = new Map<string, string | number>()

  const persist = async (item: SeedRecord, data: RecordValue): Promise<RecordValue | null> => {
    const result = await createMissing(payload, item, data, dryRun)
    const target = result.created ? created : skipped
    target[item.collection] += 1
    return result.document
  }

  for (const taxonomy of fixture.taxonomies) {
    const document = await persist(taxonomy, taxonomy.data)
    const id = idOf(document)
    if (id !== null) taxonomyIds.set(taxonomy.naturalKey, id)
  }

  const artifactData = { ...fixture.artifact.data }
  for (const field of ['models', 'useCases', 'techniques', 'styles', 'subjects'] as const) {
    artifactData[field] = (artifactData[field] as string[]).map((key) => taxonomyIds.get(key) ?? key)
  }
  const artifact = await persist(fixture.artifact, artifactData)
  const artifactId = idOf(artifact)

  await persist(fixture.localeVariant, {
    ...fixture.localeVariant.data,
    artifact: artifactId ?? fixture.artifact.naturalKey,
  })
  for (const evidence of fixture.sourceEvidence) {
    await persist(evidence, {
      ...evidence.data,
      artifact: artifactId ?? fixture.artifact.naturalKey,
    })
  }

  return { artifactKey: ARTIFACT_KEY, created, skipped }
}

export const firstPromptSeedConstants = {
  artifactKey: ARTIFACT_KEY,
  promptText: PROMPT_TEXT,
} as const
