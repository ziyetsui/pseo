/* Builds docs/wireframes/proto-l1-credit-kinetic-riff.html out of the selected L1 master.
   Round two: five motion stories in the Kinetic family. Round one's file stays on disk as the
   record of what was rejected; this generator superseded its build script.
   The master (docs/wireframes/final/L1-hub-magnetic.html, itself a byte-identical copy of
   proto-continuous-peek.html) is READ, never written: its README records its SHA-256 and §7 names
   it, so the exploration gets its own file. Five precise insertions, each asserted — if the master
   moves, this fails loudly instead of producing a page that quietly is not the master. */
import {readFile,writeFile} from 'node:fs/promises';
const root = new URL('../../../', import.meta.url);
const src = new URL('docs/wireframes/final/L1-hub-magnetic.html', root);
let file = await readFile(src, 'utf8');
const cut = (find, replace, what) => {
  if (!file.includes(find)) throw new Error('master changed, anchor gone: ' + what);
  file = file.replace(find, replace);
};

/* ── 1 · the credit itself, rendered after the signature line ─────────── */
/* A comment, not a template expression: ARGUMENT is a frozen top-level string built once at load,
   so a `${...}` here would both evaluate before CREDIT exists and freeze the first direction in
   place forever. The marker keeps ARGUMENT a plain constant and lets page() fill it per render. */
cut(
  '      <p class="sig">${DATA.length} prompts · every one credited · every one links to its source</p>',
  '      <p class="sig">${DATA.length} prompts · every one credited · every one links to its source</p>\n'
  + '      <!--credit-->',
  'the signature line');
cut(
  '    ${ARGUMENT}',
  '    ${ARGUMENT.replace("<!--credit-->", CREDIT[creditIndex]())}',
  'the argument use site');

