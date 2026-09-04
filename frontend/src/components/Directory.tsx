import type { Catalog, Ref } from '@/lib/catalog/types';
import { SiteFooter, SiteHeader } from './Chrome';

export function Directory({ catalog, title, items }: { catalog: Catalog; title: string; items: Ref[] }) {
  return <div className="prototype-hub"><div className="taste">
    <SiteHeader locale={catalog.locale} level="deck" />
    <main id="main" className="wrap"><section className="sec"><p className="eyebrow">The library</p><h1 className="tier-index">{title}</h1>
      <div className="tiles" style={{ marginTop: 32 }}>{items.map(item => <a className="tile" href={item.href} target={/^https?:\/\//.test(item.href) ? "_blank" : undefined} rel={/^https?:\/\//.test(item.href) ? "nofollow noopener noreferrer" : undefined} key={item.id}><span className="tb"><h2>{item.label}</h2><p>{item.count} {item.count === 1 ? 'prompt' : 'prompts'}</p></span></a>)}</div>
      {!items.length && <p className="dek">Nothing has been published here yet.</p>}
    </section></main><SiteFooter catalog={catalog} />
  </div></div>;
}
