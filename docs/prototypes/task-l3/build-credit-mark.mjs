/* Builds docs/wireframes/proto-l1-credit-mark.html out of the selected L1 master.
   Round three. The note on round two was: the type is too big, and it is neither spare enough nor
   forceful enough. So every direction here is SMALL — 11 to 17px — and each one finds its force
   somewhere other than size: contrast, enclosure, register, scale opposition, or the refusal to
   take any new space at all. Motion follows: nothing here runs past 260ms.
   Rounds one and two stay on disk as the record of what was rejected.
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
  '      <p class="sig">${DATA.length} prompts · every one credited · every one links to its source<!--credit-inline--></p>\n'
  + '      <!--credit-block-->',
  'the signature line');
cut(
  '    ${ARGUMENT}',
  '    ${fillCredit(ARGUMENT)}',
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
  /* 1 · Inline — the credit takes no space at all. It finishes the signature
     line the page already prints, in that line's own mono, so the first screen
     gains a credit and not a block. The names lift from faint to full ink one
     after the other, 160ms apart: the only motion is the ink arriving. */
  { inline: true, render: () => \` <span class="cr cr-inline"><span class="cr-sep" aria-hidden="true">·</span> credit \${
    PEOPLE.map((p, i) => \`<a class="cr-mini" href="\${p.href}"\${LINK} style="--i:\${i}">\${p.name.toLowerCase()}</a>\`)
      .join('<span class="cr-amp-min" aria-hidden="true">&</span>')}</span>\` },

  /* 2 · Mono — the machine register. 12px, uppercase, wide tracking, the names
     in full ink against a faint label; it reads as a stamped attribution
     rather than a signature. Force from precision: one 220ms wipe, left to
     right, like a line being set. */
  { inline: false, render: () => \`<p class="cr cr-mono"><span class="cr-key">Credit</span>\${
    PEOPLE.map((p, i) => \`<a class="cr-mini" href="\${p.href}"\${LINK} style="--i:\${i}">\${p.name}</a>\`)
      .join('<span class="cr-amp-min" aria-hidden="true">&</span>')}</p>\` },

  /* 3 · Bracket — small type held by a mark. Two hairline brackets snap in
     around the names in 240ms and stop; nothing else moves. The force is
     geometric — the credit is something that has been closed on. */
  { inline: false, render: () => \`<p class="cr cr-bracket"><span class="cr-b cr-b-l" aria-hidden="true"></span>\${
    PEOPLE.map((p, i) => \`<a class="cr-set" href="\${p.href}"\${LINK} style="--i:\${i}">\${p.name}</a>\`)
      .join('<span class="cr-amp-min" aria-hidden="true">&</span>')}<span class="cr-b cr-b-r" aria-hidden="true"></span></p>\` },

  /* 4 · Stamp — contrast instead of size. The label is a filled block, ink on
     paper inverted, pressed in at 180ms from scale .94; the names sit beside
     it at reading size. The smallest element on the screen is also the
     highest-contrast one, which is the whole argument of the direction. */
  { inline: false, render: () => \`<p class="cr cr-stamp"><span class="cr-chip">Credit</span>\${
    PEOPLE.map((p, i) => \`<a class="cr-set" href="\${p.href}"\${LINK} style="--i:\${i}">\${p.name}</a>\`)
      .join('<span class="cr-amp-min" aria-hidden="true">&</span>')}</p>\` },

  /* 5 · Counterpoint — one big thing, two small ones. The ampersand is set
     large enough to be an ornament and the names are deliberately quiet
     beside it; the mark lands first and the names step out from under it.
     Scale opposition, not scale. */
  { inline: false, render: () => \`<p class="cr cr-counter">
      <a class="cr-set cr-c-l" href="\${PEOPLE[0].href}"\${LINK}>\${PEOPLE[0].name}</a>
      <span class="cr-c-mark" aria-hidden="true">&</span>
      <a class="cr-set cr-c-r" href="\${PEOPLE[1].href}"\${LINK}>\${PEOPLE[1].name}</a>
      <span class="cr-c-key" aria-hidden="true">credit</span></p>\` },
];
/* A direction either finishes the signature line or sits under it; a block one
   dropped inside that <p> would be hoisted out by the parser, so each fills
   only its own slot and the other marker resolves to nothing. */
function fillCredit(html){
  const spec = CREDIT[creditIndex];
  return html
    .replace('<!--credit-inline-->', spec.inline ? spec.render() : '')
    .replace('<!--credit-block-->', spec.inline ? '' : spec.render());
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
  <button class="proto-picker-item" data-active aria-current="true">Inline</button>
  <button class="proto-picker-item">Mono</button>
  <button class="proto-picker-item">Bracket</button>
  <button class="proto-picker-item">Stamp</button>
  <button class="proto-picker-item">Counterpoint</button>
  <span class="proto-picker-divider" aria-hidden="true"></span>
  <button class="proto-picker-item proto-picker-replay" aria-label="Replay animation (R)">↻</button>
</nav>`,
  'the picker');

