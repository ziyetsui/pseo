---
name: pseo-content-pr
description: Legacy name for preparing a CMS human-review package; content publication no longer uses per-item Git pull requests.
---

# Prepare a CMS review package

**Scope: PromptLab only.** Use only when the target repository is confirmed as PromptLab and contains its CMS publication contract (`specs/0011-promptlab-youmind-cms-publication.md`). On other projects use `pseo-content-workflow` and the host project’s own rules. Installation does not install a CMS adapter, schema, credentials, or deployment access.

This Skill name is retained for compatibility, but the old Markdown → content PR publication path is retired by spec 0011. Use it only to package a validated CMS proposal for human editorial and rights review.

- Identify type, immutable ID, locale, expected CMS revision, proposed field changes, source/evidence, and unresolved facts.
- Report validation results and every approval invalidated by the change.
- Keep `cleared`, `community_attributed`, `approved`, `public`, takedown decisions, mirror sync, and released state under authorized human/service control.
- Never edit the generated mirror, create a content branch/PR, push `main`, deploy, or claim public/released state.

Engineering changes to schema, exporter, workflow, or policy still use ordinary code PRs; this Skill does not prepare those.
