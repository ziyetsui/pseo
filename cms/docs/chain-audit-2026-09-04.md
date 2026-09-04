# CMS chain audit — 2026-09-04

Scope: CMS engineering checks in the existing worktree. No live CMS record,
production credential, public mirror, Cloudflare setting or deployment was changed.

## Corrections

- The proposal endpoint converted the authenticated user's numeric PostgreSQL ID
  to a string. Payload rejects that string as an `agent-proposal-audits.actor`
  relationship, so a real request returned `PROMPT_PROPOSAL_FAILED` and rolled
  back. Preserve the native ID type through the endpoint and proposal service.
  The regression exercises a numeric actor through the endpoint.
- The golden seed assigned `cleared` to an `evidence` row. The real collection
  hook only permits rights decisions on `source` rows, so seeding stopped partway
  through. The evidence row now retains the safe `review_required` default; the
  source row retains its existing audited fixture data. The fixture test now runs
  every source/evidence row through the real source validator.
- Six snapshot tests imported the removed `prompt-lab-template` consumer. Their
  imports now target the current `prompt-lab/scripts/sync-cms-snapshot.mjs`.

## Executed checks

| Check | Result | Boundary |
| --- | --- | --- |
| `cd cms && pnpm verify` | Passed: typecheck + 200 tests, zero failures/skips | Includes real validators and mirror filesystem tests; most Payload APIs remain test doubles |
| `cd cms && pnpm build` | Failed during page-data collection | Existing local environment includes retired CMS Git publication variables; the fail-closed guard remains intact |
| `next build --webpack` in an isolated copy without environment files | Passed | Same installed Next/Payload dependencies and source; direct PostgreSQL configuration with generated temporary test secret; not a Cloudflare Worker build |
| Fresh local PostgreSQL migration | Passed | Both checked-in PostgreSQL migrations applied to a disposable database |
| Real Payload proposal endpoint handler | Passed | Actual PostgreSQL serializable transaction, numeric actor relationship, 201 create, 200 idempotent replay, persisted `review_required` draft |
| Real Payload approval and snapshot handlers/services | Passed | Synthetic isolated fixture, revision-bound approval, repeatable-read public snapshot containing exactly one eligible Prompt; unapproved proposal excluded |
| Temporary database cleanup | Passed | Disposable database dropped and absence verified |

The database check invoked the actual Payload endpoint handlers with a synthetic
authenticated request. It did not verify HTTP login/API-key middleware, browser
Admin UI, Hyperdrive, Worker CPU limits, a live mirror run, or deployment.
No external messages were sent. Test records existed only in the disposable
local database.

Local run evidence is in `/tmp/pseo-cms-verify-final.log`,
`/tmp/pseo-cms-build-isolated.log` and `/tmp/pseo-cms-chain-audit-final.log`.
The disposable integration runner is `/tmp/pseo-cms-chain-audit.mjs`.

## Remaining publication boundaries

- `ContentWithdrawalService` deliberately writes
  `syncDispatchMode: 'disabled'`. Its durable urgent event metadata is not proof
  of event delivery, edge suppression or an applied removal deployment.
- The current CMS snapshot has Prompt and content-type/model taxonomy exports,
  but no canonical surface collection/export. The full root compiler requires
  `content/surfaces.json`; importing a repository fixture into a public snapshot
  would not establish canonical CMS policy. This is an unresolved cross-project
  contract boundary.
- The deployed create-Prompt adapter/migration version, API-key authentication,
  Article/edit/route proposals, signed deployment callback, persisted smoke
  receipt and CMS release projection were not established by these checks.
- CMS public eligibility, mirror synchronization and production release remain
  separate states. This audit does not advance or attest any live state.
