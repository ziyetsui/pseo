import { interfaceLocale, uiText, text, caseCount } from '@/lib/i18n/text';
import type { Catalog, WebsiteViewAxis } from '@/lib/catalog/types';
import { websiteViews, websiteViewEntries } from '@/lib/catalog/website-views';
import { websiteRef } from '@/lib/catalog/website';
import { SiteHeader, SiteFooter } from './Chrome';
import { WebsiteDeck } from './WebsiteDeck';

const sections: { axis: WebsiteViewAxis; label: string; description: string }[] = [
  { axis: 'use-case', label: "Browse by purpose", description: "Find projects for the work you want to do." },
  { axis: 'model', label: "Browse by model", description: "Explore projects associated with each coding model." },
  { axis: 'tool', label: "Browse by technology", description: "Explore the tools and technologies used in these projects." },
  { axis: 'all', label: "The complete collection", description: "Browse every website case in one view." },
];
export function WebsiteViews({ catalog }: { catalog: Catalog }) {
  const uiLocale = interfaceLocale(catalog);
  const views = websiteViews(catalog);
  return <div className="prototype-deck website-aligned"><div className="v4 taste"><SiteHeader bilingual={catalog.mode === 'git-beta'} currentHref={`/${catalog.locale}/prompts/website`} level="deck" locale={catalog.locale} contentType="website" /><main id="main"><div className="wrap">
    <header className="hero"><p className="eyebrow">{uiText(uiLocale, "Website gallery")}</p><h1 className="tier-index">{uiText(uiLocale, "Website views")}</h1><p className="lede">{text(uiLocale, `Explore ${websiteRef(catalog).count} website cases by purpose, model or technology. Pick a view to discover related projects.`, `按用途、模型或技术探索 ${websiteRef(catalog).count} 个网站案例，选择一个分类发现相关项目。`)}</p></header>
    <section className="sec"><div className="sec-head"><h2>{uiText(uiLocale, "Explore a view")}</h2><span className="count">{text(uiLocale, `${views.length} views`, `${views.length} 个分类`)}</span></div><WebsiteDeck uiLocale={uiLocale} kind="view" items={views.map(view=>({id:view.id,title:view.label,href:view.href,cover:websiteViewEntries(catalog,view).find(entry=>entry.cover)?.cover??'',summary:text(uiLocale, `Explore ${view.count} website ${view.count===1?'case':'cases'} in this ${view.axis==='all'?'complete collection':view.axis==='use-case'?'purpose':view.axis==='tool'?'technology':'model'} view.`, `在此分类中探索 ${view.count} 个网站案例。`),caption:caseCount(uiLocale, view.count)}))} /></section>
    {sections.map(section => {
      const rows = views.filter(view => view.axis === section.axis);
      if (!rows.length) return null;
      return <section className="sec website-browse" key={section.axis}><div className="sec-head"><h2>{uiText(uiLocale, section.label)}</h2></div><p className="subline">{uiText(uiLocale, section.description)}</p><ul className="entry">{rows.map(view => <li key={view.id}>
        <a className="nm" href={view.href} data-website-view={view.id} data-view-axis={view.axis} data-view-target={view.targetId ?? ''} data-view-count={view.count}>{view.label} <span>{caseCount(uiLocale, view.count)}</span></a><a className="go" href={view.href}>{uiText(uiLocale, "Explore this view →")}</a>
      </li>)}</ul></section>;
    })}
  </div></main><SiteFooter catalog={catalog} level="deck" /></div></div>;
}
