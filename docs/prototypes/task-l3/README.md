# Task L3 exploration — pending selection

> The L1 entry band that reaches these pages has its own exploration: [README-browse.md](README-browse.md) (`/browse`).
> The L1 first screen has its own exploration: [README-first.md](README-first.md) (`/first`).
> The first-screen credit line has its own exploration: [README-credit.md](README-credit.md) (`/credit`).
> The same credit against the selected L1 master: [README-magnetic-credit.md](README-magnetic-credit.md) (`docs/wireframes/proto-l1-magnetic-credit.html`).
> Round two of that credit, riffing around Kinetic: [README-credit-riff.md](README-credit-riff.md) (`docs/wireframes/proto-l1-credit-kinetic-riff.html`).
> Round three, small type: [README-credit-mark.md](README-credit-mark.md) (`docs/wireframes/proto-l1-credit-mark.html`).
> Round four, riffing around Counterpoint: [README-credit-scale.md](README-credit-scale.md) (`docs/wireframes/proto-l1-credit-scale.html`).

## One file, all four surfaces

`docs/wireframes/proto-picker.html` — the combined picker: four surfaces, nineteen directions, self-contained. http://127.0.0.1:8766/proto-picker.html, or open the file. `node build-standalone-all.mjs` regenerates it from the same fixture and the same stylesheets the harnesses read.

- Top pill switches surface (`[` / `]`), bottom pill switches direction (`1`–`5`, ←/→). `R` replays on the credit surface, which is the only one with an entrance — PICKER.md renders that control nowhere else. `?s=&v=&task=&model=` survives a reload.
- PICKER.md specifies one control; a multi-surface file needs a second, so the surface switch is built to read as the same harness chrome — same dark glass, quieter, opposite edge. The picker itself is untouched, and its buttons are written from JS only because the surfaces have 5, 5, 4 and 5 directions.
- A task entry in the band opens the task surface in place, on its own baseline (the shipped filtered library, in an iframe) — which is where that entry goes today; `2`–`4` are the directions. Everything the file has no direction for still leaves for the running site on port 3000.
- Verified by `node verify-picker.mjs` at 1440 and 375: all nineteen render, axe clean on all 38 passes, no console or page errors from the file, no horizontal overflow, no placeholder links, plus the band→task hop, the plate cell's model chip, the task page's search / type filter / matrix selection / preview dialog / Escape, the credit surface's untouched-block diff and its two real links, replay re-running the entrance, reduced motion stopping all of it, and the keyboard and reload contract. The embedded production app's own console is excluded from that gate — it belongs to that app, not to the picker.


Scope: Browse by task → dedicated task collection → per-prompt L4. All three new directions use the same task subset, real fixture titles, models, styles, thumbnails and source links. Beauty contains 13 records; Food & beverage contains 8. No prompt text or taxonomy is fabricated.

Run from this directory: `node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 8767` (node_modules points to the existing frontend install). This is a separate Next/React/TypeScript application with plain CSS and reused production materials. Production imports none of it. All routes have noindex/nofollow; no production/CMS/mirror changes were made.

- Entry: http://127.0.0.1:8767/#tasks
- Beauty: http://127.0.0.1:8767/tasks/beauty?v=2
- Source inspiration: http://127.0.0.1:8766/proto-l1-system.html?v=5 — Matrix model/task plate, neutral count shading and empty intersections.

## Directions

| Picker | Axis | Strength | Cost |
| --- | --- | --- | --- |
| Current | Existing filtered L1, unchanged in iframe | A literal baseline | Not a dedicated task page |
| Matrix | Count-based model × style navigation inside a fixed task | Compare coverage and choose an exact intersection | Matrix takes vertical room before result images; narrow screens scroll the table |
| Lanes | Visual model columns | Compare output appearances across models | Wide board; multi-model prompts repeat in each applicable lane |
| Index | Master/detail reading workspace | Scan titles and read full prompts without leaving the task | Fewer simultaneous result images; mobile stacks index above reader |

`1–4` and left/right switch variants; `R` remounts. Ignore shortcuts inside text inputs/selects and with modifiers. URL `v` retains the selection. The picker CSS is copied verbatim from prototype/PICKER.md; 28px picker controls are mandated harness chrome, separate from the 44px product controls. No decision has been made. After selection, record chosen/rejected directions, implement the chosen task route through real category/public API contracts, update frontend/AGENTS.md, then remove this exploration unless the user asks to keep it.

## Loadout

Design foundations: hierarchy and spacing. Typography: Inter, readable text and tabular counts. Color/surfaces: inherited Linear dark palette and neutral matrix shade. Animations/performance: small hover scale, no animated view swaps, reduced-motion override, bounded 35-record fixture. Forms-and-inputs: named inputs, 16px input/select text and search form. UI polish/touch-and-accessibility/UI review: keyboard, visible focus, native dialog, touch target and overflow checks.

## Verification

`node verify.mjs` exercised Current plus all three directions at 1440×1000 and 375×1000. It checked entry→Beauty, 13-record task scope, search empty/reset, media filters, matrix selection/reset, dialogs/Escape, real L4 hrefs, index selection/full text, picker reload persistence, and switching to Food & beverage. No page JavaScript errors or document horizontal overflow. Axe returned zero violations on each new task UI (picker is excluded as fixed skill chrome). TypeScript check passed. Screenshots inspected; fixed full-image containment in detail view and removed an accidental Tailwind overline utility collision. Evidence: `evidence/review.json` and per-variant screenshots.

Known prototype boundaries: filters are local and reset when swapping variants; only picker selection persists. Current iframe requires the existing frontend server on port 3000. Generate actions navigate to that frontend's actual L4; this prototype does not invoke a generation service. Preview media are reference thumbnails, not fabricated playable videos. Sample content is visual-fixture only, not a new public snapshot.

## Round 2: Plate / Manifesto / Folio

A separate editorial comparison is now available at http://127.0.0.1:8767/editorial/beauty?v=2, with its Browse by task entry at http://127.0.0.1:8767/editorial#tasks. See `editorial/README.md` for the reference, directions, tradeoffs and verification. Both rounds remain pending user selection; this does not replace or approve a production L3 design.
