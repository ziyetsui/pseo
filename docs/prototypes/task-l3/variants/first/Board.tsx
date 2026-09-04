'use client';
import { useEffect, useState } from 'react';
import type { Catalog } from '@/lib/catalog/types';
import { cell, kindRows, n, plural, ramp, saveRate, sum, taskFilterHref, taskRows, unclassified } from '../../first-shared';

/* Direction: the first screen is a board of numbers. The two decks are the column heads and the
   only two big targets; the plate under them says where the saving actually happens, task by task.
   Shade is a neutral luminance mix of the page's own ink, never a hue, and every cell prints its
   number, so the encoding is never the only signal. */
export default function Board({ catalog }: { catalog: Catalog }) {
  const [tip, setTip] = useState<{ x: number; y: number; text: string } | null>(null);
  /* The tip is placed in viewport coordinates, so a scroll would leave it hanging beside nothing. */
  useEffect(() => {
    if (!tip) return;
    const clear = () => setTip(null);
    window.addEventListener('scroll', clear, { passive: true });
    return () => window.removeEventListener('scroll', clear);
  }, [tip]);
  const kinds = kindRows(catalog), rows = taskRows(catalog), loose = unclassified(catalog);
  const peak = Math.max(1, ...rows.flatMap(row => kinds.map(k => sum(cell(row, k.kind), 'saves'))));
  const total = sum(catalog.prompts, 'saves');
  const lead = [...kinds].sort((a, b) => b.saves - a.saves)[0];
  return <section className="fs fs-board"><div className="wrap">
    <p className="eyebrow">The board · snapshot {catalog.observedAt}</p>
    <h1 className="tier-index">{n(total)} saves across {plural(catalog.prompts.length, 'prompt')}</h1>
    <p className="dek">A save is somebody putting a prompt aside to run it. {lead.label} take more of them than the other deck
      — {n(lead.saves)} against {n(kinds.find(k => k !== lead)!.saves)} — from {lead.prompts.length === Math.max(...kinds.map(k => k.prompts.length)) ? 'more' : 'fewer'} prompts.</p>
    <div className="fs-decks">{kinds.map(k => <a className="fs-deck" href={k.href} key={k.kind}>
      <span className="fs-deck-head"><b>{k.label}</b><span>{plural(k.prompts.length, 'prompt')}</span></span>
      <span className="fs-deck-figure">{n(k.saves)}<em>saves</em></span>
      <dl className="fs-deck-stats">
        <div><dt>Per prompt</dt><dd>{n(Math.round(k.saves / k.prompts.length))}</dd></div>
        <div><dt>Saves per like</dt><dd>{saveRate(k).toFixed(2)}</dd></div>
      </dl>
      <span className="fs-deck-go">Open the deck <span aria-hidden="true">→</span></span>
    </a>)}</div>
    <div className="fs-map"><table aria-describedby="fs-board-note">
      <caption className="vh">Saves by task and deck</caption>
      <thead><tr><th scope="col" className="fs-corner">Task ↓ / Deck →</th>
        {kinds.map(k => <th scope="col" key={k.kind}>{k.label}<em>{n(k.saves)}</em></th>)}
        <th scope="col" className="fs-total">Both decks</th></tr></thead>
      <tbody>{rows.map(row => {
        const rowTotal = sum(row.prompts, 'saves');
        return <tr key={row.label}>
          <th scope="row"><span className="fs-task">{row.label}<em>{plural(row.prompts.length, 'prompt')}</em></span></th>
          {kinds.map(k => {
            const rows2 = cell(row, k.kind), saves = sum(rows2, 'saves');
            if (!rows2.length) return <td key={k.kind}><span className="fs-nil"><span aria-hidden="true">·</span><span className="vh">No {k.label.toLowerCase()} in {row.label}</span></span></td>;
            const text = `${row.label} · ${k.label} — ${plural(rows2.length, 'prompt')}, ${n(saves)} saves`;
            return <td className="fs-shade" key={k.kind} style={{ '--d': `${ramp(saves, peak).toFixed(1)}%` } as React.CSSProperties}>
              {row.slug
                ? <a className="fs-cell" href={taskFilterHref(catalog, k.kind, row.slug)} aria-label={`${text}. Opens the ${k.label.toLowerCase()} deck filtered to ${row.label}.`}
                    onMouseEnter={e => setTip({ x: e.currentTarget.getBoundingClientRect().left, y: e.currentTarget.getBoundingClientRect().top, text })}
                    onMouseLeave={() => setTip(null)} onFocus={e => setTip({ x: e.currentTarget.getBoundingClientRect().left, y: e.currentTarget.getBoundingClientRect().top, text })} onBlur={() => setTip(null)}>{n(saves)}</a>
                /* No task, so no filter to open: the number is stated, not linked. */
                : <span className="fs-cell fs-cell-flat" title={text}>{n(saves)}</span>}
            </td>;
          })}
          <td className="fs-total"><span className="fs-cell fs-cell-flat">{n(rowTotal)}</span></td>
        </tr>;
      })}</tbody>
    </table></div>
    <p className="fs-note" id="fs-board-note">Shade is the square root of the cell&rsquo;s saves against the busiest cell — saves run {n(6)} to {n(peak)} in this snapshot, and a linear ramp would flatten every row but one. A dot is a combination the library has nothing for.
      {loose.length ? ` ${plural(loose.length, 'prompt')} is neither image nor video, so it appears in neither deck.` : ''}</p>
    {tip && <span className="fs-tip" style={{ left: tip.x, top: tip.y }} role="presentation">{tip.text}</span>}
  </div></section>;
}
