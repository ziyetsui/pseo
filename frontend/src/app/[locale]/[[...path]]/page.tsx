import {interfaceLocale,text} from '@/lib/i18n/text';
import { WebsiteGallery, WebsiteCaseDetail, WebsiteViewGallery } from '@/components/WebsiteCases';
import { LibraryIndex } from '@/components/LibraryIndex';
import { websiteViewForPath } from '@/lib/catalog/website-views';
import { websitePrompts, websiteRef } from '@/lib/catalog/website';
import {websiteLegacyPaths} from '@/lib/catalog/website-taxonomy';
import {SiteHeader,SiteFooter} from '@/components/Chrome';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { loadCatalogs } from '@/lib/catalog/server';
import { Hub } from '@/components/Hub';
import { Deck } from '@/components/Deck';
import { Anthology } from '@/components/Anthology';
import { TaskFindings } from '@/components/TaskFindings';
import { StylePlate } from '@/components/StylePlate';
import { Recipe } from '@/components/Recipe';
import { Directory } from '@/components/Directory';
import { Blog, BlogArticle, BlogCategory } from '@/components/Blog';
import { loadArticleSite } from '@/site/articles';
import { StructuredData } from '@/components/StructuredData';
import { catalogPaths, categoryForPath, styleForPath, taskForPath } from '@/site/routes';
import { siteMetadata } from '@/site/metadata';
import { modelFamilies, modelFamilyForPath } from '@/lib/catalog/model-families';
import { loadSurfaceSeo } from '@/site/surface-seo';

type Params = { locale: string; path?: string[] };
export const dynamicParams = false;

export async function generateStaticParams(): Promise<Params[]> {
  const catalogs = await loadCatalogs();
  const paths = await Promise.all(catalogs.map(async catalog => [...catalogPaths(catalog), ...(await loadArticleSite(catalog)).routes].map(path => ({ locale: catalog.locale, path: path.split('/').slice(2) }))));
  return paths.flat();
}

async function resolve(params: Params) {
  const catalog = (await loadCatalogs()).find(item => item.locale === params.locale);
  if (!catalog) notFound();
  return { catalog, path: `/${params.locale}${params.path?.length ? `/${params.path.join('/')}` : ''}` };
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { catalog, path } = await resolve(await params);
  const websiteCase = catalog.websites?.find(item => item.href === path);
  if (websiteCase) return siteMetadata(catalog, path, websiteCase.title);
  const prompt = catalog.prompts.find(prompt => prompt.href === path);
  const model = catalog.models.find(model => model.href === path) ?? modelFamilyForPath(catalog, path);
  const task = taskForPath(catalog, path);
  const style = styleForPath(catalog, path);
  const category = categoryForPath(catalog, path);
  if (path.includes('/blog/')) {
    const site = await loadArticleSite(catalog);
    const article = Object.values(site.details).find(article => article.summary.href === path);
    const category = Object.values(site.categories).find(category => category.href === path);
    const seo = article?.seo ?? category?.seo;
    if (seo) return { title: seo.title, description: seo.description, robots: seo.robots, alternates: { canonical: seo.canonicalUrl, languages: seo.hreflang } };
  }
  const surface = await loadSurfaceSeo(catalog, path);
  return siteMetadata(catalog, path, prompt?.title ?? (model ? `${model.label} prompts` : task ? `${task.label} prompts` : style ? `${style.label} prompts` : category ? `${category.ref.label} prompts` : path.endsWith('/models') ? 'Models' : path.endsWith('/creators') ? 'Creators' : path.endsWith('/video') ? 'Video prompts' : path.endsWith('/image') ? 'Image prompts' : path.endsWith('/website') ? 'Website prompts' : 'The library'), prompt, model ?? task ?? style ?? category?.ref ?? undefined, surface);
}

