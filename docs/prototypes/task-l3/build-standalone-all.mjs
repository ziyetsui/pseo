/* Generates the combined single-file picker: docs/wireframes/proto-picker.html.
   Three surfaces, fourteen directions, one file. Same contract as the two per-surface generators —
   the tokens are magnetic.css, each surface's rules are its own stylesheet, the picker is
   PICKER.md's, and the data is baked from /browse/data. Re-run after any of those change. */
import {readFile,writeFile} from 'node:fs/promises';

const root = new URL('../../../', import.meta.url);
const css = async p => readFile(new URL(p, root), 'utf8');
const payload = await (await fetch('http://127.0.0.1:8767/browse/data')).json();
const magnetic = (await css('frontend/src/styles/magnetic.css'))
  .replace('/fonts/inter-latin-wght-normal.woff2', 'https://cdn.jsdelivr.net/npm/@fontsource-variable/inter@5/files/inter-latin-wght-normal.woff2');
const firstCss = await css('docs/prototypes/task-l3/app/first.css');
const bandCss = await css('docs/prototypes/task-l3/app/browse.css');
const creditCss = await css('docs/prototypes/task-l3/app/credit.css');
const taskCss = await css('docs/prototypes/task-l3/app/prototype.css');
const pickerCss = await css('docs/prototypes/task-l3/app/picker.css');

