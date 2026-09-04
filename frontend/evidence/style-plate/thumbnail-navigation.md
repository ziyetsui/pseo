# Style L3 thumbnail rows — 2026-09-04

Latest user screenshot replaces the earlier text-only decision. Category, task, model and style navigation on all Style Plate pages use a single horizontal row of thumbnail cards. Thumbnails are 16:10, titles/counts below, gap 12px, card widths 180–260px with approximately five cards on desktop. Short rows keep the same card width; narrow viewports scroll horizontally. Models preserve families; links and source taxonomy remain unchanged. Missing media retains a bounded fallback, never a fabricated cover.

Files: Browse.tsx (opt-in horizontalNavigation), StylePlate.tsx, style-plate.css, AGENTS.md. Other page callers retain their existing default layout. Historical compact prop/styles were removed because they no longer have a caller.

Chrome visual inspection at 1406px: category 2 cards/2 images; tasks 8/7 (Automotive has no media); models 4/4; styles 5/5. All four rows use column flow and measured card width 259.59px. Root document has no horizontal overflow. Screenshot visually reviewed at Styles anchor; matches the requested thumbnail-above-caption horizontal structure. Current taxonomy counts/images follow the prior audit, not stale numbers in the reference screenshot.

Verification this turn: 49/49 unit tests; Style browser suite 7 passed, 1 deliberate duplicate viewport skip. Browser suite covers narrow/tablet widths, mobile, scoped filtering, L4 links, keyboard, no-JS and Axe. No new tests added for this reversible layout change.

Full visual build is blocked by concurrently introduced, unrelated `src/app/(entry)/proto/model-hero/` work: first missing proto.css, then strict TypeScript errors in variants.tsx (possibly undefined seed). Those files were not changed here. check:static passed against the prior export (77 HTML / 4948 links), so this is not a fresh export receipt for the thumbnail layout. No claim of successful final build or deployment. No CMS/mirror/data changes.
