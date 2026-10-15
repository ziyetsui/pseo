# Queenie image library implementation plan

Goal: add all qualifying public Queenie image records to Ancher's existing image library and L1–L4 navigation.
Spec: docs/superpowers/specs/2026-10-15-queenie-image-library.md

1. Capture an immutable public bilingual snapshot and asset manifest, with pagination consistency, retry/cache and explicit exclusions. Audit actual covers against visual recipe fields; record source facts separately from inferred prompts.
2. Add tested validation/projection in a focused queenie catalog module and localized dataset. Generate semantic placeholders/defaults and bilingual taxonomy; bind dataset into catalog revision, finalizer receipts and asset/route checks. Preserve existing Git-beta behavior and fixture isolation.
3. Add honest reference-image / reconstruction credit to shared L4 without changing design. Verify deck/task/style routing, search and language switching; run tests for malformed data, unsafe URLs, duplicate records, missing translations, variable defaults and unchanged baseline routes.
4. Run lint, typecheck, unit tests, build/static checks and Chrome/axe checks at 375/1440; measure artifact limits. Obtain whole-branch independent review, address findings, create PR, merge and deploy complete verified source. Record deployment URLs and live checks.

Scope clarification pending: user was offered all real images / Xiaohongshu / memes; proceed with all qualifying published real images if no narrowing arrives. Public-only source is the complete currently available approved content, not private business data or draft records.
