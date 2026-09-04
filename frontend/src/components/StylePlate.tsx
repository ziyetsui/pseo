import type { Catalog, Ref } from '@/lib/catalog/types';
import { SiteHeader, SiteFooter } from './Chrome';
import { HubBrowse } from './Browse';
import { StylePlateReader } from './StylePlateReader';

export function StylePlate({ catalog, style }: { catalog: Catalog; style: Ref }) {
  const rows = catalog.prompts.filter(p => p.styles.some(ref => ref.id === style.id || ref.slug === style.slug));
  return <div className="prototype-magnetic prototype-style-plate"><div className="taste vpl"><SiteHeader level="hub" locale={catalog.locale} /><main id="main">
    <section className="wrap titlepage"><p className="eyebrow">Catalogue · {rows.length} {rows.length === 1 ? 'prompt' : 'prompts'}</p><h1><span lang={catalog.locale}>{style.label}.</span><br />One prompt, one plate.</h1><p className="dek">Each result is reproduced whole and uncropped, with its caption set in the margin: what made it, who wrote it, and the words themselves.</p></section>
    <StylePlateReader catalog={{...catalog,prompts:rows}} style={style} />
    <HubBrowse catalog={catalog} horizontalNavigation />
  </main><SiteFooter catalog={catalog} /></div></div>;
}
