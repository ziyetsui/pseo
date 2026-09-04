import type { Catalog } from '@/lib/catalog/types';
import { PromptMedia } from '@/components/PromptMedia';
import { kindRows, n, plural, saveRate, sum, topSaved, unclassified } from '../../first-shared';

/* Direction: the first screen as a head-to-head. Two decks, two columns, the same four measures
   down each side so the eye compares by position rather than by a shared scale — and each column
   head is the L2 entry. It is the only direction where the two categories are the structure. */
export default function Split({ catalog }: { catalog: Catalog }) {
  const kinds = kindRows(catalog), loose = unclassified(catalog);
  const peakRate = Math.max(...kinds.map(saveRate)), peakSaves = Math.max(...kinds.map(k => k.saves));
  return <section className="fs fs-split"><div className="wrap">
    <p className="eyebrow">Head to head · snapshot {catalog.observedAt}</p>
    <h1 className="tier-index">Two decks, {n(sum(catalog.prompts, 'saves'))} saves</h1>
    <p className="dek">Same four measures down each side. Pick a side and the deck opens.</p>
    <div className="fs-duel">{kinds.map(k => <section className="fs-side" key={k.kind}>
      <a className="fs-side-head" href={k.href}><h2>{k.label}</h2><span>Open the deck <span aria-hidden="true">→</span></span></a>
      <dl className="fs-measures">{([
        ['Prompts', k.prompts.length, n(k.prompts.length), Math.max(...kinds.map(x => x.prompts.length))],
        ['Saves', k.saves, n(k.saves), peakSaves],
        ['Saves per prompt', k.saves / k.prompts.length, n(Math.round(k.saves / k.prompts.length)), Math.max(...kinds.map(x => x.saves / x.prompts.length))],
        ['Saves per like', saveRate(k), saveRate(k).toFixed(2), peakRate],
      ] as const).map(([label, value, shown, peak]) => <div key={label}>
        <dt>{label}</dt>
        {/* Every measure carries the same bar against its own peak: two of four would read as a
            judgement about which two matter, and the eye compares position, not scale. */}
        <dd>{shown}<span className="fs-track" aria-hidden="true"><span className="fs-mini" style={{ '--w': `${(value / peak) * 100}%` } as React.CSSProperties} /></span></dd>
      </div>)}</dl>
      <p className="fs-side-label">Most saved in this deck</p>
      <ol className="fs-side-list">{topSaved(k.prompts, 3).map(prompt => <li key={prompt.id}>
        <a href={prompt.href}>
          <span className="fs-side-media"><PromptMedia prompt={prompt} width={160} height={160} /></span>
          <span className="fs-side-copy"><b>{prompt.title}</b><span>{prompt.handle}</span></span>
          <span className="fs-side-n">{n(prompt.saves ?? 0)}<em>saves</em></span>
        </a>
      </li>)}</ol>
    </section>)}</div>
    {loose.length ? <p className="fs-note">{plural(loose.length, 'prompt')} is neither image nor video, so it belongs to neither side and appears in neither deck.</p> : null}
  </div></section>;
}
