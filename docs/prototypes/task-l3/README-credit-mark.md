# The credit, round three — small, and forceful anyway

The note on round two: *the type is too big, it is not spare enough, and it is not forceful enough.* So nothing in this round is set above 17px, and each direction finds its force somewhere other than size — register, enclosure, contrast, scale opposition, or refusing to take any new space at all. Nothing here runs past 260ms either; round two's 640ms draws were part of what read as soft.

- Open: `docs/wireframes/proto-l1-credit-mark.html` → http://127.0.0.1:8766/proto-l1-credit-mark.html, or open the file. `1`–`5`, ←/→, `R` replays, `?v=` survives a reload.
- Rounds one and two stay on disk (`proto-l1-magnetic-credit.html`, `proto-l1-credit-kinetic-riff.html`) as the record of what was rejected.
- Built by `node build-credit-mark.mjs`, which reads the master and writes a separate file; the master's SHA-256 still matches `docs/wireframes/final/README.md`.

## Directions

| Picker | Where the force comes from | When it wins | What it costs |
| --- | --- | --- | --- |
| **Inline** | Taking no space. It finishes the signature line the page already prints, in that line's own 11.5px mono; the names lift from faint to full ink, 160ms apart | The most concise answer available — the first screen gains a credit and not a block, and the fold problem disappears with it | The credit is as quiet as the line it joins; nobody will notice it who is not looking for it |
| **Mono** | Register. 12px uppercase, 0.12em tracking, names in full ink against a faint key, set left to right in one 220ms wipe | It reads as a stamped attribution rather than a signature — machine-precise, and it sits naturally under a mono signature line | Uppercase mono at 12px is the least warm treatment of two human names in the set |
| **Bracket** | Geometry. Two hairline brackets snap in around the names in 240ms and stop | Small type that has been *closed on* — the mark does the work the size used to | The brackets are an ornament with no meaning of their own; they can read as decoration |
| **Stamp** | Contrast. The key is an inverted block — ink on paper reversed — pressed in from `scale(.94)` in 180ms, beside names at reading size | The smallest element on the screen is also the highest-contrast one, which is the whole argument: force without size | A filled block is the most UI-like thing on a screen that is otherwise pure type |
| **Counterpoint** | Scale opposition. One oversized italic ampersand lands first and the two quiet 15px names step out from under it | Creative in the cheapest possible way — one big mark, nothing else enlarged | The ampersand is the loudest thing in the credit, and it is the one part that carries no information |

## Where it lands

The credit's bottom edge, at 1440×1000: **Inline 905, Mono 950, Bracket 952, Stamp 952, Counterpoint 981** (round two was 1004–1017). At 375×1000: 886–934.

Inline is worth stating precisely: the signature line's own bottom edge is 905, and Inline's is also 905. It costs **zero** vertical space. Wherever the signature line is on a given screen, the credit is there too.

## Craft

- Transform and opacity, `cubic-bezier(0.32, 0.72, 0, 1)`, every entrance between 180ms and 260ms. **Two deliberate exceptions, both stated in the file:** Mono reveals with an animated `clip-path` (a reveal in place — a curtain scaled over the text scales its own edge), and Inline animates `color`, which is the master's own idiom for exactly this — `.m-run[data-field] .t` transitions colour and nothing else — and is what "the ink arrives" has to be to read at 11.5px.
- The underline is its own element in all five; `text-decoration` cannot be drawn on. At this size it is the entire hover and focus affordance, and focus is served the way a pointer is.
- Hit areas: at 12–15px the box is 17–19px tall, so a pseudo-element carries every target past 44px without touching the line box; 4px of horizontal bleed cannot reach a neighbour 10px away. Asserted at both widths.
- Every block direction sits in the same 410px column as the paragraphs and the signature line.

## Verification

`node verify-credit-mark.mjs`, at 1440×1000 and 375×1000, in both themes: every direction renders and is the Magnetic master; the first screen with the credit stripped is identical across all five; **no name is set above 17px and no credit element above 41px** (the round's own premise, asserted); exactly two links each, to the two supplied URLs, `target="_blank"` with `noopener`, and no `[data-expand]`; replay re-runs the entrance; `?v=` survives a reload; a reduced-motion context has no running animation, Mono is unclipped and Inline's names are at full ink; axe clean of any credit element in light and dark; no console or page errors; no horizontal overflow. Evidence: `evidence/credit-mark/`.

Two things this round's assertions did **not** catch, both found by looking at the screenshots — worth remembering when reading any of these reports:

- Every block direction had lost the 410px column and was running full-bleed from the section's left padding at x=30. A full-bleed credit is still two valid links at a valid height, so nothing failed; it was simply on a different grid from the rest of the screen.
- The first version of the untouched-block assertion normalized whitespace at only one of its two capture sites, so it compared a normalized string against an un-normalized one and reported a change that did not exist. Both sites now share one normalizer, and the comparison is whitespace-insensitive on both sides because Inline's leading space belongs to the credit.

The master's own `serious` contrast failure on `.chip > small` still appears on all ten passes, unchanged and unrelated.

## Still open

§7 has to record the credit; the entrance should be gated to once per session in production, where the picker deliberately replays it; none of these five adds a typeface.
