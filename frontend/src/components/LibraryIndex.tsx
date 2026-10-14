import { interfaceLocale, uiText } from '@/lib/i18n/text';
import type { Catalog } from '@/lib/catalog/types';
import { libraryIndex } from '@/site/navigation';
import { SiteHeader, SiteFooter } from './Chrome';

export function LibraryIndex({ catalog }: { catalog:Catalog }) {
  const uiLocale = interfaceLocale(catalog);
  const index=libraryIndex(catalog);
  return <div className="prototype-deck website-aligned"><div className="v4 taste"><SiteHeader bilingual={catalog.mode === 'git-beta'} currentHref={`/${catalog.locale}/prompts/library-index`} level="deck" locale={catalog.locale} /><main id="main"><div className="wrap"><header className="hero"><p className="eyebrow">{uiText(uiLocale, "The complete directory")}</p><h1>{uiText(uiLocale, "Library index")}</h1><p className="lede">{uiText(uiLocale, "Browse by medium, task, model and technology, or find a project in the full collection.")}</p></header><section className="sec"><h2>{uiText(uiLocale, "Browse the library")}</h2><div className="linkcols">{index.groups.map(group=><section key={group.id}><h3>{group.title}</h3><ul>{group.entries.map(entry=><li key={entry.id}><a href={entry.href}>{entry.label}</a></li>)}</ul></section>)}</div></section><section className="sec"><h2>{uiText(uiLocale, "Every prompt and project")}</h2>{index.collections.map(group=><details className="library-index-group" key={group.id}><summary>{group.title} · {group.entries.length}</summary><ol>{group.entries.map(entry=><li key={entry.id}><a href={entry.href}>{entry.label}</a></li>)}</ol></details>)}</section></div><script type="application/json" id="library-navigation-index" dangerouslySetInnerHTML={{__html:JSON.stringify(index).replace(/</g,'\\u003c')}} /></main><SiteFooter catalog={catalog} level="deck" /></div></div>;
}
