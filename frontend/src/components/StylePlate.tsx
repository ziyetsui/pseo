import { styleHref, taskHref } from '@/lib/catalog/query';
import { interfaceLocale, text, promptCount } from '@/lib/i18n/text';
import type { Catalog, Ref } from '@/lib/catalog/types';
import { SiteHeader, SiteFooter } from './Chrome';
import { HubBrowse } from './Browse';
import { StylePlateReader, type PlateAxis } from './StylePlateReader';

/** L3 Plate: one fixed style or task, every result reproduced whole with its caption in the margin. */
export function StylePlate({ catalog, style, axis = 'style' }: { catalog: Catalog; style: Ref; axis?: PlateAxis }) {
  const uiLocale = interfaceLocale(catalog);
  const rows = catalog.prompts.filter(p => (axis === 'style' ? p.styles : p.useCases).some(ref => ref.id === style.id || ref.slug === style.slug));
  const href = axis === 'style' ? styleHref(catalog.locale, style.slug) : taskHref(catalog.locale, style.slug);
  return <div className={`prototype-magnetic prototype-style-plate${axis === 'useCase' ? ' prototype-task-plate' : ''}`}><div className="taste vpl"><SiteHeader bilingual={catalog.mode === 'git-beta'} currentHref={href} level="hub" locale={catalog.locale} /><main id="main">
    <section className="wrap titlepage"><p className="eyebrow">{text(uiLocale, "Catalogue", "目录")} · {promptCount(uiLocale, rows.length)}</p><h1><span lang={catalog.locale}>{style.label}.</span><br />{text(uiLocale, "One prompt, one plate.", "一条提示词，一幅图版。")}</h1><p className="dek">{text(uiLocale, "Each result is reproduced whole and uncropped, with its caption set in the margin: what made it, who wrote it, and the words themselves.", "完整展示每个结果，不作裁切；侧边记录所用模型、作者和提示词正文。")}</p></section>
    <StylePlateReader catalog={{...catalog,prompts:rows}} style={style} axis={axis} />
    <HubBrowse catalog={catalog} horizontalNavigation />
  </main><SiteFooter catalog={catalog} /></div></div>;
}
