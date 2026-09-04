import { createHash } from 'node:crypto'

import { CONTENT_APPROVAL_RIGHTS_POLICY_VERSION } from '../domain/index.ts'
import type {
  ContentApprovalRecord,
  ContentWithdrawalRecord,
  PublicationFile,
} from '../domain/index.ts'
import {
  PUBLIC_SNAPSHOT_EXPORTER_VERSION,
  PUBLIC_SNAPSHOT_MAX_APPROVALS,
  PUBLIC_SNAPSHOT_MAX_FILE_BYTES,
  PUBLIC_SNAPSHOT_MAX_FILES,
  PUBLIC_SNAPSHOT_MAX_TOTAL_BYTES,
  PUBLIC_SNAPSHOT_SCHEMA_VERSION,
  PublicSnapshotError,
  type PublicRightsMetadata,
  type PublicSnapshotCatalogItem,
  type PublicSnapshotEnvelope,
  type PublicSnapshotManifest,
  type PublicSnapshotSource,
  type PublicSnapshotValidatedApproval,
} from './types.ts'

const REVISION = /^sha256:[a-f0-9]{64}$/u
const RAW_SHA256 = /^[a-f0-9]{64}$/u
const ARTIFACT_ID = /^prm_[a-z0-9_]{8,64}$/u
const PROMPT_BUNDLE_PATH = /^content\/prompts\/(prm_[a-z0-9_]{8,64})\/(en|zh-CN)\.md$/u
const TAXONOMY_BUNDLE_PATH = /^content\/taxonomies\/(content-type|model)\/((?:cty|mdl)_[a-z0-9_]{3,64})\/(en|zh-CN)\.json$/u
const SECRET_PATTERNS = [
  /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----/u,
  /\bgh[pousr]_[A-Za-z0-9]{30,}\b/u,
  /\bgithub_pat_[A-Za-z0-9_]{40,}\b/u,
  /\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{24,}\b/u,
  /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/u,
  /\bAIza[0-9A-Za-z_-]{35}\b/u,
  /\bBearer[ \t]+[^\s"'<>\[\]{}]{16,}/iu,
  /\b(?:https?|postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis):\/\/[^\s/@:]+:[^\s/@]+@/iu,
  /\b(?:api[_-]?key|access[_-]?token|client[_-]?secret|password|aws_secret_access_key)\b[ \t]*[:=][ \t]*["']?[A-Za-z0-9_./+~=-]{20,}/iu,
]
const EXECUTABLE_HTML_PATTERNS = [
  /<\s*\/?\s*(?:script|iframe|object|embed|style)\b/iu,
  /<[^>]{0,4096}\s+on[a-z]{2,32}\s*=/iu,
  /\bjavascript\s*:/iu,
  /\bdata\s*:\s*text\/html/iu,
]

function fail(
  code: string,
  detail: string,
  status: 409 | 422 | 500 | 503 = 422,
): never {
  throw new PublicSnapshotError(code, detail, status)
}

function compare(left: string, right: string): number {
  return left.localeCompare(right, 'en')
}

function validBundlePath(value: string): boolean {
  const prompt = PROMPT_BUNDLE_PATH.exec(value)
  if (prompt !== null) return true
  const taxonomy = TAXONOMY_BUNDLE_PATH.exec(value)
  if (taxonomy === null) return false
  return (taxonomy[1] === 'content-type' && (taxonomy[2] ?? '').startsWith('cty_')) ||
    (taxonomy[1] === 'model' && (taxonomy[2] ?? '').startsWith('mdl_'))
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical)
  if (typeof value === 'object' && value !== null) {
    const source = value as Record<string, unknown>
    return Object.fromEntries(Object.keys(source).sort().map((key) => [key, canonical(source[key])]))
  }
  return value
}

export function stableSnapshotJson(value: unknown): string {
  return `${JSON.stringify(canonical(value), null, 2)}\n`
}

export function snapshotSha256(value: Uint8Array | string): `sha256:${string}` {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`
}

function safeHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && url.username === '' && url.password === ''
  } catch {
    return false
  }
}

function validateRights(rights: PublicRightsMetadata, locale: 'en' | 'zh-CN'): void {
  if (rights.status === 'cleared') {
    if (
      rights.basis.trim().length < 12 ||
      !safeHttpsUrl(rights.evidenceUrl) ||
      rights.licenseReference.trim().length < 3 ||
      !safeHttpsUrl(rights.sourceUrl) ||
      Number.isNaN(Date.parse(rights.reviewedAt))
    ) {
      fail('INVALID_PUBLIC_RIGHTS', 'Approved rights metadata is not safe for public projection', 409)
    }
    return
  }
  if (
    rights.authorName.trim() === '' ||
    !safeHttpsUrl(rights.originalPostUrl) ||
    !safeHttpsUrl(rights.takedownUrl) ||
    rights.originalPostUrl !== rights.sourceUrl ||
    rights.policyVersion.trim() === '' ||
    (rights.authorUrl !== null && !safeHttpsUrl(rights.authorUrl)) ||
    !REVISION.test(rights.riskAcceptanceRevision) ||
    Number.isNaN(Date.parse(rights.reviewedAt)) ||
    rights.notice !== (locale === 'zh-CN'
      ? '作者保留权利；该 Prompt 不适用仓库的开放内容许可证。'
      : 'The author retains rights; this Prompt is not offered under the repository content license.')
  ) {
    fail('INVALID_PUBLIC_RIGHTS', 'Approved rights metadata is not safe for public projection', 409)
  }
}

function validateApprovalShape(approval: ContentApprovalRecord): void {
  if (
    approval.decision !== 'approved' ||
    !ARTIFACT_ID.test(approval.artifactId) ||
    !['en', 'zh-CN'].includes(approval.locale) ||
    !REVISION.test(approval.contentRevision) ||
    !REVISION.test(approval.sourceRevision) ||
    !REVISION.test(approval.rightsRevision) ||
    !/^[A-Za-z0-9][A-Za-z0-9._-]{2,63}$/u.test(approval.rightsPolicyVersion) ||
    !/^sha256:[a-f0-9]{64}$/u.test(approval.decisionFingerprint) ||
    !Number.isSafeInteger(approval.decisionSequence) ||
    approval.decisionSequence < 1 ||
    Number.isNaN(Date.parse(approval.approvedAt)) ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/u.test(approval.approvedAt)
  ) {
    fail('INVALID_APPROVAL_RECORD', 'A content approval audit record is malformed')
  }
  if (approval.files.length === 0 || approval.fileCount !== approval.files.length) {
    fail('INVALID_APPROVAL_RECORD', 'A content approval audit record has invalid file metadata')
  }
  const paths = new Set<string>()
  for (const file of approval.files) {
    if (
      !validBundlePath(file.path) ||
      file.path.startsWith('/') ||
      file.path.includes('..') ||
      file.path.includes('\\') ||
      !RAW_SHA256.test(file.sha256) ||
      !Number.isSafeInteger(file.byteLength) ||
      file.byteLength < 1 ||
      file.byteLength > PUBLIC_SNAPSHOT_MAX_FILE_BYTES ||
      paths.has(file.path)
    ) {
      fail('INVALID_APPROVAL_RECORD', 'A content approval audit record has invalid file metadata')
    }
    paths.add(file.path)
  }
}

function selectLatestApprovals(
  approvals: readonly ContentApprovalRecord[],
): readonly ContentApprovalRecord[] {
  if (approvals.length > PUBLIC_SNAPSHOT_MAX_APPROVALS) {
    fail('TOO_MANY_APPROVALS', 'The public snapshot approval limit was exceeded')
  }
  const ids = new Set<string>()
  const grouped = new Map<string, ContentApprovalRecord[]>()
  for (const approval of approvals) {
    validateApprovalShape(approval)
    if (ids.has(approval.id)) fail('DUPLICATE_APPROVAL', 'Content approval ids must be unique')
    ids.add(approval.id)
    const key = `${approval.artifactId}\u0000${approval.locale}`
    const values = grouped.get(key) ?? []
    values.push(approval)
    grouped.set(key, values)
  }
  const selected: ContentApprovalRecord[] = []
  for (const values of grouped.values()) {
    values.sort((left, right) => right.decisionSequence - left.decisionSequence)
    const latest = values[0]
    const tied = values[1]
    if (!latest) continue
    if (tied && tied.decisionSequence === latest.decisionSequence) {
      fail('AMBIGUOUS_APPROVAL', 'Approval decision sequences must be globally unique', 409)
    }
    selected.push(latest)
  }
  return selected.sort((left, right) => (
    compare(left.artifactId, right.artifactId) || compare(left.locale, right.locale)
  ))
}

function validateWithdrawalShape(withdrawal: ContentWithdrawalRecord): void {
  if (
    !ARTIFACT_ID.test(withdrawal.artifactId) ||
    !['en', 'zh-CN'].includes(withdrawal.locale) ||
    (withdrawal.decision !== 'restricted' && withdrawal.decision !== 'takedown') ||
    !REVISION.test(withdrawal.rightsRevision) ||
    !REVISION.test(withdrawal.decisionFingerprint) ||
    !Number.isSafeInteger(withdrawal.decisionSequence) ||
    withdrawal.decisionSequence < 1 ||
    !REVISION.test(withdrawal.syncEventRevision) ||
    withdrawal.syncDispatchMode !== 'disabled' ||
    withdrawal.syncEventType !== 'public_snapshot_withdrawal' ||
    withdrawal.syncPriority !== 'urgent' ||
    withdrawal.syncRequestedAt !== withdrawal.withdrawnAt ||
    withdrawal.caseId.trim().length < 3 ||
    withdrawal.caseId.length > 160 ||
    withdrawal.withdrawnBy.trim() === '' ||
    Number.isNaN(Date.parse(withdrawal.withdrawnAt)) ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/u.test(withdrawal.withdrawnAt)
  ) {
    fail('INVALID_WITHDRAWAL_RECORD', 'A content withdrawal audit record is malformed', 500)
  }
}

function selectLatestWithdrawals(
  withdrawals: readonly ContentWithdrawalRecord[],
): readonly ContentWithdrawalRecord[] {
  if (withdrawals.length > PUBLIC_SNAPSHOT_MAX_APPROVALS) {
    fail('TOO_MANY_WITHDRAWALS', 'The public snapshot withdrawal limit was exceeded')
  }
  const ids = new Set<string>()
  const grouped = new Map<string, ContentWithdrawalRecord[]>()
  for (const withdrawal of withdrawals) {
    validateWithdrawalShape(withdrawal)
    if (ids.has(withdrawal.id)) fail('DUPLICATE_WITHDRAWAL', 'Content withdrawal ids must be unique', 500)
    ids.add(withdrawal.id)
    // Source rights are artifact-wide in the CMS. One durable restricted or
    // takedown decision therefore suppresses every locale of that artifact.
    const key = withdrawal.artifactId
    const values = grouped.get(key) ?? []
    values.push(withdrawal)
    grouped.set(key, values)
  }
  const selected: ContentWithdrawalRecord[] = []
  for (const values of grouped.values()) {
    values.sort((left, right) => right.decisionSequence - left.decisionSequence)
    const latest = values[0]
    const tied = values[1]
    if (!latest) continue
    if (tied && tied.decisionSequence === latest.decisionSequence) {
      fail('AMBIGUOUS_WITHDRAWAL', 'Withdrawal decision sequences must be globally unique', 409)
    }
    selected.push(latest)
  }
  return selected.sort((left, right) => (
    compare(left.artifactId, right.artifactId) || compare(left.locale, right.locale)
  ))
}

function activeApprovalsAfterWithdrawals(
  selectedApprovals: readonly ContentApprovalRecord[],
  allApprovals: readonly ContentApprovalRecord[],
  withdrawals: readonly ContentWithdrawalRecord[],
): readonly ContentApprovalRecord[] {
  const latestWithdrawal = new Map(withdrawals.map((withdrawal) => [
    withdrawal.artifactId,
    withdrawal,
  ]))
  return selectedApprovals.filter((approval) => {
    const withdrawal = latestWithdrawal.get(approval.artifactId)
    if (!withdrawal) return true
    if (approval.decisionSequence === withdrawal.decisionSequence) {
      fail(
        'AMBIGUOUS_PUBLICATION_DECISION',
        'Approval and withdrawal decisions cannot share one database sequence',
        409,
      )
    }
    if (approval.decisionSequence < withdrawal.decisionSequence) return false

    const reusesWithdrawnRevision = allApprovals.some((candidate) => (
      candidate.artifactId === approval.artifactId &&
      candidate.locale === approval.locale &&
      candidate.decisionSequence < withdrawal.decisionSequence &&
      (
        candidate.contentRevision === approval.contentRevision ||
        candidate.rightsRevision === approval.rightsRevision
      )
    ))
    if (reusesWithdrawnRevision) {
      fail(
        'WITHDRAWN_REVISION_REAPPROVAL',
        'A withdrawn artifact cannot be republished without new content and rights revisions',
        409,
      )
    }
    return true
  })
}

function assertGloballyUniqueDecisionSequences(
  approvals: readonly ContentApprovalRecord[],
  withdrawals: readonly ContentWithdrawalRecord[],
): void {
  const sequences = new Set<number>()
  for (const record of [...approvals, ...withdrawals]) {
    if (sequences.has(record.decisionSequence)) {
      fail(
        'DUPLICATE_PUBLICATION_DECISION_SEQUENCE',
        'Publication decision sequences must be globally unique',
        500,
      )
    }
    sequences.add(record.decisionSequence)
  }
}

function normalizedFileMetadata(files: readonly PublicationFile[]): readonly {
  readonly bytes: number
  readonly content: string
  readonly path: string
  readonly sha256: string
}[] {
  if (files.length === 0) fail('EMPTY_APPROVED_BUNDLE', 'An approved content bundle is empty')
  const sorted = [...files].sort((left, right) => compare(left.path, right.path))
  const seen = new Set<string>()
  return sorted.map((file) => {
    if (
      !validBundlePath(file.path) ||
      file.path.startsWith('/') ||
      file.path.includes('..') ||
      file.path.includes('\\') ||
      seen.has(file.path)
    ) {
      fail('UNSAFE_BUNDLE_PATH', 'An approved content bundle contains an unsafe path')
    }
    seen.add(file.path)
    assertSafeGeneratedText(file.content)
    const bytes = Buffer.byteLength(file.content, 'utf8')
    if (bytes < 1 || bytes > PUBLIC_SNAPSHOT_MAX_FILE_BYTES) {
      fail('FILE_SIZE_LIMIT', 'An approved content file exceeds the public snapshot size limit')
    }
    return {
      bytes,
      content: file.content,
      path: file.path,
      sha256: snapshotSha256(file.content).slice('sha256:'.length),
    }
  })
}

function assertSafeGeneratedText(content: string): void {
  if (content.includes('\0') || content.includes('\r')) {
    fail('INVALID_TEXT_FORMAT', 'Public snapshot files must contain NUL-free LF text')
  }
  if (SECRET_PATTERNS.some((pattern) => pattern.test(content))) {
    fail('SECRET_DETECTED', 'A public snapshot file failed the credential safety gate')
  }
  if (EXECUTABLE_HTML_PATTERNS.some((pattern) => pattern.test(content))) {
    fail('UNSAFE_HTML', 'A public snapshot file failed the executable HTML safety gate')
  }
}

function assertApprovalMatches(
  approval: ContentApprovalRecord,
  validated: PublicSnapshotValidatedApproval,
): ReturnType<typeof normalizedFileMetadata> {
  if (
    validated.contentRevision !== approval.contentRevision ||
    validated.sourceRevision !== approval.sourceRevision ||
    validated.rightsRevision !== approval.rightsRevision
  ) {
    fail(
      'APPROVAL_REVISION_MISMATCH',
      'Current CMS content does not match the selected immutable approval',
      409,
    )
  }
  validateRights(validated.rights, approval.locale)
  const current = normalizedFileMetadata(validated.files)
  const approved = [...approval.files].sort((left, right) => compare(left.path, right.path))
  if (
    current.length !== approved.length ||
    current.some((file, index) => {
      const expected = approved[index]
      return !expected ||
        file.path !== expected.path ||
        file.bytes !== expected.byteLength ||
        file.sha256 !== expected.sha256
    })
  ) {
    fail(
      'APPROVAL_FILE_MISMATCH',
      'Current CMS bytes do not match the selected immutable approval',
      409,
    )
  }
  const requiredPrompt = `content/prompts/${approval.artifactId}/${approval.locale}.md`
  if (!current.some((file) => file.path === requiredPrompt)) {
    fail('APPROVED_PROMPT_MISSING', 'The approved Prompt bundle is incomplete', 409)
  }
  return current
}

function publicRightsItem(
  approval: ContentApprovalRecord,
  rights: PublicRightsMetadata,
): Record<string, unknown> {
  const common = {
    id: approval.artifactId,
    locale: approval.locale,
    status: rights.status,
    rightsRevision: approval.rightsRevision,
    sourceUrl: rights.sourceUrl,
    reviewedAt: rights.reviewedAt,
  }
  return rights.status === 'cleared'
    ? {
        ...common,
        basis: rights.basis,
        evidenceUrl: rights.evidenceUrl,
        licenseReference: rights.licenseReference,
      }
    : {
        ...common,
        authorName: rights.authorName,
        authorUrl: rights.authorUrl,
        originalPostUrl: rights.originalPostUrl,
        policyVersion: rights.policyVersion,
        riskAcceptanceRevision: rights.riskAcceptanceRevision,
        takedownUrl: rights.takedownUrl,
        notice: rights.notice,
      }
}

function plainObject(value: unknown, code = 'INVALID_APPROVED_BUNDLE'): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    fail(code, 'An approved bundle cannot be projected into the public content contract', 500)
  }
  return value as Record<string, unknown>
}

function nonEmptyString(value: unknown, code = 'INVALID_APPROVED_BUNDLE'): string {
  if (typeof value !== 'string' || value.trim() === '') {
    fail(code, 'An approved bundle cannot be projected into the public content contract', 500)
  }
  return value
}

function json(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`
}

function parseJsonFrontmatter(content: string): { readonly body: string; readonly data: Record<string, unknown> } {
  const match = content.match(/^---\n([\s\S]*?)\n---(?:\n|$)/u)
  if (!match?.[1]) fail('INVALID_APPROVED_BUNDLE', 'An approved Prompt has malformed frontmatter', 500)
  try {
    return {
      body: content.slice(match[0].length).replace(/^\n/u, ''),
      data: plainObject(JSON.parse(match[1])),
    }
  } catch {
    fail('INVALID_APPROVED_BUNDLE', 'An approved Prompt has malformed frontmatter', 500)
  }
}

function projectPrompt(
  file: { readonly content: string; readonly path: string },
  approval: ContentApprovalRecord,
  rights: PublicRightsMetadata,
): string {
  const match = file.path.match(/^content\/prompts\/(prm_[a-z0-9_]+)\/([^/]+)\.md$/u)
  if (!match || match[1] !== approval.artifactId || match[2] !== approval.locale) {
    fail('INVALID_APPROVED_BUNDLE', 'An approved Prompt identity does not match its path', 500)
  }
  const { body, data } = parseJsonFrontmatter(file.content)
  if (data.id !== approval.artifactId || data.locale !== approval.locale || data.type !== 'prompt') {
    fail('INVALID_APPROVED_BUNDLE', 'An approved Prompt identity does not match its path', 500)
  }
  const prompt = plainObject(data.prompt)
  const source = plainObject(data.source)
  const seo = plainObject(data.seo)
  const publication = plainObject(data.publication)
  const translation = plainObject(data.translation)
  nonEmptyString(prompt.text)
  const sourceUrl = nonEmptyString(source.url)
  if (!Array.isArray(data.media) || data.media.length !== 0) {
    fail('UNVERIFIED_MEDIA', 'Approved media lacks a public rights projection', 409)
  }
  if (!Array.isArray(data.examples) || data.examples.length !== 0) {
    fail('UNVERIFIED_MEDIA', 'Approved examples lack a public rights projection', 409)
  }
  const reviewer = typeof translation.reviewer === 'string' && translation.reviewer.trim() !== ''
    ? translation.reviewer
    : null
  if (reviewer === null) {
    fail('TRANSLATION_REVIEW_MISSING', 'Approved translation review metadata is missing', 409)
  }
  const currentUpdatedAt = nonEmptyString(publication.updatedAt)
  const updatedAt = Date.parse(currentUpdatedAt) >= Date.parse(approval.approvedAt)
    ? currentUpdatedAt
    : approval.approvedAt
  const projected = {
    ...data,
    status: 'published',
    indexable: true,
    prompt,
    source,
    seo: { ...seo, robots: 'index,follow' },
    publication: {
      ...publication,
      publishedAt: approval.approvedAt,
      updatedAt,
    },
    translation: {
      ...translation,
      status: 'ready',
      reviewer,
    },
  }
  let normalizedBody = body.replace(/\n+$/u, '')
  if (rights.status === 'community_attributed') {
    for (const required of [
      rights.authorName,
      rights.originalPostUrl,
      rights.notice,
      rights.takedownUrl,
    ]) {
      if (!normalizedBody.includes(required)) {
        fail('COMMUNITY_NOTICE_MISSING', 'Approved community attribution notice is incomplete', 409)
      }
    }
  } else if (!normalizedBody.includes(sourceUrl)) {
    const heading = approval.locale === 'zh-CN' ? '来源' : 'Source'
    const label = approval.locale === 'zh-CN' ? '原始来源' : 'Original source'
    normalizedBody = `${normalizedBody}\n\n## ${heading}\n\n[${label}](${sourceUrl})`
  }
  return `---\n${json(projected)}---\n\n${normalizedBody}\n`
}

function projectTaxonomy(
  file: { readonly content: string; readonly path: string },
  snapshotPublicationAt: string,
): string {
  let data: Record<string, unknown>
  try {
    data = plainObject(JSON.parse(file.content))
  } catch {
    fail('INVALID_APPROVED_BUNDLE', 'An approved taxonomy has malformed JSON', 500)
  }
  const match = file.path.match(
    /^content\/taxonomies\/(content-type|model)\/((?:cty|mdl)_[a-z0-9_]{3,64})\/(en|zh-CN)\.json$/u,
  )
  if (
    !match ||
    data.type !== 'taxonomy' ||
    data.axis !== match[1] ||
    data.id !== match[2] ||
    data.locale !== match[3] ||
    (match[1] === 'content-type' && !match[2]?.startsWith('cty_')) ||
    (match[1] === 'model' && !match[2]?.startsWith('mdl_'))
  ) {
    fail('INVALID_APPROVED_BUNDLE', 'An approved taxonomy identity does not match its path', 500)
  }
  const seo = plainObject(data.seo)
  plainObject(data.publication)
  plainObject(data.translation)
  const sourceRef = nonEmptyString(seo.canonical)
  const {
    publication: _publication,
    sourceRef: _sourceRef,
    translation: _translation,
    ...stableData
  } = data
  const normalized = {
    ...stableData,
    status: 'published',
    indexable: false,
    sourceLocale: 'en',
    sourceRef,
    seo: { ...seo, robots: 'noindex,nofollow' },
  }
  const sourceRevision = snapshotSha256(stableSnapshotJson({
    path: file.path,
    taxonomy: normalized,
  }))
  return json({
    ...normalized,
    publication: {
      publishedAt: snapshotPublicationAt,
      updatedAt: snapshotPublicationAt,
      sourceRevision,
    },
    translation: {
      status: 'ready',
      translatedFromRevision: data.locale === 'en' ? null : sourceRevision,
      reviewer: 'CMS approval',
    },
  })
}

/**
 * Taxonomy translations bind to one product-owned English taxonomy revision.
 * The revision is derived from the normalized English public candidate, never
 * from a localized Prompt, approval timestamp, or source URL.
 */
function bindCanonicalTaxonomyRevisions(
  files: Map<string, string>,
  snapshotPublicationAt: string,
): void {
  const grouped = new Map<string, Map<string, { readonly data: Record<string, unknown>; readonly path: string }>>()
  for (const [path, source] of files) {
    const match = path.match(
      /^content\/taxonomies\/(content-type|model)\/((?:cty|mdl)_[a-z0-9_]{3,64})\/(en|zh-CN)\.json$/u,
    )
    if (!match) continue
    let data: Record<string, unknown>
    try {
      data = plainObject(JSON.parse(source))
    } catch {
      fail('INVALID_PUBLIC_TAXONOMY', 'A projected taxonomy is malformed', 500)
    }
    const key = `${String(match[1])}\u0000${String(match[2])}`
    const localized = grouped.get(key) ?? new Map()
    const locale = String(match[3])
    if (localized.has(locale)) {
      fail('DUPLICATE_PUBLIC_TAXONOMY', 'Projected taxonomies contain a duplicate locale', 409)
    }
    localized.set(locale, { data, path })
    grouped.set(key, localized)
  }

  for (const localized of grouped.values()) {
    const english = localized.get('en')
    if (!english) {
      fail(
        'ENGLISH_TAXONOMY_SOURCE_MISSING',
        'A translated public taxonomy has no canonical English source candidate',
        409,
      )
    }
    const {
      publication: _publication,
      translation: _translation,
      ...englishCanonical
    } = english.data
    const englishRevision = snapshotSha256(stableSnapshotJson({
      path: english.path,
      taxonomy: englishCanonical,
    }))
    for (const [locale, candidate] of localized) {
      files.set(candidate.path, json({
        ...candidate.data,
        publication: {
          publishedAt: snapshotPublicationAt,
          updatedAt: snapshotPublicationAt,
          sourceRevision: englishRevision,
        },
        translation: {
          status: 'ready',
          translatedFromRevision: locale === 'en' ? null : englishRevision,
          reviewer: 'CMS approval',
        },
      }))
    }
  }
}

function projectApprovedBundle(
  approval: ContentApprovalRecord,
  rights: PublicRightsMetadata,
  files: ReturnType<typeof normalizedFileMetadata>,
  snapshotPublicationAt: string,
): readonly { readonly content: string; readonly path: string }[] {
  return files.map((file) => {
    if (file.path.startsWith('content/prompts/')) {
      return { content: projectPrompt(file, approval, rights), path: file.path }
    }
    if (file.path.startsWith('content/taxonomies/')) {
      return { content: projectTaxonomy(file, snapshotPublicationAt), path: file.path }
    }
    fail('UNSUPPORTED_PUBLIC_CONTENT_TYPE', 'The approved bundle contains an unsupported public file', 409)
  })
}

interface PublicPromptData {
  readonly contentType: string
  readonly id: string
  readonly locale: 'en' | 'zh-CN'
  readonly models: readonly string[]
  readonly slug: string
  readonly source: Record<string, unknown>
  readonly summary: string
  readonly title: string
}

function publicPromptData(content: string): PublicPromptData {
  const data = parseJsonFrontmatter(content).data
  const locale = nonEmptyString(data.locale)
  if (locale !== 'en' && locale !== 'zh-CN') {
    fail('INVALID_APPROVED_BUNDLE', 'An approved Prompt has an unsupported locale', 500)
  }
  if (
    !Array.isArray(data.models) ||
    data.models.length === 0 ||
    data.models.some((item) => typeof item !== 'string' || item.trim() === '')
  ) {
    fail('INVALID_APPROVED_BUNDLE', 'An approved Prompt has malformed model selectors', 500)
  }
  return {
    contentType: nonEmptyString(data.contentType),
    id: nonEmptyString(data.id),
    locale,
    models: data.models as string[],
    slug: nonEmptyString(data.slug),
    source: plainObject(data.source),
    summary: nonEmptyString(data.summary),
    title: nonEmptyString(data.title),
  }
}

function pruneAndValidateTaxonomies(contentFiles: Map<string, string>): void {
  const requiredSelectors = new Set<string>()
  for (const [path, source] of contentFiles) {
    if (!path.startsWith('content/prompts/')) continue
    const prompt = publicPromptData(source)
    requiredSelectors.add(`${prompt.locale}\u0000contentType\u0000${prompt.contentType}`)
    for (const model of prompt.models) {
      requiredSelectors.add(`${prompt.locale}\u0000models\u0000${model}`)
    }
  }

  const selectors = new Map<string, string>()
  const identities = new Set<string>()
  const slugs = new Set<string>()
  const taxonomyPaths: string[] = []
  for (const [path, source] of contentFiles) {
    if (!path.startsWith('content/taxonomies/')) continue
    taxonomyPaths.push(path)
    let data: Record<string, unknown>
    try {
      data = plainObject(JSON.parse(source))
    } catch {
      fail('INVALID_PUBLIC_TAXONOMY', 'A projected taxonomy is malformed', 500)
    }
    const selector = plainObject(data.selector)
    const axis = nonEmptyString(data.axis, 'INVALID_PUBLIC_TAXONOMY')
    const id = nonEmptyString(data.id, 'INVALID_PUBLIC_TAXONOMY')
    const locale = nonEmptyString(data.locale, 'INVALID_PUBLIC_TAXONOMY')
    const slug = nonEmptyString(data.slug, 'INVALID_PUBLIC_TAXONOMY')
    const field = nonEmptyString(selector.field, 'INVALID_PUBLIC_TAXONOMY')
    const value = nonEmptyString(selector.value, 'INVALID_PUBLIC_TAXONOMY')
    if (
      (axis === 'content-type' && field !== 'contentType') ||
      (axis === 'model' && field !== 'models') ||
      (axis !== 'content-type' && axis !== 'model')
    ) {
      fail('INVALID_PUBLIC_TAXONOMY', 'A projected taxonomy selector is inconsistent', 500)
    }
    const identity = `${id}\u0000${locale}`
    const localizedSlug = `${axis}\u0000${locale}\u0000${slug}`
    const selectorKey = `${locale}\u0000${field}\u0000${value}`
    if (identities.has(identity) || slugs.has(localizedSlug) || selectors.has(selectorKey)) {
      fail('DUPLICATE_PUBLIC_TAXONOMY', 'Projected taxonomies contain an ambiguous identity', 409)
    }
    identities.add(identity)
    slugs.add(localizedSlug)
    selectors.set(selectorKey, path)
  }

  const referenced = new Set<string>()
  for (const selector of requiredSelectors) {
    const path = selectors.get(selector)
    if (!path) {
      fail('MISSING_PUBLIC_TAXONOMY', 'A public Prompt is missing a required taxonomy', 409)
    }
    referenced.add(path)
  }
  for (const path of taxonomyPaths) {
    if (!referenced.has(path)) contentFiles.delete(path)
  }
}

function rootReadme(counts: Readonly<Record<string, number>>, exportRevision: string): string {
  const rows = ['en', 'zh-CN']
    .map((locale) => `| [${locale}](locales/${locale}/README.md) | ${counts[locale] ?? 0} |`)
    .join('\n')
  return `<!-- GENERATED FROM PAYLOAD CMS; DO NOT EDIT. -->\n\n# PromptLab\n\nPublic content is generated from revision-bound Payload CMS approvals.\n\nExport revision: \`${exportRevision}\`\n\n| Locale | Approved prompts |\n| --- | ---: |\n${rows}\n\nMachine-readable consumers can use [catalog.json](catalog.json).\n`
}

function localeReadme(
  locale: string,
  items: readonly PublicSnapshotCatalogItem[],
  rights: readonly Record<string, unknown>[],
  exportRevision: string,
): string {
  const title = locale === 'zh-CN' ? 'PromptLab · 中文' : `PromptLab · ${locale}`
  const empty = locale === 'zh-CN'
    ? '当前没有已审核并发布的 Prompt。'
    : 'No reviewed, published prompts are available yet.'
  const rows = items.length === 0
    ? empty
    : [
        '| Prompt | Source | Rights |',
        '| --- | --- | --- |',
        ...items.map((item) => `| [${item.title}](../../${item.path}) | [source](${item.sourceUrl}) | ${item.rightsStatus} |`),
      ].join('\n')
  const notices = rights
    .filter((item) => item.locale === locale && item.status === 'community_attributed')
    .map((item) => {
      const authorName = nonEmptyString(item.authorName)
      const authorUrl = item.authorUrl === null ? null : nonEmptyString(item.authorUrl)
      const author = authorUrl === null ? authorName : `[${authorName}](${authorUrl})`
      const heading = locale === 'zh-CN' ? '权利与署名' : 'Rights and attribution'
      const original = locale === 'zh-CN' ? '原帖' : 'Original post'
      const takedown = locale === 'zh-CN' ? '申请更正或删除' : 'Request correction or removal'
      return `## ${heading}: ${String(item.id)}\n\n${author}\n\n[${original}](${String(item.originalPostUrl)})\n\n${String(item.notice)}\n\n[${takedown}](${String(item.takedownUrl)})`
    })
  return `<!-- GENERATED FROM PAYLOAD CMS; DO NOT EDIT. -->\n\n# ${title}\n\nExport revision: \`${exportRevision}\`\n\n${rows}${notices.length === 0 ? '' : `\n\n${notices.join('\n\n')}`}\n`
}

function installSiteFile(contentFiles: Map<string, string>): readonly string[] {
  const publishedLocales = [...new Set(
    [...contentFiles]
      .filter(([path]) => /^content\/prompts\/.+\.md$/u.test(path))
      .map(([, source]) => publicPromptData(source).locale),
  )].sort(compare)
  contentFiles.set('content/site.json', json({
    schemaVersion: 1,
    siteName: 'PromptLab',
    defaultLocale: 'en',
    locales: ['en', 'zh-CN'],
    publishedLocales,
  }))
  return publishedLocales
}

function createDerivedFiles(
  contentFiles: ReadonlyMap<string, string>,
  rights: readonly Record<string, unknown>[],
  publicationAudit: readonly Record<string, unknown>[],
  exportRevision: string,
): ReadonlyMap<string, string> {
  const promptEntries = [...contentFiles]
    .filter(([path]) => /^content\/prompts\/.+\.md$/u.test(path))
    .sort(([left], [right]) => compare(left, right))
  const rightsByIdentity = new Map(rights.map((item) => [
    `${String(item.id)}\u0000${String(item.locale)}`,
    item,
  ]))
  const localizedSlugs = new Set<string>()
  const items: PublicSnapshotCatalogItem[] = promptEntries.map(([path, source]) => {
    const data = publicPromptData(source)
    const localizedSlug = `${data.locale}\u0000${data.slug}`
    if (localizedSlugs.has(localizedSlug)) {
      fail('DUPLICATE_PUBLIC_SLUG', 'Public Prompt slugs must be unique within each locale', 409)
    }
    localizedSlugs.add(localizedSlug)
    const rightsItem = rightsByIdentity.get(`${data.id}\u0000${data.locale}`)
    if (!rightsItem) fail('RIGHTS_PROJECTION_MISSING', 'A public Prompt has no exact rights projection', 500)
    const rightsStatus = rightsItem.status
    if (rightsStatus !== 'cleared' && rightsStatus !== 'community_attributed') {
      fail('RIGHTS_PROJECTION_INVALID', 'A public Prompt has an invalid rights projection', 500)
    }
    return {
      id: data.id,
      locale: data.locale,
      path,
      rightsStatus,
      slug: data.slug,
      sourceUrl: nonEmptyString(data.source.url),
      summary: data.summary,
      title: data.title,
    } satisfies PublicSnapshotCatalogItem
  }).sort((left, right) => compare(
    `${left.id}\u0000${left.locale}`,
    `${right.id}\u0000${right.locale}`,
  ))
  const taxonomyData = [...contentFiles]
    .filter(([path]) => path.startsWith('content/taxonomies/'))
    .map(([path, source]): Record<string, unknown> => ({
      ...plainObject(JSON.parse(source)),
      path,
    }))
    .sort((left, right) => (
      compare(String(left['locale']), String(right['locale'])) ||
      compare(String(left['axis']), String(right['axis'])) ||
      compare(String(left['slug']), String(right['slug']))
    ))
  const counts = Object.fromEntries(['en', 'zh-CN'].map((locale) => [
    locale,
    items.filter((item) => item.locale === locale).length,
  ]))
  const generated = new Map<string, string>([
    ['catalog.json', json({
      schemaVersion: 1,
      exportRevision,
      total: items.length,
      items,
    })],
    ['README.md', rootReadme(counts, exportRevision)],
    ['governance/content-rights.json', json({
      schemaVersion: 1,
      exportRevision,
      total: rights.length,
      items: rights,
    })],
    ['governance/publication-audit.json', json({
      schemaVersion: 1,
      exportRevision,
      total: publicationAudit.length,
      items: publicationAudit,
    })],
  ])
  for (const locale of ['en', 'zh-CN']) {
    const localized = items.filter((item) => item.locale === locale)
    const localizedTaxonomies = taxonomyData.filter((item) => item['locale'] === locale)
    generated.set(
      `locales/${locale}/README.md`,
      localeReadme(locale, localized, rights, exportRevision),
    )
    generated.set(`locales/${locale}/index.json`, json({
      schemaVersion: 1,
      exportRevision,
      locale,
      total: localized.length,
      items: localized,
    }))
    generated.set(`locales/${locale}/taxonomies.json`, json({
      schemaVersion: 1,
      exportRevision,
      locale,
      total: localizedTaxonomies.length,
      items: localizedTaxonomies,
    }))
  }
  return generated
}

export class PublicSnapshotService {
  private readonly source: PublicSnapshotSource

  constructor(source: PublicSnapshotSource) {
    this.source = source
  }

  async build(): Promise<PublicSnapshotEnvelope> {
    return this.source.readConsistently(async (session) => {
      const allApprovals = await session.listApprovals()
      const allWithdrawals = await session.listWithdrawals()
      assertGloballyUniqueDecisionSequences(allApprovals, allWithdrawals)
      const selectedApprovals = selectLatestApprovals(allApprovals)
      const selectedWithdrawals = selectLatestWithdrawals(allWithdrawals)
      const selected = activeApprovalsAfterWithdrawals(
        selectedApprovals,
        allApprovals,
        selectedWithdrawals,
      )
      const files = new Map<string, string>()
      const publicationAudit: Record<string, unknown>[] = []
      const rights: Record<string, unknown>[] = []
      const snapshotPublicationAt = selected
        .map((approval) => approval.approvedAt)
        .sort((left, right) => Date.parse(left) - Date.parse(right))
        .at(-1) ?? '1970-01-01T00:00:00.000Z'

      for (const approval of selected) {
        if (approval.rightsPolicyVersion !== CONTENT_APPROVAL_RIGHTS_POLICY_VERSION) {
          fail(
            'APPROVAL_POLICY_STALE',
            'The selected approval uses a retired rights policy version',
            409,
          )
        }
        const validated = await session.validateApproval(approval)
        const approvedBundle = assertApprovalMatches(approval, validated)
        const publicBundle = projectApprovedBundle(
          approval,
          validated.rights,
          approvedBundle,
          snapshotPublicationAt,
        )
        for (const file of publicBundle) {
          const existing = files.get(file.path)
          if (existing !== undefined && existing !== file.content) {
            fail('BUNDLE_PATH_CONFLICT', 'Approved bundles produce conflicting public paths', 409)
          }
          files.set(file.path, file.content)
        }
        publicationAudit.push({
          approvalId: approval.id,
          approvedAt: approval.approvedAt,
          contentRevision: approval.contentRevision,
          id: approval.artifactId,
          locale: approval.locale,
          rightsRevision: approval.rightsRevision,
          sourceRevision: approval.sourceRevision,
        })
        rights.push(publicRightsItem(approval, validated.rights))
      }

      bindCanonicalTaxonomyRevisions(files, snapshotPublicationAt)
      pruneAndValidateTaxonomies(files)
      installSiteFile(files)
      const publicContentFiles = [...files].sort(([left], [right]) => compare(left, right))
      const exportRevision = snapshotSha256(stableSnapshotJson({
        approvals: publicationAudit,
        approvalDecisionSequences: selected.map((approval) => ({
          artifactId: approval.artifactId,
          decisionSequence: approval.decisionSequence,
          id: approval.id,
          locale: approval.locale,
        })),
        exporterVersion: PUBLIC_SNAPSHOT_EXPORTER_VERSION,
        files: publicContentFiles.map(([path, content]) => ({
          path,
          sha256: snapshotSha256(content),
        })),
        rights,
        schemaVersion: PUBLIC_SNAPSHOT_SCHEMA_VERSION,
        withdrawals: selectedWithdrawals.map((withdrawal) => ({
          artifactId: withdrawal.artifactId,
          decision: withdrawal.decision,
          decisionFingerprint: withdrawal.decisionFingerprint,
          decisionSequence: withdrawal.decisionSequence,
          id: withdrawal.id,
          locale: withdrawal.locale,
          rightsRevision: withdrawal.rightsRevision,
          withdrawnAt: withdrawal.withdrawnAt,
        })),
      }))
      for (const [path, content] of createDerivedFiles(
        files,
        rights,
        publicationAudit,
        exportRevision,
      )) {
        files.set(path, content)
      }
      const sortedFiles = [...files].sort(([left], [right]) => compare(left, right))
      if (sortedFiles.length > PUBLIC_SNAPSHOT_MAX_FILES) {
        fail('TOO_MANY_FILES', 'The public snapshot file limit was exceeded')
      }

      let totalBytes = 0
      for (const [, content] of sortedFiles) {
        assertSafeGeneratedText(content)
        const size = Buffer.byteLength(content, 'utf8')
        if (size > PUBLIC_SNAPSHOT_MAX_FILE_BYTES) {
          fail('FILE_SIZE_LIMIT', 'A public snapshot file exceeds the size limit')
        }
        totalBytes += size
      }
      if (totalBytes > PUBLIC_SNAPSHOT_MAX_TOTAL_BYTES) {
        fail('SNAPSHOT_SIZE_LIMIT', 'The public snapshot exceeds the total size limit')
      }

      const manifestFiles = sortedFiles.map(([path, content]) => ({
        bytes: Buffer.byteLength(content, 'utf8'),
        path,
        sha256: snapshotSha256(content),
      }))
      const manifest: PublicSnapshotManifest = {
        counts: {
          locales: 2,
          prompts: sortedFiles.filter(([path]) => /^content\/prompts\/.+\.md$/u.test(path)).length,
          taxonomies: sortedFiles.filter(([path]) => path.startsWith('content/taxonomies/')).length,
        },
        exporterVersion: PUBLIC_SNAPSHOT_EXPORTER_VERSION,
        exportRevision,
        files: manifestFiles,
        schemaVersion: PUBLIC_SNAPSHOT_SCHEMA_VERSION,
      }
      return {
        exporterVersion: PUBLIC_SNAPSHOT_EXPORTER_VERSION,
        exportRevision,
        files: sortedFiles.map(([path, content]) => ({
          content: Buffer.from(content, 'utf8').toString('base64'),
          encoding: 'base64' as const,
          path,
          sha256: snapshotSha256(content),
        })),
        manifest,
        manifestSha256: snapshotSha256(stableSnapshotJson(manifest)),
        schemaVersion: PUBLIC_SNAPSHOT_SCHEMA_VERSION,
      }
    })
  }
}
