# The credit, round four — riffing around Counterpoint

Counterpoint's axis was **scale opposition**: one big thing, two quiet names. Its stated cost was that the big thing — an ampersand — carries no information. So all five here keep the opposition and change *what is big*. Names stay at 13–15px and nothing runs past 260ms, both carried over from round three.

- Open: `docs/wireframes/proto-l1-credit-scale.html` → http://127.0.0.1:8766/proto-l1-credit-scale.html, or open the file. `1`–`5`, ←/→, `R` replays, `?v=` survives a reload.
- Rounds one to three stay on disk; nothing was overwritten.
- Built by `node build-credit-scale.mjs`; the master is read, never written, and its SHA-256 still matches `docs/wireframes/final/README.md`.

## Directions

| Picker | What is big | When it wins | What it costs |
| --- | --- | --- | --- |
| **Counterpoint** | The conjunction — the incumbent, unchanged | The reference the other four answer | The loudest part of the credit is the one part carrying no information |
| **Initials** | The people. Two monograms carry the size *and* the links; the full names sit under them at 11.5px as the caption | The only direction where the largest element on the screen is the credit's actual subject — it answers Counterpoint's cost head-on | Two letters are a weak handle for a stranger; the caption is doing the real naming, one line down |
| **Label** | The word. `credit` set at 40px in the page's serif italic, names small beneath | The sentence carries the size — the biggest thing on screen is the thing that says what this is | The word "credit" is not the interesting noun; it takes the most space and names nobody |
| **Ghost** | Nothing readable. The ampersand is set far past reading size, dropped to a whisper and clipped by the column, so it becomes texture behind the names rather than punctuation between them | Most creative of the five, and the only one that adds a graphic register to a screen that is otherwise pure type | Pure decoration, honestly labelled — inert, `aria-hidden`, and carrying nothing; if Counterpoint's ornament bothered you, this is more of it, not less |
| **Dropcap** | Part of the names themselves. Each name's own first letter is set at 34px on the shared baseline while the rest stays at 14px | The opposition moves *inside* the word — no extra element, no ornament, and the link still reads as one whole name | Two display capitals in one short line is a lot of texture; and it only works on names whose initials are pleasant letterforms |

## Where it lands

Bottom edge at 1440×1000: **Counterpoint 981, Ghost 981, Dropcap 993, Label 1005, Initials 1018**. At 375×1000: 934–979. Initials is the tallest because it is the only one with three stacked lines (label, monograms, caption).

## Craft

- Transform and opacity, `cubic-bezier(0.32, 0.72, 0, 1)`, every entrance 200–260ms. One exception, stated in the file: Label reveals its word with an animated `clip-path`, because that is a reveal in place.
- **Two accessibility traps this round created and closed.** Initials' links would have been announced as "VW" and "SL", and Dropcap's would have been announced as "incent Wu" if the capital were simply hidden — both now carry a visually-hidden full name beside the visual composition, and the test asserts that every link's text begins with a whole name.
- Ghost's clip wraps the ornament only. Clipping the whole block would have clipped the names' hit-area pseudo-elements with it and quietly taken them under 44px.
- Every direction sits in the same 410px column as the paragraphs and the signature line.

## Verification

`node verify-credit-scale.mjs`, at 1440×1000 and 375×1000, in both themes: every direction renders and is the Magnetic master; the first screen with the credit stripped is identical across all five; exactly two links each, to the two supplied URLs, `target="_blank"` with `noopener`, no `[data-expand]`, and **each link's text begins with a whole name**; **anything set above 17px is either inside a link (part of a name) or inside something `aria-hidden` (decoration)** — the round's own premise, asserted; replay re-runs the entrance; `?v=` survives a reload; reduced motion has no running animation, Label is unclipped and Ghost still shows; axe clean of any credit element in light and dark; no console or page errors; no horizontal overflow. Evidence: `evidence/credit-scale/`.

That oversized-element assertion failed twice on my own wording before it was right: first it flagged a container that only passes its size down to a link, then an element sitting inside an `aria-hidden` wrapper rather than carrying the attribute itself. It now looks only at elements that actually set type on screen, and checks ancestors rather than the element alone.

The master's own `serious` contrast failure on `.chip > small` still appears on all ten passes, unchanged and unrelated.
