# Model page first screen — Signature credit (selected)

Selected 2026-09-04 from `/proto/model-credit` (Byline · Colophon · **Signature** · Ribbon · Duet).
Standalone: `proto-model-signature.html` — open the file, no server and no build step.

## The decision

**Direction:** the page is signed. The two names in a display serif's *true italic*, inline
after a tracked mono `CREDIT TO`, with a drawn stroke that sweeps out from the left on hover
and on keyboard focus.

- Placement: directly after the hero's facts line, before the composer.
- Label: `CREDIT TO` — mono, `10.5px`, `letter-spacing: .22em`, uppercase, `--faint-fg`.
- Names: Instrument Serif italic, `clamp(24px, 2.8vw, 34px)`, `line-height: 1.1`, `letter-spacing: .002em`.
- Ampersand: same face, italic, `--faint-fg`.
- Row: flex, `align-items: baseline`, `gap: 10px`, wraps and centres.
- Stroke: 8px tall, `scaleX(0)` → `scaleX(1)`, `320ms cubic-bezier(.32, .72, 0, 1)`, transform only.
  Its own element, because a native `text-decoration` cannot be drawn on.
- Hit area: `min-height: 44px` on each name (measured 44).
- Links: `https://x.com/VincentWu11`, `https://x.com/st3v3li`, `rel="nofollow noopener noreferrer"`.

## Rejected, and why

| Direction | Why not |
| --- | --- |
| **Byline** | Correct but invisible — the credit joins the facts line's register exactly, so it reads as one more count rather than as people. The right answer if a credit is only a fact. |
| **Colophon** | A rule plus a small-caps label plus the names, stacked and centred. Reads well, but the entrance plays once and a returning visitor never sees the gesture again. |
| **Ribbon** | A full-bleed ticker. Most memorable, but a moving target is not a target, so the links had to sit still on a second row — the same credit twice on one screen. |
| **Duet** | The names at near-headline scale. Deliberately over the line: it competes with the wordmark, which is a hierarchy inversion on a page whose subject is the model, not the authors. |

## Things carried into the file

- Whitespace-only text nodes between the flex children. They change nothing visually — flex
  ignores them — but without them the line is announced as `Credit toVincent Wu&Steve Li`. A CSS
  gap is not a word boundary to a screen reader.
- The Generate button stays disabled with its reason. Generation depends on a real
  `actions.tryUrl` and a blank box has none; a hero button that lies is worse than one that explains.
- The wall pauses off-screen (IntersectionObserver) and freezes under `prefers-reduced-motion`.

## Open before this ships

1. **Typeface.** Instrument Serif is SIL OFL and loaded from the CDN here. Shipping it means the
   pipeline `public/fonts/README.md` documents: download both files, record the SHA-256, copy the
   OFL, serve from `/fonts`. Until then it is a prototype dependency.
2. **Wording.** "Credit to" on a page whose argument is that every prompt is credited to its author
   can read as *these two wrote the prompts*. If they built the site, `Site by` / `Built by` is more
   accurate. Not changed here — the words are the user's.
3. **Which hero.** `/proto/model-hero` still holds an open choice between Drift, Marquee, Ticker,
   Plaque and Corner. This credit was judged on Marquee and drops into any of them; they all have a
   facts line.
4. **Unverified here.** The hover / `:focus-visible` sweep could not be exercised in the harness —
   the preview pane never gives the document focus, so `:focus` itself does not match. The rules,
   the transition and the stroke's 139px layout width are verified; the trigger needs a real browser.
