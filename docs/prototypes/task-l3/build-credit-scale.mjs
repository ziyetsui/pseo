/* Builds docs/wireframes/proto-l1-credit-scale.html out of the selected L1 master.
   Round four, riffing around Counterpoint. Its axis was scale opposition — one big mark, two
   quiet names — and its stated cost was that the big thing, an ampersand, carries no information.
   So these five all keep the opposition and change WHAT IS BIG: the conjunction, the people's
   monograms, the label, a ghost of the ornament, or the names' own first letters. Names stay at
   13-15px throughout and nothing runs past 260ms, both carried over from round three.
   Rounds one to three stay on disk as the record of what was rejected.
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
  /* 1 · Counterpoint — the incumbent, unchanged. The big thing is the
     conjunction: an oversized italic ampersand lands first and the two quiet
     names step out from under it. Kept as the reference the others answer. */
  { inline: false, render: () => \`<p class="cr cr-counter">
      <a class="cr-set cr-c-l" href="\${PEOPLE[0].href}"\${LINK}>\${PEOPLE[0].name}</a>
      <span class="cr-c-mark" aria-hidden="true">&</span>
      <a class="cr-set cr-c-r" href="\${PEOPLE[1].href}"\${LINK}>\${PEOPLE[1].name}</a>
      <span class="cr-c-key" aria-hidden="true">credit</span></p>\` },

  /* 2 · Initials — the big thing is the people. Two monograms carry the size
     and the links; the full names sit under them at 11.5px as the caption.
     The one direction where the largest element on the screen is the credit's
     actual subject. Each monogram carries its full name for assistive tech,
     so the link is never announced as two letters. */
  { inline: false, render: () => \`<div class="cr cr-initials"><p class="cr-key-min">Credit</p>
      <p class="cr-mono-pair">\${PEOPLE.map((p, i) => \`<a class="cr-mark-link" href="\${p.href}"\${LINK} style="--i:\${i}"><span class="vh">\${p.name}</span><span aria-hidden="true">\${p.name.split(' ').map(w => w[0]).join('')}</span></a>\`)
        .join('<span class="cr-amp-min" aria-hidden="true">&</span>')}</p>
      <p class="cr-caption">\${PEOPLE.map(p => p.name).join(' & ')}</p></div>\` },

  /* 3 · Label — the big thing is the word. "credit" set large in the page's
     serif italic, the two names small beneath it; the loud element carries
     the sentence rather than an ornament. */
  { inline: false, render: () => \`<div class="cr cr-label-big"><p class="cr-word" aria-hidden="true">credit</p>
      <p class="cr-line-min"><span class="vh">Credit to</span>\${PEOPLE.map((p, i) => \`<a class="cr-set" href="\${p.href}"\${LINK} style="--i:\${i}">\${p.name}</a>\`)
        .join('<span class="cr-amp-min" aria-hidden="true">&</span>')}</p></div>\` },

  /* 4 · Ghost — the ornament stops being a character and becomes ground. The
     ampersand is set far past reading size, dropped to a whisper and clipped
     by the column, so it reads as texture behind the names rather than as
     punctuation between them. Decoration, and honest about it: aria-hidden,
     inert, and never the thing carrying the meaning. */
  { inline: false, render: () => \`<div class="cr cr-ghost"><span class="cr-ghost-wrap" aria-hidden="true"><span class="cr-ghost-mark">&</span></span>
      <p class="cr-key-min">Credit</p>
      <p class="cr-line-min">\${PEOPLE.map((p, i) => \`<a class="cr-set" href="\${p.href}"\${LINK} style="--i:\${i}">\${p.name}</a>\`)
        .join('<span class="cr-amp-min" aria-hidden="true">&</span>')}</p></div>\` },

  /* 5 · Dropcap — the opposition moves inside the word. Each name's own first
     letter is set at display size on the shared baseline and the rest stays at
     14px, so the big thing is part of the name instead of standing next to it.
     No extra element, no ornament, and the link still reads as one name. */
  { inline: false, render: () => \`<div class="cr cr-dropcap"><p class="cr-key-min">Credit</p>
      <p class="cr-line-min">\${PEOPLE.map((p, i) => \`<a class="cr-drop" href="\${p.href}"\${LINK} style="--i:\${i}"><span class="vh">\${p.name}</span><span aria-hidden="true"><span class="cr-cap">\${p.name[0]}</span>\${p.name.slice(1)}</span></a>\`)
        .join('<span class="cr-amp-min" aria-hidden="true">&</span>')}</p></div>\` },
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
  <button class="proto-picker-item" data-active aria-current="true">Counterpoint</button>
  <button class="proto-picker-item">Initials</button>
  <button class="proto-picker-item">Label</button>
  <button class="proto-picker-item">Ghost</button>
  <button class="proto-picker-item">Dropcap</button>
  <span class="proto-picker-divider" aria-hidden="true"></span>
  <button class="proto-picker-item proto-picker-replay" aria-label="Replay animation (R)">↻</button>
</nav>`,
  'the picker');

