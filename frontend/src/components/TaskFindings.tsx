import { taskHref } from '@/lib/catalog/query';
import { generationLabel } from './generation-label';
import { interfaceLocale, text } from '@/lib/i18n/text';
import type { Catalog, Prompt, Ref } from '@/lib/catalog/types';
import { Creators } from './Browse';
import { taskTerms } from '@/lib/catalog/task-findings';
import { SiteHeader, SiteFooter } from './Chrome';
import { TaskFindingsReader } from './TaskFindingsReader';

export function TaskFindings({ catalog, task, prompts, aggregate = false }: { catalog: Catalog; task: Ref; prompts?: Prompt[]; aggregate?: boolean }) {
  const uiLocale = interfaceLocale(catalog);
  const rows = prompts ?? catalog.prompts.filter(p => p.useCases.some(r => r.id === task.id || r.slug === task.slug));
  const tasks = [ ...(aggregate ? [task] : []), ...taskTerms(catalog.prompts, 'useCase').filter(ref => !aggregate || ref.slug !== task.slug) ];
  return <div className="prototype-magnetic prototype-task-findings"><div className="taste vfd"><SiteHeader bilingual={catalog.mode === 'git-beta'} currentHref={aggregate ? task.href : taskHref(catalog.locale, task.slug)} level="hub" locale={catalog.locale} sectionNavigation="library" /><main id="main">
    <TaskFindingsReader catalog={{ ...catalog, prompts: rows }} task={task} tasks={tasks} />
    <Creators catalog={catalog} prompts={rows} heading={text(uiLocale, `Who writes ${task.label} prompts`, `${task.label}提示词的创作者`)} hideEmpty />
    <section className="cta"><div className="wrap"><h2>{text(uiLocale, `Take a ${task.label} prompt and start`, `选一条${task.label}提示词，开始创作`)}</h2><p>{text(uiLocale, "Read the prompt, see the result, and follow it back to its source.", "阅读提示词、查看效果，并追溯原始来源。")}</p><div className="task-start">{(['image','video'] as const).map(kind => rows.some(p => p.kind === kind) && <a className={`btn${kind === 'image' ? ' pri' : ''}`} href={`/${catalog.locale}/prompts/${kind}?${new URLSearchParams({useCase:task.slug})}`} key={kind}>{generationLabel(kind, uiLocale)}</a>)}</div></div></section>
  </main><SiteFooter catalog={catalog} /></div></div>;
}
