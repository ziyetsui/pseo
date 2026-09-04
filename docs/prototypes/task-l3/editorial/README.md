# Task L3 editorial exploration — pending selection

2026-09-04. User requested multiple Browse by task → L3 page directions borrowing Plate and Manifesto from `docs/wireframes/proto-l1-editorial.html`, previewed at `http://127.0.0.1:8766/proto-l1-editorial.html?v=3`. Reference SHA-256: `9dd72a802aa8750d6656b7ac90e3e4f318183e998870c138d0273aece6b94c4a`.

This is the second exploration round in the isolated `docs/prototypes/task-l3` application. It adds `/editorial` and `/editorial/[task]`. The first Matrix/Lanes/Index round remains available at `/tasks/[task]`; neither round is selected or rejected yet. No production frontend, API, CMS content, public snapshot, mirror or deployment is changed in this round.

- Browse entry: http://127.0.0.1:8767/editorial#tasks
- Beauty comparison: http://127.0.0.1:8767/editorial/beauty?v=2
- Start in the parent directory: `node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 8767`

## The picker

| Variant | Design axis | What it gives | Cost |
| --- | --- | --- | --- |
| Current | Existing task-filtered L1 in an unchanged iframe | Literal comparison with the existing task browsing behavior | Not a dedicated task layout; requires port 3000 |
| Plate | Exhibition catalogue: numbered index, large uncropped media, alternating marginal captions | Every matching prompt gets a complete illustrated record and source link | Long page; complete prompt text is narrow when opened in the desktop margin |
| Manifesto | Oversized serif opening, 410px argument, 648px specimens, continuous title list | Strong reading rhythm and editorial identity | Three illustrated specimens at most; remaining matching prompts appear as direct L4 title links |
| Folio | Manually turned image/text spread, jump index and complete original text | A focused way to inspect one result and its complete prompt | One prompt at a time; mobile stacks the facing pages vertically |

All new directions default to the existing Linear dark palette. Picker markup and CSS are the prototype skill's fixed harness; 1–4 and arrow keys switch, R remounts. Text fields and native selects retain their keyboard behavior. The URL persists variant choice. Switching clears the old in-page anchor and returns to the top. Folio page turns return to the start of the new record. No entrance effects, autoplay or animated content transitions; the picker highlight retains its mandated transition.

## Real data and actions

Use the existing `createFixtureCatalog('zh-CN')` through `materials.ts`. Task matching uses the actual use-case slug. Beauty contains 13 records, Food & beverage 8, Automotive 1. Titles, prompt text, models, media and author/source references are reused without content edits. Typography uses the locally served Inter font and system Georgia for editorial headings. This is visual-fixture data, not a newly approved public snapshot.

Search, model and image/video filters work locally in each direction. Empty results offer Clear filters. Native details disclose the original full prompt; no Copy prompt actions are introduced. Generate image / Generate video labels follow the actual prompt kind and link to that prompt's existing L4 on port 3000. Sources open their actual URLs. No generation API is invoked. Media use existing reference assets and the production unavailable-media fallback.

## Craft loadout

Design foundations, typography, color, surfaces, animation/performance, forms, touch/accessibility and UI review: a consistent dark foundation, separate composition axes, bounded task subsets, 16px inputs, 44px product targets, visible focus, native keyboard behavior and reduced-motion support. Marketing-pages guidance informs clear section rhythm and source/result pairing, with no copied unsupported claims, parallax or automatic motion. Layout and descriptive UI copy are exploratory; original prompt bodies remain intact.

## Verification

- Isolated TypeScript check passed: `node node_modules/typescript/bin/tsc --noEmit --project tsconfig.json` from the parent directory.
- `node verify-editorial.mjs`: Current and all three directions checked at 1440×1000 and 375×1000. Entry → Beauty, 13-record scope, empty/reset, model and media filters, Plate index and full text, Manifesto unique specimens plus all remaining links, Folio previous/next/jump and endpoint states, task changes, picker keyboard input isolation, reload persistence and switch scroll position passed.
- Page JavaScript errors: zero. Horizontal document overflow: none. Axe: zero violations within all three `.ed-shell` surfaces at both sizes. The mandatory picker is excluded from the product audit; the unchanged Current iframe was checked for rendering and its task count.
- `node capture-editorial.mjs`: actual first Generate image navigation returned HTTP 200 and the matching L4 heading.
- Screenshots inspected at desktop and mobile sizes. Evidence: `../evidence/editorial/review.json`, `../evidence/editorial/l4-navigation.json`, and per-direction screenshots.

## Decision boundary

The user has requested options, not selected a winner. Per the prototype skill, keep production unchanged until a direction is selected. Then record the selected and rejected directions, update the approved route/visual contracts and `frontend/AGENTS.md`, implement the winner against the real public category API, and remove the unused exploration unless the user asks to retain it. Filters currently reset on variant/task switches; only variant choice persists.
