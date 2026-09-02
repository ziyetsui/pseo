import { generatePageMetadata, RootPage } from '@payloadcms/next/views'
import config from '@payload-config'
import type { Metadata } from 'next'

import { importMap } from '../importMap'

interface PageArguments {
  readonly params: Promise<{ segments: string[] }>
  readonly searchParams: Promise<Record<string, string | string[]>>
}

export function generateMetadata({ params, searchParams }: PageArguments): Promise<Metadata> {
  return generatePageMetadata({ config, params, searchParams })
}

export default function AdminPage({ params, searchParams }: PageArguments) {
  return RootPage({ config, importMap, params, searchParams })
}
