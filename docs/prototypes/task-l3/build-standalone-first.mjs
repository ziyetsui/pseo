/* Generates the single-file first-screen picker at docs/wireframes/proto-l1-first-screen.html.
   Same contract as build-standalone.mjs: the tokens are magnetic.css, the band rules are
   app/first.css, the picker is app/picker.css, and the data is baked from /browse/data, so the
   static file is a build of this exploration rather than a second hand-made copy of it. */
import {readFile,writeFile} from 'node:fs/promises';

const root = new URL('../../../', import.meta.url);
const css = async p => readFile(new URL(p, root), 'utf8');
const payload = await (await fetch('http://127.0.0.1:8767/browse/data')).json();
const magnetic = (await css('frontend/src/styles/magnetic.css'))
  .replace('/fonts/inter-latin-wght-normal.woff2', 'https://cdn.jsdelivr.net/npm/@fontsource-variable/inter@5/files/inter-latin-wght-normal.woff2');
const first = await css('docs/prototypes/task-l3/app/first.css');
const picker = await css('docs/prototypes/task-l3/app/picker.css');

const html = String.raw;
const page = html`<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>L1 first screen — value and heat</title>

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

<style>/* ─── docs/prototypes/task-l3/app/first.css, verbatim ─── */
${first}</style>

<style>/* ─── Picker · harness chrome, copied verbatim from PICKER.md ─── */
${picker}</style>

<div class="prototype-magnetic"><div class="vme m-run taste" data-mode="run" data-field="magnet">
  <a class="skip" href="#main">Skip to content</a>
  <nav class="nav" aria-label="Primary"><div class="wrap">
    <a class="brand" href="__SITE__/__LOCALE__/prompts">Prompt Library</a>
    <div class="navlinks"><a href="__SITE__/__LOCALE__/prompts#tasks">Tasks</a><a href="__SITE__/__LOCALE__/prompts#models">Models</a><a href="__SITE__/__LOCALE__/prompts#styles">Styles</a><a href="__SITE__/__LOCALE__/prompts#creators">Creators</a></div>
  </div></nav>
  <main id="main"><div id="stage"></div></main>
</div></div>

<nav class="proto-picker" aria-label="Prototype variants">
  <span class="proto-picker-highlight" aria-hidden="true"></span>
  <button class="proto-picker-item" data-active aria-current="true">Current</button>
  <button class="proto-picker-item">Board</button>
  <button class="proto-picker-item">Quilt</button>
  <button class="proto-picker-item">Statement</button>
  <button class="proto-picker-item">Split</button>
</nav>

<script>
const DATA = __DATA__;
const SITE = DATA.site, LOCALE = DATA.locale, WHEN = DATA.observedAt;

/* What "value" and "heat" are allowed to mean here: saves and likes are observed source metrics
   that survive into the public read model. score and highValue are visual-fixture only, views is
   null on all but one record, and the snapshot has a single observation date — so nothing below
   encodes them and nothing says "trending now". */
const esc = s => String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const n = v => Number(v || 0).toLocaleString('en-US');
const plural = (c, one, many = one + 's') => n(c) + ' ' + (c === 1 ? one : many);
const sum = (rows, key) => rows.reduce((t, p) => t + (p[key] || 0), 0);
const KINDS = [['image','Images'],['video','Videos']];
const kindRows = () => KINDS.map(([kind, label]) => {
  const prompts = DATA.prompts.filter(p => p.kind === kind);
  return {kind, label, href: SITE + '/' + LOCALE + '/prompts/' + kind, prompts, saves: sum(prompts,'saves'), likes: sum(prompts,'likes')};
});
const unclassified = () => DATA.prompts.filter(p => p.kind !== 'image' && p.kind !== 'video');
const saveRate = r => r.likes ? r.saves / r.likes : 0;
const topSaved = (rows, c) => [...rows].sort((a,b) => (b.saves||0)-(a.saves||0)).slice(0, c);
/* Saves run three orders of magnitude here, so both encodings go through a square root. */
const ramp = (v, peak) => 4 + Math.sqrt(v / peak) * 12;
const side = (v, peak) => Math.sqrt(v / peak);
function taskRows(){
  const rows = DATA.tasks.map(t => ({slug: t.slug, label: t.label, prompts: DATA.prompts.filter(p => p.uses.some(r => r.slug === t.slug))}))
    .filter(r => r.prompts.length);
  const loose = DATA.prompts.filter(p => !p.uses.length);
  if (loose.length) rows.push({slug: '', label: 'No task named', prompts: loose});
  return rows.sort((a, b) => sum(b.prompts,'saves') - sum(a.prompts,'saves'));
}
const cellRows = (row, kind) => row.prompts.filter(p => p.kind === kind);
const media = (p, w, h) => p.img
  ? '<img src="' + esc(p.img) + '" alt="" width="' + w + '" height="' + h + '" loading="lazy" referrerpolicy="no-referrer">'
  : '<span class="media-fallback"><span>No image on the source post.</span></span>';

/* ── 1 · Current — the shipped first screen, verbatim from Hub.tsx ────── */
function vCurrent(){
  const kinds = kindRows();
  return '<section class="wrap argument"><h1>Somebody already wrote this</h1><div class="body">'
    + '<p>Every prompt in this library was published in the open by the person who wrote it, and then mostly lost — buried under a feed that is optimised for the next thing rather than the useful thing.</p>'
    + '<p>So the whole of the work here is <em>not editing</em>. No paraphrase, no house style, no distillation into a template. The text you copy is the text they posted, down to the render settings at the end that look like noise and are not.</p>'
    + '<p>What we add is the index, the attribution, and a link back. That is the entire product.</p>'
    + '</div></section><div class="after"><section class="sec" id="category"><div class="wrap"><div class="sec-h"><h2>Browse by category</h2></div><div class="cat">'
    + kinds.map(k => {
      const rep = k.prompts.find(p => p.img) || k.prompts[0];
      return '<a class="tile" href="' + esc(k.href) + '"><span class="th">' + (rep ? media(rep, 560, 350) : '')
        + '</span><span class="tb"><h3>' + k.label + '</h3><p>' + k.prompts.length + ' prompts</p></span></a>';
    }).join('') + '</div></div></section></div>';
}

/* ── 2 · Board — the first screen as a board of numbers ──────────────── */
function vBoard(){
  const kinds = kindRows(), rows = taskRows(), loose = unclassified();
  let peak = 1;
  rows.forEach(r => kinds.forEach(k => { peak = Math.max(peak, sum(cellRows(r, k.kind), 'saves')); }));
  const total = sum(DATA.prompts, 'saves');
  const lead = [...kinds].sort((a, b) => b.saves - a.saves)[0], other = kinds.find(k => k !== lead);
  const low = Math.min(...DATA.prompts.map(p => p.saves || 0));
  return '<section class="fs fs-board"><div class="wrap">'
    + '<p class="eyebrow">The board · snapshot ' + esc(WHEN) + '</p>'
    + '<h1 class="tier-index">' + n(total) + ' saves across ' + plural(DATA.prompts.length, 'prompt') + '</h1>'
    + '<p class="dek">A save is somebody putting a prompt aside to run it. ' + lead.label + ' take more of them than the other deck — '
    + n(lead.saves) + ' against ' + n(other.saves) + ' — from ' + (lead.prompts.length < other.prompts.length ? 'fewer' : 'more') + ' prompts.</p>'
    + '<div class="fs-decks">' + kinds.map(k => '<a class="fs-deck" href="' + esc(k.href) + '">'
      + '<span class="fs-deck-head"><b>' + k.label + '</b><span>' + plural(k.prompts.length, 'prompt') + '</span></span>'
      + '<span class="fs-deck-figure">' + n(k.saves) + '<em>saves</em></span>'
      + '<dl class="fs-deck-stats"><div><dt>Per prompt</dt><dd>' + n(Math.round(k.saves / k.prompts.length)) + '</dd></div>'
      + '<div><dt>Saves per like</dt><dd>' + saveRate(k).toFixed(2) + '</dd></div></dl>'
      + '<span class="fs-deck-go">Open the deck <span aria-hidden="true">→</span></span></a>').join('') + '</div>'
    + '<div class="fs-map"><table aria-describedby="fs-board-note"><caption class="vh">Saves by task and deck</caption><thead><tr>'
    + '<th scope="col" class="fs-corner">Task ↓ / Deck →</th>'
    + kinds.map(k => '<th scope="col">' + k.label + '<em>' + n(k.saves) + '</em></th>').join('')
    + '<th scope="col" class="fs-total">Both decks</th></tr></thead><tbody>'
    + rows.map(row => '<tr><th scope="row"><span class="fs-task">' + esc(row.label) + '<em>' + plural(row.prompts.length, 'prompt') + '</em></span></th>'
      + kinds.map(k => {
        const rs = cellRows(row, k.kind), saves = sum(rs, 'saves');
        if (!rs.length) return '<td><span class="fs-nil"><span aria-hidden="true">·</span><span class="vh">No ' + k.label.toLowerCase() + ' in ' + esc(row.label) + '</span></span></td>';
        const text = row.label + ' · ' + k.label + ' — ' + plural(rs.length, 'prompt') + ', ' + n(saves) + ' saves';
        const body = row.slug
          ? '<a class="fs-cell" href="' + SITE + '/' + LOCALE + '/prompts/' + k.kind + '?useCase=' + encodeURIComponent(row.slug)
            + '" data-tip="' + esc(text) + '" aria-label="' + esc(text) + '. Opens the ' + k.label.toLowerCase() + ' deck filtered to ' + esc(row.label) + '.">' + n(saves) + '</a>'
          /* No task, so no filter to open: the number is stated, not linked. */
          : '<span class="fs-cell fs-cell-flat">' + n(saves) + '</span>';
        return '<td class="fs-shade" style="--d:' + ramp(saves, peak).toFixed(1) + '%">' + body + '</td>';
      }).join('')
      + '<td class="fs-total"><span class="fs-cell fs-cell-flat">' + n(sum(row.prompts, 'saves')) + '</span></td></tr>').join('')
    + '</tbody></table></div>'
    + '<p class="fs-note" id="fs-board-note">Shade is the square root of the cell&rsquo;s saves against the busiest cell — saves run ' + n(low) + ' to ' + n(peak)
    + ' in this snapshot, and a linear ramp would flatten every row but one. A dot is a combination the library has nothing for.'
    + (loose.length ? ' ' + plural(loose.length, 'prompt') + ' is neither image nor video, so it appears in neither deck.' : '') + '</p>'
    + '</div></section>';
}

/* ── 3 · Quilt — the work itself, sized by how often it gets saved ───── */
const band = s => s >= .72 ? 'xl' : s >= .46 ? 'lg' : s >= .28 ? 'md' : 'sm';
function vQuilt(){
  const kinds = kindRows(), shown = topSaved(DATA.prompts.filter(p => p.img), 14);
  const peak = Math.max(1, ...shown.map(p => p.saves || 0));
  const low = Math.min(...DATA.prompts.map(p => p.saves || 0));
  const missing = DATA.prompts.length - shown.length;
  return '<section class="fs fs-quilt"><div class="wrap">'
    + '<p class="eyebrow">The quilt · snapshot ' + esc(WHEN) + '</p>'
    + '<h1 class="tier-index">What people actually save</h1>'
    + '<p class="dek">The ' + shown.length + ' most-saved prompts in the library, each tile sized by the square root of its saves. Open a deck, or open the one that caught you.</p>'
    + '<div class="fs-entries">' + kinds.map(k => '<a class="fs-entry" href="' + esc(k.href) + '"><b>' + k.label + '</b><span>'
      + plural(k.prompts.length, 'prompt') + ' · ' + n(k.saves) + ' saves</span><span aria-hidden="true">→</span></a>').join('') + '</div>'
    + '<ul class="fs-tiles">' + shown.map(p => '<li class="fs-tile fs-' + band(side(p.saves || 0, peak)) + '"><a href="' + esc(p.href) + '">'
      + '<span class="fs-tile-media">' + media(p, 480, 480) + '</span>'
      + '<span class="fs-tile-face"><b>' + n(p.saves) + '<em>saves</em></b>'
      + '<span class="fs-tile-title">' + esc(p.title) + '</span>'
      + '<span class="fs-tile-meta">' + esc(p.kind) + ' · ' + esc(p.handle) + '</span></span></a></li>').join('') + '</ul>'
    + '<p class="fs-note">Area follows the square root of saves, rounded to the grid — saves run ' + n(low) + ' to ' + n(peak)
    + ' here, so a linear area would leave most tiles invisible.'
    + (missing ? ' ' + plural(missing, 'prompt') + ' is not shown: one carries no image on its source post, and the rest sit below the top ' + shown.length + '.' : '')
    + '</p></div></section>';
}

/* ── 4 · Statement — the first screen as a printed statement ─────────── */
function vStatement(){
  const kinds = kindRows(), loose = unclassified();
  const total = sum(DATA.prompts, 'saves'), likes = sum(DATA.prompts, 'likes');
  const lead = [...kinds].sort((a, b) => saveRate(b) - saveRate(a))[0], other = kinds.find(k => k !== lead);
  const claim = topSaved(DATA.prompts, 1)[0];
  const peakRate = Math.max(...kinds.map(saveRate));
  return '<section class="fs fs-statement"><div class="wrap">'
    + '<p class="eyebrow">The statement · snapshot ' + esc(WHEN) + '</p>'
    + '<h1 class="fs-figure">' + n(total) + '<em>saves</em></h1>'
    + '<p class="dek">Across ' + plural(DATA.prompts.length, 'prompt') + ' and ' + n(likes)
    + ' likes. A like is applause; a save is somebody putting the text aside to run it, which is the only number here that behaves like intent.</p>'
    + '<dl class="fs-lines">' + kinds.map(k => '<div class="fs-line">'
      + '<dt><a href="' + esc(k.href) + '">' + k.label + '<span aria-hidden="true">→</span></a></dt>'
      + '<dd class="fs-line-n">' + plural(k.prompts.length, 'prompt') + '</dd>'
      + '<dd class="fs-line-n">' + n(k.saves) + ' saves</dd>'
      + '<dd class="fs-line-n">' + saveRate(k).toFixed(2) + ' per like</dd>'
      + '<dd class="fs-line-bar"><span style="--w:' + (saveRate(k) / peakRate) * 100 + '%" aria-hidden="true"></span></dd></div>').join('') + '</dl>'
    + '<p class="fs-read">' + lead.label + ' are ' + (saveRate(lead) / saveRate(other)).toFixed(1) + '× as likely to be saved as liked than '
    + other.label.toLowerCase() + ', from ' + (other.prompts.length > lead.prompts.length ? 'half the prompts' : 'more prompts')
    + '. That gap is the whole argument for keeping both decks separate.</p>'
    + '<figure class="fs-quote"><blockquote><p>The one prompt in this library that names a price is its most-saved: its author says the pipeline it replaces runs <q>web studio build: $6,000-$35,000+</q>.</p></blockquote>'
    + '<figcaption>' + esc(claim.handle) + ', <cite>' + esc(claim.title) + '</cite> · ' + n(claim.saves) + ' saves · '
    + '<a href="' + esc(claim.sourceUrl) + '" target="_blank" rel="nofollow noopener noreferrer">the source post <span aria-hidden="true">↗</span></a>'
    + '<span>Their claim about their own work, quoted. Not a measurement of this library.</span></figcaption></figure>'
    + '<ol class="fs-ranked">' + topSaved(DATA.prompts, 5).map((p, i) => '<li><span class="fs-rank">' + String(i + 1).padStart(2, '0') + '</span>'
      + '<a href="' + esc(p.href) + '">' + esc(p.title) + '</a>'
      + '<span class="fs-ranked-meta">' + esc(p.handle) + ' · ' + esc(p.kind) + '</span><b>' + n(p.saves) + '</b></li>').join('') + '</ol>'
    + (loose.length ? '<p class="fs-note">' + plural(loose.length, 'prompt') + ' is neither image nor video, so neither line item above reaches it.</p>' : '')
    + '</div></section>';
}

/* ── 5 · Split — two decks, two columns, the same four measures ──────── */
function vSplit(){
  const kinds = kindRows(), loose = unclassified();
  const peaks = {
    prompts: Math.max(...kinds.map(k => k.prompts.length)),
    saves: Math.max(...kinds.map(k => k.saves)),
    per: Math.max(...kinds.map(k => k.saves / k.prompts.length)),
    rate: Math.max(...kinds.map(saveRate)),
  };
  return '<section class="fs fs-split"><div class="wrap">'
    + '<p class="eyebrow">Head to head · snapshot ' + esc(WHEN) + '</p>'
    + '<h1 class="tier-index">Two decks, ' + n(sum(DATA.prompts, 'saves')) + ' saves</h1>'
    + '<p class="dek">Same four measures down each side. Pick a side and the deck opens.</p>'
    + '<div class="fs-duel">' + kinds.map(k => {
      const measures = [
        ['Prompts', k.prompts.length, n(k.prompts.length), peaks.prompts],
        ['Saves', k.saves, n(k.saves), peaks.saves],
        ['Saves per prompt', k.saves / k.prompts.length, n(Math.round(k.saves / k.prompts.length)), peaks.per],
        ['Saves per like', saveRate(k), saveRate(k).toFixed(2), peaks.rate],
      ];
      return '<section class="fs-side"><a class="fs-side-head" href="' + esc(k.href) + '"><h2>' + k.label + '</h2>'
        + '<span>Open the deck <span aria-hidden="true">→</span></span></a>'
        /* Every measure carries the same bar against its own peak: two of four would read as a
           judgement about which two matter, and the eye compares position, not scale. */
        + '<dl class="fs-measures">' + measures.map(([label, value, shown, peak]) => '<div><dt>' + label + '</dt>'
          + '<dd>' + shown + '<span class="fs-track" aria-hidden="true"><span class="fs-mini" style="--w:' + (value / peak) * 100 + '%"></span></span></dd></div>').join('') + '</dl>'
        + '<p class="fs-side-label">Most saved in this deck</p>'
        + '<ol class="fs-side-list">' + topSaved(k.prompts, 3).map(p => '<li><a href="' + esc(p.href) + '">'
          + '<span class="fs-side-media">' + media(p, 160, 160) + '</span>'
          + '<span class="fs-side-copy"><b>' + esc(p.title) + '</b><span>' + esc(p.handle) + '</span></span>'
          + '<span class="fs-side-n">' + n(p.saves) + '<em>saves</em></span></a></li>').join('') + '</ol></section>';
    }).join('') + '</div>'
    + (loose.length ? '<p class="fs-note">' + plural(loose.length, 'prompt') + ' is neither image nor video, so it belongs to neither side and appears in neither deck.</p>' : '')
    + '</div></section>';
}

/* ── Picker wiring, verbatim from PICKER.md. No replay: nothing has an entrance. ── */
const variants = [vCurrent, vBoard, vQuilt, vStatement, vSplit];
const stage = document.getElementById('stage');
const picker = document.querySelector('.proto-picker');
const highlight = picker.querySelector('.proto-picker-highlight');
const items = [...picker.querySelectorAll('.proto-picker-item:not(.proto-picker-replay)')];
let current = 0;

function moveHighlight() {
  const el = items[current];
  highlight.style.width = el.offsetWidth + 'px';
  highlight.style.transform = 'translateX(' + el.offsetLeft + 'px)';
}
function mount(i) { stage.innerHTML = variants[i](); }
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
window.addEventListener('resize', moveHighlight);
document.addEventListener('keydown', (e) => {
  if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable) return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const num = parseInt(e.key, 10);
  if (num >= 1 && num <= variants.length) setActive(num - 1);
  else if (e.key === 'ArrowRight') setActive((current + 1) % variants.length);
  else if (e.key === 'ArrowLeft') setActive((current - 1 + variants.length) % variants.length);
});
setActive((parseInt(new URLSearchParams(location.search).get('v'), 10) || 1) - 1);
requestAnimationFrame(() => requestAnimationFrame(() => picker.setAttribute('data-ready', '')));

/* The board's hover layer: one tip element, driven by the cells' own data-tip, on hover and on
   keyboard focus. Pointer-events off so it can never intercept a click on the cell under it. */
const tip = document.createElement('span');
tip.className = 'fs-tip';
tip.hidden = true;
/* Inside the scoped wrapper, not on <body>: every rule in this file is written under
   .prototype-magnetic, so a tip parked on the body inherits none of them — including its own
   pointer-events:none, which is what stops it eating the click on the cell it describes. */
document.querySelector('.prototype-magnetic').append(tip);
const show = el => {
  const box = el.getBoundingClientRect();
  tip.textContent = el.dataset.tip;
  tip.style.left = box.left + 'px';
  tip.style.top = box.top + 'px';
  tip.hidden = false;
};
for (const type of ['mouseover', 'focusin']) document.addEventListener(type, e => {
  const cell = e.target.closest?.('.fs-cell[data-tip]');
  if (cell) show(cell); else tip.hidden = true;
});
for (const type of ['mouseout', 'focusout']) document.addEventListener(type, () => { tip.hidden = true; });
document.addEventListener('scroll', () => { tip.hidden = true; }, {passive: true});
</script>
`;

const out = page
  .replaceAll('__SITE__', payload.site)
  .replaceAll('__LOCALE__', payload.locale)
  .replace('__DATA__', JSON.stringify(payload));
await writeFile(new URL('docs/wireframes/proto-l1-first-screen.html', root), out);
console.log('wrote docs/wireframes/proto-l1-first-screen.html —', (out.length / 1024).toFixed(0) + 'KB,', payload.prompts.length, 'prompts');
