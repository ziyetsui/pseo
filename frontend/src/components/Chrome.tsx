import type { Catalog, Locale, Ref } from '@/lib/catalog/types';
import { styleHref, subjectHref, taskHref } from '@/lib/catalog/query';
import { modelFamilies } from '@/lib/catalog/model-families';
import { isPromptCreator } from '@/lib/catalog/creator-match';

type Level = 'hub' | 'deck' | 'model' | 'prompt';
export function SiteHeader({ level, locale, contentType, sectionNavigation = 'local' }: { level: Level; locale: Locale; contentType?: 'image' | 'video'; sectionNavigation?: 'local' | 'library' }) {
  const hub = `/${locale}/prompts`;
  const sectionBase = sectionNavigation === 'library' ? hub : '';
  const links = level === 'hub'
    ? [['Tasks', `${sectionBase}#tasks`], ['Models', `${sectionBase}#models`], ['Styles', `${sectionBase}#styles`], ['Creators', `${sectionBase}#creators`]]
    : [['Home', hub], ['Images', `${hub}/image`], ...(level === 'deck' ? [['Videos', `${hub}/video`]] : []), ['Models', `${hub}#models`]];
  const inner = <>
    <a className="brand" href={hub}>{level === 'deck' || level === 'model' ? <i aria-hidden="true" /> : null}Prompt Library</a>
    <div className="navlinks">{links.map(([label, href]) => <a key={label} href={href} aria-current={level === 'model' && label === 'Models' || level === 'deck' && contentType && label === (contentType === 'video' ? 'Videos' : 'Images') ? 'page' : undefined}>{label}</a>)}</div>
  </>;
  return <>
    <a className="skip" href="#main">Skip to content</a>
    <nav className="nav" aria-label="Primary">{level === 'model' ? inner : <div className={level === 'prompt' ? 'inner' : 'wrap'}>{inner}</div>}</nav>
  </>;
}

const referenceOrder = {
  models: ['Nano Banana', 'Higgsfield Soul', 'GPT Image', 'Kling', 'Seedance', 'Veo', 'Sora', 'Wan'],
  useCases: ['Fashion', 'Beauty', 'Advertising', 'Food & beverage', 'Automotive', 'Web & motion', 'UGC', 'Product marketing'],
  styles: ['Photorealistic', 'Cinematic', 'Luxury', 'Anime / illustrated', 'Retro / vintage', 'Sci-fi / cyberpunk', 'Surreal / fantasy'],
  subjects: ['Person / portrait', 'Architecture / interior', 'Product', 'Food / drink', 'Vehicle'],
};
function ordered(values: Ref[], order: string[]) {
  const ranks = new Map(order.map((label, index) => [label.toLowerCase(), index]));
  return [...values].sort((a, b) => (ranks.get(a.label.toLowerCase()) ?? 100) - (ranks.get(b.label.toLowerCase()) ?? 100));
}
export function SiteFooter({ catalog, level = 'hub' }: { catalog: Catalog; level?: Level }) {
  const hub = `/${catalog.locale}/prompts`;
  const models = modelFamilies(catalog).filter(family => family.count > 0);
  const populated = (values: Ref[], axis: 'useCases' | 'styles' | 'subjects') => values.filter(ref =>
    catalog.prompts.some(prompt => prompt[axis].some(relation => relation.id === ref.id || relation.slug === ref.slug)));
  const hasCreators = catalog.creators.some(creator => catalog.prompts.some(prompt => isPromptCreator(prompt, creator)));
  const browse = [
    { label: 'Image prompts', href: `${hub}/image`, available: catalog.prompts.some(prompt => prompt.kind === 'image') },
    { label: 'Video prompts', href: `${hub}/video`, available: catalog.prompts.some(prompt => prompt.kind === 'video') },
    { label: 'All prompts', href: hub, available: catalog.prompts.length > 0 },
    { label: 'All models', href: `${hub}/models`, available: models.length > 0 },
    { label: 'All creators', href: `${hub}/creators`, available: hasCreators },
  ].filter(entry => entry.available);
  function entries(values: Ref[], labels: string[]) {
    if (catalog.mode !== 'visual-fixture') return ordered(values, labels);
    return labels.flatMap(label => {
      const existing = values.find(value => value.label.toLowerCase() === label.toLowerCase() || label === 'Web & motion' && value.label === 'Web & motion design');
      return existing ? [{ ...existing, label }] : [];
    });
  }
  const columns = [
    { title: 'By model', values: ordered(models, referenceOrder.models) },
    { title: level === 'hub' || level === 'prompt' ? 'By task' : 'By use case', values: entries(populated(catalog.useCases, 'useCases'), referenceOrder.useCases).map(ref => ({ ...ref, href: taskHref(catalog.locale, ref.slug) })) },
    { title: 'By style', values: entries(populated(catalog.styles, 'styles'), referenceOrder.styles).map(ref => ({ ...ref, href: styleHref(catalog.locale, ref.slug) })) },
    { title: 'By subject', values: entries(populated(catalog.subjects, 'subjects'), referenceOrder.subjects).map(ref => ({ ...ref, href: subjectHref(catalog.locale, ref.slug) })) },
  ];
  const content = <>
    <div className="footnav">{columns.filter(column => column.values.length).map(column => <div key={column.title}>
      <h3>{column.title}</h3><ul>{column.values.map(ref => <li key={ref.id}><a href={ref.href}>{ref.label} prompts</a></li>)}</ul>
    </div>)}
      {browse.length > 0 && <div><h3>Browse</h3><ul>{browse.map(({ label, href }) => <li key={label}><a href={href}>{label}</a></li>)}</ul></div>}
    </div>
    <div className="footlegal"><span>Prompt Library</span><span>{level === 'prompt' ? 'Prompts belong to their authors; this page credits the source.' : 'Prompts remain the property of their authors. Every page credits the source.'}</span></div>
  </>;
  return <footer className="foot">{level === 'model' ? content : <div className={level === 'prompt' ? 'wrap wide' : 'wrap'}>{content}</div>}</footer>;
}
