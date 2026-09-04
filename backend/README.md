# pSEO backend — internal-beta read API

This directory contains the Python 3.12 FastAPI thin slice defined by
`specs/0008-prd.md` and `specs/0009-pseo-tech-arch.md`. It is anonymous and read-only. It does
not implement Payload CMS, Git writes, ingestion, or publication.

Publication authority follows `specs/0011-promptlab-youmind-cms-publication.md`:
Payload CMS owns reviewed content and rights decisions. The API consumes the deterministic
projection of an immutable approved CMS snapshot; Git is its generated mirror. Local fixtures
exercise the read contract and do not prove CMS approval, mirror synchronization, or deployment.

The default `GitCatalogRepository` is isolated behind `CatalogRepository`. It reads the same
validated Git artifacts as the static build: the full compiler input set, generated build/route
manifests, each published locale's taxonomy index, and only the Markdown variants named by
published routes. It recomputes the compiler revision and verifies taxonomy index membership,
route identity, and build-manifest integrity. It fails closed unless a Prompt variant is
`published`, `indexable`, and translation `ready`; it never reads draft `en` content through the
public API. A compiler-verified catalog with zero published Prompts is valid and produces honest
empty API results; zero is not treated as a corrupt deployment merely because no Prompt has passed
publication review yet.

At this local repository snapshot `en` is supported but disabled, while `zh-CN` is the default and
only published locale. Its one public fixture Prompt is `prm_2063814043631280180` at
`/zh-CN/prompts/country-miniature-stamp-poster`. The published `nano-banana-pro` model taxonomy is
also exposed with its honest empty member set; the Prompt's unrelated `gpt-image-2` relation is not
rewritten to populate it. This local fixture is not proof that the Prompt exists on the public
repository's protected `main`. Counts and `X-Content-Revision` come from the generated snapshot
rather than a second backend fixture.

## Run

```bash
node infra/bin/content.mjs validate
node infra/bin/content.mjs build
cd backend
uv sync --frozen
uv run uvicorn pseo.main:app --host 127.0.0.1 --port 8000 --reload
```

The content build is a required startup prerequisite, not an optional cache warm-up:
`infra/generated/` is intentionally ignored by Git. A clean checkout therefore has no manifests
until the build command succeeds. Packaged deployments must mount or copy a verified
`infra/generated/static/` artifact together with the matching `content/` and `schemas/` inputs;
the adapter recomputes the digest and refuses stale or mixed revisions.

Then open `http://127.0.0.1:8000/docs` or request:

```bash
curl 'http://127.0.0.1:8000/api/v1/home?locale=zh-CN'
curl 'http://127.0.0.1:8000/api/v1/prompts?locale=zh-CN&model=gpt-image-2&contentType=image'
curl 'http://127.0.0.1:8000/api/v1/prompts/country-miniature-stamp-poster?locale=zh-CN'
```

## Implemented contract

| Endpoint | Purpose |
| --- | --- |
| `GET /api/v1/locales` | enabled locale registry |
| `GET /api/v1/home?locale=…` | L1 stats, featured, trending, browse, collections, creators |
| `GET /api/v1/prompts?locale=…` | search, filter, sort, opaque cursor, page and facets |
| `GET /api/v1/prompts/{slug}?locale=…` | complete, untruncated L4 Prompt detail |
| `GET /api/v1/facets?locale=…` | counts for the current filtered result set |
| `GET /api/v1/models/{slug}?locale=…` | L3 model entity plus Prompt projection |
| `GET /api/v1/categories/{axis}/{slug}?locale=…` | L2 category plus Prompt projection |
| `GET /healthz` | process and catalog revision health |

All public content calls require an explicit locale and never fall back to another locale.
Repeated values on the same filter axis use OR; different axes and `q` use AND. Unknown query
parameters and invalid/reused cursors return `400 INVALID_QUERY` rather than being ignored.

Successful GET responses expose `ETag`, `X-Content-Revision`, and `X-Request-ID`, and accept
`If-None-Match`. All errors use `application/problem+json`; no stack, path, provider response, or
credential is returned.

`X-Content-Revision` and response `meta.contentRevision` are the generated manifest digest for the
whole snapshot. `PromptDetail.revision` is the Prompt's `publication.sourceRevision`; these values
have intentionally different scopes. Missing media and examples are empty arrays, and unavailable
metrics are `null`—the adapter never manufactures thumbnails or engagement numbers.

Set `PSEO_REPOSITORY_ROOT` only when the API process is launched outside this monorepo layout. The
directory must contain both `content/` and `infra/generated/static/` from one verified checkout.

## OpenAPI and verification

