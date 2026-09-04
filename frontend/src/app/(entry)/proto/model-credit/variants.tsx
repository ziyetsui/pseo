"use client";
/* PROTOTYPE — the credit line on the model page's first screen. RESTORED.
 *
 * This is the round-four set that was reverted on 2026-09-04, rebuilt verbatim
 * at its own route. /proto/model-hero keeps round three's five heroes and its
 * still-open decision; nothing there was touched to bring this back.
 *
 * The hero is frozen at round three's Marquee in all five — the wordmark, the
 * facts line, the composer, the version links — and the credit sits directly
 * after the facts line, so the picker compares TREATMENT and nothing else.
 * Whichever treatment wins drops into any of round three's heroes; they all
 * have a facts line.
 *
 * The axis is how much weight a credit can carry before it steals the hero.
 * A credit is secondary information and hierarchy is subtraction, so the five
 * run from "metadata" to "second headline", and the last one is deliberately
 * over the line so you can see where the line is.
 *
 * Type: one display family (Instrument Serif), which puts the page at three —
 * Inter, Instrument Serif, system mono — the ceiling, not past it. It is
 * loaded from a CDN and is PROTOTYPE-ONLY; see the note in proto.css.
 */
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type { ProtoModel, ProtoPrompt } from "./Harness";

/* ── the credit ─────────────────────────────────────────────────────────────
 * The real handles, from docs/prototypes/task-l3/README-credit.md, where they
 * are recorded as supplied by the user: "Neither name appears anywhere in this
 * repository, so nothing here was inferred." These replace the placeholder the
 * first build carried. Same links, same rel, as the codebase uses for source
 * posts. */
const CREDIT = [
  { name: "Vincent Wu", url: "https://x.com/VincentWu11" },
  { name: "Steve Li", url: "https://x.com/st3v3li" },
] as const;

const linkProps = { target: "_blank", rel: "nofollow noopener noreferrer" } as const;

/* ── shared pieces ──────────────────────────────────────────────────────── */

const label = (kind: ProtoPrompt["kind"]) => (kind === "image" ? "Generate image" : kind === "video" ? "Generate video" : "Generate");
const n = (value: number) => value.toLocaleString("en-US");

function GenerateAction({ source, kind, size = "pri" }: { source: ProtoPrompt | null; kind: ProtoPrompt["kind"]; size?: "pri" | "big" }) {
  const text = label(source?.kind ?? kind);
  const cls = size === "big" ? "mh-gen mh-gen-big" : "mh-gen";
  if (source?.tryUrl) return <a className={cls} href={source.tryUrl}>{text}</a>;
  return <button className={cls} type="button" disabled title={source ? "No generation link is available for this prompt. Copy it into your model to run it." : "Pick a prompt below to start from — this page hands you the words, it does not run them."}>{text}</button>;
}

function useSubmitShortcut(onSubmit: () => void) {
  return (event: React.KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") { event.preventDefault(); onSubmit(); }
  };
}

function ShortcutHint() {
  const [modifier, setModifier] = useState("Ctrl");
  const onRef = useCallback((node: HTMLElement | null) => {
    if (node) setModifier(/Mac|iP(hone|ad|od)/.test(navigator.platform || navigator.userAgent) ? "⌘" : "Ctrl");
  }, []);
  return <kbd className="mh-kbd" ref={onRef}>{modifier}↵</kbd>;
}

function Versions({ model }: { model: ProtoModel }) {
  if (!model.members.length) return null;
  return <nav className="mh-versions" aria-label="Model versions">
    {model.members.map((member) => <a className="mh-version" href={member.href} key={member.id}>{member.label}</a>)}
  </nav>;
}

