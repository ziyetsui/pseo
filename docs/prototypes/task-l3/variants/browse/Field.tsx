import type { Catalog } from '@/lib/catalog/types';
import { plural, taskHref, taskRows, unfiled } from '../../browse-shared';

/* Direction: argue by output, not by taxonomy. Each task is a contact sheet of its own real
   results, packed by how many it actually has — one fills the frame, four make a quarter grid —
   so the cell content is the evidence and the count is a caption. A task with no usable preview
   says so instead of dropping out of the band, which is what the current tiles do to Automotive. */
export default function Field({ catalog }: { catalog: Catalog }) {
  const rows = taskRows(catalog), loose = unfiled(catalog);
  return <section className="sec" id="tasks"><div className="wrap">
    <div className="sec-h"><h2>Browse by task</h2><span className="bx-end">{plural(rows.length, 'task')} · {plural(catalog.prompts.length, 'prompt')}</span></div>
    <div className="bx-field">{rows.map(row => {
      const shots = row.shots.slice(0, 4);
      return <a className="bx-sheet" href={taskHref(row.ref)} key={row.ref.slug}>
        <span className="bx-mosaic" data-shots={shots.length}>{shots.length
          ? shots.map(prompt => <img key={prompt.id} src={prompt.img ?? ''} alt="" width={220} height={220} loading="lazy" referrerPolicy="no-referrer" />)
          : <span className="bx-blank">No preview on the source posts</span>}</span>
        <span className="bx-caption"><b lang={catalog.locale}>{row.ref.label}</b><span>{plural(row.prompts.length, 'prompt')} · {row.models.length ? plural(row.models.length, 'model') : 'no model named'}</span></span>
      </a>;
    })}</div>
    {loose.length ? <p className="bx-foot">{loose.length} of {catalog.prompts.length} prompts carry no task yet, so no sheet above reaches them.</p> : null}
  </div></section>;
}
