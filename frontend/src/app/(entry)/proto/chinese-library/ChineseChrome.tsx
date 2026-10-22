// Typography probe: same markup as components/Chrome.tsx; Chinese interface copy only.
import type { Catalog, Locale, Ref } from '@/lib/catalog/types';
import { styleHref, subjectHref, taskHref } from '@/lib/catalog/query';
import { modelFamilies } from '@/lib/catalog/model-families';
import { isPromptCreator } from '@/lib/catalog/creator-match';

type Level = 'hub' | 'deck' | 'model' | 'prompt';
export function SiteHeader({ level, locale, contentType, sectionNavigation = 'local' }: { level: Level; locale: Locale; contentType?: 'image' | 'video'; sectionNavigation?: 'local' | 'library' }) {
  const hub = `/${locale}/prompts`;
  const sectionBase = sectionNavigation === 'library' ? hub : '';
  const links = level === 'hub'
    ? [['任务', `${sectionBase}#tasks`], ['模型', `${sectionBase}#models`], ['风格', `${sectionBase}#styles`], ['创作者', `${sectionBase}#creators`]]
    : [['首页', hub], ['图片', `${hub}/image`], ...(level === 'deck' ? [['视频', `${hub}/video`]] : []), ['模型', `${hub}#models`]];
  const inner = <>
    <a className="brand" href={hub}>{level === 'deck' || level === 'model' ? <i aria-hidden="true" /> : null}提示词库</a>
    <div className="navlinks">{links.map(([label, href]) => <a key={label} href={href} aria-current={level === 'model' && label === '模型' || level === 'deck' && contentType && label === (contentType === 'video' ? '视频' : '图片') ? 'page' : undefined}>{label}</a>)}</div>
  </>;
  return <>
    <a className="skip" href="#main">跳转到正文</a>
    <nav className="nav" aria-label="主导航">{level === 'model' ? inner : <div className={level === 'prompt' ? 'inner' : 'wrap'}>{inner}</div>}</nav>
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
  const has创作者 = catalog.creators.some(creator => catalog.prompts.some(prompt => isPromptCreator(prompt, creator)));
  const browse = [
    { label: '图片提示词', href: `${hub}/image`, available: catalog.prompts.some(prompt => prompt.kind === 'image') },
    { label: '视频提示词', href: `${hub}/video`, available: catalog.prompts.some(prompt => prompt.kind === 'video') },
    { label: '网站案例', href: `${hub}/website`, available: (catalog.websites?.length ?? 0) > 0 },
    { label: '全部提示词', href: hub, available: catalog.prompts.length > 0 },
    { label: '全部模型', href: `${hub}/models`, available: models.length > 0 },
    { label: '全部创作者', href: `${hub}/creators`, available: has创作者 },
  ].filter(entry => entry.available);
  function entries(values: Ref[], labels: string[]) {
    if (catalog.mode !== 'visual-fixture') return ordered(values, labels);
    return labels.flatMap(label => {
      const existing = values.find(value => value.label.toLowerCase() === label.toLowerCase() || label === 'Web & motion' && value.label === 'Web & motion design');
      return existing ? [{ ...existing, label }] : [];
    });
  }
  const columns = [
    { title: '按模型', values: ordered(models, referenceOrder.models) },
    { title: level === 'hub' || level === 'prompt' ? '按任务' : '按用途', values: entries(populated(catalog.useCases, 'useCases'), referenceOrder.useCases).map(ref => ({ ...ref, href: taskHref(catalog.locale, ref.slug) })) },
    { title: '按风格', values: entries(populated(catalog.styles, 'styles'), referenceOrder.styles).map(ref => ({ ...ref, href: styleHref(catalog.locale, ref.slug) })) },
    { title: '按主题', values: entries(populated(catalog.subjects, 'subjects'), referenceOrder.subjects).map(ref => ({ ...ref, href: subjectHref(catalog.locale, ref.slug) })) },
  ];
  const content = <>
    <div className="footnav">{columns.filter(column => column.values.length).map(column => <div key={column.title}>
      <h3>{column.title}</h3><ul>{column.values.map(ref => <li key={ref.id}><a href={ref.href}>{ref.label}提示词</a></li>)}</ul>
    </div>)}
      {browse.length > 0 && <div><h3>浏览</h3><ul>{browse.map(({ label, href }) => <li key={label}><a href={href}>{label}</a></li>)}</ul></div>}
    </div>
    {catalog.mode === "git-beta" && <p><a href="/licenses/awesome-gpt-image-2" target="_blank" rel="noopener noreferrer">Image collection credits and license</a></p>}
    <div className="footlegal"><span>提示词库</span><span>{level === 'prompt' ? '提示词归创作者所有，本页保留来源署名。' : '提示词归创作者所有。每一页，都保留原始来源。'}</span></div>
  </>;
  return <footer className="foot">{level === 'model' ? content : <div className={level === 'prompt' ? 'wrap wide' : 'wrap'}>{content}</div>}</footer>;
}
