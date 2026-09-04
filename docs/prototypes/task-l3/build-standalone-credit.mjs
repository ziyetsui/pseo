/* Generates the single-file credit picker at docs/wireframes/proto-l1-credit.html.
   Same contract as the other generators: magnetic.css for the L1 material set, app/credit.css for
   the credit's own rules, app/picker.css for the harness, and the fixture for the band below the
   fold. Re-run after any of those change. */
import {readFile,writeFile} from 'node:fs/promises';

const root = new URL('../../../', import.meta.url);
const css = async p => readFile(new URL(p, root), 'utf8');
const payload = await (await fetch('http://127.0.0.1:8767/browse/data')).json();
const magnetic = (await css('frontend/src/styles/magnetic.css'))
  .replace('/fonts/inter-latin-wght-normal.woff2', 'https://cdn.jsdelivr.net/npm/@fontsource-variable/inter@5/files/inter-latin-wght-normal.woff2');
const credit = await css('docs/prototypes/task-l3/app/credit.css');
const picker = await css('docs/prototypes/task-l3/app/picker.css');

const html = String.raw;
const page = html`<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>First-screen credit — five directions</title>

<style>
*,*::before,*::after{box-sizing:border-box}
html{color-scheme:dark;scroll-behavior:smooth}
body{margin:0;background:#161618;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}*,*::before,*::after{animation-duration:.01ms!important;transition-duration:.01ms!important}}
.vh{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap;border:0}
a:focus-visible,button:focus-visible{outline:2px solid currentColor;outline-offset:3px}
.media-fallback{display:grid;place-content:center;text-align:center;padding:20px;background:#202024;color:#aeb0b6;min-height:100px;font:12px/1.6 ui-monospace,monospace}
main{padding-bottom:120px}
</style>

<style>/* ─── frontend/src/styles/magnetic.css, verbatim but for the font URL ─── */
${magnetic}</style>
<style>/* ─── docs/prototypes/task-l3/app/credit.css, verbatim ─── */
${credit}</style>
<style>/* ─── Picker · harness chrome, copied verbatim from PICKER.md ─── */
${picker}</style>

<div class="prototype-magnetic"><div class="vme m-run taste" data-mode="run" data-field="magnet">
  <a class="skip" href="#main">Skip to content</a>
  <nav class="nav" aria-label="Primary"><div class="wrap">
    <a class="brand" href="__SITE__/__LOCALE__/prompts">Prompt Library</a>
    <div class="navlinks"><a href="__SITE__/__LOCALE__/prompts#tasks">Tasks</a><a href="__SITE__/__LOCALE__/prompts#models">Models</a><a href="__SITE__/__LOCALE__/prompts#styles">Styles</a><a href="__SITE__/__LOCALE__/prompts#creators">Creators</a></div>
  </div></nav>
  <main id="main"><div id="stage"></div><div class="after" id="fold"></div></main>
</div></div>

<nav class="proto-picker" aria-label="Prototype variants">
  <span class="proto-picker-highlight" aria-hidden="true"></span>
  <button class="proto-picker-item" data-active aria-current="true">Current</button>
  <button class="proto-picker-item">Colophon</button>
  <button class="proto-picker-item">Signature</button>
  <button class="proto-picker-item">Plaque</button>
  <button class="proto-picker-item">Kinetic</button>
  <span class="proto-picker-divider" aria-hidden="true"></span>
  <button class="proto-picker-item proto-picker-replay" aria-label="Replay animation (R)">↻</button>
</nav>

<script>
const DATA = __DATA__;
const SITE = DATA.site, LOCALE = DATA.locale;
const esc = s => String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

/* Supplied by the user: nothing here is inferred. A credit with a guessed handle is worse than no
   credit at all. */
const CREDITS = [
  {name: 'Vincent Wu', handle: '@VincentWu11', href: 'https://x.com/VincentWu11'},
  {name: 'Steve Li', handle: '@st3v3li', href: 'https://x.com/st3v3li'},
];
const LINK = ' target="_blank" rel="nofollow noopener noreferrer"';

/* The shipped first screen, copied verbatim out of frontend/src/components/Hub.tsx. Every
   direction renders THIS and appends only the credit, so "nothing else changes" is structural. */
const argument = credit => '<section class="wrap argument"><h1>Somebody already wrote this</h1><div class="body">'
  + '<p>Every prompt in this library was published in the open by the person who wrote it, and then mostly lost — buried under a feed that is optimised for the next thing rather than the useful thing.</p>'
  + '<p>So the whole of the work here is <em>not editing</em>. No paraphrase, no house style, no distillation into a template. The text you copy is the text they posted, down to the render settings at the end that look like noise and are not.</p>'
  + '<p>What we add is the index, the attribution, and a link back. That is the entire product.</p>'
  + '</div>' + (credit || '') + '</section>';

const vCurrent = () => argument('');

const vColophon = () => argument('<div class="cr cr-colophon"><span class="cr-rule" aria-hidden="true"></span>'
  + '<p class="cr-line"><span class="cr-label">Credit to</span>'
  + CREDITS.map((p, i) => '<span class="cr-name" style="--i:' + i + '"><a href="' + p.href + '"' + LINK + '>' + esc(p.name) + '</a>'
    + (i === 0 ? '<span class="cr-amp" aria-hidden="true">&amp;</span>' : '') + '</span>').join('')
  + '</p></div>');

const vSignature = () => argument('<div class="cr cr-signature"><p class="cr-label cr-label-centred">Credit to</p><p class="cr-sig">'
  + '<a class="cr-sig-name" href="' + CREDITS[0].href + '"' + LINK + ' style="--i:0">' + esc(CREDITS[0].name) + '<span class="cr-stroke" aria-hidden="true"></span></a>'
  + '<span class="cr-sig-amp" aria-hidden="true">&amp;</span>'
  + '<a class="cr-sig-name" href="' + CREDITS[1].href + '"' + LINK + ' style="--i:1">' + esc(CREDITS[1].name) + '<span class="cr-stroke" aria-hidden="true"></span></a>'
  + '</p></div>');

const vPlaque = () => argument('<div class="cr cr-plaque"><p class="cr-label">Credit to</p><div class="cr-card">'
  + CREDITS.map((p, i) => '<a class="cr-row" href="' + p.href + '"' + LINK + ' style="--i:' + i + '">'
    + '<span class="cr-row-name">' + esc(p.name) + '</span><span class="cr-row-handle">' + esc(p.handle) + '</span>'
    + '<span class="cr-row-go" aria-hidden="true">↗</span></a>').join('') + '</div></div>');

/* The glyph spans are aria-hidden and the real name sits beside them, so the effect never costs
   the text. A space inside an inline-block would collapse, hence the non-breaking one. */
const glyphs = (word, offset) => [...word].map((glyph, i) =>
  '<span class="cr-glyph" style="--i:' + (offset + i) + '">' + esc(glyph === ' ' ? ' ' : glyph) + '</span>').join('');
function vKinetic(){
  let offset = 0;
  return argument('<div class="cr cr-kinetic"><p class="cr-label">Credit to</p><p class="cr-kin">'
    + CREDITS.map((p, index) => {
      const start = offset; offset += p.name.length + 3;
      return '<span class="cr-kin-part"><a class="cr-kin-name" href="' + p.href + '"' + LINK + '>'
        + '<span class="vh">' + esc(p.name) + '</span><span aria-hidden="true">' + glyphs(p.name, start) + '</span>'
        + '<span class="cr-stroke" aria-hidden="true"></span></a>'
        + (index === 0 ? '<span class="cr-kin-amp" aria-hidden="true" style="--i:' + (start + p.name.length) + '">&amp;</span>' : '') + '</span>';
    }).join('') + '</p></div>');
}

/* The fold: the shipped category band, so the credit is judged against what actually follows it. */
document.getElementById('fold').innerHTML = '<section class="sec" id="category"><div class="wrap">'
  + '<div class="sec-h"><h2>Browse by category</h2></div><div class="cat">'
  + [['image','Images'],['video','Videos']].map(([kind, label]) => {
    const rows = DATA.prompts.filter(p => p.kind === kind), rep = rows.find(p => p.img) || rows[0];
    return '<a class="tile" href="' + SITE + '/' + LOCALE + '/prompts/' + kind + '"><span class="th">'
      + (rep && rep.img ? '<img src="' + esc(rep.img) + '" alt="" width="560" height="350" loading="lazy" referrerpolicy="no-referrer">' : '')
      + '</span><span class="tb"><h3>' + label + '</h3><p>' + rows.length + ' prompts</p></span></a>';
  }).join('') + '</div></div></section>';

/* ── Picker wiring, verbatim from PICKER.md. Four of five have an entrance, so the replay
   control is rendered. In production that entrance would be gated to once per session
   (sessionStorage); here it runs on every mount, because a motion you cannot re-watch cannot
   be judged. ── */
const variants = [vCurrent, vColophon, vSignature, vPlaque, vKinetic];
const stage = document.getElementById('stage');
const picker = document.querySelector('.proto-picker');
const highlight = picker.querySelector('.proto-picker-highlight');
const items = [...picker.querySelectorAll('.proto-picker-item:not(.proto-picker-replay)')];
const replay = picker.querySelector('.proto-picker-replay');
let current = 0;

function moveHighlight() {
  const el = items[current];
  highlight.style.width = el.offsetWidth + 'px';
  highlight.style.transform = 'translateX(' + el.offsetLeft + 'px)';
}
function mount(i) {
  stage.innerHTML = '';
  // Clear first, render next frame, so entrance animations re-run.
  requestAnimationFrame(() => { stage.innerHTML = variants[i](); });
}
function setActive(i) {
  if (i < 0 || i >= variants.length) return;
  current = i;
  items.forEach((el, j) => {
    el.toggleAttribute('data-active', j === i);
    if (j === i) el.setAttribute('aria-current', 'true');
    else el.removeAttribute('aria-current');
  });
  moveHighlight();
  const url = new URL(location);
  url.searchParams.set('v', i + 1);
  history.replaceState(null, '', url);
  mount(i);
}
items.forEach((el, i) => el.addEventListener('click', () => setActive(i)));
replay?.addEventListener('click', () => mount(current));
window.addEventListener('resize', moveHighlight);
document.addEventListener('keydown', (e) => {
  if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable) return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const num = parseInt(e.key, 10);
  if (num >= 1 && num <= variants.length) setActive(num - 1);
  else if (e.key === 'ArrowRight') setActive((current + 1) % variants.length);
  else if (e.key === 'ArrowLeft') setActive((current - 1 + variants.length) % variants.length);
  else if (e.key === 'r' || e.key === 'R') mount(current);
});
setActive((parseInt(new URLSearchParams(location.search).get('v'), 10) || 1) - 1);
requestAnimationFrame(() => requestAnimationFrame(() => picker.setAttribute('data-ready', '')));
</script>
`;

const out = page
  .replaceAll('__SITE__', payload.site)
  .replaceAll('__LOCALE__', payload.locale)
  .replace('__DATA__', JSON.stringify({site: payload.site, locale: payload.locale,
    prompts: payload.prompts.map(p => ({kind: p.kind, img: p.img}))}));
await writeFile(new URL('docs/wireframes/proto-l1-credit.html', root), out);
console.log('wrote docs/wireframes/proto-l1-credit.html —', (out.length / 1024).toFixed(0) + 'KB');
