# Model-family navigation — 2026-09-04

Grouped all Browse by model sections (Hub and Deck), shared By model footer variants and All models directory by the explicitly selected model families. Nano Banana combines registered nano-banana/nano-banana-pro/nano-banana-2; GPT Image combines gpt-image/gpt-image-2. All other registered models stay independent. Counts and contents use the union of matching immutable Prompt IDs, with exact member IDs/slugs. No title-prefix inference or content edits.

Multi-member families use /{locale}/prompts/model-families/{slug}; existing version-specific model routes and exact model filters keep their original meaning. Family pages reuse Anthology and provide 44px version-navigation links. Scratchpad storage separates family and model scopes. Group metadata does not inherit an individual model's SEO approval. No new CMS taxonomy or family API is fabricated; all data comes from the same validated catalog. Updated frontend/AGENTS.md and PRD/Tech Arch.

Observed locally:
- Nano Banana: 17 unique entries and three version links.
- GPT Image: 6 unique entries and two version links; GPT Image 2 direct page remains 4 entries.
- L1 cards contain six nonempty families; footer has eight registered families including the zero-count models.
- GPT family Generate video opened its actual Recipe L4; browser Back returned to the family.

Validation:
- 35 unit tests passed (including four family membership/deduplication/route/SEO tests).
- Initial build caught strict indexing errors in new test fixtures; corrected and typecheck/build passed afterward.
- Lint: 0 errors, 10 existing img warnings. Build: 80 generation entries; static check: 78 HTML pages / 4602 links.
- Combined Journey + Task + Style browser run: 21 passed, 3 failed, 2 deliberate skips. All four desktop/mobile image/video L1→L2→L3→L4 journeys passed. Failures were two scratchpad focus checks and a browser Page.reload attachment error.
- Targeted serial rerun of scratchpad and Style navigation: all four desktop/mobile cases passed unchanged. Parallel instability is not claimed resolved.
- Full E2E, root compiler and Lighthouse were not rerun. New family UI was visually inspected in Chrome; no pixel-equivalence claim for these derived pages.

Local noindex visual-fixture only; CMS public, mirror and production deployment unchanged. Fixture input revision remains sha256:fb874b02738afe5fc077ca9b40396d500edfcc737ee7e7039e2f1439b4d3916e (application changes are not part of this fixture-input hash).
