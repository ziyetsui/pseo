import type { Catalog } from '@/lib/catalog/types';
import { plural, splitLabel, taskHref, taskRows, unfiled } from '../../browse-shared';

/* Direction: the plate's count-is-the-shape argument, straightened into one ranked line per task.
   Length replaces shade, so the ranking is readable at a glance and survives a phone; the bar is
   split image / video and both numbers are also written out, so the split never depends on tone
   alone. Three real thumbnails per row keep the page from becoming a spreadsheet. */
export default function Ledger({ catalog }: { catalog: Catalog }) {
  const rows = taskRows(catalog), loose = unfiled(catalog);
  const peak = Math.max(1, ...rows.map(row => row.prompts.length));
  return <section className="sec" id="tasks"><div className="wrap">
    <div className="sec-h"><h2>Browse by task</h2><span className="bx-end">{plural(rows.length, 'task')}, most covered first</span></div>
    <ol className="bx-ledger">{rows.map((row, index) => <li className="bx-row" key={row.ref.slug}>
      <span className="bx-rank">{String(index + 1).padStart(2, '0')}</span>
      <span className="bx-lede">
        <a className="bx-name" href={taskHref(row.ref)}>{row.ref.label}</a>
        <span className="bx-models">{row.models.length ? row.models.slice(0, 3).map(model => model.label).join(' · ') : 'No model named'}</span>
      </span>
      <span className="bx-measure">
        <span className="bx-bar" aria-hidden="true" style={{ '--w': `${(row.prompts.length / peak) * 100}%` } as React.CSSProperties}>
          {row.images + row.videos ? <><i className="bx-img" style={{ flexGrow: row.images }} /><i className="bx-vid" style={{ flexGrow: row.videos }} /></> : <i className="bx-vid" style={{ flexGrow: 1 }} />}
        </span>
        <span className="bx-split">{plural(row.prompts.length, 'prompt')}<span> · {splitLabel(row)}</span></span>
      </span>
      <span className="bx-shots" aria-hidden="true">{row.shots.slice(0, 3).map(prompt => <img key={prompt.id} src={prompt.img ?? ''} alt="" width={44} height={44} loading="lazy" referrerPolicy="no-referrer" />)}
        {row.shots.length ? null : <span className="bx-noshot">no preview</span>}</span>
    </li>)}</ol>
    {loose.length ? <p className="bx-foot">{loose.length} of {catalog.prompts.length} prompts carry no task yet, so no row above reaches them.</p> : null}
  </div></section>;
}