The runtime contract is available at `/openapi.json`. Regenerate the checked artifact with:

```bash
uv run pseo-openapi --output openapi/openapi.json
```

Quality gates:

```bash
uv run ruff format --check .
uv run ruff check .
uv run mypy --strict src/pseo
uv run pytest
uv run pytest --cov=pseo --cov-branch --cov-report=term-missing
```

Tests are deterministic and never access the network or an external system.

## Cloudflare Python Worker

The same FastAPI routes can run on Cloudflare Python Workers through
`src/worker.py`. The Worker does not read the repository filesystem at request time. Instead, a
deployment step derives `src/worker_catalog.json` from the already-verified Git publication
manifests. Bundle schema v2 contains only the anonymous public projection, records both the source
content revision and required 40-character lowercase `sourceGitSha`, and verifies a deterministic
payload SHA-256 (including that Git SHA) before the app starts. Draft Markdown and Payload data are
not copied into the Worker.

The checked one-Prompt `src/worker_catalog.json` predates source-SHA attestation. It is deliberately
rejected by the Worker and must not be deployed. Do not retrofit a guessed SHA into it. Replace it
only with output built from the public content repository's clean, protected `main` checkout; a
valid zero-Prompt catalog is also supported when the approved CMS snapshot has no Prompt records.

The checked configuration is intentionally credential-free: the Worker name is `pseo-api-beta`,
the public OpenAPI server is `https://api-beta.ancher.space`, and CORS allows
`https://beta.ancher.space`. Account IDs, tokens, custom-domain routing, rate-limit rules, and DNS
remain Cloudflare-side deployment configuration.

The release artifact must be prepared in protected CI from a clean checkout whose active ref is
exactly `refs/heads/main`. The CI provider supplies the immutable commit SHA explicitly; the CLI
checks that it is lowercase, is exactly 40 characters, equals `HEAD` and `refs/heads/main`, and
that `content/**` and `schemas/**` have no tracked or untracked drift. For example, after assigning
the provider's trusted commit value to `PSEO_SOURCE_GIT_SHA` and the checkout path to
`PSEO_PUBLIC_REPOSITORY`:

```bash
node infra/bin/content.mjs validate \
  --content "$PSEO_PUBLIC_REPOSITORY/content" \
  --schemas "$PSEO_PUBLIC_REPOSITORY/schemas"
node infra/bin/content.mjs build \
  --content "$PSEO_PUBLIC_REPOSITORY/content" \
  --schemas "$PSEO_PUBLIC_REPOSITORY/schemas" \
  --output "$PSEO_PUBLIC_REPOSITORY/infra/generated/static"
cd backend
uv sync --frozen
uv run pseo-worker-bundle \
  --repository-root "$PSEO_PUBLIC_REPOSITORY" \
  --source-git-sha "$PSEO_SOURCE_GIT_SHA"
uv run pseo-worker-bundle \
  --repository-root "$PSEO_PUBLIC_REPOSITORY" \
  --source-git-sha "$PSEO_SOURCE_GIT_SHA" \
  --check
uv run pywrangler sync
uv run pywrangler deploy --dry-run --outdir /tmp/pseo-api-beta-dist
```

Feature branches, detached HEADs, SHA mismatches, dirty content/schema inputs, noncanonical SHAs,
and source archives without Git metadata all fail closed. If the final deployment archive must omit
`.git`, generate and `--check` the bundle in the protected checkout first, then copy that immutable
checked artifact into the archive; never regenerate it from the Git-less archive.

A mirror commit means only that a CMS snapshot has been mirrored. The deployment job must bind
its deployment record to the same `sourceGitSha` and CMS export revision/manifest, complete the
Cloudflare deployment and post-deploy smoke, and only then record a release receipt. A failed
deploy or smoke keeps serving the previous released snapshot; neither a bundle nor a mirror
commit is release evidence. Content does not use per-content PRs; engineering changes still do.

`workers-py` 1.17.1 currently requires `uv` 0.12.3 or newer for its sync/deploy commands. A real
`uv run pywrangler deploy` is an explicit external write and is not part of the local verification
flow above.

## Replacement seam and deferred work

The port requires one internally consistent `CatalogSnapshot`, so callers cannot mix revisions.
For a packaged deployment, replace the filesystem adapter with an object-store or database read
adapter that consumes the same verified build manifest and preserves the contract tests.

The internal-beta slice intentionally defers write APIs, Git Bridge, Payload synchronization,
rate-limit infrastructure, persistent search/index storage, redirects/tombstones, and source
acquisition. Those capabilities require their own ports and acceptance tests; they must not be
implemented inside the public read routes.
