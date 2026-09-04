"use client";
/* PROTOTYPE harness. The picker's markup, styles, behaviour and keyboard
 * contract come from the prototype skill's PICKER.md and are not a design
 * decision — it stays identical across projects so it always reads as chrome.
 * Expressed idiomatically for React (state + a keyed re-mount + a layout
 * effect for the highlight) rather than innerHTML, as PICKER.md allows. */
import { startTransition, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Byline, Colophon, Duet, Ribbon, Signature } from "./variants";

/* The catalog's kind is a four-member union, not a two-member one: narrowing it
   here made "text"/"other" prompts unrepresentable and the CTA would have had
   to guess a label for them, which frontend/AGENTS.md §7 forbids. */
export type ProtoKind = "image" | "video" | "text" | "other";
export type ProtoVariable = { token: string; label: string; defaultValue: string; options: string[] };
export type ProtoPrompt = {
  id: string; title: string; href: string; text: string;
  kind: ProtoKind; handle: string; img: string | null;
  likes: number | null; locale: string; models: string[]; tags: string[];
  variables: ProtoVariable[]; tryUrl: string | null;
};
export type ProtoModel = {
  label: string; locale: string; total: number; shortest: number; longest: number;
  members: { id: string; label: string; href: string }[];
};

/* Round four, restored. The hero is frozen at round three's Marquee in all
   five; only the credit treatment changes, so the picker compares that and
   nothing else. Signature is v=3, which is what this route exists to bring
   back. */
const VARIANTS = [
  { name: "Byline", render: Byline },
  { name: "Colophon", render: Colophon },
  { name: "Signature", render: Signature },
  { name: "Ribbon", render: Ribbon },
  { name: "Duet", render: Duet },
] as const;

export function Harness({ model, prompts }: { model: ProtoModel; prompts: ProtoPrompt[] }) {
  const [current, setCurrent] = useState(0);
  /* The keyed re-mount PICKER.md asks for: bumping it re-runs a variant's
     entrance without switching away from it. */
  const [nonce, setNonce] = useState(0);
  const [ready, setReady] = useState(false);
  const picker = useRef<HTMLElement>(null);
  const items = useRef<(HTMLButtonElement | null)[]>([]);
  const [highlight, setHighlight] = useState({ left: 0, width: 0 });

  /* Selection persists across reload via ?v=, falling back to variant 1. It is
     read after mount so the server and the client render the same first frame,
     and applied in a transition so the restore is not a cascading synchronous
     render inside the effect. */
  useEffect(() => {
    const value = parseInt(new URLSearchParams(window.location.search).get("v") ?? "", 10);
    if (value >= 1 && value <= VARIANTS.length) startTransition(() => setCurrent(value - 1));
  }, []);

  const measure = useCallback(() => {
    const element = items.current[current];
    if (element) setHighlight({ left: element.offsetLeft, width: element.offsetWidth });
  }, [current]);

  useLayoutEffect(() => { measure(); }, [measure]);
  useEffect(() => {
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);
  /* Enable the slide only after first paint, so load doesn't animate. */
  useEffect(() => { const id = requestAnimationFrame(() => requestAnimationFrame(() => setReady(true))); return () => cancelAnimationFrame(id); }, []);

  const setActive = useCallback((index: number) => {
    if (index < 0 || index >= VARIANTS.length) return;
    setCurrent(index);
    const url = new URL(window.location.href);
    url.searchParams.set("v", String(index + 1));
    window.history.replaceState(null, "", url);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const number = parseInt(event.key, 10);
      if (number >= 1 && number <= VARIANTS.length) setActive(number - 1);
      else if (event.key === "ArrowRight") setActive((current + 1) % VARIANTS.length);
      else if (event.key === "ArrowLeft") setActive((current - 1 + VARIANTS.length) % VARIANTS.length);
      else if (event.key === "r" || event.key === "R") setNonce((value) => value + 1);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [current, setActive]);

  const Variant = (VARIANTS[current] ?? VARIANTS[0]).render;

  return <>
    <Variant key={`${current}-${nonce}`} model={model} prompts={prompts} />

    <nav className="proto-picker" aria-label="Prototype variants" ref={picker} {...(ready ? { "data-ready": "" } : {})}>
      <span className="proto-picker-highlight" aria-hidden="true"
        style={{ width: highlight.width, transform: `translateX(${highlight.left}px)` }} />
      {VARIANTS.map((variant, index) => <button
        key={variant.name}
        ref={(element) => { items.current[index] = element; }}
        className="proto-picker-item"
        type="button"
        {...(index === current ? { "data-active": "", "aria-current": "true" as const } : {})}
        onClick={() => setActive(index)}
      >{variant.name}</button>)}
    </nav>
  </>;
}
