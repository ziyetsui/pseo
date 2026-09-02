import { createHash, timingSafeEqual } from 'node:crypto'

import type { Endpoint } from 'payload'

import type { CmsEnvironment } from '../config/env.ts'
import {
  buildCmsPreviewEnvelope,
  loadPreviewCatalogDocuments,
  projectPreviewCatalog,
  type CmsPreviewData,
  type PreviewPayloadLocalApi,
} from '../preview/index.ts'

const SECURITY_HEADERS = {
  'Cache-Control': 'no-store, private',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
}

export interface PreviewCatalogEndpointOptions {
  readonly now?: () => string
}

function response(status: number, code: string, detail: string): Response {
  return Response.json({ code, detail, status }, { status, headers: SECURITY_HEADERS })
}

function bearerToken(value: string | null): string | null {
  if (!value?.startsWith('Bearer ')) return null
  const token = value.slice('Bearer '.length)
  return token ? token : null
}

function constantTimeTokenMatches(candidate: string | null, expected: string): boolean {
  const candidateDigest = createHash('sha256').update(candidate ?? '').digest()
  const expectedDigest = createHash('sha256').update(expected).digest()
  return timingSafeEqual(candidateDigest, expectedDigest) && candidate !== null
}

function assertCompleteSeededCatalog(data: CmsPreviewData): void {
  if (
    data.prompts.length !== 35 ||
    data.taxonomies.length !== 42 ||
    data.creators.length !== 21 ||
    data.models.length !== 11 ||
    data.collections.length !== 6
  ) {
    throw new Error('The CMS preview seed is incomplete')
  }
}

export function createPreviewCatalogEndpoint(
  environment: CmsEnvironment,
  options: PreviewCatalogEndpointOptions = {},
): Endpoint {
  return {
    path: '/internal/v1/preview-catalog',
    method: 'get',
    handler: async (req) => {
      if (!environment.previewEnabled || !environment.previewToken) {
        return response(404, 'NOT_FOUND', 'Not found')
      }

      if (!constantTimeTokenMatches(bearerToken(req.headers.get('authorization')), environment.previewToken)) {
        return response(401, 'UNAUTHENTICATED', 'Valid preview credentials are required')
      }

      let locale: string | null
      try {
        if (!req.url) throw new TypeError('Missing request URL')
        locale = new URL(req.url).searchParams.get('locale')
      } catch {
        return response(400, 'INVALID_LOCALE', 'Only locale zh-CN is supported')
      }
      if (locale !== 'zh-CN') {
        return response(400, 'INVALID_LOCALE', 'Only locale zh-CN is supported')
      }

      try {
        const documents = await loadPreviewCatalogDocuments(
          req.payload as unknown as PreviewPayloadLocalApi,
          locale,
        )
        const data = projectPreviewCatalog(documents, locale)
        assertCompleteSeededCatalog(data)
        const envelope = buildCmsPreviewEnvelope(data, options.now?.() ?? new Date().toISOString())
        return Response.json(envelope, {
          status: 200,
          headers: {
            ...SECURITY_HEADERS,
            'X-Content-Revision': envelope.meta.contentRevision,
          },
        })
      } catch {
        return response(500, 'PREVIEW_CATALOG_FAILED', 'Preview catalog could not be generated')
      }
    },
  }
}
