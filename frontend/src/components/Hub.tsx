import type { Catalog } from "@/lib/catalog/types";
import { SiteHeader, SiteFooter } from "@/components/Chrome";
import { HubBrowse } from "@/components/Browse";
import { HubReader } from "@/components/HubReader";

export function Hub({ catalog }: { catalog: Catalog }) {
  return <div className="prototype-magnetic"><div className="vme m-run taste" data-mode="run" data-field="magnet"><SiteHeader level="hub" locale={catalog.locale} /><main id="main"><section className="wrap argument"><h1>Somebody already wrote this</h1><div className="body">
    <p>Every prompt in this library was published in the open by the person who wrote it, and then mostly lost — buried under a feed that is optimised for the next thing rather than the useful thing.</p>
    <p>So the whole of the work here is <em>not editing</em>. No paraphrase, no house style, no distillation into a template. The text you copy is the text they posted, down to the render settings at the end that look like noise and are not.</p>
    <p>What we add is the index, the attribution, and a link back. That is the entire product.</p>
  </div></section><div className="after"><HubReader catalog={catalog} /><HubBrowse catalog={catalog} /></div></main><SiteFooter catalog={catalog} level="hub" /></div></div>;
}
