/** Ocean current from the owner-selected Prompt Cloud artifact (buildCurrent).
 * Its velocity field, pointer vortex, streamline trails, rotation and soft separation are retained.
 * React owns content; this disposable controller owns motion and the existing anchored peek.
 * Hover/focus/open titles are pinned while their neighbours keep flowing. */
type CurrentNode = { el: HTMLButtonElement; x: number; y: number; w: number; h: number; rot: number; transform: string };
type Seed = { x: number; y: number; rot: number; width: number; height: number };
const seeds = new WeakMap<HTMLButtonElement, Seed>();
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, Math.max(min, max)));

export function mountCurrent(box: HTMLDivElement) {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const fine = matchMedia("(hover:hover) and (pointer:fine)");
  const field = box.querySelector<HTMLElement>(".run")!;
  const buttons = [...box.querySelectorAll<HTMLButtonElement>("[data-expand]")];
  const canvas = box.querySelector<HTMLCanvasElement>(".current-streamlines")!;
  const context = canvas.getContext("2d");
  const abort = new AbortController();
  const options = { signal: abort.signal, passive: true };
  let raf = 0, last = 0, hue = 0, onScreen = true, W = 0, H = 0, time = 0;
  let pointerX = -1e4, pointerY = -1e4;
  let particles: {x: number; y: number; age: number}[] = [];
  let ink = "#c9c7c1";
  let hovered: HTMLButtonElement | null = null, focused: HTMLButtonElement | null = null;
  let nodes: CurrentNode[] = [];
  type Peek = { item: HTMLElement; el: HTMLElement; button: HTMLButtonElement; w: number; h: number };
  let peek: Peek | null = null;
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const delay = (fn: () => void, ms: number) => { const timer = setTimeout(() => { timers.delete(timer); fn(); }, ms); timers.add(timer); };

  const isLive = () => !reduced.matches;
  /** Every title being read is pinned; moving neighbours separate around it. */
  const pinned = (node: CurrentNode) => node.el === peek?.button || node.el === hovered || node.el === focused;

  function halt() { cancelAnimationFrame(raf); raf = 0; last = 0; }
  function clear() {
    field.style.removeProperty("--current-height");
    buttons.forEach(el => { el.style.removeProperty("transform"); el.style.removeProperty("opacity"); el.style.removeProperty("z-index"); el.removeAttribute("data-tier"); el.removeAttribute("data-held"); });
  }
  function measure() {
    W = field.clientWidth;
    const metrics = buttons.map(el => ({el, w: el.offsetWidth, h: el.offsetHeight}));
    if (isLive()) {
      // Reserve room for real title lengths on narrow screens, rather than stacking 54 lines.
      const area = metrics.reduce((sum, node) => sum + (node.w + 18) * (node.h + 12), 0);
      const minimum = Math.max(480, Math.min(1100, innerHeight - 200));
      field.style.setProperty("--current-height", `${Math.ceil(Math.max(minimum, area / Math.max(1, W * .68)))}px`);
    } else field.style.removeProperty("--current-height");
    H = field.clientHeight;
    const columns = Math.max(1, Math.floor(W / 260)), rows = Math.max(1, Math.ceil(buttons.length / columns));
    nodes = metrics.map(({el, w, h}, index) => {
      const seed = seeds.get(el);
      const x = seed ? seed.x / Math.max(1, seed.width) * W : (index % columns + .5) / columns * W;
      // Revealing more titles grows the field without relocating existing titles.
      const y = seed ? seed.width === W ? seed.y : seed.y / Math.max(1, seed.height) * H : (Math.floor(index / columns) + .5) / rows * H;
      return {el, x, y, rot: seed?.rot ?? 0, w, h, transform: ""};
    });
    const dpr = Math.min(2, devicePixelRatio || 1);
    // Decorative trails use a bounded backing store even when the title field grows.
    canvas.width = Math.max(1, Math.min(4096, Math.round(W * dpr)));
    canvas.height = Math.max(1, Math.min(4096, Math.round(H * dpr), Math.floor(4194304 / canvas.width)));
    context?.setTransform(canvas.width / Math.max(1, W), 0, 0, canvas.height / Math.max(1, H), 0, 0);
    ink = getComputedStyle(box).color;
    particles = Array.from({length: Math.min(360, Math.round(W * H / 3200))}, () => ({x: Math.random() * W, y: Math.random() * H, age: Math.random() * 4}));
    if (isLive()) paintNodes();
  }
  function live() {
    const on = isLive();
    box.toggleAttribute("data-current", on);
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
  function paintNodes() {
    for (const node of nodes) {
      const transform = `translate3d(${(node.x - node.w / 2).toFixed(1)}px,${(node.y - node.h / 2).toFixed(1)}px,0) rotate(${node.rot.toFixed(3)}rad) scale(var(--press))`;
      if (transform !== node.transform) { node.el.style.transform = transform; node.transform = transform; }
      if (W && H) seeds.set(node.el, {x: node.x, y: node.y, rot: node.rot, width: W, height: H});
    }
  }
  function velocity(x: number, y: number): [number, number] {
    const angle = Math.sin(x * .0042 + time * .21) * 1.3 + Math.cos(y * .0065 - time * .17) * 1.1 + Math.sin((x + y) * .0021 + time * .09);
    let vx = (Math.cos(angle) * .75 + .55) * 26, vy = Math.sin(angle) * .75 * 26;
    const dx = x - pointerX, dy = y - pointerY, distance = Math.hypot(dx, dy);
    if (distance < 190 && distance > 1) { const force = (1 - distance / 190) * 150; vx -= dy / distance * force; vy += dx / distance * force; }
    return [vx, vy];
  }
  function drawTrails(dt: number) {
    if (!context) return;
    context.globalCompositeOperation = "destination-out";
    // The original 7%/frame fade, normalized for display refresh rate.
    context.fillStyle = `rgba(0,0,0,${1 - Math.pow(.93, dt * 60)})`; context.fillRect(0, 0, W, H);
    context.globalCompositeOperation = "source-over";
    context.strokeStyle = ink; context.globalAlpha = .16; context.lineWidth = 1;
    context.beginPath();
    for (const particle of particles) {
      const [vx, vy] = velocity(particle.x, particle.y);
      const x = particle.x + vx * dt * 1.6, y = particle.y + vy * dt * 1.6;
      context.moveTo(particle.x, particle.y); context.lineTo(x, y);
      particle.x = x; particle.y = y; particle.age += dt;
      if (particle.age > 4 || x > W || x < 0 || y < 0 || y > H) { particle.x = Math.random() * W; particle.y = Math.random() * H; particle.age = 0; }
    }
    context.stroke(); context.globalAlpha = 1;
  }
  function frame(now: number) {
    raf = 0;
    if (!isLive() || document.hidden || !onScreen) return;
    const dt = last ? Math.min(.05, (now - last) / 1000) : 1 / 60; last = now; time += dt;
    drawTrails(dt);
    for (const node of nodes) {
      node.el.toggleAttribute("data-held", pinned(node));
      if (pinned(node)) continue;
      const [vx, vy] = velocity(node.x, node.y);
      node.x += vx * dt; node.y += vy * dt;
      const target = clamp(Math.atan2(vy, vx), -.14, .14);
      node.rot += (target - node.rot) * (1 - Math.exp(-3 * dt));
      if (node.x - node.w / 2 > W) node.x = -node.w / 2; else if (node.x + node.w / 2 < 0) node.x = W + node.w / 2;
      if (node.y > H + 20) node.y = -20; else if (node.y < -20) node.y = H + 20;
    }
    // Sweep by y avoids testing every possible pair as readers reveal more titles.
    const ordered = [...nodes].sort((a, b) => a.y - b.y);
    const band = Math.max(34, ...nodes.map(node => node.h + 12));
    for (let i = 0; i < ordered.length; i++) for (let j = i + 1; j < ordered.length; j++) {
      const a = ordered[i], b = ordered[j];
      if (!a || !b) continue;
      const dy = b.y - a.y;
      if (dy > band) break;
      const ox = (a.w + b.w) / 2 + 18 - Math.abs(b.x - a.x), oy = (a.h + b.h) / 2 + 12 - Math.abs(dy);
      if (ox > 0 && oy > 0) {
        const push = Math.min(ox, oy) * 3 * dt, sign = dy >= 0 ? 1 : -1;
        a.y -= sign * push * (pinned(a) ? 0 : pinned(b) ? 2 : 1);
        b.y += sign * push * (pinned(b) ? 0 : pinned(a) ? 2 : 1);
      }
    }
    paintNodes();
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
    if (target) {
      focused = target;
      const node = nodes.find(node => node.el === target);
      if (node) { node.x = clamp(node.x, node.w / 2 + 12, W - node.w / 2 - 12); node.y = clamp(node.y, node.h / 2 + 20, H - node.h / 2 - 20); if (isLive()) paintNodes(); }
      wake();
    }
  }, { signal: abort.signal });
  box.addEventListener("focusout", () => { focused = null; wake(); }, { signal: abort.signal });
  field.addEventListener("pointermove", event => {
    if (!fine.matches) return;
    const rect = field.getBoundingClientRect(); pointerX = event.clientX - rect.left; pointerY = event.clientY - rect.top;
  }, options);
  field.addEventListener("pointerleave", () => { pointerX = pointerY = -1e4; hovered = null; }, options);
  document.addEventListener("click", event => {
    if (peek && event.target instanceof Element && !peek.el.contains(event.target) && !event.target.closest("[data-expand]")) close();
  }, { signal: abort.signal, capture: true });
  window.addEventListener("keydown", event => { if (event.key === "Escape" && peek) { const button = peek.button; close(); button.focus(); } }, { signal: abort.signal });
  // The peek is anchored to a title; scrolling detaches it, so it closes.
  window.addEventListener("scroll", () => { if (peek) close(); }, options);
  document.addEventListener("visibilitychange", () => document.hidden ? halt() : wake(), options);
  fine.addEventListener("change", () => { hovered = null; pointerX = pointerY = -1e4; }, options);
  const changed = () => { halt(); live(); measure(); if (peek) anchor(peek); wake(); };
  reduced.addEventListener("change", changed, options);
  const resize = new ResizeObserver(() => { measure(); for (const node of nodes) node.transform = ""; if (peek) { peek.w = peek.el.offsetWidth; peek.h = peek.el.offsetHeight; anchor(peek); } wake(); });
  resize.observe(field);
  const visibility = new IntersectionObserver(entries => { onScreen = entries.some(entry => entry.isIntersecting); if (onScreen) wake(); else halt(); }, { rootMargin: "120px" });
  visibility.observe(box);
  live(); measure(); wake();
  document.fonts?.ready.then(() => { if (!abort.signal.aborted) changed(); });
  return () => { abort.abort(); halt(); resize.disconnect(); visibility.disconnect(); timers.forEach(clearTimeout); if (peek) { peek.item.removeAttribute("data-peek"); peek.item.removeAttribute("data-open"); peek.button.setAttribute("aria-expanded", "false"); peek.el.inert = true; } clear(); box.removeAttribute("data-current"); };
}
