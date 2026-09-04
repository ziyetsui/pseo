/* Generates the single-file picker at docs/wireframes/proto-browse-band.html.
   The five directions, the tokens and the data all come from the same places the React harness
   reads — magnetic.css for the L1 material set, app/browse.css for the band's own rules, the
   fixture through /browse/data — so the standalone file is a build of this exploration, not a
   hand-copied second version of it. Re-run it after the fixture or the CSS changes. */
import {readFile,writeFile} from 'node:fs/promises';

const root = new URL('../../../', import.meta.url);
const css = async p => readFile(new URL(p, root), 'utf8');
const payload = await (await fetch('http://127.0.0.1:8767/browse/data')).json();

/* The font lives in the Next app's public dir; the static file has no such dir, so the same face
   is pulled from the CDN the sibling wireframes already use. Nothing else in the CSS changes. */
const magnetic = (await css('frontend/src/styles/magnetic.css'))
  .replace('/fonts/inter-latin-wght-normal.woff2', 'https://cdn.jsdelivr.net/npm/@fontsource-variable/inter@5/files/inter-latin-wght-normal.woff2');
const band = await css('docs/prototypes/task-l3/app/browse.css');
const picker = await css('docs/prototypes/task-l3/app/picker.css');

const html = String.raw;
const page = html`<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Browse by task — band exploration</title>

<style>
/* ─── Base. The site's own default: dark, one system, no theme switch. ─── */
*,*::before,*::after{box-sizing:border-box}
html{color-scheme:dark;scroll-behavior:smooth}
body{margin:0;background:#161618;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}
@media (prefers-reduced-motion:reduce){
  html{scroll-behavior:auto}
  *,*::before,*::after{animation-duration:.01ms!important;transition-duration:.01ms!important}
}
.vh{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap;border:0}
a:focus-visible,button:focus-visible{outline:2px solid currentColor;outline-offset:3px}
.media-fallback{display:grid;place-content:center;text-align:center;padding:20px;background:#202024;color:#aeb0b6;min-height:100px;font:12px/1.6 ui-monospace,monospace}
main{padding-bottom:120px}
</style>

<style>/* ─── frontend/src/styles/magnetic.css, verbatim but for the font URL ─── */
${magnetic}</style>

<style>/* ─── docs/prototypes/task-l3/app/browse.css, verbatim ─── */
${band}</style>

<style>/* ─── Picker · harness chrome, copied verbatim from PICKER.md ─── */
${picker}</style>

<div class="prototype-magnetic"><div class="taste">
  <a class="skip" href="#main">Skip to content</a>
  <nav class="nav" aria-label="Primary"><div class="wrap">
    <a class="brand" href="__SITE__/__LOCALE__/prompts">Prompt Library</a>
    <div class="navlinks"><a href="#tasks">Tasks</a><a href="#models">Models</a><a href="__SITE__/__LOCALE__/prompts#styles">Styles</a><a href="__SITE__/__LOCALE__/prompts#creators">Creators</a></div>
  </div></nav>
  <main id="main">
    <section class="wrap bx-intro">
      <p class="eyebrow">Browse band exploration</p>
      <h1 class="tier-index">Browse by task</h1>
      <p class="dek">Five ways to print the task taxonomy on L1. Every entry opens the task&rsquo;s own collection page; the plate&rsquo;s cells open it narrowed to one model. The bands above and below are the shipped ones.</p>
    </section>
    <div class="after">
      <div id="category"></div>
      <div id="stage"></div>
      <div id="models"></div>
    </div>
  </main>
</div></div>

<nav class="proto-picker" aria-label="Prototype variants">
  <span class="proto-picker-highlight" aria-hidden="true"></span>
  <button class="proto-picker-item" data-active aria-current="true">Current</button>
  <button class="proto-picker-item">Plate</button>
  <button class="proto-picker-item">Ledger</button>
  <button class="proto-picker-item">Field</button>
  <button class="proto-picker-item">Directory</button>
</nav>

<script>
const DATA = __DATA__;

/* ── helpers ─────────────────────────────────────────────────────────── */
const esc = s => String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const plural = (n, one, many = one + 's') => n + ' ' + (n === 1 ? one : many);
const byCount = (a, b) => b.count - a.count || a.label.localeCompare(b.label);
const SITE = DATA.site, LOCALE = DATA.locale;

/* Where a task entry goes: the real L3 collection page. A plate cell adds the model, which the
   shipped library filter honours today — the collection page itself has no model parameter yet. */
const taskHref = task => task.href;
const cellHref = (task, model) => SITE + '/' + LOCALE + '/prompts?useCase=' + encodeURIComponent(task.slug) + '&model=' + encodeURIComponent(model.slug);

function taskRows(){
  return DATA.tasks.map(task => {
    const prompts = DATA.prompts.filter(p => p.uses.some(r => r.slug === task.slug));
    const models = new Map();
    prompts.forEach(p => p.models.forEach(r => models.set(r.slug, {...r, count: (models.get(r.slug)?.count || 0) + 1})));
    return {
      task, prompts,
      images: prompts.filter(p => p.kind === 'image').length,
      videos: prompts.filter(p => p.kind === 'video').length,
      models: [...models.values()].sort(byCount),
      shots: prompts.filter(p => p.img),
    };
  }).filter(row => row.prompts.length).sort((a, b) => byCount(a.task, b.task));
}
function modelColumns(){
  const models = new Map();
  for (const p of DATA.prompts) for (const r of p.models) models.set(r.slug, {...r, count: (models.get(r.slug)?.count || 0) + 1});
  return [...models.values()].sort(byCount);
}
const cell = (row, slug) => row.prompts.filter(p => p.models.some(r => r.slug === slug)).length;
const unfiled = () => DATA.prompts.filter(p => !p.uses.length);
function splitLabel(row){
  const parts = [];
  if (row.images) parts.push(plural(row.images, 'image'));
  if (row.videos) parts.push(plural(row.videos, 'video'));
  const rest = row.prompts.length - row.images - row.videos;
  if (rest) parts.push(rest + ' uncategorised');
  return parts.join(' · ');
}
const media = (prompt, w, h) => prompt.img
  ? '<img src="' + esc(prompt.img) + '" alt="" width="' + w + '" height="' + h + '" loading="lazy" referrerpolicy="no-referrer">'
  : '<span class="media-fallback"><span>No image on the source post.</span></span>';
const foot = noun => {
  const loose = unfiled().length;
  return loose ? '<p class="bx-foot">' + loose + ' of ' + DATA.prompts.length + ' prompts carry no task yet, so no ' + noun + ' above reaches them.</p>' : '';
};
const head = end => '<div class="sec-h"><h2>Browse by task</h2><span class="bx-end">' + end + '</span></div>';
const scale = () => plural(DATA.tasks.length, 'task') + ' · ' + plural(DATA.prompts.length, 'prompt');

/* ── neighbours: the shipped HubBand, unchanged, for the model band and for variant 1 ── */
function hubBand(axis, id, heading, hrefFor){
  const used = new Set(), representatives = new Map();
  const refs = new Map();
  for (const p of DATA.prompts) for (const r of p[axis]) refs.set(r.slug, {...r, count: (refs.get(r.slug)?.count || 0) + 1});
  const options = [...refs.values()].sort(byCount).map(ref => ({ref, candidates: DATA.prompts.filter(p => p.img && p[axis].some(r => r.slug === ref.slug))}));
  // The reference gives scarce image sets first choice so every real category can retain a unique print.
  for (const item of [...options].sort((a, b) => a.candidates.length - b.candidates.length)) {
    const prompt = item.candidates.find(p => p.img && !used.has(p.img));
    if (prompt) { used.add(prompt.img); representatives.set(item.ref.slug, prompt); }
  }
  const items = options.map(({ref}) => ({ref, prompt: representatives.get(ref.slug)})).filter(item => item.prompt);
  return '<section class="sec" id="' + id + '"><div class="wrap"><div class="sec-h"><h2>' + heading + '</h2></div><div class="tiles">'
    + items.map(({ref, prompt}) => '<a class="tile" href="' + esc(hrefFor(ref)) + '"><span class="th">' + media(prompt, 320, 200)
      + '</span><span class="tb"><h3 lang="' + LOCALE + '">' + esc(ref.label) + '</h3><p>' + ref.count + ' prompts</p></span></a>').join('')
    + '</div></div></section>';
}
function categoryBand(){
  return '<section class="sec" id="category"><div class="wrap"><div class="sec-h"><h2>Browse by category</h2></div><div class="cat">'
    + ['image', 'video'].map(kind => {
      const rows = DATA.prompts.filter(p => p.kind === kind), representative = rows.find(p => p.img) || rows[0];
      return '<a class="tile" href="' + SITE + '/' + LOCALE + '/prompts/' + kind + '"><span class="th">' + (representative ? media(representative, 560, 350) : '')
        + '</span><span class="tb"><h3>' + (kind === 'image' ? 'Images' : 'Videos') + '</h3><p>' + rows.length + ' prompts</p></span></a>';
    }).join('') + '</div></div></section>';
}

/* ── 1 · Current — the shipped band, unchanged ───────────────────────── */
const vCurrent = () => hubBand('uses', 'tasks', 'Browse by task', ref => (DATA.tasks.find(t => t.slug === ref.slug) || {href: '#'}).href);

/* ── 2 · Plate — the taxonomy drawn once, navigation is the diagram ──── */
function vPlate(){
  const rows = taskRows(), columns = modelColumns(), loose = unfiled().length;
  let peak = 1;
  rows.forEach(row => columns.forEach(m => { peak = Math.max(peak, cell(row, m.slug)); }));
  const thead = columns.map(m => '<th scope="col">' + esc(m.label) + '<em>' + m.count + '</em></th>').join('');
  const tbody = rows.map(row => '<tr><th scope="row"><a class="bx-task" href="' + esc(taskHref(row.task)) + '">' + esc(row.task.label) + '<em>' + row.prompts.length + '</em></a></th>'
    + columns.map(m => {
      const count = cell(row, m.slug);
      if (!count) return '<td><span class="bx-nil"><span aria-hidden="true">·</span><span class="vh">No prompts: ' + esc(row.task.label) + ' and ' + esc(m.label) + '</span></span></td>';
      /* The shade sits on the cell, not on the link: a task whose name wraps to two lines makes the
         row taller than the link, and a link-painted shade leaves a grey strip under it. */
      return '<td class="bx-shade" style="--d:' + (4 + (count / peak) * 12).toFixed(1) + '%"><a class="bx-cell" href="' + esc(cellHref(row.task, m))
        + '" aria-label="' + plural(count, 'prompt') + ': ' + esc(row.task.label) + ' and ' + esc(m.label) + '">' + count + '</a></td>';
    }).join('') + '</tr>').join('');
  return '<section class="sec" id="tasks"><div class="wrap">' + head(scale())
    + '<p class="bx-note" id="bx-plate-note">Prompts per task and model. Shade is the count, printed in every cell; a dot is an intersection nothing covers yet. A task name opens its collection, a cell opens it narrowed to that model.</p>'
    + '<div class="bx-map"><table aria-describedby="bx-plate-note"><caption class="vh">Prompt counts by task and model</caption>'
    + '<thead><tr><th scope="col" class="bx-corner">Task ↓ / Model →</th>' + thead + '</tr></thead><tbody>' + tbody + '</tbody></table></div>'
    + '<p class="bx-legend"><span>Fewer</span><span class="bx-ramp" aria-hidden="true"><i style="--d:4%"></i><i style="--d:8%"></i><i style="--d:12%"></i><i style="--d:16%"></i></span><span>More</span>'
    + '<span>Peak ' + plural(peak, 'prompt') + ' in one cell' + (loose ? ' · ' + loose + ' of ' + DATA.prompts.length + ' prompts carry no task yet' : '') + '</span></p>'
    + '</div></section>';
}

/* ── 3 · Ledger — count as length, one ranked line per task ──────────── */
function vLedger(){
  const rows = taskRows();
  const peak = Math.max(1, ...rows.map(row => row.prompts.length));
  return '<section class="sec" id="tasks"><div class="wrap">' + head(plural(rows.length, 'task') + ', most covered first')
    + '<ol class="bx-ledger">' + rows.map((row, i) => '<li class="bx-row">'
      + '<span class="bx-rank">' + String(i + 1).padStart(2, '0') + '</span>'
      + '<span class="bx-lede"><a class="bx-name" href="' + esc(taskHref(row.task)) + '">' + esc(row.task.label) + '</a>'
      + '<span class="bx-models">' + (row.models.length ? esc(row.models.slice(0, 3).map(m => m.label).join(' · ')) : 'No model named') + '</span></span>'
      + '<span class="bx-measure"><span class="bx-bar" aria-hidden="true" style="--w:' + (row.prompts.length / peak) * 100 + '%">'
      + (row.images + row.videos
        ? '<i class="bx-img" style="flex-grow:' + row.images + '"></i><i class="bx-vid" style="flex-grow:' + row.videos + '"></i>'
        : '<i class="bx-vid" style="flex-grow:1"></i>')
      + '</span><span class="bx-split">' + plural(row.prompts.length, 'prompt') + '<span> · ' + splitLabel(row) + '</span></span></span>'
      + '<span class="bx-shots" aria-hidden="true">' + (row.shots.length
        ? row.shots.slice(0, 3).map(p => '<img src="' + esc(p.img) + '" alt="" width="44" height="44" loading="lazy" referrerpolicy="no-referrer">').join('')
        : '<span class="bx-noshot">no preview</span>') + '</span>'
      + '</li>').join('') + '</ol>' + foot('row') + '</div></section>';
}

/* ── 4 · Field — argue by output: each task is its own contact sheet ─── */
function vField(){
  const rows = taskRows();
  return '<section class="sec" id="tasks"><div class="wrap">' + head(scale())
    + '<div class="bx-field">' + rows.map(row => {
      const shots = row.shots.slice(0, 4);
      return '<a class="bx-sheet" href="' + esc(taskHref(row.task)) + '"><span class="bx-mosaic" data-shots="' + shots.length + '">'
        + (shots.length ? shots.map(p => '<img src="' + esc(p.img) + '" alt="" width="220" height="220" loading="lazy" referrerpolicy="no-referrer">').join('')
          : '<span class="bx-blank">No preview on the source posts</span>')
        + '</span><span class="bx-caption"><b lang="' + LOCALE + '">' + esc(row.task.label) + '</b><span>' + plural(row.prompts.length, 'prompt') + ' · '
        + (row.models.length ? plural(row.models.length, 'model') : 'no model named') + '</span></span></a>';
    }).join('') + '</div>' + foot('sheet') + '</div></section>';
}

/* ── 5 · Directory — the band as a printed index, no imagery at rest ─── */
function vDirectory(){
  const rows = taskRows();
  return '<section class="sec" id="tasks"><div class="wrap">' + head(scale())
    + '<div class="bx-directory">' + rows.map(row => '<article class="bx-entry">'
      + '<div class="bx-entry-head"><h3><a href="' + esc(taskHref(row.task)) + '">' + esc(row.task.label) + '</a></h3>'
      + '<p class="bx-entry-meta">' + plural(row.prompts.length, 'prompt') + ' · ' + splitLabel(row) + '<br>'
      + (row.models.length ? esc(row.models.slice(0, 3).map(m => m.label).join(' · ')) : 'No model named') + '</p></div>'
      + '<ul class="bx-titles">' + row.prompts.slice(0, 3).map(p => '<li><a href="' + esc(p.href) + '">' + esc(p.title) + '</a><span>' + esc(p.handle) + '</span></li>').join('')
      + (row.prompts.length > 3 ? '<li class="bx-more"><a href="' + esc(taskHref(row.task)) + '">All ' + esc(row.task.label.toLowerCase()) + ' prompts <span aria-hidden="true">→</span></a></li>' : '')
      + '</ul></article>').join('') + '</div>' + foot('entry') + '</div></section>';
}

/* The neighbours are painted once; only the band between them swaps. */
document.getElementById('category').innerHTML = categoryBand();
document.getElementById('models').innerHTML = hubBand('models', 'models', 'Browse by model', ref => SITE + '/' + LOCALE + '/prompts/models/' + ref.slug);

/* ── Picker wiring, verbatim from PICKER.md. No replay: nothing here has an entrance. ── */
const variants = [vCurrent, vPlate, vLedger, vField, vDirectory];
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
// Enable the slide only after first paint, so load doesn't animate.
requestAnimationFrame(() => requestAnimationFrame(() => picker.setAttribute('data-ready', '')));
</script>
`;

const out = page
  .replaceAll('__SITE__', payload.site)
  .replaceAll('__LOCALE__', payload.locale)
  .replace('__DATA__', JSON.stringify(payload));
await writeFile(new URL('docs/wireframes/proto-browse-band.html', root), out);
console.log('wrote docs/wireframes/proto-browse-band.html —', (out.length / 1024).toFixed(0) + 'KB,', payload.prompts.length, 'prompts,', payload.tasks.length, 'tasks');
