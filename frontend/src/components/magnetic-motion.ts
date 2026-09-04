/** Magnetic v2 equations from docs/wireframes/proto-continuous-peek.html.
 * React owns records; this disposable controller owns only transient motion/disclosure attributes.
 */
export function mountMagnetic(box: HTMLDivElement) {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const fine = matchMedia("(hover:hover) and (pointer:fine)");
  const buttons = [...box.querySelectorAll<HTMLButtonElement>("[data-expand]")];
  const abort = new AbortController();
  const options = { signal: abort.signal, passive: true };
  const step = 1000 / 60;
  let raf = 0, last = 0, acc = 0, hue = 0, onScreen = true, lastMove = 0;
  const pointer = { x: -9e5, y: -9e5, cx: -9e5, cy: -9e5, inside: false };
  let nodes: { el: HTMLButtonElement; cx: number; cy: number; x: number; y: number; vx: number; vy: number; near: number }[] = [];
  type Peek = { item: HTMLElement; el: HTMLElement; button: HTMLButtonElement; anchored: boolean; hover: boolean; x: number; y: number; vx: number; vy: number; scale: number; w: number; h: number };
  let peek: Peek | null = null;
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const delay = (fn: () => void, ms: number) => { const timer = setTimeout(() => { timers.delete(timer); fn(); }, ms); timers.add(timer); };
  function halt() { cancelAnimationFrame(raf); raf = 0; last = 0; acc = 0; }
  /** Compositor layers for every title are worth holding only while the field can run. */
  function live() { box.toggleAttribute("data-live", onScreen && fine.matches && !reduced.matches); }
  function measure() {
    buttons.forEach(el => { el.style.removeProperty("--fx"); el.style.removeProperty("--fy"); el.style.removeProperty("--near"); });
    nodes = buttons.map(el => { const r = el.getBoundingClientRect(); return { el, cx: r.left + scrollX + r.width / 2, cy: r.top + scrollY + r.height / 2, x: 0, y: 0, vx: 0, vy: 0, near: 0 }; });
  }
  function writePeek(p: Peek) {
    p.el.style.setProperty("--px", `${p.x.toFixed(1)}px`);
    p.el.style.setProperty("--py", `${p.y.toFixed(1)}px`);
    p.el.style.setProperty("--ps", p.scale.toFixed(3));
  }
  function anchored(p: Peek) {
    const r = p.button.getBoundingClientRect();
    p.x = Math.max(12, Math.min(r.left, innerWidth - p.w - 12));
    p.y = r.bottom + 10;
    if (p.y + p.h > innerHeight - 12) p.y = Math.max(12, r.top - p.h - 10);
    p.vx = p.vy = 0; p.scale = 1; writePeek(p);
  }
  function close() {
    if (!peek) return;
    const p = peek; peek = null;
    p.item.removeAttribute("data-peek"); p.button.setAttribute("aria-expanded", "false"); p.el.inert = true;
    delay(() => { if (peek?.item !== p.item) p.item.removeAttribute("data-open"); }, reduced.matches ? 0 : 170);
  }
  function wake() {
    if (!raf && !reduced.matches && !document.hidden && (onScreen || peek)) raf = requestAnimationFrame(frame);
  }
  function frame(now: number) {
    raf = 0;
    if (reduced.matches || document.hidden || (!onScreen && !peek)) return;
    acc = Math.min(acc + (last ? Math.min(64, now - last) : step), 100); last = now;
    let steps = 0; while (acc >= step) { acc -= step; steps++; }
    let busy = false;
    for (const n of nodes) {
      let tx = 0, ty = 0, near = 0;
      if (pointer.inside && fine.matches) {
        const dx = pointer.x - n.cx, dy = pointer.y - n.cy, d = Math.hypot(dx, dy);
        if (d < 220) { near = (1 - d / 220) ** 2; tx = dx / (d || 1) * near * 13; ty = dy / (d || 1) * near * 13 - near * 5; }
      }
      for (let k = 0; k < steps; k++) {
        n.near += (near - n.near) * .12;
        n.vx = (n.vx + (tx - n.x) * .055) * .86;
        n.vy = (n.vy + (ty - n.y) * .055) * .86;
        n.x += n.vx; n.y += n.vy;
      }
      if (Math.abs(n.vx) > .01 || Math.abs(n.vy) > .01 || Math.abs(n.x) > .05 || Math.abs(n.y) > .05 || Math.abs(near - n.near) > .005) busy = true;
      for (const [key, value] of [["--fx", `${Math.round(n.x * 20) / 20}px`], ["--fy", `${Math.round(n.y * 20) / 20}px`], ["--near", `${Math.round(n.near * 100) / 100}`]] as const) {
        if (n.el.style.getPropertyValue(key) !== value) n.el.style.setProperty(key, value);
      }
    }
    if (peek && !peek.anchored) {
      const p = peek, moving = now - lastMove < 450;
      let tx = p.x, ty = p.y;
      if (moving && !p.hover) {
        tx = pointer.cx + 26; ty = pointer.cy + 20;
        if (tx + p.w > innerWidth - 12) tx = pointer.cx - p.w - 22;
        if (ty + p.h > innerHeight - 12) ty = pointer.cy - p.h - 18;
        tx = Math.max(12, Math.min(tx, innerWidth - p.w - 12));
        ty = Math.max(12, Math.min(ty, innerHeight - p.h - 12));
      }
      for (let k = 0; k < steps; k++) {
        p.vx = (p.vx + (tx - p.x) * .05) * .82; p.vy = (p.vy + (ty - p.y) * .05) * .82;
        p.x += p.vx; p.y += p.vy; p.scale += (1 - p.scale) * .12;
      }
      writePeek(p);
      if (Math.abs(p.vx) > .02 || Math.abs(p.vy) > .02 || Math.abs(1 - p.scale) > .002 || moving) busy = true;
    }
    if (busy) wake();
  }
  box.addEventListener("click", event => {
    const target = event.target instanceof Element ? event.target.closest<HTMLButtonElement>("[data-expand]") : null;
    if (!target) return;
    if (peek?.button === target) { close(); return; }
    close();
    const item = target.parentElement!, el = item.querySelector<HTMLElement>(".exp")!;
    item.setAttribute("data-open", ""); target.setAttribute("aria-expanded", "true"); el.inert = false;
    const ink = `var(--ink-${hue++ % 6 + 1})`;
    target.style.setProperty("--ink", ink); target.setAttribute("data-inked", ""); el.style.setProperty("--ink", ink);
    const r = target.getBoundingClientRect(), viaPointer = event.detail > 0;
    const x = viaPointer ? event.clientX : r.left + r.width / 2, y = viaPointer ? event.clientY : r.top + r.height / 2;
    peek = { item, el, button: target, anchored: !viaPointer || !fine.matches || reduced.matches, hover: false, x: x - 30, y: y - 20, vx: 0, vy: 0, scale: .94, w: el.offsetWidth, h: el.offsetHeight };
    if (peek.anchored) anchored(peek); else writePeek(peek);
    const p = peek;
    delay(() => { if (peek === p) item.setAttribute("data-peek", ""); }, 16);
    wake();
  }, { signal: abort.signal });
  window.addEventListener("pointermove", event => {
    if (event.clientX !== pointer.cx || event.clientY !== pointer.cy) lastMove = performance.now();
    pointer.cx = event.clientX; pointer.cy = event.clientY; pointer.x = event.clientX + scrollX; pointer.y = event.clientY + scrollY; pointer.inside = true;
    if (peek) peek.hover = event.target instanceof Node && peek.el.contains(event.target);
    wake();
  }, options);
  document.addEventListener("pointerleave", () => { pointer.inside = false; wake(); }, options);
  document.addEventListener("click", event => {
    if (peek && event.target instanceof Element && !peek.el.contains(event.target) && !event.target.closest("[data-expand]")) close();
  }, { signal: abort.signal, capture: true });
  window.addEventListener("keydown", event => { if (event.key === "Escape" && peek) { const button = peek.button; close(); button.focus(); } }, { signal: abort.signal });
  box.addEventListener("focusin", event => { if (peek && event.target instanceof Node && peek.el.contains(event.target)) { peek.anchored = true; peek.vx = peek.vy = 0; } }, { signal: abort.signal });
  // Scroll updates document coordinates; anchored peeks close rather than detach from their title.
  window.addEventListener("scroll", () => { pointer.x = pointer.cx + scrollX; pointer.y = pointer.cy + scrollY; if (peek?.anchored) close(); wake(); }, options);
  document.addEventListener("visibilitychange", () => document.hidden ? halt() : wake(), options);
  const changed = () => { halt(); measure(); live(); if (peek) { peek.anchored = reduced.matches || !fine.matches; anchored(peek); } wake(); };
  reduced.addEventListener("change", changed, options); fine.addEventListener("change", changed, options);
  const resize = new ResizeObserver(() => { measure(); if (peek) { peek.w = peek.el.offsetWidth; peek.h = peek.el.offsetHeight; anchored(peek); } wake(); });
  resize.observe(box);
  const visibility = new IntersectionObserver(entries => { onScreen = entries.some(entry => entry.isIntersecting); live(); if (onScreen || peek) wake(); else halt(); }, { rootMargin: "120px" });
  visibility.observe(box); measure(); live(); wake();
  return () => { abort.abort(); halt(); resize.disconnect(); visibility.disconnect(); timers.forEach(clearTimeout); box.removeAttribute("data-live"); };
}
