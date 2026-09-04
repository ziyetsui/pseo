import type { Catalog } from '@/lib/catalog/types';
import { plural, splitLabel, taskHref, taskRows, unfiled } from '../../browse-shared';

/* Direction: the band as a printed index. No imagery at rest, so the whole taxonomy fits in one
   screen and every task also exposes the first few prompts it holds — one entry point becomes
   four, all of them crawlable text in the initial HTML. Type carries the hierarchy: the task name
   sits at heading weight, the prompt titles at reading weight, the counts in tabular mono. */
export default function Directory({ catalog }: { catalog: Catalog }) {
  const rows = taskRows(catalog), loose = unfiled(catalog);
  return <section className="sec" id="tasks"><div className="wrap">
    <div className="sec-h"><h2>Browse by task</h2><span className="bx-end">{plural(rows.length, 'task')} · {plural(catalog.prompts.length, 'prompt')}</span></div>
    <div className="bx-directory">{rows.map(row => <article className="bx-entry" key={row.ref.slug}>
      <div className="bx-entry-head">
        <h3><a href={taskHref(row.ref)}>{row.ref.label}</a></h3>
        <p className="bx-entry-meta">{plural(row.prompts.length, 'prompt')} · {splitLabel(row)}<br />{row.models.length ? row.models.slice(0, 3).map(model => model.label).join(' · ') : 'No model named'}</p>
      </div>
      <ul className="bx-titles">{row.prompts.slice(0, 3).map(prompt => <li key={prompt.id}><a href={prompt.href}>{prompt.title}</a><span>{prompt.handle}</span></li>)}
        {row.prompts.length > 3 ? <li className="bx-more"><a href={taskHref(row.ref)}>All {row.ref.label.toLowerCase()} prompts <span aria-hidden="true">→</span></a></li> : null}</ul>
    </article>)}</div>
    {loose.length ? <p className="bx-foot">{loose.length} of {catalog.prompts.length} prompts carry no task yet, so no entry above reaches them.</p> : null}
  </div></section>;
}
