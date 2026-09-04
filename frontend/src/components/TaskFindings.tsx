import type { Catalog, Ref } from '@/lib/catalog/types';
import { isPromptCreator } from '@/lib/catalog/creator-match';
import { taskTerms } from '@/lib/catalog/task-findings';
import { SiteHeader, SiteFooter } from './Chrome';
import { TaskFindingsReader } from './TaskFindingsReader';

export function TaskFindings({ catalog, task }: { catalog: Catalog; task: Ref }) {
  const rows = catalog.prompts.filter(p => p.useCases.some(r => r.id === task.id || r.slug === task.slug));
  const tasks = taskTerms(catalog.prompts, 'useCase');
  const creators = catalog.creators.map(c => ({ ...c, count: rows.filter(p => isPromptCreator(p, c)).length })).filter(c => c.count).sort((a,b) => b.count - a.count).slice(0,8);
  return <div className="prototype-magnetic prototype-task-findings"><div className="taste vfd"><SiteHeader level="hub" locale={catalog.locale} sectionNavigation="library" /><main id="main">
    <TaskFindingsReader catalog={{ ...catalog, prompts: rows }} task={task} tasks={tasks} />
    {creators.length > 0 && <section className="sec" id="creators"><div className="wrap"><div className="sec-h"><h2>Who writes {task.label} prompts</h2></div><div className="people">{creators.map(c => <a className="person" key={c.id} href={c.url || c.href} target={c.url ? "_blank" : undefined} rel={c.url ? "nofollow noopener noreferrer" : undefined}><span className="av">{c.avatarUrl && <img src={c.avatarUrl} alt="" width={34} height={34} loading="lazy" referrerPolicy="no-referrer" />}</span><b>{c.handle || c.label}</b><span>{c.count} {c.count === 1 ? 'prompt' : 'prompts'}</span></a>)}</div></div></section>}
    <section className="cta"><div className="wrap"><h2>Take a {task.label} prompt and start</h2><p>Read the prompt, see the result, and follow it back to its source.</p><div className="task-start">{(['image','video'] as const).map(kind => rows.some(p => p.kind === kind) && <a className={`btn${kind === 'image' ? ' pri' : ''}`} href={`/${catalog.locale}/prompts/${kind}?${new URLSearchParams({useCase:task.slug})}`} key={kind}>Generate {kind}</a>)}</div></div></section>
  </main><SiteFooter catalog={catalog} /></div></div>;
}
