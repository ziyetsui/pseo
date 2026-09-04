"use client";
/* PROTOTYPE — round three, on top of Drift.
 *
 * Two things are fixed, because you settled them: the backdrop is Drift's
 * moving wall, and the body below the fold is the real Anthology page (mounted
 * by page.tsx, not imitated here). So these five are FIRST SCREENS ONLY, and
 * they diverge on the one thing still open — how the hero composes itself over
 * a wall that is already moving.
 *
 * Your note on the screenshot drives the copy: lead with the wordmark, cut the
 * rest. Drift keeps round two's three-line hero as the reference so you can
 * see what the cut buys; the other four are the cut, at four different
 * settings.
 *
 * Carried rules: Generate is a real link when a runnable destination exists
 * and a real disabled button with the reason when it does not; text never sits
 * directly on a photograph; nothing dims that the user needs to read.
 *
 * The composer's "model version" control was a radio group that changed
 * nothing — a dead control since round one. The three versions are sibling
 * pages, so they are links, and they go where the real page's
 * .model-versions pills go.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ProtoModel, ProtoPrompt } from "./Harness";

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

/* The modifier is a client-only fact. Read in a ref callback rather than an
   effect, so it lands with the first commit and never as a setState cascade. */
function ShortcutHint() {
  const [modifier, setModifier] = useState("Ctrl");
  const onRef = useCallback((node: HTMLElement | null) => {
    if (node) setModifier(/Mac|iP(hone|ad|od)/.test(navigator.platform || navigator.userAgent) ? "⌘" : "Ctrl");
  }, []);
  return <kbd className="mh-kbd" ref={onRef}>{modifier}↵</kbd>;
}

/* The three family members are sibling pages, so they are links — the same
   destination the real page's .model-versions pills carry. */
function Versions({ model }: { model: ProtoModel }) {
  if (!model.members.length) return null;
  return <nav className="mh-versions" aria-label="Model versions">
    {model.members.map((member) => <a className="mh-version" href={member.href} key={member.id}>{member.label}</a>)}
  </nav>;
}

/* Drift's wall, extracted so all five sit on the same backdrop. Four lanes at
   four speeds; transform only; `will-change` on the lanes and nothing else;
   paused off-screen by IntersectionObserver; frozen under reduced motion. The
   loop is a CSS animation, so not one frame of it goes through React. */
function DriftWall({ prompts, tone = "centre" }: { prompts: ProtoPrompt[]; tone?: "centre" | "even" | "left" }) {
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
    <div className="mh-drift-scrim" data-tone={tone} />
  </div>;
}

/* The composer. One shape, so the five are compared on the hero around it and
   not on five different boxes. */
function Composer({ id, rows, placeholder, facts, className = "" }: {
  id: string; rows: number; placeholder: string; facts: string; className?: string;
}) {
  const [text, setText] = useState("");
  const onKeyDown = useSubmitShortcut(() => {});
  return <form className={`mh-plate ${className}`} onSubmit={(event) => event.preventDefault()}>
    <label className="vh" htmlFor={id}>Your prompt</label>
    <textarea id={id} className="mh-box" rows={rows} value={text} spellCheck={false}
      placeholder={placeholder} onChange={(event) => setText(event.target.value)} onKeyDown={onKeyDown} />
    <div className="mh-platefoot">
      <span className="mh-count">{text ? `${n(text.length)} characters` : facts}</span>
      <span className="mh-sp" />
      <ShortcutHint />
      <GenerateAction source={null} kind="image" size="big" />
    </div>
  </form>;
}

type VariantProps = { model: ProtoModel; prompts: ProtoPrompt[] };

/* ══ V1 · Drift — round two's hero, unchanged ═══════════════════════════════
   The reference. Eyebrow, a sentence for a headline, a lede, then the box —
   three blocks of copy before the thing you came to use. Kept as-is so the
   four cuts below are measured against something, not remembered. */
