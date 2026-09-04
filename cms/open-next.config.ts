import {
  defineCloudflareConfig,
  type OpenNextConfig,
} from '@opennextjs/cloudflare/config'

// Payload Admin and REST do not use ISR in the internal beta. R2-backed cache
// and upload storage can be added only when a reviewed upload collection exists.
const cloudflareConfig = defineCloudflareConfig({})

export default {
  ...cloudflareConfig,
  // Invoke Next directly so the sanitized staging build never executes pnpm's
  // generated .bin shim, whose NODE_PATH contains the source checkout path.
  buildCommand: 'node node_modules/next/dist/bin/next build --webpack',
} satisfies OpenNextConfig
