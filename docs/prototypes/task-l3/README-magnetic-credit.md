# The Magnetic master's first screen, with a credit — pending selection

Scope: **one credit added after the signature line** on the first screen of the selected L1 master, crediting Vincent Wu and Steve Li with links to their X profiles. The motion decision is not in play: §7 selects Magnetic, so all five directions render `page("run", NOTE, mRun, "magnet")` and the verification asserts `data-field="magnet"` on every one of them.

- Open: `docs/wireframes/proto-l1-magnetic-credit.html` → http://127.0.0.1:8766/proto-l1-magnetic-credit.html, or open the file. `1`–`5`, ←/→, `R` replays, `?v=` survives a reload.
- Built by `node build-magnetic-credit.mjs`, which **reads** `docs/wireframes/final/L1-hub-magnetic.html` and writes a separate file. The master is never edited: `docs/wireframes/final/README.md` records its SHA-256 and §7 names its source. Each of the six insertions asserts its anchor first, so if the master moves this fails loudly instead of quietly producing a page that is no longer the master.

The two handles came from the user: `https://x.com/VincentWu11` and `https://x.com/st3v3li`. Neither name appears anywhere in the repository, so nothing here is inferred.

## Directions

| Picker | Axis | Strength | Cost |
| --- | --- | --- | --- |
| Current | The first screen exactly as it is | The baseline — flip to it to confirm nothing above the credit moved | — |
| **Field** | The master's own thesis, applied to the credit | The names carry `.t`, so the pointer field measures them with the 35 titles and moves them on the same inverse-square falloff and the same spring. **No new motion code exists in this direction.** It is the only one that could not have been designed for any other page | Inherits the field's resting opacity, so the names sit at 78% until you approach them; and it is invisible on touch, where the master's field has no ambient term |
| Colophon | Book plate: hairline, small-caps label, names in the page's own serif | Quietest thing that still reads as a credit; adds no typeface and no colour | Easy to miss, one line under a mono line that already looks like a colophon |
| Signature | The page is signed — display italic at 42px, ampersand as ornament | The most designed moment on the screen; the names read as people, not metadata | Adds a typeface (below); tallest, and the loudest thing under a paragraph about not editing |
| Kinetic | The credit is the motion — dealt out letter by letter, stroke traces on hover | Most memorable, re-earns attention on every visit | The motion is the point, so it is also what can wear out |

**Plaque was cut.** In the earlier round against the React first screen it was the "small object" direction; on this master the first screen is pure type down to the signature line, and a bordered card fights it harder than any of the four above. A picker with four distinct directions beats one padded to five.

## Where it lands

The master's first screen is already a full viewport, so the credit's bottom edge matters:

| Direction | 1440×1000 | 375×1000 |
| --- | --- | --- |
| Field | 961 ✓ | 924 ✓ |
| Colophon | 977 ✓ | 940 ✓ |
| Signature | 1008 — 8px under | 952 ✓ |
| Kinetic | 1006 — 6px under | 956 ✓ |

The lever, if the taller two are wanted, is the section's own `padding-block: 112px 96px` or the credit's top margin — both below the last paragraph and therefore invisible to a reader of the text above. Neither was touched: that is a call about the master.

## Two harness notes

- The picker takes PICKER.md's **one allowed modification**, `data-position="top"`, because the credit lands at the bottom-centre — exactly the case the spec names. The master parks its theme toggle top-right below 700px *because* the picker owns the bottom there, so this file puts the toggle back in the corner it was moved out of at that width. Both are harness; §7 is explicit that sample selectors and toggles are not product UI, and nothing about the page moves.
- `vStill`, `vBreathe`, `vInk` and `vDrift` stay defined and unused, so the file still says what it was cut from.

## Verification

`node verify-magnetic-credit.mjs`, at 1440×1000 and 375×1000, in **both themes**:

- Every direction renders and is the Magnetic master (`data-field="magnet"`).
- The whole first screen with the credit removed is byte-identical to the baseline, in every direction at every width.
- Exactly two links, each to one of the two supplied URLs, `target="_blank"` with a `rel` containing `noopener`, and **no `[data-expand]`** — a credit name must never be mistaken for a title, since that is the attribute the peek disclosure keys off.
- Field: the field measures the credit names (`.m-run .t` count rises by exactly 2) and, with a fine pointer emulated and the pointer walked in, the loop writes `--fx`, `--fy` and `--near` to a credit name just as it does to a title. Headless Chromium reports no fine pointer by default and the engine gates on `matchMedia('(hover:hover) and (pointer:fine)')` — without those launch flags this check would have passed over a field that never ran, which is how it was caught.
- Replay re-runs the entrance; `?v=` survives a reload; a reduced-motion context has no running animation under `.cr` while the credit stays visible.
- axe on `#stage` in light, and on `.argument` in dark — no violation from any credit element in either theme.
- No console or page errors; no document horizontal overflow.

Evidence: `evidence/magnetic-credit/` (light and dark screenshots per direction per width) and `review.json`.

### One pre-existing finding in the master

axe reports the same `serious` colour-contrast failure on **all ten passes, including Current**: the filter chips' counts, `.chip > small`. It is the master's, not the credit's. Production already carries a fix for exactly this — `frontend/src/styles/globals.css` has `.prototype-hub .chip small, .prototype-deck .chip small, .prototype-anthology .chip small { opacity: 1 }` with the note that the prototype's extra alpha falls below AA — but `.prototype-magnetic` is not in that list, and L1 is now Magnetic. That is the same failure I saw through the embedded production page in the combined picker. Not fixed here: it is production code another session is editing.

## Before any of this ships

1. **The typeface, if Signature wins.** Instrument Serif italic (SIL OFL) from a CDN. No font licence record exists in this repository and §7 requires the selected page's actual font stack, so adopting it means registering the licence, self-hosting the `woff2` and preloading it. The other three add no typeface.
2. **§7.** It pins L1 to a 1:1 reproduction of this master and records that the first-screen signature was deliberately deleted. The credit lands just under the line that replaced it. The request is the authorisation; §7 has to say so before implementation.
3. **The entrance should play once per session** (`sessionStorage`) in production. The picker replays it on every mount on purpose — a motion you cannot re-watch cannot be judged.

No decision has been made. After selection: record the chosen and rejected directions, implement in the real component, settle the three points above, then delete this exploration unless asked to keep it.
