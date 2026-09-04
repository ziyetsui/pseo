# The credit, round two — five motion stories in the Kinetic family

Round one ended with Kinetic chosen as the direction to develop. This round keeps that family — **the credit is the thing that moves** — and diverges inside it: five different motion stories, one constant structure (label, two names, one italic ampersand), so the motion is the only variable.

- Open: `docs/wireframes/proto-l1-credit-kinetic-riff.html` → http://127.0.0.1:8766/proto-l1-credit-kinetic-riff.html, or open the file. `1`–`5`, ←/→, **`R` replays**, `?v=` survives a reload.
- Round one is still on disk at `docs/wireframes/proto-l1-magnetic-credit.html` — Current, Field, Colophon, Signature and the original Kinetic — so the rejected set stays visible rather than being overwritten.
- Built by `node build-credit-riff.mjs`, which **reads** `docs/wireframes/final/L1-hub-magnetic.html` and writes a separate file. The master is never edited; each insertion asserts its anchor first. Its SHA-256 still matches the one recorded in `docs/wireframes/final/README.md`.

Everything from round one still holds: all five render the Magnetic master (`data-field="magnet"` asserted), the credit sits after the signature line inside `.argument`, nothing above it moves, and the links are the two the user supplied.

## Directions

| Picker | The motion story | When it wins | What it costs |
| --- | --- | --- | --- |
| **Kinetic** | The incumbent, unchanged: each name dealt out letter by letter, 26ms apart, vertically | The set's reference point — everything else has to beat it | Twenty small gestures where one might do; the busiest of the five |
| **Ink** | The name is *written*: a hairline draws left to right and the letters appear in its wake, same duration, same curve. The line stays as the underline | The most elegant reading of "motion is the subject" — one continuous gesture, and it leaves something behind instead of just arriving | Both names carry a permanent underline, so the credit reads unmistakably as two links — louder at rest than the other four |
| **Gather** | The letters are already there and close ranks: each glyph starts displaced from its own word's centre and slides home | Same letter-level craft as Kinetic with a calmer read — the name assembles rather than rains in | The effect is subtle enough that a reader glancing away for 600ms misses it entirely |
| **Ampersand** | The ornament acts: the italic `&` lands first, and the two names part from behind it | The only one that is a composition rather than a line; the ampersand earns its size | Centred, so it breaks the 410px text column the rest of the first screen is built on |
| **Hairline** | One gesture, not twenty: a rule opens from a point and the whole credit arrives behind it | The restrained pole of the family — still motion-led, nothing moving letter by letter | Least memorable of the five, and the tallest |

## Craft

- Transform and opacity throughout, `cubic-bezier(0.32, 0.72, 0, 1)`, entrances 460–640ms and the hover stroke 280ms. **One deliberate exception:** Ink reveals its text with an animated `clip-path`, because that is a reveal *in place* — a curtain scaled over the text scales its own edge with it, and a mask position costs more than one paint-only property on two short spans. It is a one-shot on two elements, not a per-frame cost.
- Gather's geometry is in CSS, not JS: each glyph carries `--j` (its place in its word) and its word carries `--n` (the letter count), so `--dx: calc((var(--j) - (var(--n) - 1) / 2) * 7px)` finds each letter's distance from the centre without a second pass at runtime.
- The animated underline is its own element in all five — `text-decoration` cannot be drawn on. Everywhere but Ink it is the hover and focus affordance; in Ink it draws itself on arrival and pointing at a name weights it instead (a `scaleY`, so nothing reflows).
- Focus is served exactly the way a pointer is.
- Every name carries a pseudo-element hit extension so the target clears 44px at both widths, and the horizontal bleed cannot reach the ampersand 12px away.
- Type: the page's own serif at `clamp(26px, 3.4vw, 34px)`, tracking −0.018em, label at 10.5px with 0.16em tracking. Ampersand runs slightly larger because it is centred and alone.

## Where it lands

The master's first screen is a full viewport on its own, so the credit's bottom edge sits at **y = 1004–1017 at 1440×1000** (Kinetic 1004, Ink 1004, Gather 1004, Ampersand 1009, Hairline 1017) and **952–975 at 375×1000**. On a 1000-tall window all five are a few pixels under the fold; on a 900-tall laptop, all of them are under it. The levers are the section's own `padding-block: 112px 96px` and the credit's `26px` top margin — both below the last paragraph, both untouched here, because that is a call about the master.

## Verification

`node verify-credit-riff.mjs`, at 1440×1000 and 375×1000, in **both themes**: every direction renders and is the Magnetic master; the first screen with the credit stripped is byte-identical across all five; exactly two links each, to the two supplied URLs, `target="_blank"` with `noopener`, and **no `[data-expand]`** — the attribute the peek disclosure keys off, which a credit name must never carry; replay re-runs the entrance; `?v=` survives a reload; a reduced-motion context has no running animation while the credit stays visible **and Ink still shows its underline** (its line is drawn by an animation, so with animations off it has to simply be there — that assertion is in the suite); axe clean of any credit element in light and dark; no console or page errors; no horizontal overflow. Evidence: `evidence/credit-riff/`.

The same pre-existing `serious` contrast failure on the master's filter chips (`.chip > small`) appears on all ten passes — it is the master's, not the credit's, and `globals.css` already fixes exactly that for `.prototype-hub` / `.deck` / `.anthology` but not for `.prototype-magnetic`, which is what L1 now is.

## Still open before anything ships

§7 has to record the credit; the entrance should be gated to once per session (`sessionStorage`) in production, where the picker deliberately replays it on every mount; and none of these five adds a typeface — the Instrument Serif question died with Signature.
