import {RecipeMedia} from './RecipeMedia';
import {MonetizationRelated} from './Monetization';
import { interfaceLocale, uiText, text, caseCount, sourceLanguage } from '@/lib/i18n/text';
import type { Catalog, WebsiteCase, WebsiteView, Ref } from '@/lib/catalog/types';
import { RecipeText } from './RecipeText';
import { RecipeGenerateLink } from './RecipeGenerateLink';
import { websiteEditableTemplate } from '@/lib/catalog/website-templates';
import { websiteRef } from '@/lib/catalog/website';
import { websiteViewEntries, websiteViews, websiteViewsForCase } from '@/lib/catalog/website-views';
import { WebsiteViews } from './WebsiteViews';
import { SiteHeader, SiteFooter } from './Chrome';
import { WebsiteCasesReader } from './WebsiteCasesReader';

export function WebsiteGallery({ catalog }: { catalog: Catalog }) {
  return <WebsiteViews catalog={catalog} />; }
export function WebsiteViewGallery({ catalog, view }: { catalog: Catalog; view: WebsiteView }) {
  const uiLocale = interfaceLocale(catalog);
  const entries=websiteViewEntries(catalog,view),presentation=view.axis==='all'?'deck':view.axis==='use-case'?'findings':'anthology';
  const reference=(view:WebsiteView):Ref=>({id:view.id,slug:view.slug,label:view.label,href:view.href,count:view.count});
  const navigation=websiteViews(catalog).filter(item=>item.axis===view.axis).map(reference);
  const topics=Object.fromEntries(entries.map(entry=>[entry.id,websiteViewsForCase(catalog,entry.id).map(reference)]));
  const templates=entries.map(entry=>({entry,template:websiteEditableTemplate(catalog,entry)}));
  const promptTexts=Object.fromEntries(templates.map(({entry,template})=>[entry.id,template.prompt]));
  const promptLanguages=Object.fromEntries(templates.map(({entry,template})=>[entry.id,template.language]));
  const promptTemplateOrigins=Object.fromEntries(templates.map(({entry,template})=>[entry.id,template.origin]));
  const reader=<WebsiteCasesReader promptTemplateOrigins={promptTemplateOrigins} promptLanguages={promptLanguages} uiLocale={uiLocale} entries={entries} href={view.href} presentation={presentation} title={view.label} locale={catalog.locale} navigation={navigation} topics={topics} promptTexts={promptTexts} />;
  if(presentation==='anthology') return <div className="prototype-anthology website-aligned"><div className="v4"><SiteHeader bilingual={catalog.mode === 'git-beta'} currentHref={view.href} level="model" locale={catalog.locale} /><div className="page"><main id="main">{reader}</main><SiteFooter catalog={catalog} level="model" /></div></div></div>;
  if(presentation==='findings') return <div className="prototype-magnetic prototype-task-findings website-aligned"><div className="taste vfd"><SiteHeader bilingual={catalog.mode === 'git-beta'} currentHref={view.href} level="hub" locale={catalog.locale} sectionNavigation="library" /><main id="main"><section className="wrap open"><h1>{view.label}</h1><div className="arg"><p className="lede">{text(uiLocale, `${view.count} website cases, connected by purpose. Explore their sources, previews and the project links supplied with them.`, `${view.count} 个用途相近的网站案例。探索原始来源、预览及所附项目链接。`)}</p></div></section>{reader}</main><SiteFooter catalog={catalog} /></div></div>;
  return <div className="prototype-deck website-aligned"><div className="v4 taste"><SiteHeader bilingual={catalog.mode === 'git-beta'} currentHref={view.href} level="deck" locale={catalog.locale} contentType="website" /><main id="main"><div className="wrap"><header className="hero"><p className="eyebrow">{uiText(uiLocale, "Website gallery")}</p><h1 className="tier-index">{view.label}</h1><p className="lede">{text(uiLocale, `${view.count} website cases, one project at a time. Use the buttons or arrow keys to explore the deck.`, `${view.count} 个网站案例，每次探索一个项目。使用按钮或方向键逐一浏览。`)}</p></header>{reader}</div></main><SiteFooter catalog={catalog} level="deck" /></div></div>;
}
export function WebsiteCaseDetail({ catalog, entry }: { catalog: Catalog; entry: WebsiteCase }) {
  const uiLocale = interfaceLocale(catalog);
  const prompt=websiteEditableTemplate(catalog,entry),views=websiteViewsForCase(catalog,entry.id);
  return <div className="prototype-recipe website-aligned"><div className="v3"><SiteHeader bilingual={catalog.mode === 'git-beta'} currentHref={entry.href} level="prompt" locale={catalog.locale} /><main id="main"><div className="wrap">
    <header className="website-recipe-title"><h1 lang={sourceLanguage(entry.title)}>{entry.title}</h1><p className="dek" lang={sourceLanguage(entry.summary)}>{entry.summary}</p><div className="byline"><span>{text(uiLocale, "by ", "作者：")}<a href={entry.source.url} target="_blank" rel="noopener noreferrer nofollow">{entry.attribution || uiText(uiLocale, "Original source")}</a></span><a href={websiteRef(catalog).href}>{uiText(uiLocale, "Website views")}</a></div></header>
    <section className="step" aria-labelledby="website-result"><div className="num" aria-hidden="true">01</div><div><h2 id="website-result">{text(uiLocale,"Visual references","视觉参考")}</h2><p className="lede">{text(uiLocale,"Images, videos and demo screenshots linked to this case’s sources.","本案例来源关联的图片、视频及演示网站截图。")}</p><RecipeMedia website uiLocale={uiLocale} prompt={{id:entry.id,title:entry.title,locale:catalog.locale,img:entry.cover,media:entry.media}} /></div></section>
    <RecipeText prompt={prompt} uiLocale={uiLocale} showOriginalLanguage />
    <section className="step" aria-labelledby="website-run"><div className="num" aria-hidden="true">04</div><div><h2 id="website-run">{uiText(uiLocale, "Run it")}</h2><p className="lede">{uiText(uiLocale, "Explore the creator’s project using the links supplied with the source.")}</p><div className="acts"><RecipeGenerateLink prompt={prompt.prompt}>{text(uiLocale, "Generate website", "生成网站")}</RecipeGenerateLink><a className="btn" href={entry.source.url} target="_blank" rel="noopener noreferrer nofollow">{uiText(uiLocale, "View original source ↗")}</a>{entry.demoUrl&&<a className="btn" href={entry.demoUrl} target="_blank" rel="noopener noreferrer nofollow">{uiText(uiLocale, "Open demo ↗")}</a>}{entry.codeUrl&&<a className="btn" href={entry.codeUrl} target="_blank" rel="noopener noreferrer nofollow">{uiText(uiLocale, "View code ↗")}</a>}</div><div className="kv"><span>{uiText(uiLocale, "Related views")}</span><span>{views.map((view,index)=><span key={view.id}>{index>0&&' · '}<a href={view.href}>{view.label} · {caseCount(uiLocale, view.count)}</a></span>)}</span></div>{entry.relatedSources.map(url=><div className="kv" key={url}><span>{uiText(uiLocale, "Related source")}</span><a href={url} target="_blank" rel="noopener noreferrer nofollow">{uiText(uiLocale, "Related source post ↗")}</a></div>)}</div></section>
    <MonetizationRelated catalog={catalog} contentId={entry.id}/>
  </div></main><SiteFooter catalog={catalog} level="prompt" /></div></div>;
}
