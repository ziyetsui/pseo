# CMS → Frontend Local Beta Integration Plan

Spec: `specs/0008-prd.md`, `specs/0009-pseo-tech-arch.md`

## Goal

Run a truthful local preview loop in which all 35 wireframe Prompt records and their creators/models/categories exist as Payload drafts; an authenticated, preview-only API projects those drafts; and a separately started frontend preview reads that projection so a CMS save is visible after refresh. Production/default builds remain Git-first/fixture-backed and Submit Review remains mock-only during Beta. After that gate passes, add a separately enabled public Prompt Lab exporter and GitHub PR publisher so reviewed locales can become public, auditable Markdown without making Payload the publication authority.

## Global Constraints

- Git `main` remains the only publication authority. No CMS record may become production content, RSS, sitemap, or a released projection.
- Default `PSEO_CONTENT_SOURCE` remains `fixture`. Preview requires explicit `PSEO_CONTENT_SOURCE=cms-preview` and `PSEO_PREVIEW=1`.
- Preview credentials are server-only variables and must never use a `NEXT_PUBLIC_` prefix, appear in HTML/client bundles, logs, fixtures, reports, or commits.
- Preview API is disabled unless explicitly configured, requires a constant-time bearer-token check, returns `Cache-Control: no-store` and `X-Robots-Tag: noindex`, and exposes only a field-whitelisted DTO.
- Preview mode fails closed. It never falls back to the fixture when configuration, authentication, transport, schema, or revision checks fail.
- The 35 imported records are editorial drafts: `draftWorkflowState=needs_review`, Payload `_status=draft`, `indexable=false`, translation status `draft`, SEO `noindex,nofollow`, Git state `unpublished`.
- Missing wireframe facts stay null/empty. Do not invent source publication dates, variables, parameters, workflow steps, translations, model claims, counts, or measured media dimensions.
- CMS draft schemas may accept incomplete editorial records, but the existing publication validator must continue rejecting incomplete content before Submit Review.
- Unknown wireframe content type maps to CMS `other` while the preview metadata preserves `unknown` for truthful frontend rendering.
- Saving a CMS draft updates the preview after frontend refresh without rebuilding or mutating checked-in `content/`, `frontend/src/data/wireframe`, `frontend/out`, `infra/generated/static`, RSS, or sitemap.
- Existing local fixture frontend, public Git-derived backend, and production/static build behavior must remain unchanged.
- Tasks 1–4 allow no live Git publisher, branch, commit, pull request, merge, external network, Cloudflare deployment, or production credential. Task 5 may implement and test the real GitHub adapter, but activation and the first public repository write require explicit repository configuration and authenticated GitHub credentials.
- Preserve unrelated and untracked workspace files. Agents own only the files named by their task and do not revert other edits.

## Rulings

- Work in the current checkout on branch `codex/cms-preview-integration` instead of a linked worktree because the load-bearing CMS/backend/content/infra/spec files are currently untracked and would be absent from a clean worktree. Cost if wrong: the branch is isolated but the filesystem is not; strict file ownership is required.
- Allow a narrow frontend-server → CMS Preview API connection only when both preview sentinels are set. This is an explicit internal-beta exception to the normal “frontend never reads Payload” rule; production behavior is unchanged. Cost if wrong: replace this one adapter with a backend preview proxy later.
- Relax minimum-row/required presentation constraints for incomplete drafts while retaining strict publication validation. Cost if wrong: editors can save incomplete drafts, but they remain visibly `needs_review`, noindex, unpublished, and un-submittable.
- Seed one `zh-CN` draft projection per wireframe record using the wireframe-visible text without claiming it is a ready translation. Cost if wrong: the preview demonstrates editing accurately but is not evidence of completed localization.

## Interface Contract

The CMS preview endpoint returns a closed JSON envelope:

```ts
type CmsPreviewEnvelope = {
  data: {
    prompts: WireframePromptRecord[]
    taxonomies: WireframeTaxonomyRecord[]
    creators: Creator[]
    models: WireframeModelRecord[]
    collections: Collection[]
    snapshot: Snapshot
  }
  meta: {
    contentRevision: `sha256:${string}`
    generatedAt: string
    mode: 'cms-preview'
  }
}
```

The response is rebuilt from Payload drafts on every request, sorted by stable natural keys, and hashed from canonical JSON excluding `generatedAt`. Normal CMS fields override imported preview metadata for editable title, summary, Prompt text, relationships, metrics, media, source, variables, inputs, parameters, workflow, slug and creator.

## Task 1: Import all wireframe Prompt data as safe CMS drafts

Ownership: `cms/src/collections/**`, `cms/src/seed/**`, `cms/scripts/seed-wireframe.ts`, `cms/tests/**`, `cms/package.json`, and generated Payload types/import map only when required.

Implement a pure fixture adapter and idempotent Payload Local API seed command.

Requirements:

- Import exactly 35 prompt artifacts, 21 creator taxonomies, 11 model taxonomies, 6 collection taxonomies, and every referenced use_case/technique/style/subject taxonomy.
- Use stable natural keys and create-missing/skip-existing behavior; never overwrite edited records and never delete.
- Use `prm_<wireframe-id>` artifact keys and retain the original wireframe id in preview metadata.
- Create one `zh-CN` draft locale variant per prompt and source records with nullable publication dates.
- Preserve all frontend-only wireframe fields in an explicitly named `betaPreview` JSON field that is excluded from publication serialization.
- Relax draft collection constraints needed for honest incomplete imports; prove the publication validator still rejects an incomplete seeded record.
- Add `pnpm seed:wireframe` and a dry-run/count mode.
- Tests cover exact counts, axis mapping, unknown content type, missing dates, assumed dimensions, safe draft states, rerun/no-overwrite behavior, and incomplete-publication rejection.
- Commit the task and write the SDD task report.

## Task 2: Expose a protected CMS Preview projection

Ownership: `cms/src/endpoints/**`, `cms/src/preview/**`, `cms/src/config/env.ts`, `cms/src/payload.config.ts`, `cms/tests/**`, `cms/.env.example`, and `cms/README.md`.

Implement the endpoint from the Interface Contract.

Requirements:

- Endpoint: `GET /api/internal/v1/preview-catalog?locale=zh-CN`.
- Require `CMS_PREVIEW_ENABLED=true` plus a server-only `CMS_PREVIEW_TOKEN` of at least 32 characters.
- Use a constant-time bearer comparison; respond 404 while disabled, 401 for missing/invalid credentials, and 400 for unsupported locale.
- Query drafts with Local API, explicit depth, stable sorting, field whitelisting and no request-dependent current time in the revision hash.
- Normal editable fields override beta metadata; missing values remain null/empty.
- Set `Cache-Control: no-store, private`, `X-Robots-Tag: noindex, nofollow, noarchive`, and `X-Content-Revision`.
- Never expose users, password hashes, sessions, publication idempotency keys, internal database ids, Git secrets, or environment values.
- Tests cover disabled/auth/locale errors, exact count, deterministic revision, edit changes revision/body, and secret absence.
- Commit the task and write the SDD task report.

## Task 3: Add the fail-closed frontend CMS Preview repository

Ownership: `frontend/src/lib/content/**`, `frontend/src/lib/api/**`, directly affected imports, `frontend/tests/**`, `frontend/package.json`, and `frontend/README.md`.

Refactor the fixture repository into a data-injected repository and add a server-only preview client/factory selection.

Requirements:

