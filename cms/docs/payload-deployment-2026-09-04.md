# Payload deployment checkpoint — 2026-09-04

Scope: deploy the existing Payload backend. Formal publication-chain development
is paused; this deployment does not claim automatic frontend publication or
a frontend content-release receipt.

## Verified existing target

Read-only Wrangler control-plane checks on 2026-09-04 confirmed:

- Worker: `pseo-cms-beta`, configured by the ignored
  `wrangler.postgres.jsonc`, production environment.
- Pre-upgrade deployment: `7aa79b37-58c4-4bc4-9a5c-c7abfb9e71b5`.
- Pre-upgrade version at 100%: `51e73e54-3282-4228-9ac2-6ebbb9d171d0`.
- Hyperdrive binding: `HYPERDRIVE`; its exact configured ID was checked against
  the control plane and query caching is disabled.
- Secret names present: `PAYLOAD_SECRET`, `CMS_PUBLIC_SNAPSHOT_TOKEN`,
  `CMS_PREVIEW_TOKEN`. No values were displayed.
- PostgreSQL/Hyperdrive, Smart Placement, `nodejs_compat`, preview URLs disabled,
  existing CPU ceiling 30,000 ms; no D1 binding in the PostgreSQL configuration.

No Access, DNS, account plan, billing resource or rights policy was changed.

## Prepared artifact

- The repository's sanitized OpenNext build succeeded. It copies source into a
  staging directory that excludes environment files and uses build-only sentinel
  configuration. The ordinary checkout build remains blocked by retired Git
  publication variables in its local environment; the guard was not weakened.
- Artifact checks passed: empty compiled environment, redacted secret scan,
  retired Git publisher exclusion, unused dynamic OG runtime exclusion.
- Wrangler deploy dry-run passed: 95 static assets; Worker gzip 2663.29 KiB.
  Two dependency `direct-eval` bundler warnings remain; they did not fail the
  build or dry-run.
- Deployment/runtime regression subset: 40 passed, zero failed or skipped.
- Prepared source input receipt: `/tmp/pseo-payload-deploy-inputs.json`,
  92 files, SHA-256
  `02aac445c4573d97f4ebbf292e7c028bd65512c40b12fd462e73efd0e9542374`.

These preparation results are separate from the actual rollout evidence below.

After the v2 policy work was paused, all 92 receipt inputs were rechecked and
matched. The incomplete `src/policy/sitePublicationPolicy.ts` was not part of
the prepared inputs. Anonymous reads of `/admin`, `/api/users/me` and
`/api/internal/v1/public-snapshot` each returned 302 to Cloudflare Access.

### Repeatable preparation commands

Run from `cms/`. These commands derive the non-secret cache attestation from
the allowlisted configuration and never inject a production database URI into
the build.

```sh
pnpm verify
node --experimental-strip-types --input-type=module <<'JS'
import {
  assertProductionPostgresConfiguration,
  verifyHyperdriveCachingDisabledControlPlane,
  buildCloudflarePostgresArtifact,
  dryRunCloudflarePostgresDeploy,
} from './scripts/cloudflare-artifact.ts'

const projectDir = process.cwd()
const configuration = assertProductionPostgresConfiguration(projectDir)
verifyHyperdriveCachingDisabledControlPlane(projectDir, configuration)
const environment = {
  ...process.env,
  CMS_CLOUDFLARE_HYPERDRIVE_CACHE_DISABLED_ID: configuration.hyperdriveId,
}
buildCloudflarePostgresArtifact(projectDir, environment)
dryRunCloudflarePostgresDeploy(projectDir, environment)
JS
```

Artifact retained locally at `cms/.open-next`; the deployed version is recorded below.

## Migration procedure and completed gate

For future upgrades, confirm the applied migration ledger before uploading. If
`20260903_143750_agent_proposal_api` is missing, the pending upgrade adds the
proposal audit table and indexes, the `agent_proposer` enum value, nullable API
key columns on `users`, and a nullable audit relation on locked documents. It
does not approve or rewrite Prompt/source rights records.

Use the existing staged PostgreSQL migration wrapper with an authorized host
providing the origin database URI. Never print or place the URI in the artifact.
Take a protected backup/checkpoint, verify existing migration history, and run
the migration transaction before uploading the new Worker. On a Worker rollback,
retain the additive database schema; do not run the destructive down migration.

Immediately before upload, repeat the Hyperdrive cache-state check and compare
the source receipt. Any source drift requires another build and dry-run. After
upload, record the new version/deployment and run authenticated Admin/session,
collection-read, snapshot and concurrent-request smoke without changing content.
Access must remain in force throughout.

Current rollout status: **clone and production migrations passed; Worker deployed**. Cloudflare Access and the
Payload session have been verified through the real Admin Dashboard. Payload
3.88.0 disables migration REST endpoints and hides the Admin collection; its
direct Admin migration route returns 404. The ledger was subsequently read
through the authenticated Neon SQL editor before the upgrade: production had only
`20260903_060851_initial_postgres_baseline`, batch 1. The proposal API migration
was missing.

The verified Neon target is project `quiet-voice-76758925`, production branch
`br-round-heart-b3hr97pz`, database `neondb`, endpoint
`ep-twilight-night-b3mdavvs`, matching the live Hyperdrive origin. The isolated
production clone `payload-upgrade-check-20260904` / `br-red-grass-b3vmwab0` was
created for migration rehearsal and expires on 2026-09-05 at 21:24 GMT+8.

