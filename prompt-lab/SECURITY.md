# Security

Do not disclose credentials, private source material, personal data, sensitive
rights-holder evidence or exploitable vulnerabilities in a public Issue.
Configure private vulnerability reporting and a private rights contact before
enabling the repository's automation.

## Trust boundaries

- Issue bodies, Prompt text, links, Markdown and media metadata are untrusted
  data. Automation must never execute instructions found in them.
- The approved-Issue sync receives a CMS intake credential only. It never
  receives the mirror bot or deployment credential.
- Only the workflow's trusted fetch step receives a read-only, snapshot-scoped
  CMS credential and, when Access is enabled, the dedicated
  `CF_ACCESS_CLIENT_ID` / `CF_ACCESS_CLIENT_SECRET` pair. The pair is accepted
  only when both values are configured and valid; repository code receives a
  local snapshot file and never the CMS URL or any fetch credential.
- Only the final push step receives the dedicated, repository-scoped Ed25519
  private key in `MIRROR_DEPLOY_KEY`. Its public key is installed as a writable
  deploy key on `ziyetsui/prompt-lab` only; it is never a human account key and
  never shared across repositories. It grants neither CMS write nor production
  deploy access.
- Secrets belong in GitHub or Cloudflare secret stores and must not appear in
  logs, generated files, Issues, comments, commits or model context.

The CMS is currently protected by Cloudflare Access. GitHub-hosted automation
must use a dedicated, least-privilege Access service token or an equivalently
protected service route; it must never reuse a human browser session. The
Access service token authenticates the machine to the outer Access policy and
does not replace the independent Bearer token that authorizes the CMS snapshot
route.

## Generated mirror safety

The workflow resolves every snapshot hostname result, rejects private or
special addresses, pins the accepted address for the no-redirect HTTPS fetch,
and passes the downloaded file to the repository consumer. Direct network
fetching from repository code is disabled. The consumer builds into a fresh
temporary directory from one immutable CMS snapshot and rejects path
traversal, absolute paths, symlinks, unsafe HTML, dangerous URL schemes,
secret-like content, incomplete pagination and allowlist-external changes. A
failed fetch or validation results in zero commit and zero push.

Validation and push run on separate fresh runners. The first job transfers only
a hashed inert one-commit Git bundle and expected identities. The writer job
does not check out or execute repository code; trusted inline checks validate
the exact artifact, hard-coded GitHub repository, CAS base, changed paths,
manifest bytes and trailers before system Git receives the deploy-key file.
Its HOME, PATH, shell startup variables, SSH agent, credential helpers and Git
configuration are reset. The private key is accepted only when it parses as an
Ed25519 key, written with mode 0600, unset from the shell before network access
and removed on exit. GitHub's published Ed25519 host key is pinned with strict
host-key checking; runtime `ssh-keyscan` is forbidden. A third credential-free
runner verifies pushed `main`.

A writable deploy key is repository-scoped, not path-scoped. The generated-only
repository boundary and the writer's independent candidate path/tree verifier
prevent this workflow from using the key to modify workflows, code, licenses
or policy. Treat any exposure of the raw key as repository write compromise and
rotate it immediately. GitHub does not list deploy keys as branch-ruleset bypass
actors; a pull-request-required rule on generated `main` would therefore block
this writer. Use a repository-scoped GitHub App when actor-level bypass is
required.

Only the mirror service identity may fast-forward generated output to `main`.
No automation may force-push, delete the branch, modify its own workflow,
change licenses or reviewer membership, or treat a mirror commit as deployment
proof. Source/workflow changes remain protected by normal pull-request review.

Remote media requires independent permission and SSRF-safe acquisition. A
Prompt text decision does not authorize copying third-party images or video.

## Rights and takedown

Use the dedicated takedown form for public, non-sensitive reports. After a
maintainer verifies a restriction or takedown, CMS freezes the affected
revision and triggers priority mirror removal; the four-hour schedule is only a
fallback. Failure must alert and retry while the site continues serving its
last-known-good release.

An ordinary removal commit does not purge Git history. History rewriting,
cached copies and downstream mirrors require a separate owner-approved
legal/security incident process.