const html = String.raw;
const page = html`<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Prompt Library — three surfaces, fourteen directions</title>

<style>
*,*::before,*::after{box-sizing:border-box}
html{color-scheme:dark;scroll-behavior:smooth}
body{margin:0;background:#161618;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}*,*::before,*::after{animation-duration:.01ms!important;transition-duration:.01ms!important}}
.vh{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap;border:0}
a:focus-visible,button:focus-visible{outline:2px solid currentColor;outline-offset:3px}
.media-fallback{display:grid;place-content:center;text-align:center;padding:20px;background:#202024;color:#aeb0b6;min-height:100px;font:12px/1.6 ui-monospace,monospace}
.prototype-magnetic main{padding-bottom:130px}
.task-shell .task-footer{padding-bottom:130px}
</style>

<style>/* ─── frontend/src/styles/magnetic.css, verbatim but for the font URL ─── */
${magnetic}</style>
<style>/* ─── app/first.css, verbatim ─── */
${firstCss}</style>
<style>/* ─── app/browse.css, verbatim ─── */
${bandCss}</style>
<style>/* ─── app/credit.css, verbatim ─── */
${creditCss}</style>
<style>/* ─── app/prototype.css (the task page's own chrome), verbatim ─── */
${taskCss}</style>
<style>/* ─── Picker · harness chrome, copied verbatim from PICKER.md ─── */
${pickerCss}</style>

<style>
/* The surface switch. PICKER.md specifies one control, and a three-surface file needs a second —
   so it is built to read as the same harness chrome rather than as part of any design: same dark
   glass, same font, quieter and pinned to the opposite edge so it can never be mistaken for the
   picker or for product UI. Nothing about the picker itself is changed. */
.proto-surface{position:fixed;top:14px;left:50%;transform:translateX(-50%);z-index:2147483646;display:flex;align-items:center;gap:2px;
  padding:3px;border-radius:999px;background:rgba(10,10,10,.72);-webkit-backdrop-filter:blur(12px) saturate(1.4);backdrop-filter:blur(12px) saturate(1.4);
  box-shadow:0 0 0 1px rgba(255,255,255,.06) inset,0 6px 18px rgba(0,0,0,.2);
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:12px;line-height:1;-webkit-font-smoothing:antialiased;user-select:none;-webkit-user-select:none}
.proto-surface-highlight{position:absolute;top:3px;left:0;height:24px;border-radius:999px;background:rgba(255,255,255,.1);will-change:transform}
.proto-surface[data-ready] .proto-surface-highlight{transition:transform 250ms cubic-bezier(.23,1,.32,1),width 250ms cubic-bezier(.23,1,.32,1)}
@media (prefers-reduced-motion:reduce){.proto-surface[data-ready] .proto-surface-highlight{transition:none}}
.proto-surface-item{position:relative;display:flex;align-items:center;height:24px;padding:0 11px;border:0;border-radius:999px;background:transparent;
  color:rgba(255,255,255,.5);font:inherit;white-space:nowrap;cursor:pointer;transition:color 150ms ease-out}
.proto-surface-item:hover{color:rgba(255,255,255,.8)}
.proto-surface-item:active{transform:scale(.97)}
.proto-surface-item:focus-visible{outline:2px solid rgba(255,255,255,.4);outline-offset:2px}
.proto-surface-item[data-active]{color:#fff}
/* Narrow: the page header owns the top of the screen, so the surface switch stacks above the
   picker instead of covering it. Nothing moves in the page itself. */
@media (max-width:900px){
  .proto-surface{top:auto;bottom:68px;font-size:11px}
  .proto-surface-item{padding:0 9px}
}
</style>

<nav class="proto-surface" aria-label="Prototype surface — bracket keys switch">
  <span class="proto-surface-highlight" aria-hidden="true"></span>
  <button class="proto-surface-item" data-active aria-current="true">L1 first screen</button>
  <button class="proto-surface-item">Browse by task</button>
  <button class="proto-surface-item">Task page</button>
  <button class="proto-surface-item">First-screen credit</button>
</nav>

<div id="stage"></div>

<nav class="proto-picker" aria-label="Prototype variants">
  <span class="proto-picker-highlight" aria-hidden="true"></span>
  <button class="proto-picker-item">1</button>
  <button class="proto-picker-item">2</button>
  <button class="proto-picker-item">3</button>
  <button class="proto-picker-item">4</button>
  <button class="proto-picker-item">5</button>
</nav>

<script>
const DATA = __DATA__;
const SITE = DATA.site, LOCALE = DATA.locale, WHEN = DATA.observedAt;

/* ── helpers ─────────────────────────────────────────────────────────── */
const esc = s => String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const n = v => Number(v || 0).toLocaleString('en-US');
const plural = (c, one, many = one + 's') => n(c) + ' ' + (c === 1 ? one : many);
const sum = (rows, key) => rows.reduce((t, p) => t + (p[key] || 0), 0);
const byCount = (a, b) => b.count - a.count || a.label.localeCompare(b.label);
const media = (p, w, h) => p.img
  ? '<img src="' + esc(p.img) + '" alt="" width="' + w + '" height="' + h + '" loading="lazy" referrerpolicy="no-referrer">'
  : '<span class="media-fallback"><span>No image on the source post.</span></span>';
const generationLabel = kind => kind === 'image' ? 'Generate image' : kind === 'video' ? 'Generate video' : 'Generate';
const shell = inner => '<div class="prototype-magnetic"><div class="vme m-run taste" data-mode="run" data-field="magnet">'
  + '<a class="skip" href="#main">Skip to content</a>'
  + '<nav class="nav" aria-label="Primary"><div class="wrap"><a class="brand" href="' + SITE + '/' + LOCALE + '/prompts">Prompt Library</a>'
  + '<div class="navlinks"><a href="' + SITE + '/' + LOCALE + '/prompts#tasks">Tasks</a><a href="' + SITE + '/' + LOCALE + '/prompts#models">Models</a>'
  + '<a href="' + SITE + '/' + LOCALE + '/prompts#styles">Styles</a><a href="' + SITE + '/' + LOCALE + '/prompts#creators">Creators</a></div></div></nav>'
  + '<main id="main">' + inner + '</main></div></div>';

/* What "value" and "heat" are allowed to mean: saves and likes are observed source metrics that
   survive into the public read model. score and highValue are visual-fixture only, views is null
   on all but one record, and the snapshot has one observation date — so nothing here encodes them
   and nothing says "trending now". */
const KINDS = [['image','Images'],['video','Videos']];
const kindRows = () => KINDS.map(([kind, label]) => {
  const prompts = DATA.prompts.filter(p => p.kind === kind);
  return {kind, label, href: SITE + '/' + LOCALE + '/prompts/' + kind, prompts, saves: sum(prompts,'saves'), likes: sum(prompts,'likes')};
});
const unclassified = () => DATA.prompts.filter(p => p.kind !== 'image' && p.kind !== 'video');
const saveRate = r => r.likes ? r.saves / r.likes : 0;
const topSaved = (rows, c) => [...rows].sort((a,b) => (b.saves||0)-(a.saves||0)).slice(0, c);
/* Saves run three orders of magnitude, so both encodings go through a square root. */
const ramp = (v, peak) => 4 + Math.sqrt(v / peak) * 12;
const side = (v, peak) => Math.sqrt(v / peak);

/* ══════════════════════════════════════════════════════════════════════
   Surface 1 · L1 first screen
   ══════════════════════════════════════════════════════════════════════ */
function fsTaskRows(){
  const rows = DATA.tasks.map(t => ({slug: t.slug, label: t.label, prompts: DATA.prompts.filter(p => p.uses.some(r => r.slug === t.slug))}))
    .filter(r => r.prompts.length);
  const loose = DATA.prompts.filter(p => !p.uses.length);
  if (loose.length) rows.push({slug: '', label: 'No task named', prompts: loose});
  return rows.sort((a, b) => sum(b.prompts,'saves') - sum(a.prompts,'saves'));
}
const cellRows = (row, kind) => row.prompts.filter(p => p.kind === kind);

function fsCurrent(){
  const kinds = kindRows();
  return shell('<section class="wrap argument"><h1>Somebody already wrote this</h1><div class="body">'
    + '<p>Every prompt in this library was published in the open by the person who wrote it, and then mostly lost — buried under a feed that is optimised for the next thing rather than the useful thing.</p>'
    + '<p>So the whole of the work here is <em>not editing</em>. No paraphrase, no house style, no distillation into a template. The text you copy is the text they posted, down to the render settings at the end that look like noise and are not.</p>'
    + '<p>What we add is the index, the attribution, and a link back. That is the entire product.</p>'
    + '</div></section><div class="after"><section class="sec" id="category"><div class="wrap"><div class="sec-h"><h2>Browse by category</h2></div><div class="cat">'
    + kinds.map(k => {
      const rep = k.prompts.find(p => p.img) || k.prompts[0];
      return '<a class="tile" href="' + esc(k.href) + '"><span class="th">' + (rep ? media(rep, 560, 350) : '')
        + '</span><span class="tb"><h3>' + k.label + '</h3><p>' + k.prompts.length + ' prompts</p></span></a>';
    }).join('') + '</div></div></section></div>');
}
function fsBoard(){
  const kinds = kindRows(), rows = fsTaskRows(), loose = unclassified();
  let peak = 1;
  rows.forEach(r => kinds.forEach(k => { peak = Math.max(peak, sum(cellRows(r, k.kind), 'saves')); }));
  const lead = [...kinds].sort((a, b) => b.saves - a.saves)[0], other = kinds.find(k => k !== lead);
  const low = Math.min(...DATA.prompts.map(p => p.saves || 0));
  return shell('<section class="fs fs-board"><div class="wrap">'
    + '<p class="eyebrow">The board · snapshot ' + esc(WHEN) + '</p>'
    + '<h1 class="tier-index">' + n(sum(DATA.prompts,'saves')) + ' saves across ' + plural(DATA.prompts.length, 'prompt') + '</h1>'
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
          : '<span class="fs-cell fs-cell-flat">' + n(saves) + '</span>';
        return '<td class="fs-shade" style="--d:' + ramp(saves, peak).toFixed(1) + '%">' + body + '</td>';
      }).join('')
      + '<td class="fs-total"><span class="fs-cell fs-cell-flat">' + n(sum(row.prompts, 'saves')) + '</span></td></tr>').join('')
    + '</tbody></table></div>'
    + '<p class="fs-note" id="fs-board-note">Shade is the square root of the cell&rsquo;s saves against the busiest cell — saves run ' + n(low) + ' to ' + n(peak)
    + ' in this snapshot, and a linear ramp would flatten every row but one. A dot is a combination the library has nothing for.'
    + (loose.length ? ' ' + plural(loose.length, 'prompt') + ' is neither image nor video, so it appears in neither deck.' : '') + '</p>'
    + '</div></section>');
}
const band = s => s >= .72 ? 'xl' : s >= .46 ? 'lg' : s >= .28 ? 'md' : 'sm';
function fsQuilt(){
  const kinds = kindRows(), shown = topSaved(DATA.prompts.filter(p => p.img), 14);
  const peak = Math.max(1, ...shown.map(p => p.saves || 0)), low = Math.min(...DATA.prompts.map(p => p.saves || 0));
  const missing = DATA.prompts.length - shown.length;
  return shell('<section class="fs fs-quilt"><div class="wrap">'
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
    + '</p></div></section>');
}
function fsStatement(){
  const kinds = kindRows(), loose = unclassified();
  const lead = [...kinds].sort((a, b) => saveRate(b) - saveRate(a))[0], other = kinds.find(k => k !== lead);
  const claim = topSaved(DATA.prompts, 1)[0], peakRate = Math.max(...kinds.map(saveRate));
  return shell('<section class="fs fs-statement"><div class="wrap">'
    + '<p class="eyebrow">The statement · snapshot ' + esc(WHEN) + '</p>'
    + '<h1 class="fs-figure">' + n(sum(DATA.prompts,'saves')) + '<em>saves</em></h1>'
    + '<p class="dek">Across ' + plural(DATA.prompts.length, 'prompt') + ' and ' + n(sum(DATA.prompts,'likes'))
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
    + '</div></section>');
}
function fsSplit(){
  const kinds = kindRows(), loose = unclassified();
  const peaks = {prompts: Math.max(...kinds.map(k => k.prompts.length)), saves: Math.max(...kinds.map(k => k.saves)),
    per: Math.max(...kinds.map(k => k.saves / k.prompts.length)), rate: Math.max(...kinds.map(saveRate))};
  return shell('<section class="fs fs-split"><div class="wrap">'
    + '<p class="eyebrow">Head to head · snapshot ' + esc(WHEN) + '</p>'
    + '<h1 class="tier-index">Two decks, ' + n(sum(DATA.prompts,'saves')) + ' saves</h1>'
    + '<p class="dek">Same four measures down each side. Pick a side and the deck opens.</p>'
    + '<div class="fs-duel">' + kinds.map(k => {
      const measures = [['Prompts', k.prompts.length, n(k.prompts.length), peaks.prompts],
        ['Saves', k.saves, n(k.saves), peaks.saves],
        ['Saves per prompt', k.saves / k.prompts.length, n(Math.round(k.saves / k.prompts.length)), peaks.per],
        ['Saves per like', saveRate(k), saveRate(k).toFixed(2), peaks.rate]];
      return '<section class="fs-side"><a class="fs-side-head" href="' + esc(k.href) + '"><h2>' + k.label + '</h2>'
        + '<span>Open the deck <span aria-hidden="true">→</span></span></a>'
        + '<dl class="fs-measures">' + measures.map(m => '<div><dt>' + m[0] + '</dt><dd>' + m[2]
          + '<span class="fs-track" aria-hidden="true"><span class="fs-mini" style="--w:' + (m[1] / m[3]) * 100 + '%"></span></span></dd></div>').join('') + '</dl>'
        + '<p class="fs-side-label">Most saved in this deck</p>'
        + '<ol class="fs-side-list">' + topSaved(k.prompts, 3).map(p => '<li><a href="' + esc(p.href) + '">'
          + '<span class="fs-side-media">' + media(p, 160, 160) + '</span>'
          + '<span class="fs-side-copy"><b>' + esc(p.title) + '</b><span>' + esc(p.handle) + '</span></span>'
          + '<span class="fs-side-n">' + n(p.saves) + '<em>saves</em></span></a></li>').join('') + '</ol></section>';
    }).join('') + '</div>'
    + (loose.length ? '<p class="fs-note">' + plural(loose.length, 'prompt') + ' is neither image nor video, so it belongs to neither side and appears in neither deck.</p>' : '')
    + '</div></section>');
}

/* ══════════════════════════════════════════════════════════════════════
   Surface 2 · Browse by task band
   In this file a task entry stays inside the picker: it opens surface 3 for that task, which is
   the direction being explored for that destination. Real hrefs, so a reload lands in the same
   place. Everything the file has no direction for still leaves for the running site.
   ══════════════════════════════════════════════════════════════════════ */
const taskHref = task => '?s=3&task=' + encodeURIComponent(task.slug);
function bandRows(){
  return DATA.tasks.map(task => {
    const prompts = DATA.prompts.filter(p => p.uses.some(r => r.slug === task.slug));
    const models = new Map();
    prompts.forEach(p => p.models.forEach(r => models.set(r.slug, {...r, count: (models.get(r.slug)?.count || 0) + 1})));
    return {task, prompts, images: prompts.filter(p => p.kind === 'image').length, videos: prompts.filter(p => p.kind === 'video').length,
      models: [...models.values()].sort(byCount), shots: prompts.filter(p => p.img)};
  }).filter(r => r.prompts.length).sort((a, b) => byCount(a.task, b.task));
}
function modelColumns(){
  const models = new Map();
  for (const p of DATA.prompts) for (const r of p.models) models.set(r.slug, {...r, count: (models.get(r.slug)?.count || 0) + 1});
  return [...models.values()].sort(byCount);
}
const bandCell = (row, slug) => row.prompts.filter(p => p.models.some(r => r.slug === slug)).length;
const unfiled = () => DATA.prompts.filter(p => !p.uses.length);
function splitLabel(row){
  const parts = [];
  if (row.images) parts.push(plural(row.images, 'image'));
  if (row.videos) parts.push(plural(row.videos, 'video'));
  const rest = row.prompts.length - row.images - row.videos;
  if (rest) parts.push(rest + ' uncategorised');
  return parts.join(' · ');
}
const bandFoot = noun => {
  const loose = unfiled().length;
  return loose ? '<p class="bx-foot">' + loose + ' of ' + DATA.prompts.length + ' prompts carry no task yet, so no ' + noun + ' above reaches them.</p>' : '';
};
const bandHead = end => '<div class="sec-h"><h2>Browse by task</h2><span class="bx-end">' + end + '</span></div>';
const bandScale = () => plural(DATA.tasks.length, 'task') + ' · ' + plural(DATA.prompts.length, 'prompt');
const bandIntro = '<section class="wrap bx-intro"><p class="eyebrow">Browse band exploration</p><h1 class="tier-index">Browse by task</h1>'
  + '<p class="dek">Five ways to print the task taxonomy on L1. Every entry opens that task&rsquo;s page — surface 3 in this file. The bands above and below are the shipped ones.</p></section>';
function hubBand(axis, id, heading, hrefFor){
  const used = new Set(), representatives = new Map(), refs = new Map();
  for (const p of DATA.prompts) for (const r of p[axis]) refs.set(r.slug, {...r, count: (refs.get(r.slug)?.count || 0) + 1});
  const options = [...refs.values()].sort(byCount).map(ref => ({ref, candidates: DATA.prompts.filter(p => p.img && p[axis].some(r => r.slug === ref.slug))}));
  // The reference gives scarce image sets first choice so every real category can retain a unique print.
  for (const item of [...options].sort((a, b) => a.candidates.length - b.candidates.length)) {
    const prompt = item.candidates.find(p => p.img && !used.has(p.img));
    if (prompt) { used.add(prompt.img); representatives.set(item.ref.slug, prompt); }
  }
  const items = options.map(({ref}) => ({ref, prompt: representatives.get(ref.slug)})).filter(i => i.prompt);
  return '<section class="sec" id="' + id + '"><div class="wrap"><div class="sec-h"><h2>' + heading + '</h2></div><div class="tiles">'
    + items.map(({ref, prompt}) => '<a class="tile" href="' + esc(hrefFor(ref)) + '"><span class="th">' + media(prompt, 320, 200)
      + '</span><span class="tb"><h3 lang="' + LOCALE + '">' + esc(ref.label) + '</h3><p>' + ref.count + ' prompts</p></span></a>').join('')
    + '</div></div></section>';
}
function categoryBand(){
  return '<section class="sec" id="category"><div class="wrap"><div class="sec-h"><h2>Browse by category</h2></div><div class="cat">'
    + KINDS.map(([kind, label]) => {
      const rows = DATA.prompts.filter(p => p.kind === kind), rep = rows.find(p => p.img) || rows[0];
      return '<a class="tile" href="' + SITE + '/' + LOCALE + '/prompts/' + kind + '"><span class="th">' + (rep ? media(rep, 560, 350) : '')
        + '</span><span class="tb"><h3>' + label + '</h3><p>' + rows.length + ' prompts</p></span></a>';
    }).join('') + '</div></div></section>';
}
const bandNeighbours = middle => shell(bandIntro + '<div class="after">' + categoryBand() + middle
  + hubBand('models', 'models', 'Browse by model', ref => SITE + '/' + LOCALE + '/prompts/models/' + ref.slug) + '</div>');

const bxCurrent = () => bandNeighbours(hubBand('uses', 'tasks', 'Browse by task',
  ref => taskHref(DATA.tasks.find(t => t.slug === ref.slug) || {slug: ref.slug})));
function bxPlate(){
  const rows = bandRows(), columns = modelColumns(), loose = unfiled().length;
  let peak = 1;
  rows.forEach(row => columns.forEach(m => { peak = Math.max(peak, bandCell(row, m.slug)); }));
  return bandNeighbours('<section class="sec" id="tasks"><div class="wrap">' + bandHead(bandScale())
    + '<p class="bx-note" id="bx-plate-note">Prompts per task and model. Shade is the count, printed in every cell; a dot is an intersection nothing covers yet. A task name opens its page, a cell opens it narrowed to that model.</p>'
    + '<div class="bx-map"><table aria-describedby="bx-plate-note"><caption class="vh">Prompt counts by task and model</caption>'
    + '<thead><tr><th scope="col" class="bx-corner">Task ↓ / Model →</th>'
    + columns.map(m => '<th scope="col">' + esc(m.label) + '<em>' + m.count + '</em></th>').join('') + '</tr></thead><tbody>'
    + rows.map(row => '<tr><th scope="row"><a class="bx-task" href="' + esc(taskHref(row.task)) + '">' + esc(row.task.label) + '<em>' + row.prompts.length + '</em></a></th>'
      + columns.map(m => {
        const count = bandCell(row, m.slug);
        if (!count) return '<td><span class="bx-nil"><span aria-hidden="true">·</span><span class="vh">No prompts: ' + esc(row.task.label) + ' and ' + esc(m.label) + '</span></span></td>';
        return '<td class="bx-shade" style="--d:' + (4 + (count / peak) * 12).toFixed(1) + '%"><a class="bx-cell" href="'
          + esc(taskHref(row.task)) + '&amp;model=' + encodeURIComponent(m.slug) + '" aria-label="' + plural(count, 'prompt') + ': '
          + esc(row.task.label) + ' and ' + esc(m.label) + '">' + count + '</a></td>';
      }).join('') + '</tr>').join('') + '</tbody></table></div>'
    + '<p class="bx-legend"><span>Fewer</span><span class="bx-ramp" aria-hidden="true"><i style="--d:4%"></i><i style="--d:8%"></i><i style="--d:12%"></i><i style="--d:16%"></i></span><span>More</span>'
    + '<span>Peak ' + plural(peak, 'prompt') + ' in one cell' + (loose ? ' · ' + loose + ' of ' + DATA.prompts.length + ' prompts carry no task yet' : '') + '</span></p>'
    + '</div></section>');
}
function bxLedger(){
  const rows = bandRows(), peak = Math.max(1, ...rows.map(r => r.prompts.length));
  return bandNeighbours('<section class="sec" id="tasks"><div class="wrap">' + bandHead(plural(rows.length, 'task') + ', most covered first')
    + '<ol class="bx-ledger">' + rows.map((row, i) => '<li class="bx-row">'
      + '<span class="bx-rank">' + String(i + 1).padStart(2, '0') + '</span>'
      + '<span class="bx-lede"><a class="bx-name" href="' + esc(taskHref(row.task)) + '">' + esc(row.task.label) + '</a>'
      + '<span class="bx-models">' + (row.models.length ? esc(row.models.slice(0, 3).map(m => m.label).join(' · ')) : 'No model named') + '</span></span>'
      + '<span class="bx-measure"><span class="bx-bar" aria-hidden="true" style="--w:' + (row.prompts.length / peak) * 100 + '%">'
      + (row.images + row.videos ? '<i class="bx-img" style="flex-grow:' + row.images + '"></i><i class="bx-vid" style="flex-grow:' + row.videos + '"></i>'
        : '<i class="bx-vid" style="flex-grow:1"></i>')
      + '</span><span class="bx-split">' + plural(row.prompts.length, 'prompt') + '<span> · ' + splitLabel(row) + '</span></span></span>'
      + '<span class="bx-shots" aria-hidden="true">' + (row.shots.length
        ? row.shots.slice(0, 3).map(p => '<img src="' + esc(p.img) + '" alt="" width="44" height="44" loading="lazy" referrerpolicy="no-referrer">').join('')
        : '<span class="bx-noshot">no preview</span>') + '</span></li>').join('') + '</ol>' + bandFoot('row') + '</div></section>');
}
function bxField(){
  return bandNeighbours('<section class="sec" id="tasks"><div class="wrap">' + bandHead(bandScale())
    + '<div class="bx-field">' + bandRows().map(row => {
      const shots = row.shots.slice(0, 4);
      return '<a class="bx-sheet" href="' + esc(taskHref(row.task)) + '"><span class="bx-mosaic" data-shots="' + shots.length + '">'
        + (shots.length ? shots.map(p => '<img src="' + esc(p.img) + '" alt="" width="220" height="220" loading="lazy" referrerpolicy="no-referrer">').join('')
          : '<span class="bx-blank">No preview on the source posts</span>')
        + '</span><span class="bx-caption"><b lang="' + LOCALE + '">' + esc(row.task.label) + '</b><span>' + plural(row.prompts.length, 'prompt') + ' · '
        + (row.models.length ? plural(row.models.length, 'model') : 'no model named') + '</span></span></a>';
    }).join('') + '</div>' + bandFoot('sheet') + '</div></section>');
}
function bxDirectory(){
  return bandNeighbours('<section class="sec" id="tasks"><div class="wrap">' + bandHead(bandScale())
    + '<div class="bx-directory">' + bandRows().map(row => '<article class="bx-entry">'
      + '<div class="bx-entry-head"><h3><a href="' + esc(taskHref(row.task)) + '">' + esc(row.task.label) + '</a></h3>'
      + '<p class="bx-entry-meta">' + plural(row.prompts.length, 'prompt') + ' · ' + splitLabel(row) + '<br>'
      + (row.models.length ? esc(row.models.slice(0, 3).map(m => m.label).join(' · ')) : 'No model named') + '</p></div>'
      + '<ul class="bx-titles">' + row.prompts.slice(0, 3).map(p => '<li><a href="' + esc(p.href) + '">' + esc(p.title) + '</a><span>' + esc(p.handle) + '</span></li>').join('')
      + (row.prompts.length > 3 ? '<li class="bx-more"><a href="' + esc(taskHref(row.task)) + '">All ' + esc(row.task.label.toLowerCase()) + ' prompts <span aria-hidden="true">→</span></a></li>' : '')
      + '</ul></article>').join('') + '</div>' + bandFoot('entry') + '</div></section>');
}

/* ══════════════════════════════════════════════════════════════════════
   Surface 3 · Task page (the destination the band's entries open)
   ══════════════════════════════════════════════════════════════════════ */
const L3 = {task: '', q: '', kind: 'all', model: '', mxModel: '', mxStyle: '', lane: '', ixModel: '', sel: ''};
const taskRef = () => DATA.tasks.find(t => t.slug === L3.task) || DATA.tasks[0];
const taskAll = () => DATA.prompts.filter(p => p.uses.some(r => r.slug === taskRef().slug));
function taskFiltered(){
  const q = L3.q.toLowerCase();
  return taskAll().filter(p => (L3.kind === 'all' || p.kind === L3.kind)
    && (!L3.model || p.models.some(r => r.slug === L3.model))
    && [p.title, p.prompt, p.handle, ...p.models.map(r => r.label)].join(' ').toLowerCase().includes(q));
}
const terms = (rows, key) => {
  const values = new Map();
  rows.forEach(p => p[key].forEach(r => values.set(r.slug, {...r, count: (values.get(r.slug)?.count || 0) + 1})));
  return [...values.values()].sort((a, b) => b.count - a.count);
};
const promptCard = p => '<article class="prompt-card"><button class="card-image" data-peek="' + p.id + '" aria-label="Preview ' + esc(p.title) + '">'
  + media(p, 400, 300) + '<span class="media-kind">' + esc(p.kind) + '</span></button>'
  + '<div class="card-text"><h3><button data-peek="' + p.id + '">' + esc(p.title) + '</button></h3>'
  + '<p class="card-source">' + esc(p.handle) + '</p>'
  + '<a href="' + esc(p.href) + '">' + generationLabel(p.kind) + ' <span>↗</span></a></div></article>';
const promptDetail = p => '<article class="prompt-detail"><div class="detail-media">' + media(p, 640, 480) + '</div>'
  + '<div class="detail-copy"><p class="proto-overline">' + esc(p.kind) + ' prompt · ' + esc(p.models.map(m => m.label).join(' / ') || 'No model named') + '</p>'
  + '<h2>' + esc(p.title) + '</h2><div class="detail-actions">'
  + '<a class="primary-action" href="' + esc(p.href) + '">' + generationLabel(p.kind) + ' ↗</a>'
  + '<a href="' + esc(p.sourceUrl) + '" target="_blank" rel="nofollow noopener noreferrer">' + esc(p.handle) + ' ↗</a></div>'
  + '<pre lang="' + esc(p.language) + '">' + esc(p.prompt) + '</pre></div></article>';

function taskShell(intro, body){
  const all = taskAll(), rows = taskFiltered(), ref = taskRef();
  const chipLabel = L3.model ? (DATA.prompts.flatMap(p => p.models).find(m => m.slug === L3.model)?.label || L3.model) : '';
  return '<div class="task-shell"><header class="task-nav">'
    + '<a class="brand" href="?s=2">Prompt Library</a><a href="?s=2">Browse by task ↗</a></header>'
    + '<main id="main" class="task-main">'
    + '<nav class="crumb" aria-label="Breadcrumb"><a href="?s=2">Tasks</a><span>/</span><span>' + esc(ref.label) + '</span></nav>'
    + '<section class="task-heading"><div><p class="proto-overline">The task collection</p>'
    + '<h1>' + esc(ref.label) + ' prompts<span class="title-count">' + all.length + '</span></h1>'
    + '<p class="intro">' + intro + '</p></div>'
    + '<label class="task-switch">Explore another task<select data-l3="task">'
    + DATA.tasks.filter(t => t.count).map(t => '<option value="' + esc(t.slug) + '"' + (t.slug === ref.slug ? ' selected' : '') + '>'
      + esc(t.label) + ' · ' + t.count + '</option>').join('') + '</select></label></section>'
    + '<form class="toolbar" role="search" onsubmit="return false">'
    + '<label class="search-control"><span class="proto-overline">Search this task</span>'
    + '<input type="search" autocomplete="off" spellcheck="false" data-l3="q" value="' + esc(L3.q) + '" placeholder="Search '
    + esc(ref.label.toLowerCase()) + ' prompts…" aria-label="Search prompts"></label>'
    + '<fieldset class="type-switch"><legend class="proto-overline">Output</legend>'
    + [['all','All'],['image','Images'],['video','Videos']].map(k => '<button type="button" data-kind="' + k[0] + '" aria-pressed="'
      + (L3.kind === k[0]) + '">' + k[1] + '</button>').join('') + '</fieldset>'
    + (L3.model ? '<button type="button" class="filter-chip" data-l3="chip" aria-label="Remove the ' + esc(chipLabel) + ' filter">Model: '
      + esc(chipLabel) + ' <span aria-hidden="true">×</span></button>' : '')
    + '<span class="result-count" role="status">' + rows.length + ' / ' + all.length + ' prompts</span></form>'
    + '<div data-results>' + (rows.length ? body(rows)
      : '<div class="empty-task"><h2>No prompts match this search.</h2><p>Try another phrase or return to every '
        + esc(ref.label.toLowerCase()) + ' prompt.</p><button data-l3="clear">Clear filters</button></div>') + '</div>'
    + '<footer class="task-footer">Prompt Library <span>Prompts remain the property of their authors. Every record links to its source.</span></footer>'
    + '</main>'
    + '<dialog class="task-dialog" data-l3="dialog"><div class="dialog-top"><span class="proto-overline">Prompt preview</span>'
    + '<button data-l3="close">Close ×</button></div><div data-dialog-body></div></dialog></div>';
}
/* Baseline: the shipped filtered library, in an iframe, exactly as the original exploration framed
   it. It needs the frontend on port 3000 — the only direction here that does. */
const taskCurrent = () => '<div class="task-shell"><iframe class="current-frame" title="Current ' + esc(taskRef().label)
  + ' filtered library" src="' + SITE + '/' + LOCALE + '/prompts?useCase=' + encodeURIComponent(taskRef().slug)
  + (L3.model ? '&model=' + encodeURIComponent(L3.model) : '') + '"></iframe></div>';

function taskMatrix(){
  return taskShell('Find your combination. Explore the models and styles behind these prompts, then open the one you want to use.', rows => {
    const axis = key => {
      const refs = terms(rows, key), count = rows.filter(p => !p[key].length).length;
      return count ? [...refs, {slug: '__none', label: key === 'models' ? 'No model named' : 'No style named', count}] : refs;
    };
    const models = axis('models'), styles = axis('styles');
    const cells = (m, s) => rows.filter(p => (!m || (m === '__none' ? !p.models.length : p.models.some(r => r.slug === m)))
      && (!s || (s === '__none' ? !p.styles.length : p.styles.some(r => r.slug === s))));
    const selected = cells(L3.mxModel, L3.mxStyle);
    const peak = Math.max(1, ...models.flatMap(m => styles.map(s => cells(m.slug, s.slug).length)));
    const label = [models.find(m => m.slug === L3.mxModel)?.label, styles.find(s => s.slug === L3.mxStyle)?.label].filter(Boolean).join(' × ') || 'All prompts';
    return '<div class="matrix-caption"><p>Model ↓ <span>×</span> Style →</p><span>Choose an intersection. Read what made it.</span></div>'
      + '<div class="matrix-scroll" tabindex="0" role="region" aria-label="Models and styles matrix"><table class="task-matrix">'
      + '<caption class="vh">Prompt counts by model and style within this task. A dot means no matching prompts.</caption>'
      + '<thead><tr><th scope="col"><button data-mx="reset">All combinations</button></th>'
      + styles.map(s => '<th scope="col"><button data-mx="style" data-slug="' + esc(s.slug) + '" aria-pressed="'
        + (L3.mxStyle === s.slug && !L3.mxModel) + '">' + esc(s.label) + '<small>' + s.count + '</small></button></th>').join('') + '</tr></thead><tbody>'
      + models.map(m => '<tr><th scope="row"><button data-mx="model" data-slug="' + esc(m.slug) + '" aria-pressed="'
        + (L3.mxModel === m.slug && !L3.mxStyle) + '">' + esc(m.label) + '<small>' + m.count + '</small></button></th>'
        + styles.map(s => {
          const count = cells(m.slug, s.slug).length;
          return '<td>' + (count
            ? '<button style="background:color-mix(in oklab, var(--foreground) ' + (4 + count / peak * 12) + '%, var(--background))" data-mx="cell" data-slug="'
              + esc(m.slug) + '" data-slug2="' + esc(s.slug) + '" aria-label="' + esc(m.label) + ' × ' + esc(s.label) + ': ' + count + ' prompts" aria-pressed="'
              + (L3.mxModel === m.slug && L3.mxStyle === s.slug) + '">' + count + '</button>'
            : '<span class="nil" aria-label="No prompts: ' + esc(m.label) + ' and ' + esc(s.label) + '">·</span>') + '</td>';
        }).join('') + '</tr>').join('') + '</tbody></table></div>'
      + '<p class="matrix-legend">Fewer <span aria-hidden="true">▁ ▂ ▃ ▅</span> More <span>Prompts may appear in more than one model or style.</span></p>'
      + '<section class="matrix-results"><div class="section-heading"><h2>' + esc(label) + ' <small>' + selected.length + '</small></h2>'
      + ((L3.mxModel || L3.mxStyle) ? '<button data-mx="reset">Clear selection</button>' : '') + '</div>'
      + '<div class="result-grid">' + selected.map(promptCard).join('') + '</div></section>';
  });
}
function taskLanes(){
  return taskShell('Start with the result. Follow each model through a column of images, videos and the prompts behind them.', rows => {
    const models = terms(rows, 'models');
    const groups = [...models, ...(rows.some(p => !p.models.length)
      ? [{slug: 'none', label: 'No model named', count: rows.filter(p => !p.models.length).length}] : [])];
    return '<nav class="model-tabs" aria-label="Model lanes"><button data-lane="" aria-pressed="' + (!L3.lane) + '">All models</button>'
      + groups.map(m => '<button data-lane="' + esc(m.slug) + '" aria-pressed="' + (L3.lane === m.slug) + '">' + esc(m.label)
        + '<small>' + m.count + '</small></button>').join('') + '</nav>'
      + '<p class="lane-hint">Follow a model down its column. Prompts naming several models appear in each.</p>'
      + '<div class="lanes" role="region" aria-label="Prompt lanes by model" tabindex="0">'
      + groups.filter(m => !L3.lane || m.slug === L3.lane).map((m, i) => '<section class="lane">'
        + '<div class="lane-head"><span class="proto-overline">' + String(i + 1).padStart(2, '0') + '</span><h2>' + esc(m.label) + '</h2><b>' + m.count + '</b></div>'
        + rows.filter(p => m.slug === 'none' ? !p.models.length : p.models.some(r => r.slug === m.slug)).map(promptCard).join('')
        + '</section>').join('') + '</div>';
  });
}
function taskIndex(){
  return taskShell('A reading desk for this task. Scan the index, open a result, and read the complete prompt without losing your place.', rows => {
    const shown = rows.filter(p => !L3.ixModel || p.models.some(r => r.slug === L3.ixModel));
    const selected = shown.find(p => p.id === L3.sel) || shown[0];
    return '<div class="index-layout"><section class="index-directory" aria-label="Prompt index">'
      + '<label class="index-model">Model<select data-l3="ixmodel"><option value=""' + (L3.ixModel ? '' : ' selected') + '>All models · ' + rows.length + '</option>'
      + terms(rows, 'models').map(m => '<option value="' + esc(m.slug) + '"' + (L3.ixModel === m.slug ? ' selected' : '') + '>'
        + esc(m.label) + ' · ' + m.count + '</option>').join('') + '</select></label>'
      + '<div class="index-list">' + shown.map((p, i) => '<button class="index-row" data-index="' + p.id + '" aria-pressed="'
        + (selected && p.id === selected.id) + '"><span class="index-number">' + String(i + 1).padStart(2, '0') + '</span>'
        + '<span><b>' + esc(p.title) + '</b><small>' + esc(p.handle) + ' · ' + esc(p.kind) + '</small></span>'
        + '<span aria-hidden="true">↗</span></button>').join('') + '</div></section>'
      + '<section class="index-reader" id="reader" aria-label="Selected prompt">' + (selected ? promptDetail(selected) : '') + '</section></div>';
  });
}

/* ══════════════════════════════════════════════════════════════════════
   Surface 4 · The first screen's credit line
   Handles supplied by the user; nothing here is inferred. A credit carrying a guessed handle is
   worse than no credit at all.
   ══════════════════════════════════════════════════════════════════════ */
const CREDITS = [
  {name: 'Vincent Wu', handle: '@VincentWu11', href: 'https://x.com/VincentWu11'},
  {name: 'Steve Li', handle: '@st3v3li', href: 'https://x.com/st3v3li'},
];
const LINK = ' target="_blank" rel="nofollow noopener noreferrer"';
/* The shipped first screen, copied verbatim out of Hub.tsx. Every direction renders THIS and
   appends only the credit, so "nothing else changes" is structural rather than promised. */
const argument = credit => shell('<section class="wrap argument"><h1>Somebody already wrote this</h1><div class="body">'
  + '<p>Every prompt in this library was published in the open by the person who wrote it, and then mostly lost — buried under a feed that is optimised for the next thing rather than the useful thing.</p>'
  + '<p>So the whole of the work here is <em>not editing</em>. No paraphrase, no house style, no distillation into a template. The text you copy is the text they posted, down to the render settings at the end that look like noise and are not.</p>'
  + '<p>What we add is the index, the attribution, and a link back. That is the entire product.</p>'
  + '</div>' + (credit || '') + '</section><div class="after">' + categoryBand() + '</div>');

const crCurrent = () => argument('');
const crColophon = () => argument('<div class="cr cr-colophon"><span class="cr-rule" aria-hidden="true"></span>'
  + '<p class="cr-line"><span class="cr-label">Credit to</span>'
  + CREDITS.map((p, i) => '<span class="cr-name" style="--i:' + i + '"><a href="' + p.href + '"' + LINK + '>' + esc(p.name) + '</a>'
    + (i === 0 ? '<span class="cr-amp" aria-hidden="true">&amp;</span>' : '') + '</span>').join('') + '</p></div>');
const crSignature = () => argument('<div class="cr cr-signature"><p class="cr-label cr-label-centred">Credit to</p><p class="cr-sig">'
  + '<a class="cr-sig-name" href="' + CREDITS[0].href + '"' + LINK + ' style="--i:0">' + esc(CREDITS[0].name) + '<span class="cr-stroke" aria-hidden="true"></span></a>'
  + '<span class="cr-sig-amp" aria-hidden="true">&amp;</span>'
  + '<a class="cr-sig-name" href="' + CREDITS[1].href + '"' + LINK + ' style="--i:1">' + esc(CREDITS[1].name) + '<span class="cr-stroke" aria-hidden="true"></span></a>'
  + '</p></div>');
const crPlaque = () => argument('<div class="cr cr-plaque"><p class="cr-label">Credit to</p><div class="cr-card">'
  + CREDITS.map((p, i) => '<a class="cr-row" href="' + p.href + '"' + LINK + ' style="--i:' + i + '">'
    + '<span class="cr-row-name">' + esc(p.name) + '</span><span class="cr-row-handle">' + esc(p.handle) + '</span>'
    + '<span class="cr-row-go" aria-hidden="true">↗</span></a>').join('') + '</div></div>');
/* The glyph spans are aria-hidden and the real name sits beside them, so the effect never costs
   the text. A plain space inside an inline-block would collapse, hence the non-breaking one. */
const glyphs = (word, offset) => [...word].map((glyph, i) =>
  '<span class="cr-glyph" style="--i:' + (offset + i) + '">' + esc(glyph === ' ' ? '\u00A0' : glyph) + '</span>').join('');
function crKinetic(){
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

/* ══════════════════════════════════════════════════════════════════════
   Harness
   ══════════════════════════════════════════════════════════════════════ */
const SURFACES = [
  {id: 'first', names: ['Current', 'Board', 'Quilt', 'Statement', 'Split'], render: [fsCurrent, fsBoard, fsQuilt, fsStatement, fsSplit]},
  {id: 'band', names: ['Current', 'Plate', 'Ledger', 'Field', 'Directory'], render: [bxCurrent, bxPlate, bxLedger, bxField, bxDirectory]},
  {id: 'task', names: ['Current', 'Matrix', 'Lanes', 'Index'], render: [taskCurrent, taskMatrix, taskLanes, taskIndex]},
  /* The only surface with an entrance to re-trigger, so the only one whose pill carries a replay. */
  {id: 'credit', names: ['Current', 'Colophon', 'Signature', 'Plaque', 'Kinetic'], replay: true,
    render: [crCurrent, crColophon, crSignature, crPlaque, crKinetic]},
];
const params = new URLSearchParams(location.search);
let surface = Math.min(Math.max(parseInt(params.get('s'), 10) || 1, 1), SURFACES.length) - 1;
const chosen = [0, 0, 0, 0];
{
  const v = parseInt(params.get('v'), 10);
  if (v >= 1 && v <= SURFACES[surface].names.length) chosen[surface] = v - 1;
}
L3.task = params.get('task') || [...DATA.tasks].sort((a, b) => b.count - a.count)[0].slug;
L3.model = params.get('model') || '';

const stage = document.getElementById('stage');
const picker = document.querySelector('.proto-picker');
const highlight = picker.querySelector('.proto-picker-highlight');
const surfaceNav = document.querySelector('.proto-surface');
const surfaceHighlight = surfaceNav.querySelector('.proto-surface-highlight');
const surfaceItems = [...surfaceNav.querySelectorAll('.proto-surface-item')];
let items = [];

/* The picker's buttons are written from JS because the three surfaces do not have the same number
   of directions; the markup it produces is PICKER.md's, button for button. */
function paintPicker(){
  const config = SURFACES[surface];
  picker.innerHTML = '';
  picker.append(surfaceHighlightSpare());
  items = config.names.map((name, i) => {
    const button = document.createElement('button');
    button.className = 'proto-picker-item';
    button.textContent = name;
    button.addEventListener('click', () => setVariant(i));
    picker.append(button);
    return button;
  });
  /* PICKER.md renders the replay control only where there is an entrance to re-trigger. */
  if (config.replay) {
    const divider = document.createElement('span');
    divider.className = 'proto-picker-divider';
    divider.setAttribute('aria-hidden', 'true');
    const button = document.createElement('button');
    button.className = 'proto-picker-item proto-picker-replay';
    button.setAttribute('aria-label', 'Replay animation (R)');
    button.textContent = '↻';
    button.addEventListener('click', paintStage);
    picker.append(divider, button);
  }
}
function paintStage(){
  const config = SURFACES[surface], render = config.render[chosen[surface]];
  if (!config.replay) { stage.innerHTML = render(); return; }
  /* Clear first, render next frame, so the entrance runs again on every mount and on replay. */
  stage.innerHTML = '';
  requestAnimationFrame(() => { stage.innerHTML = render(); });
}
function surfaceHighlightSpare(){ return highlight; }
function moveHighlight(){
  const el = items[chosen[surface]];
  if (!el) return;
  highlight.style.width = el.offsetWidth + 'px';
  highlight.style.transform = 'translateX(' + el.offsetLeft + 'px)';
}
function moveSurfaceHighlight(){
  const el = surfaceItems[surface];
  surfaceHighlight.style.width = el.offsetWidth + 'px';
  surfaceHighlight.style.transform = 'translateX(' + el.offsetLeft + 'px)';
}
function writeUrl(){
  const url = new URL(location);
  url.searchParams.set('s', surface + 1);
  url.searchParams.set('v', chosen[surface] + 1);
  if (surface === 2) {
    url.searchParams.set('task', L3.task);
    if (L3.model) url.searchParams.set('model', L3.model); else url.searchParams.delete('model');
  } else { url.searchParams.delete('task'); url.searchParams.delete('model'); }
  history.replaceState(null, '', url);
}
function mount(){
  paintStage();
  items.forEach((el, i) => {
    el.toggleAttribute('data-active', i === chosen[surface]);
    if (i === chosen[surface]) el.setAttribute('aria-current', 'true'); else el.removeAttribute('aria-current');
  });
  surfaceItems.forEach((el, i) => {
    el.toggleAttribute('data-active', i === surface);
    if (i === surface) el.setAttribute('aria-current', 'true'); else el.removeAttribute('aria-current');
  });
  moveHighlight();
  moveSurfaceHighlight();
  writeUrl();
}
function setVariant(i){
  if (i < 0 || i >= SURFACES[surface].names.length) return;
  chosen[surface] = i;
  mount();
}
function setSurface(i){
  if (i < 0 || i >= SURFACES.length || i === surface) return;
  surface = i;
  paintPicker();
  mount();
  /* Surfaces are different pages; a variant swap inside one keeps your place, a surface swap does not. */
  scrollTo({top: 0, behavior: 'instant'});
}
surfaceItems.forEach((el, i) => el.addEventListener('click', () => setSurface(i)));
window.addEventListener('resize', () => { moveHighlight(); moveSurfaceHighlight(); });
document.addEventListener('keydown', e => {
  if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable) return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const num = parseInt(e.key, 10);
  if (num >= 1 && num <= SURFACES[surface].names.length) setVariant(num - 1);
  else if (e.key === 'ArrowRight') setVariant((chosen[surface] + 1) % SURFACES[surface].names.length);
  else if (e.key === 'ArrowLeft') setVariant((chosen[surface] - 1 + SURFACES[surface].names.length) % SURFACES[surface].names.length);
  else if (e.key === ']') setSurface((surface + 1) % SURFACES.length);
  else if (e.key === '[') setSurface((surface - 1 + SURFACES.length) % SURFACES.length);
  else if ((e.key === 'r' || e.key === 'R') && SURFACES[surface].replay) paintStage();
});

/* ── the task surface's own state, delegated once ─────────────────────── */
function redrawResults(){
  const region = stage.querySelector('[data-results]');
  if (!region) return mount();
  const rows = taskFiltered(), all = taskAll();
  const body = {1: taskMatrix, 2: taskLanes, 3: taskIndex}[chosen[2]];
  /* Re-render the results region only: a full remount would take the search field's focus away on
     every keystroke. */
  const next = document.createElement('div');
  next.innerHTML = body();
  const fresh = next.querySelector('[data-results]');
  region.innerHTML = fresh ? fresh.innerHTML : '';
  const count = stage.querySelector('.result-count');
  if (count) count.textContent = rows.length + ' / ' + all.length + ' prompts';
  stage.querySelectorAll('[data-kind]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.kind === L3.kind)));
}
document.addEventListener('input', e => {
  if (e.target.dataset?.l3 === 'q') { L3.q = e.target.value; redrawResults(); }
});
document.addEventListener('change', e => {
  const key = e.target.dataset?.l3;
  if (key === 'task') { L3.task = e.target.value; L3.q = ''; L3.kind = 'all'; L3.model = ''; L3.mxModel = ''; L3.mxStyle = ''; L3.lane = ''; L3.ixModel = ''; L3.sel = ''; mount(); }
  else if (key === 'ixmodel') { L3.ixModel = e.target.value; L3.sel = ''; redrawResults(); }
});
document.addEventListener('click', e => {
  const target = e.target.closest?.('[data-kind],[data-mx],[data-lane],[data-index],[data-peek],[data-l3]');
  if (!target || !stage.contains(target)) return;
  const key = target.dataset;
  if (key.kind !== undefined) { L3.kind = key.kind; redrawResults(); }
  else if (key.mx === 'reset') { L3.mxModel = ''; L3.mxStyle = ''; redrawResults(); }
  else if (key.mx === 'model') { L3.mxModel = key.slug; L3.mxStyle = ''; redrawResults(); }
  else if (key.mx === 'style') { L3.mxStyle = key.slug; L3.mxModel = ''; redrawResults(); }
  else if (key.mx === 'cell') { L3.mxModel = key.slug; L3.mxStyle = key.slug2; redrawResults(); }
  else if (key.lane !== undefined) { L3.lane = key.lane; redrawResults(); }
  else if (key.index) { L3.sel = key.index; redrawResults(); if (innerWidth < 800) stage.querySelector('#reader')?.scrollIntoView({block: 'start'}); }
  else if (key.peek) {
    const prompt = DATA.prompts.find(p => p.id === key.peek);
    const dialog = stage.querySelector('[data-l3="dialog"]');
    stage.querySelector('[data-dialog-body]').innerHTML = promptDetail(prompt);
    dialog.showModal();
  }
  else if (key.l3 === 'close') stage.querySelector('[data-l3="dialog"]').close();
  else if (key.l3 === 'chip') { L3.model = ''; mount(); }
  else if (key.l3 === 'clear') { L3.q = ''; L3.kind = 'all'; L3.model = ''; mount(); }
});
/* Clicking the backdrop closes the preview; Escape and the focus trap are the element's own. */
document.addEventListener('click', e => {
  if (e.target.matches?.('dialog.task-dialog')) e.target.close();
});
/* In-file links (?s=…) switch surface without a reload; everything else leaves for the real site. */
document.addEventListener('click', e => {
  const link = e.target.closest?.('a[href^="?s="]');
  if (!link || e.metaKey || e.ctrlKey || e.shiftKey) return;
  e.preventDefault();
  const next = new URLSearchParams(link.getAttribute('href').slice(1));
  const task = next.get('task');
  if (task) { L3.task = task; L3.q = ''; L3.kind = 'all'; L3.mxModel = ''; L3.mxStyle = ''; L3.lane = ''; L3.ixModel = ''; L3.sel = ''; }
  L3.model = next.get('model') || '';
  setSurface(Math.min(Math.max(parseInt(next.get('s'), 10) || 1, 1), SURFACES.length) - 1);
});

paintPicker();
mount();
requestAnimationFrame(() => requestAnimationFrame(() => {
  picker.setAttribute('data-ready', '');
  surfaceNav.setAttribute('data-ready', '');
}));

/* The board's hover layer: one tip, driven by the cells' own data-tip, on hover and on keyboard
   focus. It lives inside the scoped wrapper — every rule in these stylesheets is written under
   .prototype-magnetic, and on <body> it would lose its own pointer-events:none. */
const tip = document.createElement('span');
tip.className = 'fs-tip';
tip.hidden = true;
const showTip = el => {
  const box = el.getBoundingClientRect();
  const host = stage.querySelector('.prototype-magnetic');
  if (!host) return;
  host.append(tip);
  tip.textContent = el.dataset.tip;
  tip.style.left = box.left + 'px';
  tip.style.top = box.top + 'px';
  tip.hidden = false;
};
for (const type of ['mouseover', 'focusin']) document.addEventListener(type, e => {
  const cell = e.target.closest?.('.fs-cell[data-tip]');
  if (cell) showTip(cell); else tip.hidden = true;
});
for (const type of ['mouseout', 'focusout']) document.addEventListener(type, () => { tip.hidden = true; });
document.addEventListener('scroll', () => { tip.hidden = true; }, {passive: true});
</script>
`;

const out = page
  .replaceAll('__SITE__', payload.site)
  .replaceAll('__LOCALE__', payload.locale)
  .replace('__DATA__', JSON.stringify(payload));
await writeFile(new URL('docs/wireframes/proto-picker.html', root), out);
console.log('wrote docs/wireframes/proto-picker.html —', (out.length / 1024).toFixed(0) + 'KB,',
  payload.prompts.length, 'prompts,', payload.tasks.length, 'tasks');
