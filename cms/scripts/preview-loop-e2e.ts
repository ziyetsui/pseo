import { createRequire, register } from "node:module";

import { runCmsPreviewLoop } from "../src/integration/previewLoop.ts";

type NextEnvLoader = (cwd: string, dev?: boolean) => unknown;

function registerCmsPathAliases(): void {
  const sourceRoot = new URL("../src/", import.meta.url).href;
  const loader = `
    import { existsSync } from 'node:fs'
    import { fileURLToPath } from 'node:url'
    const sourceRoot = ${JSON.stringify(sourceRoot)}
    function withTypeScriptExtension(target) {
      const file = new URL(target.href + '.ts')
      const index = new URL(target.href.replace(/\\/$/, '') + '/index.ts')
      return existsSync(fileURLToPath(file)) ? file : index
    }
    export async function resolve(specifier, context, nextResolve) {
      if (specifier.startsWith('@/')) {
        const target = new URL(specifier.slice(2), sourceRoot)
        return nextResolve(withTypeScriptExtension(target).href, context)
      }
      if (specifier.startsWith('.') && context.parentURL?.startsWith(sourceRoot)) {
        const target = new URL(specifier, context.parentURL)
        const candidate = withTypeScriptExtension(target)
        if (existsSync(fileURLToPath(candidate))) return nextResolve(candidate.href, context)
      }
      return nextResolve(specifier, context)
    }
  `;
  register(`data:text/javascript,${encodeURIComponent(loader)}`, import.meta.url);
}

async function main(): Promise<void> {
  registerCmsPathAliases();
  const requireFromScript = createRequire(import.meta.url);
  const requireFromNext = createRequire(requireFromScript.resolve("next/package.json"));
  const { loadEnvConfig } = requireFromNext("@next/env") as { loadEnvConfig: NextEnvLoader };
  loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");

  const previewToken = process.env.CMS_PREVIEW_TOKEN?.trim();
  if (!previewToken || previewToken.length < 32) throw new Error("CMS_PREVIEW_TOKEN is required");

  const { getPayload } = await import("payload");
  const config = (await import("../src/payload.config.ts")).default;
  const payload = await getPayload({ config });
  try {
    if (process.argv.includes("--seed")) {
      const { seedWireframeFixture } = await import("../src/seed/wireframe.ts");
      const result = await seedWireframeFixture(payload);
      process.stdout.write(`${JSON.stringify({ mode: "seed", ...result }, null, 2)}\n`);
      return;
    }
    const evidence = await runCmsPreviewLoop({
      cmsBaseUrl: process.env.PSEO_PREVIEW_API_BASE_URL ?? "http://127.0.0.1:3001",
      frontendBaseUrl: process.env.PSEO_PREVIEW_FRONTEND_URL ?? "http://127.0.0.1:3200",
      payload,
      previewToken,
    });
    process.stdout.write(`${JSON.stringify({ mode: "verified", ...evidence }, null, 2)}\n`);
  } finally {
    await payload.destroy();
  }
}

void main().then(
  () => process.exit(0),
  (error: unknown) => {
    const message = error instanceof Error ? error.message : "Unknown preview-loop failure";
    process.stderr.write(`CMS preview loop failed: ${message}\n`, () => process.exit(1));
  },
);