/* ── 4 · the credit's own stylesheet, scoped under .argument ──────────── */
cut('<div id="stage"></div>', `<style>
/* ═══ The credit, round four. All five keep Counterpoint's axis — one big
   thing, two quiet names — and change what the big thing IS: the conjunction,
   the people's monograms, the label, a ghost of the ornament, or the names'
   own first letters. Names stay at 13–15px and nothing runs past 260ms.
   Scoped to .argument; every value is one of the file's own tokens. ═══════ */
.argument .cr{--cr-ease:cubic-bezier(.32,.72,0,1)}
/* Every direction sits in the same 410px column as the paragraphs and the
   signature line — without this they inherit the section's full width. */
.argument .cr-counter,.argument .cr-initials,.argument .cr-label-big,
.argument .cr-ghost,.argument .cr-dropcap{max-width:410px;margin-left:auto;margin-right:auto;text-align:left}
.argument .cr-key-min{font:var(--w-semi) 10px/1 var(--font-mono);letter-spacing:.16em;
  text-transform:uppercase;color:var(--faint)}
.argument .cr-line-min{display:flex;flex-wrap:wrap;align-items:baseline;gap:0 10px;margin-top:11px}
.argument .cr-amp-min{font:italic 13px/1 var(--font-serif);color:var(--faint);padding:0 3px}

/* One link register and one hit-area rule. At 14–15px the box is ~19px tall,
   so the pseudo-element carries every target past 44px without touching the
   line box; 4px of horizontal bleed cannot reach a neighbour 10px away. */
.argument .cr-set,.argument .cr-drop,.argument .cr-mark-link{position:relative;color:var(--foreground)}
.argument .cr-set{font:15px/1.5 var(--font-serif);letter-spacing:-.008em}
.argument .cr-set::before{content:"";position:absolute;inset:-15px -4px}
/* The underline is its own element everywhere: text-decoration cannot be drawn on. */
.argument .cr-set::after,.argument .cr-drop::after,.argument .cr-mark-link::after{content:"";
  position:absolute;left:0;right:0;bottom:-3px;height:1px;background:currentColor;
  transform:scaleX(0);transform-origin:left center;transition:transform 180ms var(--cr-ease)}

@keyframes cr-land{from{opacity:0;transform:scale(.86)}to{opacity:1;transform:none}}
@keyframes cr-step-l{from{opacity:0;transform:translateX(9px)}to{opacity:1;transform:none}}
@keyframes cr-step-r{from{opacity:0;transform:translateX(-9px)}to{opacity:1;transform:none}}
@keyframes cr-set-line{to{clip-path:inset(0 -2px 0 0)}}
@keyframes cr-fade{from{opacity:0}to{opacity:1}}
@keyframes cr-ghost-in{from{opacity:0;transform:translateY(10px)}to{opacity:.13;transform:none}}

/* ── 1 · Counterpoint — the big thing is the conjunction ───────────────── */
.argument .cr-counter{position:relative;display:flex;flex-wrap:wrap;align-items:center;gap:0 14px;margin-top:34px}
.argument .cr-c-mark{flex:none;font:italic 40px/1 var(--font-serif);color:var(--faint);
  animation:cr-land 200ms var(--cr-ease) both;animation-delay:100ms}
.argument .cr-c-l{animation:cr-step-l 240ms var(--cr-ease) both;animation-delay:200ms}
.argument .cr-c-r{animation:cr-step-r 240ms var(--cr-ease) both;animation-delay:200ms}
.argument .cr-c-key{position:absolute;top:-15px;left:0;font:var(--w-semi) 10px/1 var(--font-mono);
  letter-spacing:.16em;text-transform:uppercase;color:var(--faint);
  animation:cr-fade 200ms var(--cr-ease) both;animation-delay:280ms}

/* ── 2 · Initials — the big thing is the people ────────────────────────── */
.argument .cr-initials{margin-top:24px}
.argument .cr-mono-pair{display:flex;align-items:baseline;gap:0 4px;margin-top:12px;
  font:34px/1.05 var(--font-serif);letter-spacing:.01em}
.argument .cr-mark-link{animation:cr-land 200ms var(--cr-ease) both;
  animation-delay:calc(120ms + var(--i) * 100ms)}
.argument .cr-mark-link::before{content:"";position:absolute;inset:-7px -5px}
.argument .cr-initials .cr-amp-min{font-size:22px;padding:0 6px}
.argument .cr-caption{margin-top:11px;font:11.5px/1.6 var(--font-mono);color:var(--faint);
  animation:cr-fade 200ms var(--cr-ease) both;animation-delay:340ms}

/* ── 3 · Label — the big thing is the word ─────────────────────────────── */
.argument .cr-label-big{margin-top:24px}
.argument .cr-word{font:italic 40px/1 var(--font-serif);color:var(--foreground);letter-spacing:-.022em;
  clip-path:inset(0 100% 0 0);animation:cr-set-line 220ms var(--cr-ease) both;animation-delay:110ms}
.argument .cr-label-big .cr-set{animation:cr-step-l 240ms var(--cr-ease) both;
  animation-delay:calc(230ms + var(--i) * 60ms)}

/* ── 4 · Ghost — the ornament becomes ground ───────────────────────────── */
.argument .cr-ghost{position:relative;margin-top:26px;padding-top:4px}
/* The clip wraps the ornament only. Clipping the whole block would clip the
   names' hit-area pseudo-elements with it and quietly take them under 44px. */
.argument .cr-ghost-wrap{position:absolute;inset:-24px 0 -8px 0;overflow:hidden;
  pointer-events:none;user-select:none}
.argument .cr-ghost-mark{position:absolute;right:-6px;top:-52px;font:italic 150px/1 var(--font-serif);
  color:var(--foreground);opacity:.13;animation:cr-ghost-in 260ms var(--cr-ease) both}
.argument .cr-ghost .cr-key-min,.argument .cr-ghost .cr-line-min{position:relative}
.argument .cr-ghost .cr-set{animation:cr-fade 200ms var(--cr-ease) both;
  animation-delay:calc(180ms + var(--i) * 60ms)}

/* ── 5 · Dropcap — the opposition moves inside the word ────────────────── */
.argument .cr-dropcap{margin-top:24px}
.argument .cr-dropcap .cr-line-min{align-items:baseline;gap:0 12px;margin-top:14px}
.argument .cr-drop{font:14px/1.1 var(--font-serif);letter-spacing:-.006em;
  animation:cr-fade 200ms var(--cr-ease) both;animation-delay:calc(170ms + var(--i) * 70ms)}
.argument .cr-drop::before{content:"";position:absolute;inset:-8px -4px}
/* One baseline, two sizes: the capital is part of the name, not an ornament
   beside it, so it sits in the same inline flow and inherits the same link. */
.argument .cr-cap{font-size:34px;letter-spacing:-.02em;
  animation:cr-land 200ms var(--cr-ease) both;animation-delay:calc(120ms + var(--i) * 70ms);
  display:inline-block}
.argument .cr-dropcap .cr-amp-min{font-size:15px}

/* ── Interaction ───────────────────────────────────────────────────────── */
@media (hover:hover) and (pointer:fine){
  .argument .cr-set:hover::after,.argument .cr-drop:hover::after,
  .argument .cr-mark-link:hover::after{transform:scaleX(1)}
}
/* Focus is served the way a pointer is. */
.argument .cr-set:focus-visible::after,.argument .cr-drop:focus-visible::after,
.argument .cr-mark-link:focus-visible::after{transform:scaleX(1)}
@media (prefers-reduced-motion:reduce){
  .argument .cr,.argument .cr *{animation:none!important;transition:none!important}
  /* Two directions are revealed by an animation, so with animations off they
     have to simply be in their finished state. */
  .argument .cr-word{clip-path:none}
  .argument .cr-ghost-mark{opacity:.13}
}
@media (max-width:700px){
  .argument .cr-counter{margin-top:30px}
  .argument .cr-c-mark{font-size:34px}
  .argument .cr-mono-pair,.argument .cr-word{font-size:32px}
  .argument .cr-cap{font-size:30px}
  .argument .cr-ghost-mark{font-size:120px;top:-42px}
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
cut('<title>', '<title>Credit · round four · ', 'the title');

await writeFile(new URL('docs/wireframes/proto-l1-credit-scale.html', root), file);
console.log('wrote docs/wireframes/proto-l1-credit-scale.html —', (file.length / 1024).toFixed(0) + 'KB');
