import type { Catalog, Prompt } from '@/lib/catalog/types';
import { PromptMedia } from '@/components/PromptMedia';
import { kindRows, n, plural, side, topSaved, unclassified } from '../../first-shared';

/* Direction: the first screen is the work itself, sized by how often it gets saved. Area carries
   the magnitude and the number is printed on every tile, so the encoding is a reading aid rather
   than the claim. The two decks sit above it as the only two large targets. */
const band = (s: number) => s >= .72 ? 'xl' : s >= .46 ? 'lg' : s >= .28 ? 'md' : 'sm';
export default function Quilt({ catalog }: { catalog: Catalog }) {
  const kinds = kindRows(catalog), loose = unclassified(catalog);
  const shown: Prompt[] = topSaved(catalog.prompts.filter(p => p.img), 14);
  const peak = Math.max(1, ...shown.map(p => p.saves ?? 0));
  const missing = catalog.prompts.length - shown.length;
  return <section className="fs fs-quilt"><div className="wrap">
    <p className="eyebrow">The quilt · snapshot {catalog.observedAt}</p>
    <h1 className="tier-index">What people actually save</h1>
    <p className="dek">The {shown.length} most-saved prompts in the library, each tile sized by the square root of its saves. Open a deck, or open the one that caught you.</p>
    <div className="fs-entries">{kinds.map(k => <a className="fs-entry" href={k.href} key={k.kind}>
      <b>{k.label}</b><span>{plural(k.prompts.length, 'prompt')} · {n(k.saves)} saves</span><span aria-hidden="true">→</span>
    </a>)}</div>
    <ul className="fs-tiles">{shown.map(prompt => <li className={`fs-tile fs-${band(side(prompt.saves ?? 0, peak))}`} key={prompt.id}>
      <a href={prompt.href}>
        <span className="fs-tile-media"><PromptMedia prompt={prompt} width={480} height={480} /></span>
        <span className="fs-tile-face">
          <b>{n(prompt.saves ?? 0)}<em>saves</em></b>
          <span className="fs-tile-title">{prompt.title}</span>
          <span className="fs-tile-meta">{prompt.kind} · {prompt.handle}</span>
        </span>
      </a>
    </li>)}</ul>
    <p className="fs-note">Area follows the square root of saves, rounded to the grid — saves run {n(Math.min(...catalog.prompts.map(p => p.saves ?? 0)))} to {n(peak)} here, so a linear area would leave most tiles invisible.
      {missing ? ` ${plural(missing, 'prompt')} is not shown: ${loose.length ? 'one carries no image on its source post, and the rest sit below the top ' + shown.length : 'they sit below the top ' + shown.length}.` : ''}</p>
  </div></section>;
}
