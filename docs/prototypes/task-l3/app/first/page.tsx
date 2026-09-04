import { SiteHeader } from '@/components/Chrome';
import { materials } from '../../materials';
import { FirstHarness } from '../../first-harness';
import { HubBand } from '../../browse-neighbors';

/* The first screen is judged where it lives: under the real header, and above the shipped task
   band, so a direction that swallows the whole viewport shows what it costs the page below it. */
export default async function Page({searchParams}:{searchParams:Promise<{v?:string}>}) {
  const {v} = await searchParams, catalog = materials(), selected = Number(v) || 1;
  /* The same wrapper Hub.tsx uses. Without .vme the shipped first screen loses its serif display
     size and its 410px column, and the baseline stops being the baseline. */
  return <div className="prototype-magnetic"><div className="vme m-run taste" data-mode="run" data-field="magnet">
    <SiteHeader level="hub" locale={catalog.locale} />
    <main id="main">
      <FirstHarness catalog={catalog} initial={selected >= 1 && selected <= 5 ? selected - 1 : 0} />
      <div className="after"><HubBand catalog={catalog} axis="useCase" id="tasks" heading="Browse by task" /></div>
    </main>
  </div></div>;
}
