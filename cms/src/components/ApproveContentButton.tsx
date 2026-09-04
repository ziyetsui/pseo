'use client'

import {
  Button,
  toast,
  useAuth,
  useConfig,
  useDocumentInfo,
  useFormFields,
  useFormModified,
  useFormProcessing,
} from '@payloadcms/ui'
import { useEffect, useRef, useState } from 'react'

import {
  approveSavedContentRevision,
  canApproveSavedRevision,
  type ApproveContentResult,
} from './approveContentClient'

interface CmsUserWithRoles {
  readonly roles?: unknown
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function reviewerOrAdmin(user: CmsUserWithRoles | null | undefined): boolean {
  return Array.isArray(user?.roles) &&
    user.roles.some((role) => role === 'reviewer' || role === 'admin')
}

function apiBase(serverURL: string, apiRoute: string): string {
  return `${serverURL.replace(/\/+$/u, '')}/${apiRoute.replace(/^\/+|\/+$/gu, '')}`
}

function idempotencyKey(): string {
  if (typeof globalThis.crypto?.randomUUID !== 'function') {
    throw new Error('This browser cannot create a secure content approval id')
  }
  return `cms-approval:${globalThis.crypto.randomUUID()}`
}

function ResultStatus({ result }: { readonly result: ApproveContentResult }) {
  return (
    <span role="status">
      {`${result.locale} revision approved and eligible for the next CMS public snapshot. ${result.fileCount} generated files validated. Rights revision: ${result.rightsRevision}.`}
    </span>
  )
}

/** Reviewer/admin control for revision-bound CMS approval; it does not publish content. */
export function ApproveContentButton() {
  const { user } = useAuth<CmsUserWithRoles>()
  const { config } = useConfig()
  const { id, isInitializing, lastUpdateTime } = useDocumentInfo()
  const artifactId = useFormFields<string | null>(([fields]) => stringValue(fields.artifactKey?.value))
  const sourceLocale = useFormFields<'en' | 'zh-CN' | null>(([fields]) => {
    const value = stringValue(fields.sourceLocale?.value)
    return value === 'en' || value === 'zh-CN' ? value : null
  })
  const formModified = useFormModified()
  const formProcessing = useFormProcessing()
  const requestKey = useRef<string | null>(null)
  const [approvalLocale, setApprovalLocale] = useState<'en' | 'zh-CN' | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ApproveContentResult | null>(null)

  useEffect(() => {
    requestKey.current = null
    setApprovalLocale(sourceLocale)
    setError(null)
    setResult(null)
  }, [id, lastUpdateTime, sourceLocale])

  if (!reviewerOrAdmin(user)) return null

  const saved = id !== null && id !== undefined && !isInitializing
  const disabled = !canApproveSavedRevision({
    artifactId,
    busy,
    documentId: id,
    formInitializing: isInitializing,
    formModified,
    formProcessing,
    hasResult: Boolean(result),
    locale: approvalLocale,
  })
  const tooltip = !saved
    ? 'Save this draft before approving its revision'
    : formModified
      ? 'Save the latest draft changes before approving this revision'
      : result
        ? 'This saved revision has already been approved'
        : undefined

  const approve = async () => {
    if (disabled || !artifactId || !approvalLocale) return
    setBusy(true)
    setError(null)
    try {
      requestKey.current ??= idempotencyKey()
      const nextResult = await approveSavedContentRevision({
        apiBase: apiBase(config.serverURL, config.routes.api),
        artifactId,
        idempotencyKey: requestKey.current,
        locale: approvalLocale,
      })
      setResult(nextResult)
      toast.success('Revision approved for the next CMS public snapshot')
    } catch (cause: unknown) {
      const message = cause instanceof Error ? cause.message : 'Content approval failed'
      setError(message)
      toast.error(message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ alignItems: 'center', display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
      <label style={{ alignItems: 'center', display: 'flex', gap: '0.5rem' }}>
        <span>Approval locale</span>
        <select
          aria-label="Approval locale"
          disabled={busy || formProcessing}
          onChange={(event) => {
            const locale = event.target.value
            if (locale !== 'en' && locale !== 'zh-CN') return
            requestKey.current = null
            setApprovalLocale(locale)
            setError(null)
            setResult(null)
          }}
          value={approvalLocale ?? ''}
        >
          <option disabled value="">Select locale</option>
          <option value="en">en</option>
          <option value="zh-CN">zh-CN</option>
        </select>
      </label>
      <Button
        buttonStyle="secondary"
        disabled={disabled}
        margin={false}
        onClick={() => void approve()}
        size="small"
        type="button"
        {...(tooltip ? { tooltip } : {})}
      >
        {busy ? 'Approving revision…' : 'Approve revision'}
      </Button>
      {error ? <span role="alert">{error}</span> : null}
      {result ? <ResultStatus result={result} /> : null}
    </div>
  )
}
