"use client";
/* PROTOTYPE harness. The picker's markup, styles, behaviour and keyboard
 * contract come from the prototype skill's PICKER.md and are not a design
 * decision. Expressed idiomatically for React (state + a keyed re-mount + a
 * layout effect for the highlight) rather than innerHTML, as PICKER.md allows. */
import { startTransition, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Arrival, Clause, Dateline, Ink, Seal } from "./variants";

/* Least of the slot to most: one clause on the master's own line, its own
   line, a centred end-mark, a sentence in the argument's voice, and the same
   line arriving a beat late. */
const VARIANTS = [
  { name: "Clause", render: Clause },
  { name: "Dateline", render: Dateline },
  { name: "Seal", render: Seal },
  { name: "Ink", render: Ink },
  { name: "Arrival", render: Arrival },
] as const;

export function Harness({ total }: { total: number }) {
  const [current, setCurrent] = useState(0);
  const [nonce, setNonce] = useState(0);
  const [ready, setReady] = useState(false);
  const items = useRef<(HTMLButtonElement | null)[]>([]);
  const [highlight, setHighlight] = useState({ left: 0, width: 0 });

  /* Selection persists across reload via ?v=, falling back to variant 1. Read
     after mount so server and client render the same first frame, and applied
     in a transition so it is not a synchronous cascade inside the effect. */
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
    <Variant key={`${current}-${nonce}`} total={total} />

    {/* PICKER.md's one sanctioned modification: the thing being judged sits at
        the bottom-centre of the screen, which is exactly where the pill lives,
        so the pill moves to the top instead of covering the work. */}
    <nav className="proto-picker" data-position="top" aria-label="Prototype variants" {...(ready ? { "data-ready": "" } : {})}>
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
