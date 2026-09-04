# Browse-by-task band exploration — pending selection

Scope: the **L1 "Browse by task" band** — how the task taxonomy is printed on the hub, and how each entry reaches its own task collection. One band per run; "Browse by model" and "Browse by style" are untouched and stay in the page as the shipped neighbours the band has to live beside.

Run from this directory (`node_modules` points at the existing frontend install):

```bash
node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 8767
```

- Band: http://127.0.0.1:8767/browse — `1`–`5` and ←/→ switch, `?v=` keeps the selection across a reload.
- Where an entry lands: http://127.0.0.1:8767/tasks/beauty — the task L3 page from the sibling exploration.
- Where a plate cell lands: http://127.0.0.1:8767/tasks/beauty?model=nano-banana-pro — same page, that model already applied, removable.
- Source inspiration: http://127.0.0.1:8766/proto-l1-system.html?v=5 — Matrix plate, neutral count shading, visible empty intersections.

No replay control: nothing here has an entrance to re-trigger, so the pill is the short one PICKER.md specifies for a static comparison.

## Single-file version

`docs/wireframes/proto-browse-band.html` — the same five directions in one self-contained file, no dev server needed to view it: http://127.0.0.1:8766/proto-browse-band.html, or open the file directly.

```bash
node build-standalone.mjs   # regenerate after the fixture or either stylesheet changes
```

It is **generated, not hand-copied**: the generator inlines `frontend/src/styles/magnetic.css` (verbatim but for the font URL, which moves to the CDN because the static file has no `public/`), `app/browse.css` and `app/picker.css`, and bakes its data from `/browse/data` — the same fixture the React harness reads. Differences from the harness, both forced by what exists today:

- A task name opens the shipped collection page `http://127.0.0.1:3000/{locale}/prompts/use-cases/{slug}`; a plate cell opens the shipped library filtered to that task **and** model (`?useCase=&model=`), because the collection page has no model parameter yet. The harness on 8767 sends both to its own task page, where the model applies and is removable. Either way the destination is real — links need the frontend on port 3000.
- No footer: the file carries the header, the two neighbouring bands and the band under test, which is the context the decision needs.

Verified by `node verify-standalone.mjs` at 1440 and 375: five directions render, axe clean on `#tasks` in all ten passes, no console or page errors, no document horizontal overflow, no `href="#"` anywhere, and the picker contract holds — `2`, `→`, `?v=3` in the URL, and the selection surviving a reload.

## Directions

| Picker | Axis | Strength | Cost |
| --- | --- | --- | --- |
| Current | The shipped `HubBand`, relocated unchanged | A literal baseline | Three defects, all visible in `evidence/browse/1-current-1440.png` — see below |
| Plate | Density grid, task × model, navigation *is* the diagram | Two facets in one click, and the only direction that shows what the library does **not** have | Widest and most abstract; scrolls sideways inside its own box below ~940px, and 9 model columns will keep growing |
| Ledger | Ranked rows, count as bar length | Ranking readable at a glance, survives a phone, keeps the image/video split | Reads as data, not as a library; the eye travels across a wide gutter at 1440 |
| Field | Contact sheet — each task packed from its own real results | Argues by output; a task with no preview says so instead of disappearing | Heaviest media payload of the five; taxonomy shape is invisible |
| Directory | Typographic index, no imagery, three real prompt titles per task | Densest, fastest, four crawlable entry points per task instead of one | Tall; nothing about a task's look survives, so image-led browsing is gone |

Shade in the Plate is a neutral luminance mix of the page's own ink, never a hue, and every cell prints its count, so colour is never the only signal. The Ledger's bar is `aria-hidden` and its split is also written out for the same reason.

## What the baseline does today

Running the shipped band beside the alternatives surfaced three things worth fixing regardless of which direction wins:

