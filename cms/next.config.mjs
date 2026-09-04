import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare'
import { withPayload } from '@payloadcms/next/withPayload'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
const require = createRequire(import.meta.url)

// Payload's REST handler statically imports its OG endpoint. Resolve the exact
// installed endpoint path so both webpack and Turbopack replace it before
// `next/og` can pull the resvg/yoga WASM and fallback font into the Worker.
// payload.config.ts also disables the feature, and the stub mirrors Payload's
// disabled HTTP 400 behavior.
const payloadNextRoutesPath = require.resolve('@payloadcms/next/routes')
const payloadNextDistDir = path.dirname(path.dirname(payloadNextRoutesPath))
const payloadOgEndpointPath = path.join(payloadNextDistDir, 'routes/rest/og/index.js')
const payloadOgStubPath = path.resolve(dirname, 'stubs/payload-og-endpoint.js')
const drizzleKitStubPath = path.resolve(dirname, 'stubs/drizzle-kit-api.js')

export function createRuntimeAliases(environment = process.env) {
  return {
    [payloadOgEndpointPath]: payloadOgStubPath,
    // Development schema push legitimately calls drizzle-kit. Replace it only
    // in the production-mode D1 build used by the Cloudflare wrapper.
    ...(environment.NODE_ENV === 'production' && environment.CMS_DATABASE_ADAPTER === 'd1'
      ? { 'drizzle-kit/api': drizzleKitStubPath }
      : {}),
  }
}

const runtimeAliases = createRuntimeAliases()

if (
  process.env.CMS_DATABASE_ADAPTER === 'd1'
  && process.env.CMS_CLOUDFLARE_EPHEMERAL_D1 !== 'true'
  && process.env.NODE_ENV !== 'production'
) {
  void initOpenNextCloudflareForDev({ remoteBindings: false })
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // These packages contain workerd-specific or runtime-resolved Node paths.
  // Keep this aligned with Payload's official Cloudflare D1 template.
  serverExternalPackages: ['jose', 'pg-cloudflare'],
  // `drizzle-kit/api` is CLI-only. Aliasing it prevents OpenNext's esbuild
  // phase from bundling the large migration toolkit into the runtime Worker.
  turbopack: {
    resolveAlias: runtimeAliases,
  },
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }
    webpackConfig.resolve.alias = {
      ...webpackConfig.resolve.alias,
      ...runtimeAliases,
    }

    return webpackConfig
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
