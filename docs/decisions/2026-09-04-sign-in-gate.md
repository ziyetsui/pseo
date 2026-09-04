# Sign-in gate — decided from `docs/wireframes/proto-login-cta.html`

Three prototype rounds, 16 directions. Chosen: **Weight** — one real number,
very large, sized to its own digit count, with the sentence continuing out of
it. The number is the volume of prompt text the reader has not got to yet.

## What shipped

- Component `frontend/src/components/SignInGate.tsx`, policy
  `frontend/src/lib/cta/sign-in-gate.ts`, styles
  `frontend/src/styles/sign-in-gate.css`, tests
  `frontend/tests/sign-in-gate.test.ts`.
- Values: depth 45% **of the list** · dwell 600 ms · time floor 20 s · once per
  session · 7 days quiet after a dismissal · 90 days after a click through to
  bo · scrim blur 8 px · enter 250 ms `cubic-bezier(.23,1,.32,1)`, fade only.
- Destination `https://bo.video/home` — the one already shipped in Recipe
  step 04, not a new URL.

## The two decisions that changed the plan

**1. The gate is not attached to any Generate button.** On the hub, the deck
and the anthologies, "Generate image / Generate video" is `href={prompt.href}`
— it navigates *into* the library. The only click in the product that is an
attempt to generate is the one in Recipe step 04, and it already goes to bo.
Gating the browse buttons would interrupt navigation on a click carrying no
generate intent; gating the Recipe one would put a modal in front of the
single highest-intent action in the product, where bo's own sign-in already
stands. So the gate is attached to reading, not to pressing.

**2. It is self-limiting by markup, not by a route allowlist.** It measures
`[data-lg-row]` and does nothing where there are none, which is why Recipe,
the blog and the directories need no opt-out and cannot be forgotten when a
route is added.

## Rejected, with the reason

- **Round 1 — Ledge** (sticky bottom bar): permanently spends ~72 px of the
  fold on every page for the least memorable of the five.
- **Round 1 — Seam** (a paragraph inside the library): measured a 27 px rag on
  both sides of the break in the hub's justified paragraph, and it is trivially
  scrolled past.
- **Round 1 — Threshold** (cut the document): withholds real content and
  removed 19 of 35 titles from the tab order. Incompatible with "free to read".
- **Round 1 — Margin** (corner card): smallest footprint, smallest effect.
- **Round 2 — Receipt / Takeover / Anchor / Queue**: all four read well; Weight
  won because its number is the only one that grows with the catalogue instead
  of shrinking into it — "16 left" is weak at 4,500 prompts, "1,341,904
  characters" is not.
- **Round 3 — Tally** (one mark per prompt): stops being a count and becomes a
  bar past ~300 records.
- **Round 3 — Names** (the real handles): needs many authors; collapses when a
  filter leaves two.
- **Round 3 — Ascent** (a counter that flies in): the only direction with
  motion continuity, rejected because it parks something on screen for the
  whole visit — the exact cost this brief was trying to avoid.
- **Percent / fraction framing** was cut during round 3: it converged with
  Count and taught nothing new in the picker.

## Known limits, carried forward

- On the **hub** the whole 35-title paragraph crosses the fold within one
  screen, so `passed` saturates and the gate almost always shows its
  end-of-list face ("… and that is the whole of this list"). The "still
  unread" face is what appears on the anthology, style and task surfaces.
  Verified on both.
- The **deck** publishes its position as `data-lg-current` because it advances
  without scrolling. Untested against a real deck session.
- **"Free"** is the one assertion in the copy that is not computed. It needs
  the content owner's confirmation, and it is load-bearing.
- The reading rate (250 wpm) is the only estimate, and it is stated in the
  copy rather than hidden in it. The word count itself is exact.