Neon skills are installed at `.claude/skills/neon` and
`.claude/skills/neon-postgres`. The documented flow uses a direct connection and
the existing Payload/Drizzle migration runner, first against the clone.
The initial `DEFAULT` OAuth profile could not access the target organization;
it was preserved. The user then authorized the separate `pseo-sdf` profile in
the system keyring. This profile has now been verified against the exact
`org-tiny-sun-40473014` organization, project, production branch and clone-parent
relationship. No API key was minted. The clone's direct connection is retrieved
by the normal authorized CLI and held only in host memory for the existing
migration runner; it is never printed or written to the workspace.

Clone rehearsal passed using the reviewed read-only SQL checklist and existing
Payload migration wrapper. An initial checker-only failure normalized PostgreSQL
numeric batch values. A later attempt using `neondb_owner` could not alter objects
owned by `hyperdrive-user`; the transaction rolled back. Before retrying with the
existing owner, the checker verified the baseline-only ledger, absence of new
audit objects, and session ownership matching all eight existing checked objects.
No database grants or credentials were changed.

The successful run on direct endpoint `ep-lingering-scene-b3sjtked` applied
`20260903_143750_agent_proposal_api` exactly once as batch 2. Repeating the native
runner succeeded with no pending migration. All 44 content/rights/decision table
hashes matched before, after and after replay; aggregate SHA-256:
`e7097f0367e5366666620245eca777b67e9bfafec9765a06b5fbdbb439eb7aea`.
The redacted local receipt is `/tmp/pseo-neon-clone-rehearsal-receipt.json`;
the failed-owner attempt is retained at
`/tmp/pseo-neon-clone-failed-owner-receipt.json` for rollback review.

The migration source hash agrees across the build receipt, rehearsal and current
source: `970ebedcb3749e4c116cf20bc3cf530921f0eba04135253e478c01556255295a`.
All 92 prepared source inputs remain unchanged and retained artifact checks pass.
Independent review approved the clone's complete schema, defaults, constraints,
indexes, owner match and runtime grants. The authorized production migration then
passed using the same existing owner and exact branch/endpoint validation.
Production baseline schema/content matched the reviewed clone before execution;
the build inputs and migration SHA-256 matched again immediately before running.

Production pre-migration location: `2026-09-04T13:45:55.032Z`, WAL LSN
`0/2328938`. The existing clone and its parent location/expiry are recorded in
the receipt; it preserves the content but already has the rehearsed additive
schema. The destructive down migration is not a Worker rollback plan.

Production ledger now contains baseline batch 1 and proposal API batch 2, each
exactly once. The native runner succeeded and its repeat was a no-op. All 44
content/rights/decision table hashes remained identical to the pre-migration
state and clone aggregate above. The redacted production receipt is
`/tmp/pseo-neon-production-migration-receipt.json`. Independent post-migration
review passed: schema, grants, owner, ledger, content and replay results matched
the reviewed clone.

No temporary migration endpoint or REST bypass has been introduced. The prepared
92-file source checksum and retained artifact gates still pass.

## Worker rollout receipt

The existing sanitized PostgreSQL deployment wrapper uploaded the prepared
artifact after rechecking all 92 source hashes, required remote secret names,
artifact gates and live Hyperdrive caching disabled. No Access, DNS, secrets or
database grants were changed.

- Deployment: `08e10851-160a-4f85-a704-7c717b10ba0c`.
- Version: `7d66f14c-6392-4dff-884b-51c55f1481e7`, confirmed at 100% in the
  Cloudflare deployment inventory.
- Deployment time: `2026-09-04T13:48:40.199628Z`.
- URL: <https://pseo-cms-beta.codex-cloudflare-20260612.workers.dev>.
- Worker gzip: 2663.13 KiB; reported startup: 41 ms.
- At `2026-09-04T13:49:48.338Z`, anonymous requests to `/admin`, `/api/users/me`
  and `/api/internal/v1/public-snapshot` all returned 302 to the existing
  Cloudflare Access host.

Redacted local receipts: `/tmp/pseo-payload-deployment-control-plane.json` and
`/tmp/pseo-payload-anonymous-smoke.json`.

Authenticated post-deployment Admin smoke passed in a new browser tab using the
existing Access/Payload session. The Dashboard loaded normally and showed the
Agent Proposal Audits collection. That collection loaded with zero results;
Prompt Artifacts loaded 1–10 of 36, with the visible Validated/Needs review
statuses matching the pre-deployment view. No error notification appeared.

A successful snapshot export using its Bearer token, an actual Agent proposal
write and authenticated concurrent-request behavior were not tested. These Admin
and Access checks do not constitute a full
publication-chain test. CMS public content, mirror synchronization and frontend
publication were not changed; formal publication-chain work remains paused as
requested.

## Current official references

- [Cloudflare node-postgres guidance](https://developers.cloudflare.com/hyperdrive/examples/connect-to-postgres/postgres-drivers-and-libraries/node-postgres/):
  request-local clients, Hyperdrive binding and Node compatibility.
- [Hyperdrive query caching](https://developers.cloudflare.com/hyperdrive/concepts/query-caching/):
  cache behavior is unsuitable for the CMS decision/read-after-write contract
  unless disabled as enforced here.
- [Wrangler Worker commands](https://developers.cloudflare.com/workers/wrangler/commands/workers/):
  dry-run, secret-name inventory and deployment inspection.
