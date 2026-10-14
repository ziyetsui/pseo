import { interfaceLocale, uiText, text } from '@/lib/i18n/text';
import { LanguageSwitch } from './LanguageSwitch';
import type { Catalog, Locale } from '@/lib/catalog/types';
import { footerNavigation } from '@/site/navigation';
import '@/styles/footer.css';

type Level = 'hub' | 'deck' | 'model' | 'prompt';
export function SiteHeader({ level, locale, contentType, sectionNavigation = 'local', currentHref, bilingual = false }: { level: Level; locale: Locale; contentType?: 'image' | 'video' | 'website'; sectionNavigation?: 'local' | 'library'; currentHref?: string; bilingual?: boolean }) {
  const uiLocale = bilingual ? locale : 'en';
  const hub = `/${locale}/prompts`;
  const sectionBase = sectionNavigation === 'library' ? hub : '';
  const links: string[][] = level === 'hub'
    ? [['Tasks', `${sectionBase}#tasks`], ['Models', `${sectionBase}#models`], ['Styles', `${sectionBase}#styles`], ['Creators', `${sectionBase}#creators`]]
    : [['Home', hub], ['Images', `${hub}/image`], ['Videos', `${hub}/video`], ['Website', `${hub}/website`], ['Models', `${hub}#models`]];
  const inner = <>
    <a className="brand" href={hub}>{level === 'deck' || level === 'model' ? <i aria-hidden="true" /> : null}{uiText(uiLocale, 'Prompt Library')}</a>
    <div className="navlinks">{links.map(([label, href]) => <a key={label} href={href} aria-current={level === 'model' && label === 'Models' || level === 'deck' && contentType && label === (contentType === 'video' ? 'Videos' : contentType === 'website' ? 'Website' : 'Images') ? 'page' : undefined}>{uiText(uiLocale, label ?? '')}</a>)}</div>{bilingual && <LanguageSwitch locale={locale} href={currentHref ?? hub} />}
  </>;
  return <>
    <a className="skip" href="#main">{uiText(uiLocale, 'Skip to content')}</a>
    <nav className="nav" aria-label={uiText(uiLocale, 'Primary')}>{level === 'model' ? inner : <div className={level === 'prompt' ? 'inner' : 'wrap'}>{inner}</div>}</nav>
  </>;
}

export function SiteFooter({ catalog, level = 'hub' }: { catalog: Catalog; level?: Level }) {
  const uiLocale = interfaceLocale(catalog);
  const columns = footerNavigation(catalog,level);
  const content = <>
    <nav className="footnav" aria-label={uiText(uiLocale, 'Library navigation')}>{columns.map(column => <div key={column.id}>
      <h3>{column.title}</h3><ul>{column.entries.map(entry => <li key={entry.id}><a href={entry.href}>{entry.label}</a></li>)}</ul>
    </div>)}</nav>
    {catalog.mode === "git-beta" && <p><a href="/licenses/awesome-gpt-image-2" target="_blank" rel="noopener noreferrer">{text(uiLocale, 'Image collection credits and license', '图片作品集署名与许可')}</a></p>}
    <div className="footlegal"><span>{uiText(uiLocale, 'Prompt Library')}</span><span>{level === 'prompt' ? text(uiLocale, 'Prompts belong to their authors; this page credits the source.', '提示词归其作者所有；本页保留来源署名。') : text(uiLocale, 'Prompts remain the property of their authors. Every page credits the source.', '提示词归其作者所有，每个页面均保留来源署名。')}</span></div>
  </>;
  return <footer className="foot">{level === 'model' ? content : <div className={level === 'prompt' ? 'wrap wide' : 'wrap'}>{content}</div>}</footer>;
}
