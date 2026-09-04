# PSEO internal-beta CMS

Payload `3.88.0` is the canonical store for Prompt content, locales, taxonomy,
sources, rights decisions and editorial approvals. The active publication model
is defined by
[`0011-promptlab-youmind-cms-publication.md`](../specs/0011-promptlab-youmind-cms-publication.md).

> Cutover decision (2026-09-03): content no longer follows a per-content
> branch/PR/merge release path. `ziyetsui/prompt-lab` is a generated mirror. A
> dedicated mirror bot may update that generated-only repository's `main` by
> checked, compare-and-swap fast-forward; application code, schemas, workflows,
> policies and licenses still use normal engineering PRs.

## Current local implementation

| Collection | Purpose |
| --- | --- |
| `prompt-artifacts` | Stable Prompt identity and canonical content fields. |
| `locale-variants` | Independently reviewed locale, slug, body, workflow and SEO data. |
| `taxonomies` | Localized model/use-case/technique/style/subject/collection/creator relations. |
| `source-evidence` | Source/evidence records and fail-closed rights review. |
| `content-approvals` | Append-only, revision-bound human approval audit. Direct collection writes are denied. |
| `agent-proposal-audits` | Append-only receipt for bounded Agent-created drafts; it intentionally stores no Prompt body. |
| `publication-requests` | Hidden, read-only audit from the retired content-PR experiment. It is not a queue. |
| `users` | Payload Admin authentication and beta roles. |

All editable content collections use Payload versions/drafts. Payload's native
`_status=published` is blocked: it is not the product's public-state control.
The active Admin action is **Approve revision**, available only to reviewer/admin
roles for a saved artifact and one locale.

Approval is a two-step, fail-closed operation:

```http
POST /api/internal/v1/artifacts/:artifactId/approvals/prepare
POST /api/internal/v1/artifacts/:artifactId/approvals
Idempotency-Key: <unique decision key>
```

Prepare validates the current saved CMS projection and returns sorted file
metadata plus the exact `contentRevision`, `sourceRevision`, independent
`rightsRevision`, and rights-policy version. Approve revalidates all four values
and returns `409` if content, source, rights, policy or idempotency identity has
drifted. A successful call appends an audit record; it does **not** create Git
objects, publish a snapshot, write the mirror, deploy, or mark content released.

The rights validator supports:

- `cleared`: requires auditable authorization/license evidence and human review;
- `community_attributed`: requires protected author identity, original source,
  policy/risk acceptance and takedown URL, and rejects a repository license
  claim for the third-party Prompt;
- `unknown` / `review_required`: saveable for review but ineligible for public
  projection;
- `restricted` / `takedown`: excluded from public projection, with removal audit
  fields required for takedown.

The 35 wireframe/X records remain `review_required`; this cutover does not
silently promote them. The owner-approved golden record is separate evidence,
but rights evidence alone is not a public snapshot or a release.

These are separate facts:

```text
draft -> validation -> revision-bound human approval
      -> immutable CMS public snapshot
      -> GitHub generated mirror synced
      -> same-revision production deployment + smoke
```

The active CMS code implements revision-bound approval and a read-only
public-snapshot endpoint. Snapshot export is disabled by default, requires a
separate Bearer token, and obtains one repeatable-read, read-only view with the
PostgreSQL adapter. The Cloudflare production Worker now uses Neon PostgreSQL
through a cache-disabled Hyperdrive binding; the retired D1 adapter continues
to return `503 SNAPSHOT_CONSISTENCY_UNAVAILABLE` if used as a rollback runtime.
Mirror sync and online release receipts remain separate, incomplete facts.

## Agent create-Prompt proposal

The local codebase implements a versioned, authenticated create-only proposal
endpoint:

```http
POST /api/internal/v1/agent-proposals/prompts
Authorization: users API-Key <agent-proposer-key>
Idempotency-Key: <unique-safe-key>
Content-Type: application/json
```

The dedicated service user must have only the `agent_proposer` role. That role
cannot use ordinary editorial collection reads/writes and cannot review or
approve. The endpoint accepts an exact allowlist of Prompt, locale and source
fields, requires `expectedState: "absent"`, verifies X status URLs when used,
and applies one PostgreSQL serializable transaction. Its only successful result
is a Prompt artifact, locale variant and source-evidence record in `draft`,
`noindex,nofollow` and `review_required`, plus an immutable audit receipt.

Rights decisions, approval, taxonomy mutation, public snapshot, mirror sync,
deployment and `released` are not accepted operations. The host-side client is
in `tools/content-agent/src/cms-proposal-client.ts`; it uses environment-only
credentials, a fixed endpoint, no redirects and never logs the request body.
The natural-language/SDK authoring runner remains retired. This endpoint and its
PostgreSQL migration are implemented and verified locally but are not part of
the currently deployed Worker version listed below until the engineering change
is reviewed and deployed.

