// Payload's REST handler imports this endpoint unconditionally. Dynamic OG
// images are disabled in payload.config.ts, so mirror Payload's own disabled
// response without importing `next/og` and its large WASM/font dependencies.
export const runtime = 'nodejs'
export const contentType = 'image/png'
export const generateOGImage = async () => {
  return Response.json({ error: 'Open Graph images are disabled' }, { status: 400 })
}
