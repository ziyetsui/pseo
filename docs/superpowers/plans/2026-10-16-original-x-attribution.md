# Original X attribution repair

Goal: Replace 814 YouMind intermediary source credits with verified original X post authors and URLs across both locales.

- [x] Verify original-post header links for all 814 source pages; save evidence hashes and failure receipts.
- [x] Reproduce current West Lord/wrong-source regressions.
- [x] Add validated attribution overlay bound to exact record ID and previous source URL; reject missing, duplicate, conflicting or unsafe mappings.
- [x] Include overlay in build revision and exported receipt consistency.
- [x] Validate unchanged identities/media/templates, all 814 original source links, bilingual output, unit tests, typecheck, lint, beta export/static navigation and representative browser paths.
- [x] Report applied count, unresolved sources and deployment state.

No raw snapshot/CMS/rights changes; beta stays noindex. Other platforms retain real source URLs. The evidence must be the article's explicit original-post header link, never recommendation links or an inferred username.