- Default factory and all production/static tests continue using the checked-in wireframe fixture.
- Preview requires all four values: `PSEO_CONTENT_SOURCE=cms-preview`, `PSEO_PREVIEW=1`, valid absolute `PSEO_PREVIEW_API_BASE_URL`, and nonempty `PSEO_PREVIEW_API_TOKEN`.
- Fetch only on the server with a timeout, request id, bearer token and `cache: 'no-store'`; validate the external `unknown` response before domain mapping.
- No fallback to fixture on any preview error. Map not-found/config/auth/schema/timeout/unavailable to typed errors.
- One repository instance uses one consistent content revision and supplies all prompt/model/taxonomy/creator/collection methods. Blog methods may explicitly delegate to the unchanged fixture repository because CMS has no Article collection yet; document this truthful boundary.
- Do not import `server-only` through the shared pure-helper barrel used by client components; move the factory to a safe server entrypoint if needed.
- Add a visible internal-preview marker with revision on pages without changing the production fixture rendering.
- Tests cover config gates, response validation, token/client isolation, revision consistency, full Prompt copy text, editable fields, no fallback, and unchanged production build.
- Commit the task and write the SDD task report.

## Task 4: Run and verify the complete local edit-preview loop

Ownership: `scripts/**` or `infra/bin/**` local orchestration, dedicated integration tests/config, `docs/**`, and minimal package scripts needed to run the loop. Do not modify production deploy workflows.

Implement a repeatable local command and E2E evidence.

Requirements:

- Start/verify PostgreSQL, CMS on `127.0.0.1:3001`, and CMS-backed frontend preview on a dedicated loopback port without stopping the existing fixture preview on 3100.
- Seed the current local CMS database without overwriting the existing admin.
- Through authenticated CMS REST, edit one deterministic Prompt draft title or summary, then refresh the frontend preview and assert the exact edit is visible on its L4 route.
- Restore that test draft value through CMS REST during teardown; do not reset/drop the developer database.
- Verify CMS remains `_status=draft`, `needs_review`, `indexable=false`, Git unpublished.
- Submit Review test remains mock-only and asserts no branch/commit/PR/merge/release values.
- Assert preview headers/noindex and that checked-in content/static fixture outputs are unchanged.
- Run CMS typecheck/tests, frontend lint/typecheck/unit/build/static checks, dedicated preview E2E, and applicable infra tests.
- Write `docs/handoffs/cms-preview-beta.md` with commands, ports, credentials handling, limitations and exact verification evidence.
- Commit the task and write the SDD task report.

## Task 5: Publish reviewed Prompt content as a public GitHub Prompt Lab

Ownership: deterministic CMS→Markdown export, the production `GitPublisher` adapter, a public-repository template/workflows, contract tests, and public publishing documentation. Keep application source and public content repository concerns separable.

Implement an auditable Prompt Lab inspired by YouMind OpenLab, with stricter Git-first review semantics:

- Export only CMS records that pass the existing publication validator; missing or draft translations never appear as ready locales.
- Generate deterministic `content/prompts/<immutable-id>/<locale>.md`, locale README/index files, machine-readable catalog/index JSON, taxonomy indexes, media manifests, license/attribution, contribution guide and issue templates.
- Preserve immutable Prompt ids, provenance/source links, creator attribution, model/taxonomy relations, translation state, record revision and content revision.
- A real GitHub adapter creates an idempotent branch and commit, opens or reuses a PR, and records branch/commit/PR receipt. It never pushes directly to protected `main` or merges automatically.
- Keep `CMS_GIT_PUBLISHER=mock` as the default. Real mode requires an explicit production sentinel, repository owner/name, base branch, GitHub App/token credentials and allowlisted repository identity; incomplete config fails closed.
- CI validates schemas, links, uniqueness, attribution, media references, locale completeness and deterministic regeneration before a PR can merge.
- Repository workflows rebuild locale README/index files from reviewed Markdown after merge; public Issue contributions enter review and do not bypass CMS/Git validation.
- Tests use a fake GitHub transport and fixture repository. No network write occurs until the user authenticates and confirms the target public repository.
- Document repository bootstrap, branch protection, GitHub App permissions, secrets, recovery/idempotency, contribution flow and the first-publish checklist.
