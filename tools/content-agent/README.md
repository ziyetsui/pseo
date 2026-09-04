# Retired Markdown/Git content-agent

This package's former Markdown worktree authoring flow is retired. Payload CMS
is the canonical content store, and Agent-assisted changes must use a versioned,
authenticated CMS proposal contract. The former natural-language/Markdown
runner remains retired; this package now exposes only a bounded host-side client
for the versioned create-Prompt draft endpoint.

The package fails closed today:

- `pnpm start` always exits non-zero with `CMS_PROPOSAL_ADAPTER_REQUIRED`;
- `runContentAgent()` always returns `retired_workflow` before reading a request,
  accessing dependencies, starting Codex, creating a Git worktree, or writing an
  audit/patch artifact;
- it cannot edit `content/**`, produce a publication candidate, write the public
  mirror, approve CMS content, or deploy;
- `pnpm smoke:sdk` remains an isolated read-only SDK connectivity check and is
  not an authoring or publication path.

`submitCmsPromptProposal()` and `pnpm submit:cms-prompt` can send an already
validated JSON proposal to the fixed CMS endpoint. The CLI reads proposal JSON
from stdin and credentials from `PSEO_CMS_BASE_URL`, `PSEO_CMS_API_KEY` and,
when Cloudflare Access protects the endpoint, the paired
`PSEO_CF_ACCESS_CLIENT_ID` / `PSEO_CF_ACCESS_CLIENT_SECRET` environment values.
It never accepts approval, rights clearance, mirror, release, or deployment
instructions; the CMS stores the result as `draft`, `review_required`, and
`noindex`.

The remaining Git/worktree/guard modules and their unit tests are historical
security research. They are not wired to the package CLI or active runner and
must not be used as an alternate publication mechanism. The host client does
not revive Agent authoring or the old Markdown patch workflow. Turning arbitrary
natural language into the strict proposal JSON is a separate reviewed
control-plane concern.

Local verification only:

```bash
cd tools/content-agent
pnpm verify
```
