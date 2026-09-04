"use client";
/* PROTOTYPE — the credit on the L1 hub's first screen.
 *
 * The slot already exists. The L1 master ends screen one with
 *
 *   <p class="sig">35 prompts · every one credited · every one links to its source</p>
 *
 * and magnetic.css still carries the rule for it — 38px after the body, the
 * body's own 410px measure, 11.5px mono at --faint. components/Hub.tsx dropped
 * the markup and kept the CSS, so the designed slot is sitting empty. Every
 * variant below puts the credit in THAT slot rather than inventing a new one.
 *
 * The axis is how much of the slot the credit takes: from one more clause on
 * the master's own line, to its own composed object.
 *
 * Type: this screen already has a display voice — a 128px serif headline —
 * so the credit uses that same --font-serif rather than importing a fourth
 * family to compete with it. A distinct display face is a separate decision
 * and a one-line change if you want it.
 */
/* ── the credit ─────────────────────────────────────────────────────────────
 * Still not their X profiles. The only URL supplied so far turned out to be
 * pointing at this page, not at either person, so both links carry it as a
 * placeholder and nothing here invents a handle. Replace these two values and
 * all five variants are correct at once. */
const CREDIT = [
  { name: "Vincent Wu", url: "http://127.0.0.1:3000/zh-CN/prompts" },
  { name: "Steve Li", url: "http://127.0.0.1:3000/zh-CN/prompts" },
] as const;

const linkProps = { target: "_blank", rel: "noopener nofollow" } as const;

/* The master's own sig string, so a variant that keeps it keeps it verbatim. */
const facts = (total: number) => `${total} prompts · every one credited · every one links to its source`;

function Names({ className = "" }: { className?: string }) {
  return <>{CREDIT.map((person, i) => <span className={className} key={person.name}>
    {i > 0 && <span className="hc-amp" aria-hidden="true"> &amp; </span>}
    <a href={person.url} {...linkProps}>{person.name}</a>
  </span>)}</>;
}

/* Screen one, frozen. Byte-identical to components/Hub.tsx's argument section
   — the master says this string may not drift between variants — with only the
   .sig slot filled differently. */
export function ScreenOne({ sig }: { sig: React.ReactNode }) {
  return <section className="wrap argument">
    <h1>Somebody already wrote this</h1>
    <div className="body">
      <p>Every prompt in this library was published in the open by the person who wrote it, and then mostly lost — buried under a feed that is optimised for the next thing rather than the useful thing.</p>
      <p>So the whole of the work here is <em>not editing</em>. No paraphrase, no house style, no distillation into a template. The text you copy is the text they posted, down to the render settings at the end that look like noise and are not.</p>
      <p>What we add is the index, the attribution, and a link back. That is the entire product.</p>
    </div>
    {sig}
  </section>;
}

type VariantProps = { total: number };

/* ══ V1 · Clause — one more fact on the master's line ═══════════════════════
   The smallest possible answer, and the one the slot was drawn for: the
   master's sig string with the credit appended as a final clause, in the same
   mono, the same --faint ink, the same 410px measure. It reads as one more
   true thing about the page rather than as a dedication, which on a page whose
   argument is "we credit everyone" is arguably the only register that does not
   contradict itself. Motion: the underline on hover, nothing else. */
export function Clause({ total }: VariantProps) {
  return <ScreenOne sig={<p className="sig hc-clause">
    {facts(total)} · credit to <Names />
  </p>} />;
}

/* ══ V2 · Dateline — the credit gets its own line ═══════════════════════════
   A newspaper dateline: the facts stay on line one, a hairline separates, and
   the credit takes line two with the names lifted into the page's serif at
   reading size. The rule is what makes the second line legible as a different
   kind of statement — without it the two lines read as one wrapped sentence.
   Motion: the rule draws itself left to right once, on mount, transform-only. */
export function Dateline({ total }: VariantProps) {
  return <ScreenOne sig={<div className="sig hc-dateline">
    <p className="hc-facts">{facts(total)}</p>
    <span className="hc-rule" aria-hidden="true" />
    <p className="hc-credit">Credit to <Names className="hc-serif" /></p>
  </div>} />;
}

/* ══ V3 · Seal — an end-mark under the argument ═════════════════════════════
   A stamp at the end of a printed piece: centred, with two short rules
   reaching out from the names, and the label tracked out above them. It is
   the one variant that breaks the body's left alignment, and that break is
   the whole idea — the argument is a column, the seal closes it. Motion: the
   two rules grow outward from the centre as the names settle. */
export function Seal({ total }: VariantProps) {
  return <ScreenOne sig={<div className="sig hc-seal">
    <p className="hc-facts">{facts(total)}</p>
    <div className="hc-stamp">
      <span className="hc-wing" aria-hidden="true" />
      <span className="hc-stampinner">
        <span className="hc-label">Credit to</span>
        <span className="hc-names"><Names className="hc-serif" /></span>
      </span>
      <span className="hc-wing" aria-hidden="true" />
    </div>
  </div>} />;
}

/* ══ V4 · Ink — the credit joins the prose ══════════════════════════════════
   Not metadata at all: a closing line in the argument's own voice, at the
   body's 17px, with the names in the serif italic the body already uses for
   `not editing`. It is the largest the credit gets here and the most
   integrated — read straight through, the page ends on who made it. Motion:
   an underline sweeps out from the left on hover and on keyboard focus,
   transform-only, and the link works with no pointer at all. */
export function Ink({ total }: VariantProps) {
  return <ScreenOne sig={<div className="sig hc-ink">
    <p className="hc-line">Credit to {CREDIT.map((person, i) => <span className="hc-inkname" key={person.name}>
      {i > 0 && <span className="hc-amp" aria-hidden="true"> &amp; </span>}
      <a href={person.url} {...linkProps}>
        <span className="hc-inktext">{person.name}</span>
        <span className="hc-sweep" aria-hidden="true" />
      </a>
    </span>)}.</p>
    <p className="hc-facts hc-after">{facts(total)}</p>
  </div>} />;
}

/* ══ V5 · Arrival — time instead of space ══════════════════════════════════
   The master's sig line is left exactly as written, and the credit is not
   there when you land. It arrives a beat after the argument has settled —
   1.1s, one 380ms rise — so the first read is the argument and the second is
   who made it. It costs no layout at all, because the space is reserved from
   the first frame and only the ink fades in; nothing reflows under the reader.
   Under reduced motion it is simply present from the start. */
export function Arrival({ total }: VariantProps) {
  /* No JS: the row is in the DOM from the first frame and only its ink fades
     in, so nothing reflows under the reader and the delay is one CSS value. */
  return <ScreenOne sig={<div className="sig hc-arrival">
    <p className="hc-facts">{facts(total)}</p>
    <p className="hc-late">Credit to <Names className="hc-serif" /></p>
  </div>} />;
}
