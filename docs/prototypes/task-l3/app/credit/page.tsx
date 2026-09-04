import { SiteHeader } from '@/components/Chrome';
import { materials } from '../../materials';
import { CreditHarness } from '../../credit-harness';
import { CategoryBand } from '../../browse-neighbors';

/* The credit is judged where it lives: under the real header, inside the real argument block, with
   the fold and the first band below it, so a direction that pushes the page around shows it. */
export default async function Page({searchParams}:{searchParams:Promise<{v?:string}>}) {
  const {v} = await searchParams, catalog = materials(), selected = Number(v) || 1;
  return <div className="prototype-magnetic"><div className="vme m-run taste" data-mode="run" data-field="magnet">
    <SiteHeader level="hub" locale={catalog.locale} />
    <main id="main">
      <CreditHarness initial={selected >= 1 && selected <= 5 ? selected - 1 : 0} />
      <div className="after"><CategoryBand catalog={catalog} /></div>
    </main>
  </div></div>;
}
