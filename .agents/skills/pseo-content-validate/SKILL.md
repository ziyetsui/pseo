---
name: pseo-content-validate
description: Validate a CMS proposal or deterministic mirror engineering fixture without treating Git content as the publication authority.
---

# Validate CMS proposals and mirror contracts

Use after preparing a Prompt/Article CMS proposal, or for an explicitly authorized compiler/schema fixture change.

- For a proposal, validate the proposal schema, immutable identity, locale/slug, relationships, source/evidence, media, unsafe HTML/URLs, secret patterns, and expected CMS revision. Missing facts remain missing; validation never upgrades editorial or rights status.
- For mirror/compiler engineering work, inspect the exact diff and run the repository gates without weakening schemas:

```bash
node infra/bin/content.mjs validate
node infra/bin/content.mjs build --output infra/generated/static
node --test infra/tests/*.test.mjs
```

These commands validate deterministic projection behavior; they do not authorize manual edits to the public mirror. Report actual results and stop on failure. Never write Payload DB, approve rights, push the mirror, deploy, or declare content released.
