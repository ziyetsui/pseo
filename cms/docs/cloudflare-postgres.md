# Cloudflare PostgreSQL / Hyperdrive production preflight

This is the fail-closed deployment and redeployment runbook for the PostgreSQL
runtime. The authorized 2026-09-03 cutover is deployed; that operational fact
does not weaken any preflight requirement. PostgreSQL uses a separate, ignored
configuration so an absent or mismatched Hyperdrive binding cannot be mistaken
for a deployable production setup. The checked-in D1 configuration is retained
only for local work and an explicitly selected rollback version.

## Preferred production transport: Hyperdrive

Cloudflare recommends connecting Workers to an existing PostgreSQL database
through Hyperdrive and enabling Smart Placement. The installed `pg` is 8.20.0;
the preflight requires `pg` 8.16.3 or newer within major version 8. Runtime
configuration caps the pool at five connections.

Official references:

- [Connect to PostgreSQL with Hyperdrive](https://developers.cloudflare.com/hyperdrive/examples/connect-to-postgres/)
- [Hyperdrive connection lifecycle](https://developers.cloudflare.com/hyperdrive/concepts/connection-lifecycle/)
- [Hyperdrive local development](https://developers.cloudflare.com/hyperdrive/configuration/local-development/)
- [Smart Placement](https://developers.cloudflare.com/workers/configuration/placement/)
- [Workers third-party databases](https://developers.cloudflare.com/workers/databases/third-party-integrations/)

### Request-scoped pool and multipart boundary

Cloudflare does not permit a database client or pool created in one request to
be reused by another request. Payload, however, caches its adapter and its
`pg.Pool` for the process lifetime. The tracked `src/worker.ts` entry therefore
wraps the generated OpenNext Worker in a global-Symbol `AsyncLocalStorage`
scope, while the injected `pg.Pool` façade creates one native pool per request.
The façade is a real `pg.Pool` subclass so Drizzle transactions retain one
checked-out client for `BEGIN` through `COMMIT`/`ROLLBACK`. Native Hyperdrive
pools use `maxUses: 1`, five-second connect/lock timeouts and fifteen-second
query/statement/idle-transaction timeouts. The façade fails closed outside an
active Hyperdrive request; D1 and direct PostgreSQL bypass it unchanged.

OpenNext completes its outer fetch when response headers are ready and keeps
the Next/Payload handler in `waitUntil`. Cleanup must therefore wait for the
response stream plus all transitively registered `waitUntil` work. It must not
run in an outer `finally`, call `pool.end()` on a potentially checked-out edge
client, or retain Payload's bootstrap reconnect listener after the request.

For Hyperdrive only, multipart requests are copied into a bounded synthetic
request before entering the database scope. This protects the deferred
first-user/login boundary from a native request-body reader crossing the
request scope. Both declared and chunked bodies are capped at 1 MiB; this CMS
currently has no upload collection. A future upload feature must introduce a
reviewed streaming/object-storage path or an explicit limit change rather than
silently lifting this cap. Status, status text, redirect headers and repeated
`Set-Cookie` headers are preserved when the response stream is wrapped.

The unit contract covers separate runtime module graphs, two request contexts,
Payload's one-shot connection probe, a real Drizzle transaction, deferred
multipart auth, oversized bodies, streaming response cancellation and
transitive `waitUntil`. Every redeployment still requires workerd smoke for an
authenticated session, multipart parsing, collection reads and concurrent
requests; Node's Fetch implementation cannot prove preservation of
Workers-specific request metadata.

Prepare the environment-specific configuration without committing it:

```sh
cp wrangler.postgres.example.jsonc wrangler.postgres.jsonc
```

Replace `REPLACE_WITH_CLOUDFLARE_HYPERDRIVE_ID` with the real Cloudflare
Hyperdrive ID. Cloudflare currently emits this as exactly 32 hexadecimal
characters without UUID hyphens (for example, the shape
`57b7076f58be42419276f058a8968187`). The preflight rejects placeholders,
zero IDs, hyphenated UUIDs and other shapes.
Do not add `DATABASE_URI`, `localConnectionString`, credentials, or tokens to
either Wrangler file. `wrangler.postgres.jsonc` is intentionally gitignored.
The binding must be named `HYPERDRIVE`, and production must keep:

```text
CMS_DATABASE_ADAPTER=postgres
CMS_POSTGRES_TRANSPORT=hyperdrive
CMS_DEPLOYMENT_ENV=production
CMS_PREVIEW_ENABLED=false
CMS_PUBLIC_SNAPSHOT_ENABLED=true
```

Payload's authenticated admin render is not compatible with the Workers Free
10 ms CPU allowance. The production environment therefore declares a 30,000
ms per-invocation ceiling and requires the Workers Paid plan before deployment.
This is a safety ceiling, not an expected duration: investigate any ordinary
admin request that approaches it instead of raising the limit silently.

The Worker resolves only `env.HYPERDRIVE.connectionString`; it rejects a
process-level `DATABASE_URI` in Hyperdrive mode. Smart Placement and
`nodejs_compat` are mandatory in the preflight. The exact Wrangler `vars`
allowlist contains only the six non-sensitive settings shown by the example;
database credentials, Payload secrets, snapshot tokens and any other
credential-shaped values must be Worker secrets or bindings.

### Required cache-disabled configuration

Hyperdrive query caching is enabled by default. It does not invalidate a
cached `SELECT` after a write, so the default cache is unsafe for Payload
authentication, sessions, permissions, rights decisions, approval revisions,
takedowns and read-after-write checks. This CMS therefore uses one dedicated
Hyperdrive configuration with query caching disabled for **all** Payload
database traffic. Do not point the `HYPERDRIVE` binding at a default cached
configuration.

Create it with caching disabled, or disable caching on the existing
configuration:

```sh
npx wrangler hyperdrive create pseo-cms-beta-fresh \
  --connection-string='<remote-postgres-uri>' \
  --caching-disabled

npx wrangler hyperdrive update '<32-hex-hyperdrive-id>' --caching-disabled
```

Immediately before a production operation, verify the exact configuration:

```sh
npx wrangler hyperdrive get '<32-hex-hyperdrive-id>'
```

The returned JSON must contain the same `id` and `"caching": {
"disabled": true }`. Bind the local, non-secret attestation to that exact ID:

```sh
CMS_CLOUDFLARE_HYPERDRIVE_CACHE_DISABLED_ID='<32-hex-hyperdrive-id>' \
  pnpm build:cloudflare:postgres
```

Build and dry-run require this ID-bound attestation and fail closed when it is
missing or refers to another configuration. `preflight-postgres` additionally
queries the Cloudflare control plane through Wrangler and parses the captured
JSON without printing database origin metadata. `deploy-postgres` repeats that
live check immediately before the production write; an attestation alone can
never authorize deployment.

Official cache behavior and cache-disable guidance:

- [Hyperdrive query caching](https://developers.cloudflare.com/hyperdrive/concepts/query-caching/)
- [Get a Hyperdrive configuration](https://developers.cloudflare.com/api/resources/hyperdrive/subresources/configs/methods/get/)

## Safe checks and migration boundary

### One-time D1 data copy

Run the dialect-native PostgreSQL schema migration first. Then use the
one-time copier to move the data from a **fresh, quiesced** D1 export. The
copier accepts either Wrangler's SQL export or a SQLite database restored from
that export. The source file contains CMS content and may contain user email,
password hash, sessions and preferences; keep it outside the repository with
mode `0600`, and never attach it to a report or issue.

Future migration rehearsals can be planned without a database credential:

```sh
pnpm migrate:d1-to-postgres \
  --mode plan \
  --source-sql '<private-d1-export.sql>' \
  --expect prompt_artifacts=36 \
  --expect locale_variants=36 \
  --expect source_evidence=37 \
  --expect taxonomies=71 \
  --expect users=0
```

Use `--source-sqlite '<private-restored.sqlite3>'` instead when the export has
already been restored. `plan` validates SQLite integrity, foreign keys and the
expected source counts but does not connect to PostgreSQL.

Supply the PostgreSQL URI only through the server-side `DATABASE_URI`
environment variable. A CLI URI argument is deliberately rejected so it
cannot appear in shell history or process listings. First execute the complete
copy and parity check inside a transaction that is always rolled back:

```sh
DATABASE_URI='<remote-postgres-uri>' pnpm migrate:d1-to-postgres \
  --mode dry-run \
  --source-sql '<private-d1-export.sql>' \
  --expect prompt_artifacts=36 \
  --expect locale_variants=36 \
  --expect source_evidence=37 \
  --expect taxonomies=71 \
  --expect users=0
```

Only after that reports `outcome: rolled_back`, apply to the same empty target:

```sh
DATABASE_URI='<remote-postgres-uri>' pnpm migrate:d1-to-postgres \
  --mode apply \
  --confirm-empty-target \
  --source-sql '<private-d1-export.sql>' \
  --expect prompt_artifacts=36 \
  --expect locale_variants=36 \
  --expect source_evidence=37 \
  --expect taxonomies=71 \
  --expect users=0
```

The apply path takes one advisory lock plus PostgreSQL table locks, refuses any
non-empty application table, copies parents before children in one
`SERIALIZABLE` transaction, preserves explicit IDs, converts SQLite booleans
and JSONB, restarts owned sequences transactionally, and compares every shared
table's row count and normalized SHA-256 before commit. It never prints the
URI or row values. D1's `payload_migrations` row is intentionally not copied:
the already-applied PostgreSQL baseline row is adapter-specific and is
preserved instead. Target-only approval/withdrawal tables must be empty.

After apply, verify the committed target through a repeatable-read, read-only
transaction:

```sh
DATABASE_URI='<remote-postgres-uri>' pnpm migrate:d1-to-postgres \
  --mode verify \
  --source-sql '<private-d1-export.sql>' \
  --expect prompt_artifacts=36 \
  --expect locale_variants=36 \
  --expect source_evidence=37 \
  --expect taxonomies=71 \
  --expect users=0
```

`apply` is intentionally not idempotent against a populated target; a retry
fails closed. Use `verify` after a successful commit. Stop D1 writes before the
final export and keep them stopped until the PostgreSQL Worker is deployed, or
records created after the export will not be part of the cutover.

Run from `cms/`:

```sh
pnpm cloudflare:postgres:preflight
CMS_CLOUDFLARE_HYPERDRIVE_CACHE_DISABLED_ID='<32-hex-hyperdrive-id>' \
  pnpm build:cloudflare:postgres
pnpm cloudflare:artifact:check
CMS_CLOUDFLARE_HYPERDRIVE_CACHE_DISABLED_ID='<32-hex-hyperdrive-id>' \
  pnpm cloudflare:postgres:deploy:dry-run
```

The live preflight requires Wrangler authentication with read access to that
Hyperdrive configuration. Failure to authenticate, malformed/extra output, an
ID mismatch, a missing `caching` object, or any value other than
`caching.disabled=true` stops the operation. Captured Wrangler stdout/stderr is
not reflected into the error because it can contain database origin metadata.

The build receives only an inert loopback connection-string sentinel and an
invalid HTTPS origin, never the database credential or Hyperdrive runtime
binding. The resulting artifact and Wrangler dry-run output are scanned before
any production write is allowed.

Payload migrations cannot run through the Worker binding. For the migration
step only, inject the remote origin PostgreSQL URI as `DATABASE_URI` into the
command environment and run:

```sh
DATABASE_URI='<remote-postgres-uri>' pnpm migrate:cloudflare:postgres
```

The URI must use `postgres://` or `postgresql://`, identify a non-local
TLS-capable database, and point to the same origin database configured behind
Hyperdrive. The script exposes it only to a one-use staged Payload migration
process; it removes Cloudflare control-plane credentials from that process and
does not print the URI. Never put this value in a tracked file or Wrangler
`vars`.

`pnpm deploy:cloudflare:postgres` composes preflight, build, scan, dry-run,
migration, a second scan, and deploy. It performs production writes and must be
used only after explicit deployment authorization. Before the final deploy it
also requires
`CMS_CLOUDFLARE_RUNTIME_BINDINGS_READY=true` as an explicit non-secret
attestation that `PAYLOAD_SECRET` and `CMS_PUBLIC_SNAPSHOT_TOKEN` already exist
as Worker secrets. A Hyperdrive deployment additionally requires
`CMS_CLOUDFLARE_HYPERDRIVE_CACHE_DISABLED_ID` to equal the binding ID; the
script still performs the independent live control-plane check. The
preflight/build helpers never create a Hyperdrive configuration, database or
secret. The explicitly authorized deploy step does create a Worker deployment.

For the composed deployment command, provide both non-secret attestations in
the same invocation (and provide `DATABASE_URI` only for the isolated migration
step as described above):

```sh
CMS_CLOUDFLARE_RUNTIME_BINDINGS_READY=true \
CMS_CLOUDFLARE_HYPERDRIVE_CACHE_DISABLED_ID='<32-hex-hyperdrive-id>' \
DATABASE_URI='<remote-postgres-uri>' \
  pnpm deploy:cloudflare:postgres
```

## Direct PostgreSQL beta fallback

Direct Worker-to-PostgreSQL is a temporary beta fallback, not the recommended
production transport. Select `CMS_POSTGRES_TRANSPORT=direct`, remove the
Hyperdrive binding from the ignored Wrangler configuration, and provision the
Worker `DATABASE_URI` secret out of band. The deploy and dry-run commands also
require this local attestation:

```sh
CMS_CLOUDFLARE_DIRECT_DATABASE_READY=true \
  pnpm cloudflare:postgres:deploy:dry-run
```

The attestation contains no credential; it only prevents an accidental direct
deploy before the Worker secret has been configured. Migration still requires
the remote URI separately as described above.

## Current deployed checkpoint and redeployment prerequisites

The authorized 2026-09-03 deployment uses a cache-disabled Hyperdrive
configuration with Smart Placement. Production deployment
`4b34521d-cc25-4140-82bd-8e026289e2a0` sends 100% of traffic to Worker version
`07b31842-e586-4fd4-b9a2-650e07817d12`; the version has no D1 binding and uses
the request-scoped pool/stream boundary above. The one-time migration and
independent verification matched 51 shared tables and 940 rows, with migrated
core counts 36 / 36 / 37 / 71 / 0. The first admin was then created exactly
once, so the live core counts now include one user while the 36 Prompt records
remain intact.

Post-deploy owner-session smoke returned the Dashboard, one-row Users list,
10-of-36 Prompt list and Prompt detail without 1101. Payload's
`/api/users/me` returned 200 during those navigations. Four authenticated pages
also reloaded concurrently, and a non-mutating dummy multipart login request
completed with an ordinary redirect; a version-filtered Worker tail observed
no error or canceled invocation. Verification passed 190/190 tests, including
15/15 focused request-scope tests, followed by an environment-isolated build,
redacted artifact scan and Wrangler dry-run. The already-created admin was not
re-registered because repeating first-user creation would be an unsafe smoke.

For a future redeploy, re-obtain explicit authorization and provide the remote
TLS-capable `DATABASE_URI` only to the isolated migration step. Keep the real
Hyperdrive ID only in ignored `wrangler.postgres.jsonc`; keep `PAYLOAD_SECRET`
and the read-only `CMS_PUBLIC_SNAPSHOT_TOKEN` as Worker secrets. Re-run the live
cache-disabled preflight immediately before deployment. The Access service
identity for external snapshot smoke/mirroring is still outstanding; it is not
a Worker secret and must be provisioned with separate least privilege.
