# PSEO internal-beta CMS

Payload `3.88.0` editing projection for the Git-first publishing workflow in
[`0008-prd.md`](../specs/0008-prd.md) and
[`0009-pseo-tech-arch.md`](../specs/0009-pseo-tech-arch.md).

Payload is **not** the production source of truth. It stores editorial drafts,
review readiness and an audit projection of publication requests. Protected Git
`main` remains the only published source; the public site, RSS and sitemap must
never read this database directly.

## What is implemented

| Collection | Purpose |
| --- | --- |
| `prompt-artifacts` | Stable artifact id, canonical prompt text, labeled variables, inputs, parameters, media/examples, metrics, actions and taxonomy/graph relations. |
| `locale-variants` | Independent `en` / `zh-CN` slug, copy, Markdown body, indexing intent, workflow, translation gate and SEO draft. |
| `taxonomies` | Localized model/use-case/technique/style/subject/collection/creator projections. |
| `source-evidence` | Typed `source` or `evidence` records with provenance, observation time, confidence and rights review. |
| `publication-requests` | Append-only idempotency, base revision, mock/live receipt and failure audit. Direct collection writes are denied. |
| `users` | Payload Admin authentication and beta roles (`editor`, `reviewer`, `publisher`, `admin`). |

All editable content collections use Payload versions/drafts and the
`enforceDraftOnly` hook. The hook rejects `_status=published`, preserves the
Git-derived publication projection on ordinary writes, and keeps `_status` as
`draft` even when a verified merge projection is applied. Physical deletes are
denied; withdrawal must go through a tombstone/redirect content PR.

These states are intentionally different:

```text
Payload editorial draft
  draft -> needs_review -> validated -> publication request

Git publication audit
  unpublished -> request_open -> pr_open -> merged -> released
```

`translationStatus=ready` means “eligible for a publication request”, not
“online”. A Payload draft, reviewer approval or mock receipt cannot create a
published page.

## Safe publication request adapter

`POST /api/internal/v1/publication-requests` is a protected Payload endpoint for
the internal-beta Submit Review action. It requires a reviewer/admin session and
an `Idempotency-Key` header.

```http
POST /api/internal/v1/publication-requests
Idempotency-Key: prompt-country-stamp-20260902-1
Content-Type: application/json

{
  "artifactId": "prm_01jabcdef",
  "locales": ["en", "zh-CN"],
  "expectedBaseSha": "0000000000000000000000000000000000000000",
  "expectedSourceRevision": "sha256:<64 lowercase hex characters>",
  "expectedContentRevision": "sha256:<64 lowercase hex characters>",
  "commitMessage": "content: add country stamp prompt"
}
```

Preflight runs through the replaceable `PublicationContentValidator` port. The
bundled `PayloadDraftContentValidator` creates a deterministic, field-whitelisted
projection and applies the Git content contract semantics before the Git port is
called: schema-compatible ids/slugs/enums, labeled Prompt variables, exact token
and parameter coverage, populated taxonomy axes, complete locale workflow/SEO,
one primary HTTPS source with `publishedDate`, and at least one HTTPS evidence
record. It rejects stale translations unless `translatedFromRevision` equals the
current calculated source revision.

The caller must submit the source and whole-content revisions it reviewed. Both
are persisted alongside the validator's calculated revisions. A mismatch is a
fail-closed `CONTENT_REVISION_CONFLICT`, is retained on the publication request,
and never calls the Git publisher. This protects the gap between preview/review
and Submit Review; `expectedBaseSha` independently protects the Git `main` base.
The service also normalizes locale order, fingerprints the request, returns the
same record for a repeated key, and rejects reuse of a key with different input.

Only `MockGitPublisher` is bundled. It fails closed unless `expectedBaseSha`
matches `CMS_MOCK_GIT_BASE_SHA`; it returns `mock_accepted` plus a *planned*
branch name while leaving branch, commit SHA, PR number and PR URL null. It does
not use the network, filesystem, git CLI or external accounts. No result from
this adapter can become `merged` or `released`.

A production GitHub adapter belongs behind the same `GitPublisher` port and
must implement protected-branch PR creation, required checks, webhook
idempotency and verified merge projection. It is intentionally not guessed in
this scaffold.

## Local setup

The checked-in source pins Payload and its first-party packages to `3.88.0`.
Dependencies were not downloaded while creating this scaffold because the task
forbids network access.

1. Copy `.env.example` to `.env` and replace both secrets/revisions.
2. Provide an isolated PostgreSQL database.
3. Install from the approved package mirror: `pnpm install`. pnpm is configured
   to run dependency build scripts only for `esbuild`; do not broaden this
   allowlist without reviewing the named package.
4. Generate Payload types and the Admin import map:
   `pnpm generate:types && pnpm generate:importmap`.
5. Start the Admin app: `pnpm dev --port 3001`, then open `/admin`.

The first Payload user is bootstrapped as `admin`; later user creation requires
an admin. The CMS itself still needs Cloudflare Access (or an equivalent
identity-aware proxy) in deployed environments.

## Verification

Core safety tests use Node's built-in TypeScript test runner, so they run without
installing Payload:

```sh
npm test
```

They cover direct-publish rejection, read-only Git projection, deterministic
content/source revisions, schema-incompatible fields, stale translation,
idempotency, safe mock receipts and both content/base-revision conflict
retention. After dependencies are available, run:

```sh
pnpm generate:types
pnpm typecheck
pnpm test
pnpm build
```

Current local verification: full `tsc --noEmit --incremental false` passes and
`npm test` passes 17/17. The narrowly approved `esbuild` postinstall succeeds for
all resolved versions. Payload type generation, Next build and database smoke
remain pending.

## Deliberately deferred boundaries

- Markdown serialization, canonical JSON-Schema execution and atomic
  multi-locale Git commits remain in the Python backend/compiler boundary. The
  local CMS validator enforces the matching publication semantics and is a
  replaceable port; the production adapter must return the canonical compiler's
  revisions before a live Git publisher is enabled.
- Live GitHub credentials, PR creation and merge webhooks are not present.
- Before a live publisher is enabled, the validator result must carry the exact
  immutable canonical file bundle consumed by the publisher, and pending
  requests must use a durable, idempotent outbox/lease recovery flow.
- Cloudflare D1/R2 deployment is still the architecture spike described in the
  spec. This runnable scaffold uses the supported PostgreSQL adapter and can run
  in the allowed Node-container fallback without changing publication ports.
- Published body text is never copied back into a second Payload-owned source;
  only Git status identifiers may be projected after a verified merge.