## Retired Git publisher

The active Payload composition root does not mount the old
`publication-requests/prepare` or `publication-requests` routes and contains no
Submit Review UI, GitHub/mock publisher, PublicationRequest service/repository,
or one-shot publication CLI. Local Preview and Wrangler configuration pass no
`CMS_GIT_*`, `CMS_GITHUB_*` or `CMS_MOCK_*` variables. Cloudflare artifact
checks fail closed if old route, UI, publisher or environment markers appear in
the built deploy artifact. GitHub mirror credentials belong only to the
external mirror worker; do not install one in the CMS Worker.

Only the hidden, read-only `publication-requests` collection remains to
interpret the 2026-09-02 experiment. PRs
[#3](https://github.com/ziyetsui/prompt-lab/pull/3),
[#4](https://github.com/ziyetsui/prompt-lab/pull/4) and
[#5](https://github.com/ziyetsui/prompt-lab/pull/5) are historical evidence, not
current release steps. Do not merge, rebase or resubmit them to publish content.

## Generated-mirror boundary

The repository contains the source template for the consumer installed in
`ziyetsui/prompt-lab` under `prompt-lab-template`:

- `scripts/sync-cms-snapshot.mjs` validates a closed immutable envelope,
  manifest hashes, allowlisted paths, UTF-8, secrets and executable HTML, then
  applies a complete tree transactionally;
- `.github/workflows/sync-cms-snapshot.yml` runs on demand and every four hours,
  validates the tree and performs an ordinary fast-forward push to `main` only
  when the observed remote SHA still matches;
- the workflow uses a read-only snapshot credential and `contents: write`, does
  not persist checkout credentials, does not force-push and does not open a
  per-content PR.

The control plane was installed through engineering PRs #6-#10. Mirror run
[33761670885](https://github.com/ziyetsui/prompt-lab/actions/runs/33761670885)
successfully prepared, pushed and post-push verified the first one-Prompt
snapshot at commit `1a3352b85e5394fe899220418d9a8d8e67082661`; its manifest is
`sha256:9fab060d9d201645ac49eeff72bd4fbbf71e9e2ef353a3cbea2d0b7ebb039ee6`.
The rotated write deploy key is restricted to the mirror repository, and the
retired key was removed. This proves the online snapshot-to-mirror path, not a
formal production release: deployment/smoke receipt persistence and the signed
CMS release callback remain unimplemented.

## Read-only public snapshot

The export endpoint is disabled by default and returns `404` while disabled. A
local PostgreSQL deployment may enable it with a dedicated, server-only read
credential:

```dotenv
CMS_PUBLIC_SNAPSHOT_ENABLED=true
CMS_PUBLIC_SNAPSHOT_TOKEN=<a-random-read-only-token-of-at-least-32-characters>
```

```http
GET /api/internal/v1/public-snapshot
Authorization: Bearer <the-read-only-snapshot-token>
```

The endpoint returns `Cache-Control: no-store` and has no content, Git or
deployment write side effects. Authentication is checked before Payload reads.
PostgreSQL reads use one repeatable-read, read-only transaction; D1 returns the
safe consistency-unavailable response described above.

## Protected local preview

The preview endpoint is draft-only and is not a publication source. Enable it
locally with server-only values:

```dotenv
CMS_PREVIEW_ENABLED=true
CMS_PREVIEW_TOKEN=<a-random-server-only-token-of-at-least-32-characters>
```

```http
GET /api/internal/v1/preview-catalog?locale=zh-CN
Authorization: Bearer <the-local-preview-token>
```

Disabled returns `404`, invalid credentials return `401`, and unsupported
locales return `400`. Responses are a closed no-store/noindex wireframe DTO and
carry deterministic `X-Content-Revision`; they never publish or update Git.
Never expose the token through `NEXT_PUBLIC_*`, a browser URL or tracked files.

## Local setup

1. Copy `.env.example` to `.env` and set local-only values.
2. Select local PostgreSQL with `CMS_DATABASE_ADAPTER=postgres`,
   `CMS_POSTGRES_TRANSPORT=direct` and `DATABASE_URI`, or use the reviewed local
   D1 binding. Hyperdrive is resolved only from a Cloudflare runtime binding.
3. Run `pnpm install` from the approved package mirror.
4. Run `pnpm generate:types` and `pnpm generate:importmap`.
5. Start with `pnpm dev --port 3001`, then open `/admin`.

The first Payload user is bootstrapped as `admin`; later user creation requires
an admin. A deployed Admin still requires Cloudflare Access or an equivalent
identity-aware proxy.

## Cloudflare checkpoint: current PostgreSQL deployment

The authorized 2026-09-03 cutover is live at
<https://pseo-cms-beta.codex-cloudflare-20260612.workers.dev>:

- the current Paid-CPU Worker version is
  `51e73e54-3282-4228-9ac2-6ebbb9d171d0`;
- the Worker has a cache-disabled Hyperdrive binding, Smart Placement,
  `CMS_DATABASE_ADAPTER=postgres` and `CMS_POSTGRES_TRANSPORT=hyperdrive`, with
  no D1 binding; Payload's cached adapter now delegates to one native pool per
  request and retains each scope through response streaming and `waitUntil`;
- migration dry-run, apply and independent repeatable-read verification match
  across 51 shared tables and 940 rows; core counts are 36 Prompt Artifacts,
  36 locale variants, 37 source/evidence rows and 71 taxonomy rows; the first
  admin was created once after migration, so the live user count is now 1;
- authenticated smoke passed for Dashboard, Users, Prompt Artifacts, Prompt
  detail and `/api/users/me`; four concurrent page reloads plus a dummy
  multipart login request produced no error/canceled tail event or 1101;
- CMS verification is 190/190, including 15/15 focused request-scope tests;
  the sanitized production build, artifact scan and Wrangler dry-run passed.

`CMS_PREVIEW_ENABLED=false` and `CMS_PUBLIC_SNAPSHOT_ENABLED=true`. The golden
Prompt now has one human, revision-bound approval; the other 35 records remain
`review_required`. The protected Pages beta is built from the exact verified
mirror commit above rather than the legacy 35-record fixture. Its deployment
`a4cb721c` passed authenticated list/detail/model/404/CSS smoke and renders the
Prompt source plus `CC BY 4.0`. It is an Internal Beta Preview, not a live CMS
Preview or a formal `released` projection.

## Cloudflare checkpoint: superseded D1 deployment

The owner-only Internal Beta before this cutover used:

- D1 `pseo-cms-beta`
  (`aeec1c88-bc9c-4d6e-a4c2-9f8bda4f7a7b`) read back 36 Prompt Artifacts,
  36 locale variants, 37 source/evidence rows and 71 taxonomy rows with no
  foreign-key violations;
- CMS Worker version `18b56753-2204-4b31-b51d-313f132b1e07` is at
  <https://pseo-cms-beta.codex-cloudflare-20260612.workers.dev> behind
  owner-only Access;
- protected Pages preview deployment `c75633aa` is at
  <https://internal-beta.pseo-internal-beta-preview.pages.dev>;
- custom DNS and a Backend/API Worker remain absent.

That D1 runtime has been superseded. Worker version
`311f108d-306a-4584-b76a-8453d8d659e0` is retained only as a rollback point;
rolling back the Worker does not remove the Neon database, Hyperdrive
configuration or private migration backup. The public PromptLab repository was
not changed by the database cutover.

Cloudflare deployment is an explicit production write and still requires user
authorization. Use only the reviewed package scripts; they stage and scan the
artifact and apply the adapter-specific reviewed migrations.
PostgreSQL/Hyperdrive has a separate fail-closed
[preflight runbook](docs/cloudflare-postgres.md) and a non-secret example
configuration; the real binding file remains ignored. Do not bypass these
entrypoints with direct Payload, OpenNext or Wrangler deploy commands.

## Verification

Run locally from `cms/`:

```sh
pnpm generate:types
pnpm generate:importmap
pnpm typecheck
pnpm test
pnpm build
```

The CMS and generated-mirror suites exercise revision-bound approval,
producer/consumer compatibility, rights exclusions, deterministic generation,
empty removal snapshots and mirror safety checks. Run the commands above for
the current exact counts. These checks prove local code and contracts only.
The separate online evidence above proves one snapshot/mirror/Preview run;
neither category alone proves a formal production release.

## Remaining cutover work

- Implement approved-Issue intake with approver, exact body revision and
  delivery-id replay protection.
- Persist mirror runs, drift/retry state and deployment/smoke receipts.
- Implement a signed/OIDC deployment callback and project verified mirror,
  deployment and smoke receipts back to CMS without changing content fields.
- Produce a clean engineering commit and reproducible production build before
  promoting the protected Preview to an indexable production deployment.
- Implement high-priority takedown propagation and post-removal verification.
- Connect the protected Pages beta to a separately authorized Preview runtime
  only if live draft Preview is required; the current deployment is an exact
  released-mirror build and deliberately does not read CMS drafts.
