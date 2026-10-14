import type { Catalog, Locale } from '@/lib/catalog/types';
import { footerNavigation } from '@/site/navigation';
import '@/styles/footer.css';

type Level = 'hub' | 'deck' | 'model' | 'prompt';
export function SiteHeader({ level, locale, contentType, sectionNavigation = 'local' }: { level: Level; locale: Locale; contentType?: 'image' | 'video' | 'website'; sectionNavigation?: 'local' | 'library' }) {
  const hub = `/${locale}/prompts`;
  const sectionBase = sectionNavigation === 'library' ? hub : '';
  const links = level === 'hub'
    ? [['Tasks', `${sectionBase}#tasks`], ['Models', `${sectionBase}#models`], ['Styles', `${sectionBase}#styles`], ['Creators', `${sectionBase}#creators`]]
    : [['Home', hub], ['Images', `${hub}/image`], ['Videos', `${hub}/video`], ['Website', `${hub}/website`], ['Models', `${hub}#models`]];
  const inner = <>
    <a className="brand" href={hub}>{level === 'deck' || level === 'model' ? <i aria-hidden="true" /> : null}Prompt Library</a>
    <div className="navlinks">{links.map(([label, href]) => <a key={label} href={href} aria-current={level === 'model' && label === 'Models' || level === 'deck' && contentType && label === (contentType === 'video' ? 'Videos' : contentType === 'website' ? 'Website' : 'Images') ? 'page' : undefined}>{label}</a>)}</div>
  </>;
  return <>
    <a className="skip" href="#main">Skip to content</a>
    <nav className="nav" aria-label="Primary">{level === 'model' ? inner : <div className={level === 'prompt' ? 'inner' : 'wrap'}>{inner}</div>}</nav>
  </>;
}

export function SiteFooter({ catalog, level = 'hub' }: { catalog: Catalog; level?: Level }) {
  const columns = footerNavigation(catalog,level);
  const content = <>
    <nav className="footnav" aria-label="Library navigation">{columns.map(column => <div key={column.id}>
      <h3>{column.title}</h3><ul>{column.entries.map(entry => <li key={entry.id}><a href={entry.href}>{entry.label}</a></li>)}</ul>
    </div>)}</nav>
    {catalog.mode === "git-beta" && <p><a href="/licenses/awesome-gpt-image-2" target="_blank" rel="noopener noreferrer">Image collection credits and license</a></p>}
    <div className="footlegal"><span>Prompt Library</span><span>{level === 'prompt' ? 'Prompts belong to their authors; this page credits the source.' : 'Prompts remain the property of their authors. Every page credits the source.'}</span></div>
  </>;
  return <footer className="foot">{level === 'model' ? content : <div className={level === 'prompt' ? 'wrap wide' : 'wrap'}>{content}</div>}</footer>;
}
