import { interfaceLocale, uiText, text, caseCount } from '@/lib/i18n/text';
import type { Catalog, WebsiteViewAxis } from '@/lib/catalog/types';
import { websiteViews, websiteViewEntries } from '@/lib/catalog/website-views';
import { websiteEditableTemplate } from '@/lib/catalog/website-templates';
import { websiteRef } from '@/lib/catalog/website';
import { SiteHeader, SiteFooter } from './Chrome';
import { WebsiteDeck } from './WebsiteDeck';

const sections: { axis: WebsiteViewAxis; label: string; description: string }[] = [
  { axis: 'model', label: "Browse by model", description: "Explore projects associated with each coding model." },
  { axis: 'use-case', label: "Browse by purpose", description: "Find projects for the work you want to do." },
  { axis: 'tool', label: "Browse by technology", description: "Explore the tools and technologies used in these projects." },
  { axis: 'all', label: "The complete collection", description: "Browse every website case in one view." },
];
export function WebsiteViews({ catalog }: { catalog: Catalog }) {
  const uiLocale = interfaceLocale(catalog);
  const views = websiteViews(catalog);
  const slides = views.map(view => {
    const examples = websiteViewEntries(catalog, view).map(entry => ({ entry, prompt: websiteEditableTemplate(catalog, entry) }));
    const example = examples.find(item => item.entry.cover && item.prompt) ?? examples.find(item => item.prompt) ?? examples.find(item => item.entry.cover) ?? examples[0];
    return { id: view.id, title: view.label, href: view.href, cover: example?.entry.cover ?? '',
      summary: text(uiLocale, `Explore ${view.count} website ${view.count===1?'case':'cases'} in this ${view.axis==='all'?'complete collection':view.axis==='use-case'?'purpose':view.axis==='tool'?'technology':'model'} view.`, `在此分类中探索 ${view.count} 个网站案例。`),
      caption: caseCount(uiLocale, view.count), sourceUrl: example?.entry.source.url, attribution: example?.entry.attribution,
      prompt: example?.prompt?.prompt, language: example?.prompt?.language, templateOrigin: example?.prompt?.origin };
  });
  return <div className="prototype-deck website-aligned"><div className="v4 taste"><SiteHeader bilingual={catalog.mode === 'git-beta'} currentHref={`/${catalog.locale}/prompts/website`} level="deck" locale={catalog.locale} contentType="website" /><main id="main"><div className="wrap">
    <header className="hero"><p className="eyebrow">{uiText(uiLocale, "Website gallery")}</p><h1 className="tier-index">{uiText(uiLocale, "Website views")}</h1><p className="lede">{text(uiLocale, `Explore ${websiteRef(catalog).count} website cases by purpose, model or technology. Pick a view to discover related projects.`, `按用途、模型或技术探索 ${websiteRef(catalog).count} 个网站案例，选择一个分类发现相关项目。`)}</p></header>
    <section className="sec"><div className="sec-head"><h2>{uiText(uiLocale, "Explore a view")}</h2><span className="count">{text(uiLocale, `${views.length} views`, `${views.length} 个分类`)}</span></div><WebsiteDeck uiLocale={uiLocale} kind="view" items={slides} /></section>
    {sections.map(section => {
      const rows = views.filter(view => view.axis === section.axis);
      if (!rows.length) return null;
      return <section className="sec website-browse" key={section.axis}><div className="sec-head"><h2>{uiText(uiLocale, section.label)}</h2></div><p className="subline">{uiText(uiLocale, section.description)}</p><ul className="entry">{rows.map(view => <li key={view.id}>
        <a className="nm" href={view.href} data-website-view={view.id} data-view-axis={view.axis} data-view-target={view.targetId ?? ''} data-view-count={view.count}>{view.label} <span>{caseCount(uiLocale, view.count)}</span></a><a className="go" href={view.href}>{uiText(uiLocale, "Explore this view →")}</a>
      </li>)}</ul></section>;
    })}
  </div></main><SiteFooter catalog={catalog} level="deck" /></div></div>;
}
