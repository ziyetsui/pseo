/** L1 depth field: the title run flies toward the reader like a starfield.
 * Hover or focus racks focus onto one title and the field slows to a stop; a click opens the
 * existing fixed peek anchored to that title. React owns records; this disposable controller
 * owns only transient motion/disclosure attributes. Reduced motion keeps the plain paragraph.
 */
type Node = { el: HTMLButtonElement; x: number; y: number; z: number; w: number; h: number; tier: number; t: string; o: string; zi: string };
type Seed = { x: number; y: number; z: number };

// Titles keep their place in space when "show more" remounts the controller.
const seeds = new WeakMap<HTMLButtonElement, Seed>();
const FOCUS_REST = .62;
const SPEED = .032; // depth units per second; a title crosses the field in ~31s

const smooth = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
/** Spawn off the optical axis: titles born near the centre all converge on one spot and stack. */
const spawn = (): Seed => {
  const a = Math.random() * Math.PI * 2, r = .2 + Math.sqrt(Math.random()) * .8;
  return { x: Math.cos(a) * r, y: Math.sin(a) * r, z: Math.random() };
};

export function mountDepth(box: HTMLDivElement) {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const fine = matchMedia("(hover:hover) and (pointer:fine)");
  const field = box.querySelector<HTMLElement>(".run")!;
  const buttons = [...box.querySelectorAll<HTMLButtonElement>("[data-expand]")];
  const abort = new AbortController();
  const options = { signal: abort.signal, passive: true };
  let raf = 0, last = 0, hue = 0, onScreen = true, W = 0, H = 0, fit = 1;
  let speed = 1, focus = FOCUS_REST, mx = 0, my = 0, smx = 0, smy = 0;
  let hovered: HTMLButtonElement | null = null, focused: HTMLButtonElement | null = null, marked: HTMLButtonElement | null = null;
  let nodes: Node[] = [];
  type Peek = { item: HTMLElement; el: HTMLElement; button: HTMLButtonElement; w: number; h: number };
  let peek: Peek | null = null;
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const delay = (fn: () => void, ms: number) => { const timer = setTimeout(() => { timers.delete(timer); fn(); }, ms); timers.add(timer); };

  const isLive = () => !reduced.matches;
  /** The one title the camera holds: an open peek wins, then hover, then keyboard focus. */
  const held = () => peek?.button ?? hovered ?? focused;

  function halt() { cancelAnimationFrame(raf); raf = 0; last = 0; }
  function clear() {
    buttons.forEach(el => { el.style.removeProperty("transform"); el.style.removeProperty("opacity"); el.style.removeProperty("z-index"); el.removeAttribute("data-tier"); el.removeAttribute("data-held"); });
    marked = null;
  }
  function measure() {
    W = field.clientWidth; H = field.clientHeight;
    // Narrow screens shrink the whole field so long titles still read as separate lines.
    fit = Math.min(1, W / 1100) ** .35;
    nodes = buttons.map(el => {
      let seed = seeds.get(el);
      if (!seed) { seed = spawn(); seeds.set(el, seed); }
      return { el, ...seed, w: el.offsetWidth, h: el.offsetHeight, tier: -1, t: "", o: "", zi: "" };
    });
  }
  function live() {
    const on = isLive();
    box.toggleAttribute("data-depth", on);
    if (!on) clear();
  }
  function wake() {
    if (!raf && isLive() && !document.hidden && onScreen) raf = requestAnimationFrame(frame);
  }
  function anchor(p: Peek) {
    const r = p.button.getBoundingClientRect();
    const x = Math.max(12, Math.min(r.left, innerWidth - p.w - 12));
    let y = r.bottom + 10;
    if (y + p.h > innerHeight - 12) y = Math.max(12, r.top - p.h - 10);
    p.el.style.setProperty("--px", `${x.toFixed(1)}px`);
    p.el.style.setProperty("--py", `${y.toFixed(1)}px`);
    p.el.style.setProperty("--ps", "1");
  }
  function close() {
    if (!peek) return;
    const p = peek; peek = null;
    p.item.removeAttribute("data-peek"); p.button.setAttribute("aria-expanded", "false"); p.el.inert = true;
    delay(() => { if (peek?.item !== p.item) p.item.removeAttribute("data-open"); }, reduced.matches ? 0 : 170);
    wake();
  }
  function frame(now: number) {
    raf = 0;
    if (!isLive() || document.hidden || !onScreen) return;
    const dt = last ? Math.min(.064, (now - last) / 1000) : 1 / 60; last = now;
    const hold = held();
    if (hold !== marked) { marked?.removeAttribute("data-held"); hold?.setAttribute("data-held", ""); marked = hold; }
    const holdNode = hold ? nodes.find(n => n.el === hold) : undefined;
    // Brake quickly when something is held, pick back up gently.
    speed += ((holdNode ? 0 : 1) - speed) * (1 - Math.exp(-(holdNode ? 7 : 2.5) * dt));
    if (holdNode && speed < .003) speed = 0;
    focus += ((holdNode ? holdNode.z : FOCUS_REST) - focus) * (1 - Math.exp(-9 * dt));
    const k = 1 - Math.exp(-3 * dt);
    // Parallax pauses with the field, so the held title sits still under the pointer.
    if (!holdNode) { smx += (mx - smx) * k; smy += (my - smy) * k; }
    for (const n of nodes) {
      n.z += SPEED * speed * dt;
      if (n.z > 1) { const s = spawn(); n.x = s.x; n.y = s.y; n.z -= 1; }
      const seed = seeds.get(n.el); if (seed) { seed.x = n.x; seed.y = n.y; seed.z = n.z; }
      const z = n.z, zz = z * z;
      const spread = .22 + zz * 1.05, sc = (.32 + zz * 1.45) * fit;
      const px = W / 2 + n.x * W * .56 * spread - smx * zz * 70 - n.w * sc / 2;
      const py = H / 2 + n.y * H * .6 * spread - smy * zz * 45 - n.h * sc / 2;
      const t = `translate3d(${px.toFixed(1)}px,${py.toFixed(1)}px,0) scale(${sc.toFixed(3)}) scale(var(--press))`;
      const o = (smooth(0, .18, z) * (1 - smooth(.86, 1, z)) * (.35 + .65 * Math.min(1, z * 1.6))).toFixed(2);
      const zi = String(1 + Math.round(z * 50));
      if (t !== n.t) { n.t = t; n.el.style.transform = t; }
      if (o !== n.o) { n.o = o; n.el.style.opacity = o; }
      if (zi !== n.zi) { n.zi = zi; n.el.style.zIndex = zi; }
      const dz = Math.abs(z - focus);
      const tier = n.el === hold ? 0 : dz < .1 ? 0 : dz < .22 ? 1 : dz < .38 ? 2 : 3;
      if (tier !== n.tier) { n.tier = tier; n.el.dataset.tier = String(tier); }
    }
    wake();
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
    const p: Peek = { item, el, button: target, w: el.offsetWidth, h: el.offsetHeight };
    peek = p; anchor(p);
    delay(() => { if (peek === p) item.setAttribute("data-peek", ""); }, 16);
    wake();
  }, { signal: abort.signal });
  box.addEventListener("pointerover", event => {
    if (!fine.matches || !(event.target instanceof Element)) return;
    const target = event.target.closest<HTMLButtonElement>("[data-expand]");
    if (target && target !== hovered) { hovered = target; wake(); }
  }, options);
  box.addEventListener("pointerout", event => {
    if (!hovered || !(event.target instanceof Element)) return;
    const to = event.relatedTarget instanceof Element ? event.relatedTarget.closest("[data-expand]") : null;
    if (to !== hovered) { hovered = null; wake(); }
  }, options);
  box.addEventListener("focusin", event => {
    const target = event.target instanceof Element ? event.target.closest<HTMLButtonElement>("[data-expand]") : null;
    if (target) { focused = target; wake(); }
  }, { signal: abort.signal });
  box.addEventListener("focusout", () => { focused = null; wake(); }, { signal: abort.signal });
  window.addEventListener("pointermove", event => {
    mx = event.clientX / innerWidth * 2 - 1; my = event.clientY / innerHeight * 2 - 1;
  }, options);
  document.addEventListener("click", event => {
    if (peek && event.target instanceof Element && !peek.el.contains(event.target) && !event.target.closest("[data-expand]")) close();
  }, { signal: abort.signal, capture: true });
  window.addEventListener("keydown", event => { if (event.key === "Escape" && peek) { const button = peek.button; close(); button.focus(); } }, { signal: abort.signal });
  // The peek is anchored to a title; scrolling detaches it, so it closes.
  window.addEventListener("scroll", () => { if (peek) close(); }, options);
  document.addEventListener("visibilitychange", () => document.hidden ? halt() : wake(), options);
  const changed = () => { halt(); live(); measure(); if (peek) anchor(peek); wake(); };
  reduced.addEventListener("change", changed, options);
  const resize = new ResizeObserver(() => { measure(); for (const n of nodes) n.t = ""; if (peek) { peek.w = peek.el.offsetWidth; peek.h = peek.el.offsetHeight; anchor(peek); } wake(); });
  resize.observe(field);
  const visibility = new IntersectionObserver(entries => { onScreen = entries.some(entry => entry.isIntersecting); if (onScreen) wake(); else halt(); }, { rootMargin: "120px" });
  visibility.observe(box);
  live(); measure(); wake();
  return () => { abort.abort(); halt(); resize.disconnect(); visibility.disconnect(); timers.forEach(clearTimeout); clear(); box.removeAttribute("data-depth"); };
}