/* ── 2 · five credit directions, all of them the Magnetic master ──────── */
cut(
  'const variants = [vStill, vMagnet, vBreathe, vInk, vDrift];',
  `/* ── the credit exploration ───────────────────────────────────────────
   The motion decision is already made: §7 selects Magnetic, so all five of
   these render page("run", NOTE, mRun, "magnet") and the only thing that
   changes is the credit under the signature line. vStill / vBreathe / vInk /
   vDrift stay defined above, untouched and unused, so this file still says
   what it was cut from.

   Handles supplied by the user: https://x.com/VincentWu11 and
   https://x.com/st3v3li. Neither name appears anywhere in the repository, so
   nothing here is inferred — a credit carrying a guessed handle is worse than
   no credit at all. */
const PEOPLE = [
  { name: 'Vincent Wu', handle: '@VincentWu11', href: 'https://x.com/VincentWu11' },
  { name: 'Steve Li',   handle: '@st3v3li',     href: 'https://x.com/st3v3li' },
];
const LINK = ' target="_blank" rel="nofollow noopener noreferrer"';
const glyphs = (word, offset, extra) => [...word].map((g, i) =>
  \`<span class="cr-glyph\${extra}" style="--i:\${offset + i};--j:\${i}">\${g === ' ' ? '&nbsp;' : g}</span>\`).join('');

const CREDIT = [
  /* 1 · Kinetic — the incumbent, unchanged. Each name is dealt out letter by
     letter on arrival: a vertical stagger, 26ms apart. Kept in the set as the
     thing the other four have to beat. */
  () => kin('kinetic', (p, start) => glyphs(p.name, start, '')),
  /* 2 · Ink — the name is written, not revealed. A hairline draws itself left
     to right and the letters appear in its wake, at the same duration and the
     same curve, so the line reads as the pen and the text as the ink behind
     it. The line stays as the underline; pointing at a name weights it. */
  () => wrap('ink', (p, i) => \`<a class="cr-name" href="\${p.href}"\${LINK} style="--i:\${i}"><span class="cr-wet">\${p.name}</span><span class="cr-pen" aria-hidden="true"></span></a>\`),
  /* 3 · Gather — the letters are already there and close ranks. Each glyph
     starts displaced outward from its own word's centre and slides home, so
     the name assembles instead of arriving: one horizontal gesture per name
     rather than twenty vertical ones. */
  () => kin('gather', (p, start) => glyphs(p.name, start, ' style-gather')),
  /* 4 · Ampersand — the ornament acts. The italic & lands first and the two
     names part from behind it; the only direction where the credit is one
     centred composition rather than a line in the text column. */
  () => \`<div class="cr cr-amp-set"><p class="cr-label cr-label-centred">Credit to</p>
      <p class="cr-amp-line">
        <a class="cr-name cr-amp-left" href="\${PEOPLE[0].href}"\${LINK}>\${PEOPLE[0].name}<span class="cr-pen" aria-hidden="true"></span></a>
        <span class="cr-amp-mark" aria-hidden="true">&</span>
        <a class="cr-name cr-amp-right" href="\${PEOPLE[1].href}"\${LINK}>\${PEOPLE[1].name}<span class="cr-pen" aria-hidden="true"></span></a>
      </p></div>\`,
  /* 5 · Hairline — one gesture, not twenty. A rule opens from a point and the
     whole credit arrives as a single block behind it. The restrained pole of
     the same family: still motion-led, with nothing moving letter by letter. */
  () => \`<div class="cr cr-hair"><span class="cr-hair-rule" aria-hidden="true"></span>
      <p class="cr-label cr-hair-label">Credit to</p>
      <p class="cr-hair-line">\${PEOPLE.map((p, i) =>
        \`<a class="cr-name" href="\${p.href}"\${LINK}>\${p.name}<span class="cr-pen" aria-hidden="true"></span></a>\${i === 0 ? '<span class="cr-mark" aria-hidden="true">&</span>' : ''}\`).join('')}</p></div>\`,
];
/* Two names, one ampersand, one label — the structure is constant across the
   five, so the motion is what changes. */
function wrap(kind, name){
  return \`<div class="cr cr-\${kind}"><p class="cr-label">Credit to</p>
      <p class="cr-line">\${PEOPLE.map((p, i) => \`\${name(p, i)}\${i === 0 ? '<span class="cr-mark" aria-hidden="true">&</span>' : ''}\`).join('')}</p></div>\`;
}
/* The glyph spans are aria-hidden and the real name sits beside them, so
   neither effect ever costs the text. --n carries the letter count so a glyph
   can find its own distance from the word's centre in CSS. */
function kin(kind, run){
  let offset = 0;
  return \`<div class="cr cr-\${kind}"><p class="cr-label">Credit to</p>
      <p class="cr-line">\${PEOPLE.map((p, index) => {
        const start = offset; offset += p.name.length + 3;
        return \`<a class="cr-name" href="\${p.href}"\${LINK}><span class="vh">\${p.name}</span><span aria-hidden="true" style="--n:\${p.name.length}">\${run(p, start)}</span><span class="cr-pen" aria-hidden="true"></span></a>\${index === 0 ? \`<span class="cr-mark" aria-hidden="true" style="--i:\${start + p.name.length}">&</span>\` : ''}\`;
      }).join('')}</p></div>\`;
}
let creditIndex = 0;
const vCredit = i => () => { creditIndex = i; return page("run", NOTE, mRun, "magnet"); };
const variants = [vCredit(0), vCredit(1), vCredit(2), vCredit(3), vCredit(4)];`,
  'the variants array');

/* ── 3 · the picker's labels, and the replay control four of them need ─── */
cut(
  `<nav class="proto-picker" aria-label="Motion variants">
  <span class="proto-picker-highlight" aria-hidden="true"></span>
  <button class="proto-picker-item" data-active aria-current="true">Still</button>
  <button class="proto-picker-item">Magnetic</button>
  <button class="proto-picker-item">Breathing</button>
  <button class="proto-picker-item">Ink</button>
  <button class="proto-picker-item">Drift</button>
</nav>`,
  /* PICKER.md's one allowed modification, and this is the case it names: the credit lands at the
     bottom-centre of the screen, which is where the pill sits. Nothing else about it changes. */
  `<nav class="proto-picker" data-position="top" aria-label="Credit variants">
  <span class="proto-picker-highlight" aria-hidden="true"></span>
  <button class="proto-picker-item" data-active aria-current="true">Kinetic</button>
  <button class="proto-picker-item">Ink</button>
  <button class="proto-picker-item">Gather</button>
  <button class="proto-picker-item">Ampersand</button>
  <button class="proto-picker-item">Hairline</button>
  <span class="proto-picker-divider" aria-hidden="true"></span>
  <button class="proto-picker-item proto-picker-replay" aria-label="Replay animation (R)">↻</button>
</nav>`,
  'the picker');

