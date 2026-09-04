import type { Catalog } from '@/lib/catalog/types';
import { CategoryBand } from '../../browse-neighbors';

/* Baseline: the shipped first screen, copied verbatim out of frontend/src/components/Hub.tsx —
   a full-viewport serif argument — with the shipped category band underneath it, which is where
   the two L2 entries live today. Nothing else is on screen until you scroll. */
export default function Current({ catalog }: { catalog: Catalog }) {
  return <>
    <section className="wrap argument"><h1>Somebody already wrote this</h1><div className="body">
      <p>Every prompt in this library was published in the open by the person who wrote it, and then mostly lost — buried under a feed that is optimised for the next thing rather than the useful thing.</p>
      <p>So the whole of the work here is <em>not editing</em>. No paraphrase, no house style, no distillation into a template. The text you copy is the text they posted, down to the render settings at the end that look like noise and are not.</p>
      <p>What we add is the index, the attribution, and a link back. That is the entire product.</p>
    </div></section>
    <div className="after"><CategoryBand catalog={catalog} /></div>
  </>;
}