function DriftWall({ prompts }: { prompts: ProtoPrompt[] }) {
  const section = useRef<HTMLDivElement>(null);
  const lanes = useMemo(() => {
    const buckets: ProtoPrompt[][] = [[], [], [], []];
    prompts.forEach((prompt, i) => { buckets[i % 4]?.push(prompt); });
    return buckets.map((lane) => (lane.length ? [...lane, ...lane] : lane));
  }, [prompts]);

  useEffect(() => {
    const element = section.current;
    if (!element || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver((entries) => {
      element.toggleAttribute("data-paused", !entries[0]?.isIntersecting);
    }, { rootMargin: "100px" });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return <div className="mh-wallwrap" ref={section} aria-hidden="true">
    <div className="mh-drift-lanes">
      {lanes.map((lane, laneIndex) => <div className="mh-drift-lane" key={laneIndex} data-lane={laneIndex}>
        {lane.map((prompt, i) => <span className="mh-drift-tile" key={`${prompt.id}-${i}`}>
          {prompt.img
            ? <img src={prompt.img} alt="" width={300} height={300}
                loading={i < 3 ? "eager" : "lazy"} fetchPriority={i < 2 ? "high" : "auto"} referrerPolicy="no-referrer" />
            : <span className="mh-drift-word" lang={prompt.locale}>{prompt.title}</span>}
        </span>)}
      </div>)}
    </div>
    <div className="mh-drift-scrim" data-tone="centre" />
  </div>;
}

function Composer({ id, model }: { id: string; model: ProtoModel }) {
  const [text, setText] = useState("");
  const onKeyDown = useSubmitShortcut(() => {});
  return <form className="mh-plate mh-plate-centre" onSubmit={(event) => event.preventDefault()}>
    <label className="vh" htmlFor={id}>Your prompt</label>
    <textarea id={id} className="mh-box" rows={3} value={text} spellCheck={false}
      placeholder="Describe the image you want…" onChange={(event) => setText(event.target.value)} onKeyDown={onKeyDown} />
    <div className="mh-platefoot">
      <span className="mh-count">{text ? `${n(text.length)} characters` : `${model.total} prompts below`}</span>
      <span className="mh-sp" />
      <ShortcutHint />
      <GenerateAction source={null} kind="image" size="big" />
    </div>
  </form>;
}

/* The one hero, so the five differ only in the credit. */
function Hero({ model, prompts, credit, tone }: {
  model: ProtoModel; prompts: ProtoPrompt[]; credit: React.ReactNode; tone: string;
}) {
  const id = useId();
  return <section className="mh-hero mh-h-marquee" data-credit={tone}>
    <DriftWall prompts={prompts} />
    <div className="mh-front">
      <h1 className="mh-mark" lang={model.locale}>{model.label}</h1>
      <p className="mh-facts">{model.total} prompts · {model.members.length} versions · printed whole</p>
      {credit}
      <Composer id={`mh-box-${tone}-${id}`} model={model} />
      <Versions model={model} />
    </div>
  </section>;
}

type VariantProps = { model: ProtoModel; prompts: ProtoPrompt[] };

/* ══ V1 · Byline — credit as metadata ═══════════════════════════════════════
   The restrained answer, and the control: the credit joins the facts line's
   register — same mono, same size, same ink — and reads as one more true thing
   about the page rather than as a dedication. Motion is a 150ms colour and
   underline fade on the links, nothing else. */
function BylineCredit() {
  return <p className="mh-cr-byline">Credit to {CREDIT.map((person, i) => <span key={person.name}>
    {i > 0 && <span aria-hidden="true"> &amp; </span>}
    <a href={person.url} {...linkProps}>{person.name}</a>
  </span>)}</p>;
}
export function Byline({ model, prompts }: VariantProps) {
  return <Hero model={model} prompts={prompts} tone="byline" credit={<BylineCredit />} />;
}

/* ══ V2 · Colophon — credit as a printed imprint ════════════════════════════
   A book's colophon: a rule across the measure, a tracked mono label, and the
   names in the display serif at reading size. The rule does the announcing, so
   the type does not have to. Motion runs once on mount: the rule draws itself
   left to right (scaleX, transform-only), then the names rise 6px, staggered
   60ms. */
function ColophonCredit() {
  return <div className="mh-cr-colophon">
    <span className="mh-cr-rule" aria-hidden="true" />
    <p className="mh-cr-label">Credit to</p>
    <p className="mh-cr-names">{CREDIT.map((person, i) => <span className="mh-cr-name" key={person.name} style={{ "--i": i } as React.CSSProperties}>
      {i > 0 && <span className="mh-cr-amp" aria-hidden="true">&amp;</span>}
      <a href={person.url} {...linkProps}>{person.name}</a>
    </span>)}</p>
  </div>;
}
export function Colophon({ model, prompts }: VariantProps) {
  return <Hero model={model} prompts={prompts} tone="colophon" credit={<ColophonCredit />} />;
}

/* ══ V3 · Signature — credit as a gesture ═══════════════════════════════════
   The one you came back for. The names in the display serif's TRUE italic — a
   real italic file, not a slanted roman — at a size that reads as a signature
   under a plate. Each name carries a drawn stroke that sweeps out from the
   left on hover and on keyboard focus: scaleX on a wrapper, so it is
   transform-only and the irregular stroke keeps its shape. The link works with
   no pointer at all; the sweep is embellishment, never the affordance. */
function SignatureCredit() {
  /* The {" "} between flex children is deliberate: a whitespace-only text node
     is ignored by flex layout, so it changes nothing visually, but it lands in
     textContent and the accessibility tree. Without it the line is announced
     as "Credit toVincent Wu&Steve Li" — the gap is CSS, and CSS gaps are not
     word boundaries to a screen reader. */
  return <p className="mh-cr-signature">
    <span className="mh-cr-pre">Credit to</span>{" "}
    {CREDIT.map((person, i) => <span className="mh-cr-sig" key={person.name}>
      {i > 0 && <>{" "}<span className="mh-cr-amp" aria-hidden="true">&amp;</span>{" "}</>}
      <a href={person.url} {...linkProps}>
        <span className="mh-cr-sigtext">{person.name}</span>
        <span className="mh-cr-stroke" aria-hidden="true">
          <svg viewBox="0 0 120 8" preserveAspectRatio="none" focusable="false">
            <path d="M1 5.4C22 2.1 44 1.4 66 3.2c18 1.5 36 3.1 53 1.2" fill="none"
              stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          </svg>
        </span>
      </a>
    </span>)}
  </p>;
}
export function Signature({ model, prompts }: VariantProps) {
  return <Hero model={model} prompts={prompts} tone="signature" credit={<SignatureCredit />} />;
}

/* ══ V4 · Ribbon — motion is the medium ═════════════════════════════════════
   The credit is the only thing on this page that travels horizontally, which
   is exactly why it reads: the wall behind it moves vertically, so a
   left-drifting ribbon separates itself without needing size or colour.
   Tracked display caps, doubled and translated -100% for an exact loop. Under
   reduced motion it stops and centres — a stopped ribbon is still a credit. */
function RibbonCredit() {
  /* One label per pass, then the two names — repeating "Credit" before each
     name read as a stutter. Three passes fill a wide viewport without the loop
     point landing on screen. */
  const pass = ["Credit to", ...CREDIT.map((person) => person.name)];
  const run = [...pass, ...pass, ...pass];
  return <div className="mh-cr-ribbon">
    {/* The visible ribbon is decorative repetition; one accessible copy sits
        behind it so a screen reader hears the credit once, not six times. */}
    <p className="vh">Credit to {CREDIT.map((p) => p.name).join(" and ")}</p>
    <div className="mh-cr-track" aria-hidden="true">
      {[0, 1].map((copy) => <div className="mh-cr-run" key={copy}>
        {run.map((word, i) => <span className="mh-cr-cell" key={`${copy}-${i}`}>
          <span className={i % 3 === 0 ? "mh-cr-word" : "mh-cr-who"}>{word}</span>
          <span className="mh-cr-dash">—</span>
        </span>)}
      </div>)}
    </div>
    {/* The links live below the ribbon, because a moving target is not one. */}
    <p className="mh-cr-ribbonlinks">{CREDIT.map((person, i) => <span key={person.name}>
      {i > 0 && <span aria-hidden="true"> &amp; </span>}
      <a href={person.url} {...linkProps}>{person.name}</a>
    </span>)}</p>
  </div>;
}
export function Ribbon({ model, prompts }: VariantProps) {
  return <Hero model={model} prompts={prompts} tone="ribbon" credit={<RibbonCredit />} />;
}

/* ══ V5 · Duet — credit at headline scale ═══════════════════════════════════
   Deliberately over the line, so you can see where the line is. The two names
   are a second headline in the display serif, stacked, and hovering or
   focusing one lifts it 2px while the other drops to 40% — a pairing gesture
   that only works because there are exactly two. It is the only variant where
   the credit competes with the wordmark, which is either the point or the
   disqualification. */
function DuetCredit() {
  return <div className="mh-cr-duet">
    <p className="mh-cr-label">Credit to</p>
    <p className="mh-cr-pair">{CREDIT.map((person, i) => <span className="mh-cr-line" key={person.name}>
      <a className="mh-cr-big" href={person.url} {...linkProps}>{person.name}</a>
      {i === 0 && <span className="mh-cr-amp mh-cr-amp-duet" aria-hidden="true">&amp;</span>}
    </span>)}</p>
  </div>;
}
export function Duet({ model, prompts }: VariantProps) {
  return <Hero model={model} prompts={prompts} tone="duet" credit={<DuetCredit />} />;
}