export default async function Page({ params }: { params: Promise<Params> }) {
  const { catalog, path } = await resolve(await params);
  const hub = `/${catalog.locale}/prompts`;
  if(catalog.mode==='git-beta'&&websiteLegacyPaths(catalog.locale).includes(path))return <><meta httpEquiv="refresh" content={`0;url=${hub}/website`} /><div className="prototype-recipe"><div className="v3"><SiteHeader bilingual currentHref={path} level="prompt" locale={catalog.locale} /><main id="main" className="wrap"><h1>{websiteRef(catalog).label}</h1><p>{text(catalog.locale,'These categories now share one collection.','这些分类已归并为同一个案例集合。')}</p><a href={`${hub}/website`}>{text(catalog.locale,'Explore web design & development →','探索网站与开发 →')}</a></main><SiteFooter catalog={catalog} /></div></div></>;
  if (path === `${hub}/library-index` && catalog.mode === 'git-beta') return <LibraryIndex catalog={catalog} />;
  if (path === hub || path === `/${catalog.locale}`) return <Hub catalog={catalog} />;
  if (path === `${hub}/image` || path === `${hub}/video`) return <Deck catalog={catalog} contentType={path.endsWith('/video') ? 'video' : 'image'} />;
  if (path === `${hub}/website` && catalog.mode === "git-beta") return <WebsiteGallery catalog={catalog} />;
  const websiteView = websiteViewForPath(catalog, path);
  if (websiteView) return <WebsiteViewGallery catalog={catalog} view={websiteView} />;
  const websiteCase = catalog.websites?.find(item => item.href === path);
  if (websiteCase) return <WebsiteCaseDetail catalog={catalog} entry={websiteCase} />;
  if (path === `${hub}/website`) return <TaskFindings catalog={catalog} task={websiteRef(catalog)} prompts={websitePrompts(catalog)} aggregate />;
  if (path === `${hub}/models`) return <Directory catalog={catalog} currentHref={path} title="Models" items={modelFamilies(catalog)} />;
  if (path === `${hub}/creators`) return <Directory catalog={catalog} currentHref={path} title="Creators" items={catalog.creators.map(creator => ({ ...creator, href: creator.url || creator.href }))} />;
  if (path === `/${catalog.locale}/blog`) return <Blog catalog={catalog} />;
  if (path.startsWith(`/${catalog.locale}/blog/`)) {
    const site = await loadArticleSite(catalog);
    const article = Object.values(site.details).find(article => article.summary.href === path);
    if (article) return <><StructuredData catalog={catalog} path={path} article={article} /><BlogArticle catalog={catalog} article={article} /></>;
    const category = Object.values(site.categories).find(category => category.href === path);
    if (category) return <BlogCategory catalog={catalog} category={category} />;
    notFound();
  }
  const prompt = catalog.prompts.find(prompt => prompt.href === path);
  if (prompt) return <><StructuredData catalog={catalog} path={path} prompt={prompt} /><Recipe catalog={catalog} prompt={prompt} /></>;
  const model = catalog.models.find(model => model.href === path);
  if (model) return <><StructuredData catalog={catalog} path={path} model={model} /><Anthology catalog={catalog} model={model} /></>;
  const family = modelFamilyForPath(catalog, path);
  if (family) return <Anthology catalog={catalog} model={family} family={family} />;
  const task = taskForPath(catalog, path);
  if (task) return <StylePlate catalog={catalog} style={task} axis="useCase" />;
  const style = styleForPath(catalog, path);
  if (style) return <StylePlate catalog={catalog} style={style} />;
  const category = categoryForPath(catalog, path);
  if (category) return <Directory catalog={catalog} currentHref={path} title={text(interfaceLocale(catalog),`${category.ref.label} prompts`,`${category.ref.label}提示词`)} items={category.subset.prompts.map(prompt => ({ id: prompt.id, slug: prompt.slug, label: prompt.title, href: prompt.href, count: 1 }))} />;
  notFound();
}