/* ── 4 · the credit's own stylesheet, scoped under .argument ──────────── */
cut('<div id="stage"></div>', `<style>
/* ═══ The credit, round three. The note was: too big, not spare enough, not
   forceful enough. So nothing here is set above 17px, and each direction
   finds its force somewhere other than size — register, enclosure, contrast,
   scale opposition, or taking no new space at all. Nothing runs past 260ms.
   Scoped to .argument; every value is one of the file's own tokens. ═══════ */
.argument .cr{--cr-ease:cubic-bezier(.32,.72,0,1)}

/* Two link registers, one hit-area rule. At 12–15px the box is ~17–19px tall,
   so the pseudo-element carries every target past 44px without touching the
   line box; 4px of horizontal bleed cannot reach a neighbour 10px away. */
.argument .cr-mini,.argument .cr-set{position:relative;color:var(--foreground)}
.argument .cr-mini{font:12px/1.6 var(--font-mono)}
.argument .cr-set{font:15px/1.5 var(--font-serif);letter-spacing:-.008em}
.argument .cr-mini::before,.argument .cr-set::before{content:"";position:absolute;inset:-15px -4px}
/* The underline is its own element in every direction: text-decoration cannot
   be drawn on, and at this size a drawn 1px rule is the whole affordance. */
.argument .cr-mini::after,.argument .cr-set::after{content:"";position:absolute;left:0;right:0;bottom:-3px;
  height:1px;background:currentColor;transform:scaleX(0);transform-origin:left center;
  transition:transform 180ms var(--cr-ease)}
.argument .cr-amp-min{font:italic 13px/1 var(--font-serif);color:var(--faint);padding:0 3px}
/* Every block direction sits in the same 410px column as the paragraphs and the signature line.
   Without this they inherit the section's full width and start at its left padding, which reads as
   a different element on a different grid — invisible to the assertions, obvious on sight. */
.argument .cr-mono,.argument .cr-bracket,.argument .cr-stamp,.argument .cr-counter{
  max-width:410px;margin-left:auto;margin-right:auto;text-align:left}

@keyframes cr-ink{from{color:var(--faint)}to{color:var(--foreground)}}
@keyframes cr-set-line{to{clip-path:inset(0 -2px 0 0)}}
@keyframes cr-snap-l{from{opacity:0;transform:translateX(-9px)}to{opacity:1;transform:none}}
@keyframes cr-snap-r{from{opacity:0;transform:translateX(9px)}to{opacity:1;transform:none}}
@keyframes cr-press{from{opacity:0;transform:scale(.94)}to{opacity:1;transform:none}}
@keyframes cr-land{from{opacity:0;transform:scale(.86)}to{opacity:1;transform:none}}
@keyframes cr-step-l{from{opacity:0;transform:translateX(9px)}to{opacity:1;transform:none}}
@keyframes cr-step-r{from{opacity:0;transform:translateX(-9px)}to{opacity:1;transform:none}}
@keyframes cr-fade{from{opacity:0}to{opacity:1}}

/* ── 1 · Inline — it finishes the line the page already prints ─────────── */
.argument .cr-inline{font:inherit;color:var(--faint)}
.argument .cr-inline .cr-sep{padding:0 2px}
/* Colour, not transform: this is the master's own idiom — .m-run[data-field] .t
   transitions colour and nothing else — and it is a paint-only change on two
   short spans, which is what "the ink arrives" has to be to read at 11.5px. */
.argument .cr-inline .cr-mini{font:inherit;color:var(--faint);
  animation:cr-ink 260ms var(--cr-ease) both;animation-delay:calc(220ms + var(--i) * 160ms)}
.argument .cr-inline .cr-amp-min{font:italic 12px/1 var(--font-serif);padding:0 5px}

/* ── 2 · Mono — the machine register, set left to right ────────────────── */
.argument .cr-mono{display:flex;flex-wrap:wrap;align-items:baseline;gap:0 10px;margin-top:22px;
  font:12px/1.7 var(--font-mono);letter-spacing:.12em;text-transform:uppercase;
  clip-path:inset(0 100% 0 0);animation:cr-set-line 220ms var(--cr-ease) both;animation-delay:140ms}
.argument .cr-mono .cr-key{color:var(--faint)}
.argument .cr-mono .cr-mini{font:inherit;letter-spacing:inherit}
.argument .cr-mono .cr-amp-min{text-transform:none;letter-spacing:0}

/* ── 3 · Bracket — small type, closed on by a mark ─────────────────────── */
.argument .cr-bracket{display:flex;flex-wrap:wrap;align-items:center;gap:0 10px;margin-top:22px}
.argument .cr-b{flex:none;width:7px;height:21px;border:1px solid var(--border-strong)}
.argument .cr-b-l{border-right:0;animation:cr-snap-l 240ms var(--cr-ease) both;animation-delay:120ms}
.argument .cr-b-r{border-left:0;animation:cr-snap-r 240ms var(--cr-ease) both;animation-delay:120ms}
.argument .cr-bracket .cr-set{animation:cr-fade 200ms var(--cr-ease) both;animation-delay:calc(180ms + var(--i) * 60ms)}

/* ── 4 · Stamp — contrast instead of size ──────────────────────────────── */
.argument .cr-stamp{display:flex;flex-wrap:wrap;align-items:center;gap:0 12px;margin-top:22px}
.argument .cr-chip{display:inline-flex;align-items:center;height:19px;padding:0 7px;border-radius:3px;
  background:var(--foreground);color:var(--background);font:var(--w-semi) 10px/1 var(--font-mono);
  letter-spacing:.14em;text-transform:uppercase;
  animation:cr-press 180ms var(--cr-ease) both;animation-delay:120ms}
.argument .cr-stamp .cr-set{animation:cr-fade 200ms var(--cr-ease) both;animation-delay:calc(200ms + var(--i) * 60ms)}

/* ── 5 · Counterpoint — one big mark, two quiet names ──────────────────── */
.argument .cr-counter{position:relative;display:flex;flex-wrap:wrap;align-items:center;gap:0 14px;margin-top:34px}
.argument .cr-c-mark{flex:none;font:italic 40px/1 var(--font-serif);color:var(--faint);
  animation:cr-land 200ms var(--cr-ease) both;animation-delay:100ms}
.argument .cr-c-l{animation:cr-step-l 240ms var(--cr-ease) both;animation-delay:200ms}
.argument .cr-c-r{animation:cr-step-r 240ms var(--cr-ease) both;animation-delay:200ms}
.argument .cr-c-key{position:absolute;top:-15px;left:0;font:var(--w-semi) 10px/1 var(--font-mono);
  letter-spacing:.16em;text-transform:uppercase;color:var(--faint);
  animation:cr-fade 200ms var(--cr-ease) both;animation-delay:280ms}

/* ── Interaction ───────────────────────────────────────────────────────── */
@media (hover:hover) and (pointer:fine){
  .argument .cr-mini:hover::after,.argument .cr-set:hover::after{transform:scaleX(1)}
}
/* Focus is served the way a pointer is. */
.argument .cr-mini:focus-visible::after,.argument .cr-set:focus-visible::after{transform:scaleX(1)}
@media (prefers-reduced-motion:reduce){
  .argument .cr,.argument .cr *{animation:none!important;transition:none!important}
  /* Two directions are revealed by an animation, so with animations off they
     have to simply be in their finished state. */
  .argument .cr-mono{clip-path:none}
  .argument .cr-inline .cr-mini{color:var(--foreground)}
}
@media (max-width:700px){
  .argument .cr-counter{margin-top:30px}
  .argument .cr-c-mark{font-size:34px}
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
cut('<title>', '<title>Credit · round three · ', 'the title');

await writeFile(new URL('docs/wireframes/proto-l1-credit-mark.html', root), file);
console.log('wrote docs/wireframes/proto-l1-credit-mark.html —', (file.length / 1024).toFixed(0) + 'KB');
