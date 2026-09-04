import type { Catalog } from '@/lib/catalog/types';
import { kindRows, n, plural, saveRate, sum, topSaved, unclassified } from '../../first-shared';

/* Direction: the first screen as a printed statement. No imagery, no plate — the numbers are the
   design, and the two decks are line items you can open. The only money figure in the library is
   one author's own claim about what his pipeline replaces, so it is quoted, attributed and linked,
   never restated as ours. */
export default function Statement({ catalog }: { catalog: Catalog }) {
  const kinds = kindRows(catalog), loose = unclassified(catalog);
  const total = sum(catalog.prompts, 'saves'), likes = sum(catalog.prompts, 'likes');
  const lead = [...kinds].sort((a, b) => saveRate(b) - saveRate(a))[0], other = kinds.find(k => k !== lead)!;
  const claim = topSaved(catalog.prompts, 1)[0];
  return <section className="fs fs-statement"><div className="wrap">
    <p className="eyebrow">The statement · snapshot {catalog.observedAt}</p>
    <h1 className="fs-figure">{n(total)}<em>saves</em></h1>
    <p className="dek">Across {plural(catalog.prompts.length, 'prompt')} and {n(likes)} likes. A like is applause; a save is somebody putting the text aside to run it, which is the only number here that behaves like intent.</p>
    <dl className="fs-lines">{kinds.map(k => <div className="fs-line" key={k.kind}>
      <dt><a href={k.href}>{k.label}<span aria-hidden="true">→</span></a></dt>
      <dd className="fs-line-n">{plural(k.prompts.length, 'prompt')}</dd>
      <dd className="fs-line-n">{n(k.saves)} saves</dd>
      <dd className="fs-line-n">{saveRate(k).toFixed(2)} per like</dd>
      <dd className="fs-line-bar"><span style={{ '--w': `${(saveRate(k) / Math.max(...kinds.map(saveRate))) * 100}%` } as React.CSSProperties} aria-hidden="true" /></dd>
    </div>)}</dl>
    <p className="fs-read">{lead.label} are {(saveRate(lead) / saveRate(other)).toFixed(1)}× as likely to be saved as liked than {other.label.toLowerCase()},
      from {other.prompts.length > lead.prompts.length ? 'half the prompts' : 'more prompts'}. That gap is the whole argument for keeping both decks separate.</p>
    <figure className="fs-quote">
      <blockquote><p>The one prompt in this library that names a price is its most-saved: its author says the pipeline it replaces runs <q>web studio build: $6,000-$35,000+</q>.</p></blockquote>
      <figcaption>{claim.handle}, <cite>{claim.title}</cite> · {n(claim.saves ?? 0)} saves · <a href={claim.source.url} target="_blank" rel="nofollow noopener noreferrer">the source post <span aria-hidden="true">↗</span></a>
        <span>Their claim about their own work, quoted. Not a measurement of this library.</span></figcaption>
    </figure>
    <ol className="fs-ranked">{topSaved(catalog.prompts, 5).map((prompt, i) => <li key={prompt.id}>
      <span className="fs-rank">{String(i + 1).padStart(2, '0')}</span>
      <a href={prompt.href}>{prompt.title}</a>
      <span className="fs-ranked-meta">{prompt.handle} · {prompt.kind}</span>
      <b>{n(prompt.saves ?? 0)}</b>
    </li>)}</ol>
    {loose.length ? <p className="fs-note">{plural(loose.length, 'prompt')} is neither image nor video, so neither line item above reaches it.</p> : null}
  </div></section>;
}
