# First-screen credit — pending selection

Scope: **one line added after the first screen's argument paragraphs**, crediting Vincent Wu and Steve Li with links to their X profiles. Nothing above it changes — and that is enforced, not promised: every direction renders the same `Argument` component copied verbatim out of `frontend/src/components/Hub.tsx` and passes only the credit as a child, and the verification diffs that block's `outerHTML` against the baseline on every direction at every width.

- Harness: http://127.0.0.1:8767/credit — `1`–`5`, ←/→, `R` replays the entrance, `?v=` survives a reload.
- Single file: `docs/wireframes/proto-l1-credit.html` → http://127.0.0.1:8766/proto-l1-credit.html, or open it directly. `node build-standalone-credit.mjs` regenerates it.
- Below the credit sits the shipped category band, so the fold is real.

The two handles came from the user: `https://x.com/VincentWu11` and `https://x.com/st3v3li`. Neither name appears anywhere in this repository, so nothing here was inferred — a credit carrying a guessed handle is worse than no credit. Both links open in a new tab with `rel="nofollow noopener noreferrer"`, matching how the codebase links source posts.

## Directions

| Picker | Axis | Strength | Cost |
| --- | --- | --- | --- |
| Current | The shipped first screen, no credit | The baseline — flip to it to confirm nothing above moved | — |
| Colophon | Book colophon: hairline, small-caps label, names in the page's own serif | Quietest thing that still reads as a credit rather than a footnote; the only direction that adds no typeface | Easy to miss; the names sit at body scale |
| Signature | The page is signed — display italic at 42px, ampersand as ornament | The most "designed" moment on the screen, and the names read as people rather than metadata | Adds a typeface (see below); loudest thing under a paragraph about not editing |
| Plaque | A small object: two rows, name + handle + destination | The only direction that shows where the links go before you click, and the only one with two full-width targets | Reads as UI, not as typography; tallest of the four |
| Kinetic | The credit is the motion — names dealt out letter by letter, stroke traces on hover | Most memorable, and it re-earns attention on every visit | The motion is the point, so it is also the thing that can wear out; per-glyph spans need the hidden-name pattern to stay readable to assistive tech |

## The thing to decide with your eyes open

The shipped first screen already fills a viewport. Measured, the credit's bottom edge lands at:

| Direction | 1440×1000 | 1440×900 | 1440×800 | 375×1000 |
| --- | --- | --- | --- | --- |
| Colophon | 910 ✓ | 10px below the fold | 110px below | 867 ✓ |
| Signature | 935 ✓ | 35px below | 135px below | 885 ✓ |
| Kinetic | 939 ✓ | 39px below | 139px below | 883 ✓ |
| Plaque | 1001 — 1px below | 101px below | 201px below | 957 ✓ |

So on a 900-tall laptop **every** direction puts the credit just under the fold, because the argument block is already a full screen on its own. Two levers exist, both below the last paragraph and therefore invisible to a reader of the text above: the section's own `padding-block: 112px 96px`, and the credit's top margin (30–34px). Neither was touched here — that is a call about the shipped block, and the brief said not to change it.

## Craft notes

- Motion: transform and opacity only, `cubic-bezier(0.32, 0.72, 0, 1)`, 380–560ms for the entrance and 220–280ms for the hover stroke. Every hover is behind `@media (hover: hover) and (pointer: fine)`, and focus gets the same stroke hover does, so a keyboard reader sees what a pointer reader sees.
- `prefers-reduced-motion` is verified, not assumed: the check asserts that no element under `.cr` has a running animation in a reduced-motion context, and that the credit is still fully visible there.
- Hit areas: the inline names carry a pseudo-element extension so every target clears 44px — measured at both widths, since two of the type sizes are clamped and shrink on a phone.
- The animated underline is its own element in every direction, because a native `text-decoration` cannot be drawn on.
- In production the entrance should play **once per session** (`sessionStorage`, per the marketing-pages rule). The harness deliberately replays it on every mount — a motion you cannot re-watch cannot be judged — so that gate is a promotion step, not something to copy from here.

## Loadout

`design-foundations`, `typography` (the scale, tracking on the small-caps label, real punctuation, `text-wrap: balance`), `surfaces` (the plaque's border, radius and elevation), `animations` (which easing, which duration, transform/opacity only, reduced motion), `marketing-pages` (intro animation gated per session, no scroll-triggered motion, font preloading), `ui-polish` and `touch-and-accessibility` (hit areas, focus, no weight change on interaction).

## Two things to settle before any of this ships

1. **The typeface, if Signature wins.** It sets Instrument Serif italic (SIL OFL) from a CDN. This repository keeps no font licence record and `frontend/AGENTS.md` §7 requires using the selected pages' actual font stacks — so adopting it means registering the licence, self-hosting the `woff2`, and preloading it. The other three directions use only the fonts the page already loads.
2. **The visual contract.** §7 pins L1 to a 1:1 reproduction of the Magnetic master and records that the first-screen signature was deliberately deleted and is not to be restored. This credit lands in roughly that slot — the dead `.vme .argument .sig` rule is still in `magnetic.css` with nothing rendering it. The user asking for a credit is the authorisation, but §7 has to say so before implementation, and the stale `.sig` rule should go with the same change.

## Verification

`node verify-credit.mjs` (harness) and `node verify-standalone-credit.mjs` (single file), both at 1440×1000 and 375×1000 with touch emulation. Checks, per direction and width: renders; the block above the credit is byte-identical to the baseline; axe clean on `main`; no console or page errors; no document horizontal overflow; exactly two links, each to one of the two supplied URLs, with `target="_blank"` and a `rel` containing `noopener`; no interactive target under 44px once its extension is counted; the credit's bottom edge recorded. Plus: replay re-runs the entrance, `?v=` survives a reload, and a reduced-motion context has no running animation while the credit stays visible. Evidence: `evidence/credit/` and `evidence/standalone-credit/`.

Known harness limit: at 375 the five-button pill plus the replay control is a little wider than the viewport, so its leftmost button is clipped. The keyboard (`1`–`5`, `R`) works everywhere, and PICKER.md does not allow restyling the pill.

No decision has been made. After selection: record the chosen and rejected directions, implement inside `Hub.tsx`'s argument block, settle the two questions above, update `frontend/AGENTS.md` §7, then delete this exploration unless asked to keep it.