export function Drift({ model, prompts }: VariantProps) {
  return <section className="mh-hero mh-h-drift">
    <DriftWall prompts={prompts} />
    <div className="mh-front">
      <p className="eyebrow">Model family · {model.total} prompts</p>
      <h1 className="mh-drift-h1">There is always another <span lang={model.locale}>{model.label}</span> frame.</h1>
      <p className="lede mh-drift-lede">{model.total} prompts published for this family so far, every one of them somebody&rsquo;s post.</p>
      <Composer id="mh-drift-box" rows={3} className="mh-plate-centre"
        placeholder="Describe the image you want…" facts={`${model.total} prompts below`} />
    </div>
  </section>;
}

/* ══ V2 · Marquee — the wordmark, and nothing else ══════════════════════════
   The cut taken all the way: no eyebrow sentence, no lede, no claim about the
   model at all. The name at display size, one mono line of countable fact
   under it, then the box. Everything the other heroes were saying is either
   visible behind it or printed below it. */
export function Marquee({ model, prompts }: VariantProps) {
  return <section className="mh-hero mh-h-marquee">
    <DriftWall prompts={prompts} />
    <div className="mh-front">
      <h1 className="mh-mark" lang={model.locale}>{model.label}</h1>
      <p className="mh-facts">{model.total} prompts · {model.members.length} versions · printed whole</p>
      <Composer id="mh-marquee-box" rows={3} className="mh-plate-centre"
        placeholder="Describe the image you want…" facts={`${model.total} prompts below`} />
      <Versions model={model} />
    </div>
  </section>;
}

/* ══ V3 · Ticker — the hero is one line ═════════════════════════════════════
   The name, the count and the three versions collapse into a single rule-top
   line, and everything the hero saved goes to the box, which is the tallest
   here. The wall keeps the most screen of any variant because the copy takes
   the least. For a page people come back to, the name is a label, not an
   announcement. */
export function Ticker({ model, prompts }: VariantProps) {
  return <section className="mh-hero mh-h-ticker">
    <DriftWall prompts={prompts} tone="even" />
    <div className="mh-front">
      <div className="mh-tickerline">
        <h1 className="mh-ticker-name" lang={model.locale}>{model.label}</h1>
        <span className="mh-ticker-count">{model.total} prompts</span>
        <span className="mh-sp" />
        <Versions model={model} />
      </div>
      <Composer id="mh-ticker-box" rows={5} className="mh-plate-wide"
        placeholder="Describe the image you want…" facts={`${model.total} prompts below · ${model.members.length} versions`} />
    </div>
  </section>;
}

/* ══ V4 · Plaque — title and box are one object ═════════════════════════════
   Every other variant floats two things on the wall: a headline and a plate.
   Here the name is the plate's own heading, inside its surface, so exactly one
   object sits on the moving picture. It is the quietest of the five and the
   only one where the hero has no silhouette of its own to get wrong. */
export function Plaque({ model, prompts }: VariantProps) {
  return <section className="mh-hero mh-h-plaque">
    <DriftWall prompts={prompts} />
    <div className="mh-front">
      <div className="mh-plaque">
        <div className="mh-plaque-head">
          <h1 className="mh-plaque-name" lang={model.locale}>{model.label}</h1>
          <span className="mh-plaque-fact">{model.total} prompts, printed whole</span>
        </div>
        <Composer id="mh-plaque-box" rows={4} className="mh-plate-flush"
          placeholder="Describe the image you want…" facts={`${model.members.length} versions in this family`} />
        <Versions model={model} />
      </div>
    </div>
  </section>;
}

/* ══ V5 · Corner — the wall gets the middle ═════════════════════════════════
   Name pinned to the top-left, box to the bottom-left, and the whole diagonal
   between them left to the moving wall. It is the only variant that spends a
   full viewport on the first screen, and the only one where the pictures are
   the centre of the composition rather than the background of it. */
export function Corner({ model, prompts }: VariantProps) {
  return <section className="mh-hero mh-h-corner">
    <DriftWall prompts={prompts} tone="left" />
    <div className="mh-front">
      <div className="mh-corner-top">
        <h1 className="mh-mark mh-corner-name" lang={model.locale}>{model.label}</h1>
        <p className="mh-facts">{model.total} prompts</p>
      </div>
      <div className="mh-corner-bottom">
        <Composer id="mh-corner-box" rows={3} className="mh-plate-corner"
          placeholder="Describe the image you want…" facts={`${model.total} prompts below`} />
        <Versions model={model} />
      </div>
    </div>
  </section>;
}
