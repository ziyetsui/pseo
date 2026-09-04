import type { Catalog } from '@/lib/catalog/types';
import { cell, modelColumns, plural, taskHref, taskRows, unfiled } from '../../browse-shared';

/* Direction: the taxonomy drawn once as a plate. Tasks down, models across, shade = how many
   prompts sit at that intersection. Navigation is the diagram: a row heading opens the task,
   a cell opens the task with that model already applied. Shade is a neutral luminance mix of the
   page's own ink, never a hue, and the count is printed in every cell so colour is never the
   only signal. It is the only direction that shows what the library does not have. */
export default function Plate({ catalog }: { catalog: Catalog }) {
  const rows = taskRows(catalog), columns = modelColumns(catalog), loose = unfiled(catalog);
  const peak = Math.max(1, ...rows.flatMap(row => columns.map(model => cell(row, model.slug))));
  return <section className="sec" id="tasks"><div className="wrap">
    <div className="sec-h"><h2>Browse by task</h2><span className="bx-end">{plural(rows.length, 'task')} · {plural(catalog.prompts.length, 'prompt')}</span></div>
    <p className="bx-note" id="bx-plate-note">Prompts per task and model. Shade is the count, printed in every cell; a dot is an intersection nothing covers yet. A task name opens its collection, a cell opens it with that model already applied.</p>
    <div className="bx-map"><table aria-describedby="bx-plate-note">
      <caption className="vh">Prompt counts by task and model</caption>
      <thead><tr><th scope="col" className="bx-corner">Task ↓ / Model →</th>
        {columns.map(model => <th scope="col" key={model.slug}>{model.label}<em>{model.count}</em></th>)}
      </tr></thead>
      <tbody>{rows.map(row => <tr key={row.ref.slug}>
        <th scope="row"><a className="bx-task" href={taskHref(row.ref)}>{row.ref.label}<em>{row.ref.count}</em></a></th>
        {columns.map(model => {
          const count = cell(row, model.slug);
          if (!count) return <td key={model.slug}><span className="bx-nil"><span aria-hidden="true">·</span><span className="vh">No prompts: {row.ref.label} and {model.label}</span></span></td>;
          /* The shade sits on the cell, not on the link: a task whose name wraps to two lines makes
             the row taller than the link, and a link-painted shade leaves a grey strip under it. */
          return <td className="bx-shade" key={model.slug} style={{ '--d': `${(4 + (count / peak) * 12).toFixed(1)}%` } as React.CSSProperties}>
            <a className="bx-cell" href={taskHref(row.ref, model.slug)} aria-label={`${plural(count, 'prompt')}: ${row.ref.label} and ${model.label}`}>{count}</a></td>;
        })}
      </tr>)}</tbody>
    </table></div>
    <p className="bx-legend"><span>Fewer</span><span className="bx-ramp" aria-hidden="true"><i style={{ '--d': '4%' } as React.CSSProperties} /><i style={{ '--d': '8%' } as React.CSSProperties} /><i style={{ '--d': '12%' } as React.CSSProperties} /><i style={{ '--d': '16%' } as React.CSSProperties} /></span><span>More</span>
      <span>Peak {plural(peak, 'prompt')} in one cell{loose.length ? ` · ${loose.length} of ${catalog.prompts.length} prompts carry no task yet` : ''}</span></p>
  </div></section>;
}
