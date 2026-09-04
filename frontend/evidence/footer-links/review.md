# Footer destinations — 2026-09-04

All shared footer variants now route task entries to Findings, styles to Plate, subjects to their existing category directory renderer, models to Anthology, and All models / All creators to the independent directories. Ordinary inline query filters are unchanged. Registered fixture taxonomy with no prompt records is included in its own entity page; no new taxonomy, prompts or backend endpoints were invented. Removed keyword-search substitutes from the footer. Subject routes match backend `_term_href` and use category metadata. User's new footer scope is recorded in AGENTS.md and PRD/Tech Arch.

Validation this round:
- All 36 unique hub-footer destinations returned HTTP 200 and a nonempty H1, with no query/hash substitutes. See destinations.json.
- Chrome actual clicks: Beauty → Findings; Photorealistic → Plate; Person / portrait → scoped list of 15 prompts; All models → Models; All creators → Creators.
- Unit 31/31; lint 0 errors / 10 existing img warnings; typecheck passed.
- Visual build passed, 78 generation entries. Static validation: 76 HTML pages / 4476 local links.
- Task + Style E2E: 14 passed / 2 deliberate duplicate viewport skips, including desktop/mobile, keyboard, no-JS and accessibility checks.
- Full E2E, root compiler and Lighthouse were not rerun; no claim that the previously intermittent L1 video peek test is resolved.

Fixture revision: sha256:fb874b02738afe5fc077ca9b40396d500edfcc737ee7e7039e2f1439b4d3916e (fixture input hash, not an application-code revision). Current changes are local/noindex only. CMS public, mirror and production deployment remain unchanged.