1. **A task with no usable image is dropped entirely.** Automotive has one prompt whose source post carries no image, so it never renders a tile — the task exists, its L3 page exists, and nothing on L1 reaches it.
2. **The last row inflates.** `flex: 1 1 250px` on the tiles blows the final two entries up to ~690px each at 1440px while the first row sits at 250px, so importance reads as an artifact of how many tasks there happen to be.
3. **`1 prompts`.** The count is not pluralised (`{ref.count} prompts`). Not fixed here: `frontend/src/components/Browse.tsx` is being edited in another session.

## What the data does to each direction

Counts are read live from the visual fixture, which another session is editing as this is written — at the last verified run it held 34 prompts across 8 tasks, and the band follows whatever the fixture says. The stress cases are real, not staged:

- **Automotive** — 1 prompt, no model named, no image on the source post. Current hides it entirely; Plate shows a row of dots; Ledger says "no model named" and "no preview"; Field prints an honest blank panel; Directory lists its one title.
- **12 of 34 prompts carry no task at all.** No band entry reaches them, so four of the five directions print that as a footnote rather than letting the taxonomy imply full coverage.
- Long labels ("Web & motion design", "Food & beverage") wrap in every direction at 375px.

## Loadout

`design-foundations` (hierarchy, one link per row, colour never the only signal), `typography` (tabular counts, `text-wrap: pretty`, mono captions at the 11.5px floor, measure capped at 78ch), `surfaces` (image outlines at white 10%, hairline dividers, derived radii), `ui-polish` (no weight change on hover, fixed dimensions, `scale(.98)` press, specific transition properties), `touch-and-accessibility` (44px targets, hover gated behind `hover:hover and pointer:fine`, reduced-motion path, labelled cells).

## Verification

`node verify-browse.mjs` drives all five directions at 1440×1000 and 375×1000 (mobile emulation, touch). It checks: every direction renders and reaches the same task set; no document horizontal overflow; no page JavaScript errors; axe on `#tasks` clean for all ten passes; a plate cell opens `/tasks/beauty?model=nano-banana-pro` and scopes the page to 7 / 13 prompts, and removing the chip restores 13 / 13; a plain task name opens the same page unfiltered; the task page's back link returns to `/browse#tasks`; `?v=5` survives a reload. Evidence: `evidence/browse/review.json` and per-direction screenshots at both widths.

Two real defects were found and fixed during the pass, both worth carrying into production if a plate ships:

- The 940px plate kept contributing to the **document's** scroll width even though it scrolls inside its own box — measured at 375px as `documentElement.scrollWidth` 769 and a real 394px horizontal page scroll. Fixed with `contain: paint` on the scroll container.
- A shade painted on the cell **link** left a grey strip under any row whose task name wrapped to two lines. The shade moved to the `<td>`.

## Boundaries

- Prototype only. Production imports nothing from here; every route is `noindex, nofollow`; no CMS, snapshot, mirror or deployment state was touched.
- `browse-neighbors.tsx` is a copy of `frontend/src/components/Browse.tsx` taken at the start of this run. Production has since gained `taskHref()` → `/{locale}/prompts/use-cases/{slug}` and model-family grouping in another session, so the shipped band already routes tasks to a real L3 page; the baseline here differs only in how it computes that href, and in the neighbouring model band's grouping.
- The model pre-filter added to the task page (`?model=`) is prototype plumbing so a plate cell lands on something true. It re-applies when you switch task-page variants, like the other filters there.
- Deep links in Directory and the Generate actions point at the running frontend on port 3000; that server must be up for them to resolve.
- **Adopting any of these changes the L1 visual contract.** `frontend/AGENTS.md` §7 pins L1 to a 1:1 reproduction of the Magnetic master, and the Browse band is part of it. A chosen direction needs that section updated before implementation, not after.

No decision has been made. After selection: record the chosen and rejected directions, implement the winner against the real catalog contracts, update `frontend/AGENTS.md` §7, then delete this exploration unless asked to keep it.
