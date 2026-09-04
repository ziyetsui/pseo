'use client';

import type { Axis, Catalog, Ref } from '@/lib/catalog/types';
import { taskHref } from '@/lib/catalog/query';
import { isStructuredPrompt, spellCount, taskFindings, taskTerms } from '@/lib/catalog/task-findings';
import { PromptWords, usePromptExplorer } from './Filters';
import { PromptMedia } from './PromptMedia';
import { generationLabel } from './generation-label';
import { promptWords } from '@/lib/cta/sign-in-gate';
import { SignInGate } from '@/components/SignInGate';

const withinAxes: Axis[] = ['model', 'style', 'technique', 'subject'];
export function TaskFindingsReader({ catalog, task, tasks }: { catalog: Catalog; task: Ref; tasks: Ref[] }) {
  // The server supplies only this task's records. Query parameters can narrow it, never escape it.
  const explorer = usePromptExplorer(catalog);
  const { findings, rest } = taskFindings(explorer.rows);
  return <><section className="wrap open"><h1>{task.label} prompts are specifications.</h1><div className="arg"><p className="lede">Not wishes. Everything below is counted from the {catalog.prompts.length} {catalog.prompts.length === 1 ? 'prompt' : 'prompts'} this task holds right now — change the filters and the argument is recounted with them.</p></div></section>
    <div className="ctrl"><div className="wrap"><div className="bar">
      <div className="row"><span className="lbl" id="task-label">Task</span><nav className="scroller" aria-labelledby="task-label">{tasks.map(ref => <a className="chip" key={ref.id} href={taskHref(catalog.locale, ref.slug)} aria-current={ref.slug === task.slug ? 'page' : undefined}>{ref.label} <small>{ref.count}</small></a>)}</nav></div>
      <div className="row"><span className="lbl" id="within-label">Within</span><div className="scroller" role="group" aria-labelledby="within-label">{withinAxes.flatMap(axis => taskTerms(catalog.prompts, axis).filter((ref, i) => i < 2 || explorer.selected(axis, ref.slug)).map(ref => <button className="chip" type="button" key={`${axis}-${ref.id}`} aria-pressed={explorer.selected(axis, ref.slug)} onClick={() => explorer.toggle(axis, ref.slug)}>{ref.label} <small>{ref.count}</small></button>))}{explorer.active && <button className="chip" type="button" onClick={explorer.clear}>Clear filters</button>}</div></div>
    </div><span className="vh" role="status">{explorer.rows.length} of {catalog.prompts.length} {task.label} {catalog.prompts.length === 1 ? 'prompt' : 'prompts'}</span></div></div>
    <div className="findings-results" data-task={task.slug}>
      {!explorer.rows.length ? <section className="finding"><div className="wrap"><div className="empty" role="status">{catalog.prompts.length ? <><b>No {task.label} prompt matches those filters</b><p>This task holds {catalog.prompts.length} {catalog.prompts.length === 1 ? 'prompt' : 'prompts'} in total. Clear the filters to see all of them, or pick a different task above.</p><button className="btn pri" type="button" onClick={explorer.clear}>Clear filters</button></> : <><b>No {task.label} prompts in the library yet.</b><p>Explore another task or browse the library.</p><a className="btn pri" href={`/${catalog.locale}/prompts`}>Browse all prompts</a></>}</div></div></section> : <>
        {findings.map((finding, index) => <section className="finding" key={finding.key} data-finding={finding.key} data-count={finding.count}><div className="wrap"><h2>{finding.heading}</h2><div className="arg"><p>{finding.body}</p></div><article className="spec" data-prompt-id={finding.prompt.id} data-lg-row="" data-lg-chars={finding.prompt.prompt.length} data-lg-words={promptWords(finding.prompt.prompt)}>
          <p className="sno"><span>Specimen {String(index + 1).padStart(2, '0')}</span><a href={finding.prompt.source.url} target="_blank" rel="nofollow noopener noreferrer">{finding.prompt.handle || 'Source post'} ↗</a></p>
          <figure><PromptMedia prompt={finding.prompt} width={800} height={500} /></figure><h3 lang={finding.prompt.locale}><a href={finding.prompt.href}>{finding.prompt.title}</a></h3>
          <p className="verbatim" lang={finding.prompt.language}><PromptWords text={finding.prompt.prompt} /></p>
          <p className="cred"><span>{finding.prompt.models.map(r => r.label).join(', ') || 'no model named'}</span>{finding.prompt.likes !== null && <span>{finding.prompt.likes.toLocaleString('en-US')} likes</span>}<span>{isStructuredPrompt(finding.prompt) ? 'Structured text' : 'Prose'}</span></p>
          <p className="cred note">{finding.note}</p><div className="rr"><a className="btn pri" href={finding.prompt.href}>{generationLabel(finding.prompt.kind)}</a></div>
        </article></div></section>)}
        <section className="finding"><div className="wrap"><h2>And the rest of them.</h2><div className="arg"><p>{rest.length ? `The other ${spellCount(rest.length)} ${task.label.toLowerCase()} ${rest.length === 1 ? 'prompt' : 'prompts'} in this set, in the order the library holds them.` : 'Every prompt in this set is already shown above as a specimen.'}</p></div>{rest.length > 0 && <p className="allof">{rest.map((prompt, i) => <span key={prompt.id}>{i > 0 && <span className="sep" aria-hidden="true">·</span>}<a href={prompt.href} title={prompt.handle} lang={prompt.locale}>{prompt.title}</a></span>)}</p>}</div></section>
      </>}
    </div><SignInGate /></>;
}