/* ── 4 · the credit's own stylesheet, scoped under .argument ──────────── */
cut('<div id="stage"></div>', `<style>
/* ═══ The credit under the signature line, round two. Five motion stories in
   one family: the credit is the thing that moves. Scoped to .argument so no
   rule here can reach anything else; every value is one of the file's own
   tokens, and the structure — label, two names, one ampersand — is constant
   across all five so the motion is what changes. ══════════════════════════ */
.argument .cr{--cr-ease:cubic-bezier(.32,.72,0,1);--cr-draw:640ms}
.argument .cr-label{font:var(--w-semi) 10.5px/1.5 var(--font-mono);letter-spacing:.16em;
  text-transform:uppercase;color:var(--faint)}
.argument .cr-line{display:flex;flex-wrap:wrap;align-items:baseline;gap:0 12px;margin-top:14px;
  font-family:var(--font-serif);font-size:clamp(26px,3.4vw,34px);line-height:1.2;letter-spacing:-.018em}
.argument .cr-name{position:relative;display:inline-block;color:var(--foreground)}
/* The hit area is a pseudo-element: it clears 44px without touching the line
   box, and 4px of horizontal bleed cannot reach the ampersand 12px away. */
.argument .cr-name::before{content:"";position:absolute;inset:-8px -4px}
.argument .cr-mark{display:inline-block;font:italic .8em/1 var(--font-serif);color:var(--faint)}
.argument .cr-kinetic,.argument .cr-ink,.argument .cr-gather,.argument .cr-hair{
  max-width:410px;margin:26px auto 0;text-align:left}

/* The pen — one element, two jobs. Everywhere but Ink it is the hover and
   focus affordance, drawn on demand; in Ink it draws itself on arrival and
   stays as the underline. An underline that animates has to be its own
   element: text-decoration cannot be drawn on. */
.argument .cr-pen{position:absolute;left:0;right:0;bottom:-.08em;height:2px;border-radius:2px;
  background:currentColor;transform:scaleX(0);transform-origin:left center;
  transition:transform 280ms var(--cr-ease)}

@keyframes cr-deal{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
@keyframes cr-gather{from{opacity:0;transform:translateX(var(--dx))}to{opacity:1;transform:none}}
@keyframes cr-draw{from{transform:scaleX(0)}to{transform:scaleX(1)}}
@keyframes cr-wet{from{clip-path:inset(0 100% -.2em 0)}to{clip-path:inset(0 -.08em -.2em 0)}}
@keyframes cr-land{from{opacity:0;transform:rotate(-10deg) scale(.86)}to{opacity:1;transform:none}}
@keyframes cr-part-l{from{opacity:0;transform:translateX(30px)}to{opacity:1;transform:none}}
@keyframes cr-part-r{from{opacity:0;transform:translateX(-30px)}to{opacity:1;transform:none}}
@keyframes cr-open{from{transform:scaleX(0)}to{transform:scaleX(1)}}
@keyframes cr-fade{from{opacity:0}to{opacity:1}}

/* ── 1 · Kinetic — dealt out letter by letter ──────────────────────────── */
.argument .cr-glyph{display:inline-block;animation:cr-deal 460ms var(--cr-ease) both;
  animation-delay:calc(120ms + var(--i) * 26ms)}
.argument .cr-kinetic .cr-mark{animation:cr-deal 460ms var(--cr-ease) both;
  animation-delay:calc(120ms + var(--i) * 26ms)}

/* ── 2 · Ink — the line is the pen and the letters are its wake ────────── */
/* clip-path, not a transform: this is a reveal in place, and the alternatives
   (a curtain scaled over the text, a mask position) either scale their own
   edge or cost more than one paint-only property on two short spans. */
.argument .cr-ink .cr-wet{display:inline-block;animation:cr-wet var(--cr-draw) var(--cr-ease) both;
  animation-delay:calc(140ms + var(--i) * 220ms)}
.argument .cr-ink .cr-pen{animation:cr-draw var(--cr-draw) var(--cr-ease) both;
  animation-delay:calc(140ms + var(--i) * 220ms)}
/* The line is already there, so pointing at a name weights it instead of
   drawing it again — transform, so nothing reflows. */
.argument .cr-ink .cr-pen{transform-origin:left bottom}

/* ── 3 · Gather — the letters close ranks ──────────────────────────────── */
/* --j is the glyph's place in its own word and --n the word's length, so each
   letter can find its distance from the centre without a second pass in JS. */
.argument .cr-gather .style-gather{--dx:calc((var(--j) - (var(--n) - 1) / 2) * 7px);
  animation:cr-gather 620ms var(--cr-ease) both;animation-delay:calc(140ms + var(--i) * 8ms)}
.argument .cr-gather .cr-mark{animation:cr-fade 520ms var(--cr-ease) both;animation-delay:520ms}

/* ── 4 · Ampersand — the ornament lands, the names part from it ────────── */
.argument .cr-amp-set{max-width:640px;margin:28px auto 0;text-align:center}
.argument .cr-label-centred{margin-bottom:6px}
.argument .cr-amp-line{display:flex;flex-wrap:wrap;justify-content:center;align-items:baseline;gap:0 18px;
  margin-top:10px;font-family:var(--font-serif);font-size:clamp(28px,3.8vw,38px);line-height:1.14;
  letter-spacing:-.02em;text-wrap:balance}
.argument .cr-amp-mark{display:inline-block;font-style:italic;font-size:1.1em;color:var(--faint);
  animation:cr-land 520ms var(--cr-ease) both;animation-delay:120ms}
.argument .cr-amp-left{animation:cr-part-l 620ms var(--cr-ease) both;animation-delay:260ms}
.argument .cr-amp-right{animation:cr-part-r 620ms var(--cr-ease) both;animation-delay:260ms}

/* ── 5 · Hairline — one gesture, opening from a point ──────────────────── */
.argument .cr-hair-rule{display:block;width:100%;height:1px;background:var(--border-strong);
  transform:scaleX(0);transform-origin:center;animation:cr-open 560ms var(--cr-ease) both}
.argument .cr-hair-line{display:flex;flex-wrap:wrap;align-items:baseline;gap:0 12px;
  font-family:var(--font-serif);font-size:clamp(26px,3.4vw,34px);line-height:1.2;letter-spacing:-.018em;
  animation:cr-fade 520ms var(--cr-ease) both;animation-delay:200ms}
.argument .cr-hair-label{margin-top:14px;animation:cr-fade 520ms var(--cr-ease) both;animation-delay:180ms}
.argument .cr-hair-line{margin-top:12px}

/* ── Interaction ───────────────────────────────────────────────────────── */
@media (hover:hover) and (pointer:fine){
  .argument .cr-name:hover .cr-pen{transform:scaleX(1)}
  .argument .cr-ink .cr-name:hover .cr-pen{transform:scaleX(1) scaleY(1.8)}
}
/* Focus is served the same way a pointer is. */
.argument .cr-name:focus-visible .cr-pen{transform:scaleX(1)}
.argument .cr-ink .cr-name:focus-visible .cr-pen{transform:scaleX(1) scaleY(1.8)}
@media (prefers-reduced-motion:reduce){
  .argument .cr,.argument .cr *{animation:none!important;transition:none!important}
  /* Ink's underline is drawn by its animation, so with animations off it needs
     to simply be there. */
  .argument .cr-ink .cr-pen{transform:scaleX(1)}
  .argument .cr-ink .cr-wet{clip-path:none}
}
@media (max-width:700px){
  .argument .cr-amp-set{margin-top:22px}
  .argument .cr-line,.argument .cr-hair-line,.argument .cr-amp-line{gap:0 10px}
  /* The master parks its theme toggle top-right below 700px precisely because
     the picker owns the bottom there; this file takes PICKER.md's sanctioned
     data-position="top" so the pill stops covering the credit, so the toggle
     goes back to the corner it was moved out of. Both are harness — §7 is
     explicit that sample selectors and toggles are not product UI — and
     nothing about the page itself moves. */
  .theme-toggle{ bottom:14px; top:auto; right:14px; }
}
</style>

<div id="stage"></div>`, 'the stage');

/* ── 5 · the title, so a tab in the reviewer's browser says what this is ── */
cut('<title>', '<title>Credit · round two · ', 'the title');

await writeFile(new URL('docs/wireframes/proto-l1-credit-kinetic-riff.html', root), file);
console.log('wrote docs/wireframes/proto-l1-credit-kinetic-riff.html —', (file.length / 1024).toFixed(0) + 'KB');
