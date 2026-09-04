# Public PromptLab repository handoff

Status: CMS-first authority and generated mirror operational for one approved
Prompt; protected exact-mirror Pages Preview deployed and smoked; formal
production release receipt pending

Date: 2026-09-03

## Current publication model

[`0011-promptlab-youmind-cms-publication.md`](../specs/0011-promptlab-youmind-cms-publication.md)
is the controlling contract:

- Payload CMS is the canonical store for Prompt/article content, locales,
  taxonomy, sources, rights and routes.
- `ziyetsui/prompt-lab` is a generated public mirror, not an authoring surface
  or a source to import back into CMS.
- There is no per-content Git-first PR publication chain. A dedicated mirror bot
  may fast-forward the generated-only repository's `main` after validating one
  complete immutable CMS snapshot and confirming the expected remote SHA.
- Code, schema, workflow, policy, license and exporter changes still use normal
  branch/CI/human engineering PRs.
- CMS approval, Git mirror sync and production deployment are separate facts.

Contributors use separate authorized/original, community, correction,
translation and takedown Issue Forms. An approved Issue is an intake proposal;
it does not bypass CMS validation, rights review or revision-bound approval.

## Rights policy

| Source path | CMS status | Public-mirror rule |
| --- | --- | --- |
| Creator/authorized submitter or compatible source license | `cleared` | Eligible only with complete auditable authorization/license evidence and human approval. |
| Public community/X source without a license grant | `community_attributed` | Author retains rights; author, original post, policy/risk acceptance and takedown URL required; no repository CC BY claim. |
| Incomplete review | `review_required` or `unknown` | Excluded from public snapshot. |
| Restriction/removal | `restricted` or `takedown` | Excluded; previously mirrored material requires priority removal and audit. |

The 35 wireframe/X records remain `review_required`. The policy change does not
authorize a bulk conversion. The owner-approved golden Prompt has both rights
evidence and an exact CMS approval; the other 35 records remain excluded.

## Implementation status

Implemented and verified locally and/or online:

- reviewer/admin-only, append-only CMS approval bound independently to content,
  source and rights revisions plus a rights-policy version;
- `community_attributed`, `restricted` and `takedown` validation fields and
  fail-closed public eligibility;
- removal of the old Prepare/Submit-to-PR routes and UI from active Payload
  composition; active runtime rejects `CMS_GIT_PUBLISHER=github`;
- a read-only, default-disabled CMS snapshot endpoint that selects exact current
  approvals in one pagination-closed PostgreSQL repeatable-read transaction,
  excludes rights/revision drift, and emits deterministic envelope/manifest
  bytes;
- `prompt-lab-template/scripts/sync-cms-snapshot.mjs`, which validates a closed
  snapshot envelope and applies an allowlisted generated tree transactionally;
- `prompt-lab-template/.github/workflows/sync-cms-snapshot.yml`, which schedules
  reconciliation, revalidates output and pushes only an expected-SHA
  fast-forward to `main`, without force push or a content PR;
- an empty-snapshot/removal contract that removes the last Prompt and orphan
  taxonomy while retaining safe empty locale indexes;
- the legacy Markdown/worktree content-agent CLI/runner now fails closed before
  dependency, SDK, Git or filesystem access; the CMS proposal adapter remains
  unimplemented.

Local automated tests cover producer-to-consumer bytes, `cleared`,
`community_attributed`, rights/revision exclusion, deterministic no-op, empty
removal and mirror drift/CAS primitives. Online mirror run
[33761670885](https://github.com/ziyetsui/prompt-lab/actions/runs/33761670885)
also completed prepare, direct-main push and post-push verification for commit
`1a3352b85e5394fe899220418d9a8d8e67082661` and manifest
`sha256:9fab060d9d201645ac49eeff72bd4fbbf71e9e2ef353a3cbea2d0b7ebb039ee6`.

Not implemented or deployed:

- approved-Issue-to-CMS intake and replay protection;
- persisted mirror-run/drift/retry and release/deployment receipts;
- automated priority takedown propagation and completion audit;
- signed deployment callback and CMS `released` projection;
- clean engineering commit/reproducible production build receipt;
- indexable production deployment of the exact snapshot.

The deployed CMS uses PostgreSQL/Hyperdrive, and the workflow is installed and
authorized in the public repository. Protected Pages deployment
[`a4cb721c`](https://a4cb721c.pseo-internal-beta-preview.pages.dev/zh-CN/prompts)
passed authenticated list/detail/model/404/CSS smoke. Because the deployment is
noindex, was built from a dirty engineering worktree, and has no persisted
release receipt, it is Internal Beta Preview evidence rather than formal
production `released` state.

## Generated-only bot contract

Only the dedicated bot may write mirror content to `main`. It must:

1. fetch one immutable snapshot through a read-only, snapshot-scoped identity;
2. validate schema/policy version, manifest hash, every file hash, safe paths,
   UTF-8, secrets and executable HTML;
3. replace the complete allowlisted generated tree transactionally;
4. run repository validation and deterministic checks;
5. compare the current remote `main` with the observed SHA, then perform an
   ordinary fast-forward push or stop and rebuild on conflict;
6. record snapshot revision, manifest hash, before/after SHA and result.

It must not edit application code/workflows/policy, force-push, silently resolve
conflicts, publish an incomplete tree or treat a Git commit as a production
release.

## Public repository and historical evidence

Repository: <https://github.com/ziyetsui/prompt-lab>

The current public `main` is the verified generated mirror above. Preserve the
following older PRs only as audit history:

- [PR #2](https://github.com/ziyetsui/prompt-lab/pull/2) merged the initial
  MIT/software and CC BY 4.0/original-content foundation.
- [PR #3](https://github.com/ziyetsui/prompt-lab/pull/3) is the superseded first
  CMS Prompt proof — **DO NOT MERGE**.
- [PR #4](https://github.com/ziyetsui/prompt-lab/pull/4) is the old schema
  compatibility candidate.
- [PR #5](https://github.com/ziyetsui/prompt-lab/pull/5) is the corrected old
  Prompt candidate.

PRs #3/#4/#5 are not part of the current release order. Do not merge or rebase
them to publish content, and do not follow the retired content-PR UI procedure.
Legacy `publication-requests` rows are read-only evidence.

The preferred YouMind-style organization remains:

```text
Ziye-OpenLab
├── .github/profile/README.md
└── prompt-lab
```

Creating the GitHub Organization and transferring the repository remain owner
operations; they do not alter the CMS authority model.

## Next safe milestone

Commit and review the engineering source, then add signed deployment
attestation, persistent receipts and CMS release projection. Promote only the
same mirror commit/manifest to an indexable production deployment and verify it
before reporting `released`.
