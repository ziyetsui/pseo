# CMS Preview Beta handoff

> **Historical local-preview handoff (superseded 2026-09-03):** the mock Git
> publisher, `Submit Review` → PublicationRequest, and per-content PR path
> described below have been removed from the deployable runtime. Do not restore
> them. Current publication is defined by
> `specs/0011-promptlab-youmind-cms-publication.md`: CMS approval → immutable
> snapshot → validated generated mirror → dedicated bot fast-forward `main`.

Status: local CMS edit → server-rendered frontend refresh is verified. Production/static content selection remains the checked-in fixture/Git path.

## Start the Beta loop

From the repository root:

```bash
node scripts/cms-preview-beta.mjs
```

The command verifies the configured PostgreSQL socket, runs the idempotent 35-Prompt seed, starts Payload and the CMS-backed frontend, performs the edit/refresh/restore proof, and then leaves both services running:

- CMS: `http://127.0.0.1:3001/admin`
- CMS-backed Prompt Lab: `http://127.0.0.1:3200/zh-CN/prompts`
- Existing fixture preview: port `3100` is never started, stopped, or reused by this command.

For a one-shot verification that stops both child services afterward:

```bash
node scripts/cms-preview-beta.mjs --verify-and-stop
```

Ports `3001` and `3200` must be free. The command fails instead of taking over an unrelated process.

## Private configuration

The command reads the existing ignored `cms/.env` for `PAYLOAD_SECRET`, `DATABASE_URI`, and `CMS_MOCK_GIT_BASE_SHA`. It forces the Git publisher to `mock`, enables Preview only for the child processes, and generates an ephemeral Preview bearer token when none is supplied. The same token is passed server-side to the frontend process; it is never printed or placed in a `NEXT_PUBLIC_*` variable.

No admin email/password is needed for the automated proof. It uses Payload Local API with `overrideAccess` for one controlled draft update and restores the prior value in `finally`. The existing CMS admin user and all other CMS records are untouched.

## What the proof asserts

The deterministic `country-miniature-stamp-poster` locale draft is used when present.

1. Preview API returns `Cache-Control: no-store, private`, `X-Robots-Tag: noindex, nofollow, noarchive`, and a matching content-revision header/body.
2. The record remains Payload `_status=draft`, `draftWorkflowState=needs_review`, `indexable=false`, translation `draft`, and Git `unpublished`.
3. The title is updated through Payload Local API.
4. The Preview API revision changes and the L4 HTML on port `3200` shows the exact edited title after refresh, without rebuilding.
5. The page contains the visible short revision marker and contains neither the Preview token nor CMS base URL.
6. The original title is restored in `finally`, and the original deterministic revision returns.
7. Submit Review's safe publisher returns `mock_accepted`, `provider=mock`, and a planned branch while branch, commit, PR, merge, and release fields remain null.
8. Hashes of `content/**`, `frontend/src/data/wireframe/**`, `frontend/out/**`, and `infra/generated/static/**` are identical before and after the preview/edit loop.

## Verification evidence — 2026-09-02

- Dedicated live loop: passed. Initial/restored revision `sha256:c139f89045b81a2df1a3a61ad7db1ac087e234337abacb504f0d9ebecfbf9cd0`; edited revision `sha256:695b69f8b1051a8f86a13f9145e4cf202525db1f4b741cc6eb717c632dc39f17`.
- Seed rerun: `0` created; `35` Prompt artifacts, `35` locale variants, `35` source records, and `66` taxonomies skipped without overwrite.
- CMS: `pnpm verify` — TypeScript and `42/42` tests passed.
- Frontend: `pnpm lint`, `pnpm typecheck`, `pnpm test` — lint/typecheck passed and `500/500` tests passed.
- Frontend production export: default Turbopack build hit its known sandbox port-binding `EPERM`; `pnpm exec next build --webpack` passed and exported `55` pages. `pnpm check:static` passed.
- Infrastructure: `npm run verify` — validation, `11/11` tests, and deterministic static-content build passed.
- Orchestration helpers: `node --test scripts/tests/cms-preview-beta.test.mjs` — `4/4` passed.

## Deliberate Beta boundaries

- Only Prompt/catalog data comes from Payload Preview. Blog methods continue to use the checked-in fixture because the CMS has no Article collection yet.
- The default source remains `fixture`; the production/static build never reads Payload.
- The seeded drafts intentionally fail the publication validator until editorial and translation requirements are complete. The E2E therefore checks the mock publisher's no-side-effect receipt without claiming that an incomplete draft is publishable.
- No real Git branch, commit, pull request, merge, release, external deployment, or GitHub write is performed by this loop.
- CMS uses the existing local PostgreSQL service. The command verifies connectivity but does not install or reconfigure PostgreSQL.
