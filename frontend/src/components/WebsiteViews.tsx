import type { Catalog, WebsiteViewAxis } from '@/lib/catalog/types';
import { websiteViews, websiteViewEntries } from '@/lib/catalog/website-views';
import { websiteRef } from '@/lib/catalog/website';
import { SiteHeader, SiteFooter } from './Chrome';

const sections: { axis: WebsiteViewAxis; label: string; description: string }[] = [
  { axis: 'use-case', label: 'Browse by purpose', description: 'Find projects for the work you want to do.' },
  { axis: 'model', label: 'Browse by model', description: 'Explore projects associated with each coding model.' },
  { axis: 'tool', label: 'Browse by technology', description: 'Explore the tools and technologies used in these projects.' },
  { axis: 'all', label: 'The complete collection', description: 'Browse every website case in one view.' },
];
export function WebsiteViews({ catalog }: { catalog: Catalog }) {
  const views = websiteViews(catalog);
  return <div className="prototype-magnetic website-library"><div className="taste"><SiteHeader level="hub" locale={catalog.locale} sectionNavigation="library" /><main id="main">
    <section className="wrap sec"><div className="sec-h"><h1>Website views</h1></div><p className="dek">Explore {websiteRef(catalog).count} website cases by purpose, model or technology. Pick a view to discover related projects.</p></section>
    {sections.map(section => {
      const rows = views.filter(view => view.axis === section.axis);
      if (!rows.length) return null;
      return <section className="wrap sec" key={section.axis}><div className="sec-h"><h2>{section.label}</h2></div><p className="dek">{section.description}</p><div className="tiles website-cases">{rows.map(view => {
        const cover = websiteViewEntries(catalog, view).find(entry => entry.cover)?.cover;
        return <a className="tile" href={view.href} key={view.id} data-website-view={view.id} data-view-axis={view.axis} data-view-target={view.targetId ?? ''} data-view-count={view.count}>
          <div className="th">{cover && <img src={cover} alt="" width={560} height={350} loading="lazy" />}</div><div className="tb"><h3>{view.label}</h3><p>{view.count} {view.count === 1 ? 'case' : 'cases'}</p></div>
        </a>;
      })}</div></section>;
    })}
  </main><SiteFooter catalog={catalog} /></div></div>;
}
