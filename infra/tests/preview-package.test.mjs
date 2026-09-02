import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { buildStaticContent } from '../lib/content-pipeline.mjs'
import { preparePreview } from '../lib/preview-package.mjs'

async function temporaryRoot(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'pseo-preview-test-'))
  t.after(() => rm(root, { force: true, recursive: true }))
  return root
}

test('Preview package applies noindex in HTML, headers, and robots', async (t) => {
  const root = await temporaryRoot(t)
  const frontendRoot = path.join(root, 'frontend')
  const staticContentRoot = path.join(root, 'static')
  const outputRoot = path.join(root, 'preview')
  await mkdir(frontendRoot)
  await buildStaticContent({ outputRoot: staticContentRoot })
  const routeManifest = JSON.parse(await readFile(path.join(staticContentRoot, 'route-manifest.json'), 'utf8'))
  assert.deepEqual(routeManifest.routes.map((route) => route.path), [
    '/zh-CN/prompts',
    '/zh-CN/prompts/image',
    '/zh-CN/prompts/models/nano-banana-pro',
    '/zh-CN/prompts/country-miniature-stamp-poster',
  ])
  await Promise.all([
    writeFile(path.join(frontendRoot, 'index.html'), '<html><head><title>Preview</title></head><body>Home</body></html>'),
    writeFile(
      path.join(frontendRoot, '404.html'),
      '<html><head><meta name="robots" content="index,follow"></head><body>404</body></html>',
    ),
    ...routeManifest.routes.map(async (route) => {
      const file = path.join(frontendRoot, `${route.path.slice(1)}.html`)
      await mkdir(path.dirname(file), { recursive: true })
      await writeFile(file, '<html><head></head><body>Published route</body></html>')
    }),
  ])

  const result = await preparePreview({ frontendRoot, outputRoot, staticContentRoot })
  assert.equal(result.noindex, true)
  for (const relative of ['index.html', '404.html']) {
    assert.match(await readFile(path.join(outputRoot, relative), 'utf8'), /noindex,nofollow,noarchive/)
  }
  assert.equal(await readFile(path.join(outputRoot, 'robots.txt'), 'utf8'), 'User-agent: *\nDisallow: /\n')
  assert.match(await readFile(path.join(outputRoot, '_headers'), 'utf8'), /X-Robots-Tag: noindex/)
  assert.ok(JSON.parse(await readFile(path.join(outputRoot, 'zh-CN/prompts/index.json'), 'utf8')))
  assert.equal(JSON.parse(await readFile(path.join(outputRoot, 'preview-manifest.json'), 'utf8')).noindex, true)
})

test('Preview package fails closed when frontend omits a published route', async (t) => {
  const root = await temporaryRoot(t)
  const frontendRoot = path.join(root, 'frontend')
  const staticContentRoot = path.join(root, 'static')
  await mkdir(frontendRoot)
  await Promise.all([
    writeFile(path.join(frontendRoot, '404.html'), '<html><head></head><body>404</body></html>'),
    buildStaticContent({ outputRoot: staticContentRoot }),
  ])
  await assert.rejects(
    preparePreview({ frontendRoot, outputRoot: path.join(root, 'preview'), staticContentRoot }),
    (error) => {
      assert.match(error.message, /frontend export is missing published route/)
      assert.match(error.message, /\/zh-CN\/prompts\/image/)
      assert.match(error.message, /\/zh-CN\/prompts\/models\/nano-banana-pro/)
      return true
    },
  )
})
