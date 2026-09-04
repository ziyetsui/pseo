import { SiteHeader, SiteFooter } from '@/components/Chrome';
import { materials } from '../../materials';
import { BrowseHarness } from '../../browse-harness';
import { CategoryBand, HubBand } from '../../browse-neighbors';

/* The band is judged in place: the real category band above it and the real model band below it,
   both unchanged, so a direction that cannot live beside its neighbours shows that immediately. */
export default async function Page({searchParams}:{searchParams:Promise<{v?:string}>}) {
  const {v} = await searchParams, catalog = materials(), selected = Number(v) || 1;
  return <div className="prototype-magnetic"><div className="taste">
    <SiteHeader level="hub" locale={catalog.locale} />
    <main id="main">
      <section className="wrap bx-intro">
        <p className="eyebrow">Browse band exploration</p>
        <h1 className="tier-index">Browse by task</h1>
        <p className="dek">Five ways to print the task taxonomy on L1. Every entry opens the task&rsquo;s own L3 collection; the plate&rsquo;s cells open it with a model already applied. Neighbouring bands are the shipped ones.</p>
      </section>
      <div className="after">
        <CategoryBand catalog={catalog} />
        <BrowseHarness catalog={catalog} initial={selected >= 1 && selected <= 5 ? selected - 1 : 0} />
        <HubBand catalog={catalog} axis="model" id="models" heading="Browse by model" />
      </div>
    </main>
    <SiteFooter catalog={catalog} level="hub" />
  </div></div>;
}
