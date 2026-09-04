# L1 first screen — value and heat · pending selection

Scope: the **first screen of L1** — the block that opens the page and hands you into the library, including the two category entries into L2. The brief asked for "browse by category → L2" and a matrix tied to money and heat; those are the same surface, because in every direction below the two decks *are* the opening move. The shipped category tiles already point at `/{locale}/prompts/{kind}`, so the routing half was already true before this run — what changes here is what the first screen spends itself on.

- Harness: http://127.0.0.1:8767/first — `1`–`5` and ←/→ switch, `?v=` survives a reload. The shipped task band sits below the fold so a direction that eats the viewport shows what it costs the page under it.
- Single file: `docs/wireframes/proto-l1-first-screen.html` → http://127.0.0.1:8766/proto-l1-first-screen.html, or open it directly. `node build-standalone-first.mjs` regenerates it.
- Source inspiration: http://127.0.0.1:8766/proto-l1-system.html?v=5.

## What "money" and "热点" are allowed to mean here

There is no money data in this library, and inventing some is out (root `AGENTS.md` §3). What exists:

- **saves** — bookmarks. Observed on the source post and carried into the public read model (`public.ts` maps `metrics.bookmarks → saves`), so anything built on it is implementable for real. It is the closest honest proxy for intent: a like is applause, a save is somebody putting the text aside to run it.
- **likes** — same provenance. Saves ÷ likes is one measure, not two, so it can share an axis.
- **`score` and `highValue` are visual-fixture only** (`public.ts` sets `score: null`, `highValue: false`). No direction encodes them.
- **`views` is null on 34 of 35 records.** Not shown anywhere.
- **One observation date for the whole snapshot** (`2026-08-20`), so nothing here says "trending now". The superlative available is "most saved", and every direction states the snapshot date beside it.
- **One prompt in the library names a price**, in its own body copy, about its author's own pipeline. It appears once, in Statement, as a short attributed quote with a link to the source post and an explicit line saying it is their claim and not a measurement of ours.

## The finding the directions are built on

| Deck | Prompts | Saves | Likes | Saves per prompt | Saves per like |
| --- | --- | --- | --- | --- | --- |
| Images | 22 | 9,607 | 14,802 | 437 | 0.65 |
| Videos | 11 | 10,059 | 6,532 | 914 | 1.54 |

Videos are half the library and take more saves than images, at 2.4× the save-per-like rate. Images get applause; videos get kept. That asymmetry is invisible on the shipped first screen and is the argument for putting numbers there at all.

## Directions

| Picker | Axis | Strength | Cost |
| --- | --- | --- | --- |
| Current | The shipped argument block, verbatim, with the shipped category band under it | The real baseline | Nothing is clickable above the fold — measured, the first link sits at y=1029 at 1440×1000 and y=952 at 375 |
| Board | A board of numbers; the two decks are the column heads and the plate says where the saving happens | Densest reading of the library in one screen; a cell opens the deck already filtered to that task | Opens the product with a table; the plate needs a sideways scroll under ~660px |
| Quilt | The work itself, tile area ∝ √saves | The only direction where the first screen is the output, and size carries the ranking without a chart | Area is imprecise by nature; heaviest media payload; the taxonomy is invisible |
| Statement | A printed statement — one hero number, two line items, one quote | Most confident register, and the only one that can carry the price claim honestly | No imagery at all; a library of pictures opens without a picture |
| Split | Head to head: two decks, two columns, the same four measures | Makes the images-vs-videos asymmetry the point in one glance | Only two entities; says nothing about tasks, models or individual prompts |

All four new directions put the first link at y=310–442 instead of y=1029.

Encodings, in all of them: shade and area are a neutral luminance mix of the page's own ink, never a hue, so the only colour on the first screen is still the imagery — and every encoded value is printed as a number beside it, so the encoding is never the only signal. Saves run 6 to 6,127 in this snapshot (a 1,021× spread), so both the plate's ramp and the quilt's area go through a square root and say so in their own legend; a linear scale would put everything but the top row at the bottom step.

## Loadout

`design-foundations`, `typography`, `surfaces`, `ui-polish`, `touch-and-accessibility` as every run, plus **`dataviz`** for this one — it owns the calls this brief is made of: pick the form before the colour, one axis per chart (saves and likes are different scales and never share one), sequential = one hue light-to-dark, a legend or a direct label for every encoding, right-aligned tabular numbers in tables, and a hover layer on any cell chart. No categorical palette was introduced, so there was none to run the validator against.

## Verification

`node verify-first.mjs` (harness) and `node verify-standalone-first.mjs` (single file), both at 1440×1000 and 375×1000 with touch emulation. Checks: all five directions render; axe clean on `main` in every pass; no console or page errors; no document horizontal overflow; no `href="#"` anywhere; both decks reachable from every direction; a board cell opens `/prompts/{kind}?useCase={slug}` (verified against the running L2, which honours that filter — 12 cards down to 4); the tooltip answers to keyboard focus and cannot intercept the click on the cell under it; `4`, `?v=4` and a reload all hold. Evidence: `evidence/first/` and `evidence/standalone-first/`, plus `evidence/live-l1-first-screen.png` for the shipped baseline.

Two bugs of the same family were found by that pass and fixed, both worth remembering when anything moves out of this directory: the standalone's **tooltip** and its **skip link** were mounted outside `.prototype-magnetic`, and every rule in these stylesheets is scoped under it — the tooltip silently lost `pointer-events: none` (so it could swallow the click on the cell it described) and the skip link rendered as a visible blue link at the top of the page.

## Boundaries

- Prototype only; production imports nothing from here, every route is `noindex, nofollow`, and no CMS, snapshot, mirror or deployment state was touched.
- Links point at the running frontend on port 3000 (deck, filtered deck, L4, source post). That server must be up.
- **Adopting any of these changes the L1 visual contract.** `frontend/AGENTS.md` §7 pins L1 to a 1:1 reproduction of the Magnetic master and names the argument block as the first screen. A chosen direction needs that section updated before implementation, not after.

No decision has been made. After selection: record the chosen and rejected directions, implement against the real catalog contracts (`likes`/`saves` exist in the public read model; `score`/`highValue` do not), update `frontend/AGENTS.md` §7, then delete this exploration unless asked to keep it.
