'use client';
import { CompactIndex } from './CompactIndex';
import { interfaceLocale, uiText, text, promptCount, sourceLanguage, originalLanguage } from '@/lib/i18n/text';

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
  const uiLocale = interfaceLocale(catalog);
  // The server supplies only this task's records. Query parameters can narrow it, never escape it.
  const explorer = usePromptExplorer(catalog);
  const { findings, rest } = taskFindings(explorer.rows);
  return <><section className="wrap open"><h1>{text(uiLocale, `${task.label} prompts are specifications.`, `${task.label}提示词，是具体的创作说明。`)}</h1><div className="arg"><p className="lede">{text(uiLocale, `Not wishes. Everything below is counted from the ${promptCount('en', catalog.prompts.length)} this task holds right now — change the filters and the argument is recounted with them.`, `不只是愿望。下方统计来自此任务当前的 ${catalog.prompts.length} 条提示词；修改筛选条件，统计也会随之更新。`)}</p></div></section>
    <div className="ctrl"><div className="wrap"><div className="bar">
      <div className="row"><span className="lbl" id="task-label">{uiText(uiLocale, "Task")}</span><nav className="scroller" aria-labelledby="task-label">{tasks.map(ref => <a className="chip" key={ref.id} href={ref.id === 'navigation:website' ? ref.href : taskHref(catalog.locale, ref.slug)} aria-current={ref.slug === task.slug ? 'page' : undefined}>{ref.label} <small>{ref.count}</small></a>)}</nav></div>
      <div className="row"><span className="lbl" id="within-label">{uiText(uiLocale, "Within")}</span><div className="scroller" role="group" aria-labelledby="within-label">{withinAxes.flatMap(axis => taskTerms(catalog.prompts, axis).filter((ref, i) => i < 2 || explorer.selected(axis, ref.slug)).map(ref => <button className="chip" type="button" key={`${axis}-${ref.id}`} aria-pressed={explorer.selected(axis, ref.slug)} onClick={() => explorer.toggle(axis, ref.slug)}>{ref.label} <small>{ref.count}</small></button>))}{explorer.active && <button className="chip" type="button" onClick={explorer.clear}>{uiText(uiLocale, "Clear filters")}</button>}</div></div>
    </div><span className="vh" role="status">{text(uiLocale, `${explorer.rows.length} of ${catalog.prompts.length} ${task.label} ${catalog.prompts.length === 1 ? 'prompt' : 'prompts'}`, `${explorer.rows.length} / ${catalog.prompts.length} 条${task.label}提示词`)}</span></div></div>
    <div className="findings-results" data-task={task.slug}>
      {!explorer.rows.length ? <section className="finding"><div className="wrap"><div className="empty" role="status">{catalog.prompts.length ? <><b>{text(uiLocale, `No ${task.label} prompt matches those filters`, `没有符合筛选条件的${task.label}提示词`)}</b><p>{text(uiLocale, `This task holds ${promptCount('en', catalog.prompts.length)} in total. Clear the filters to see all of them, or pick a different task above.`, `此任务共有 ${catalog.prompts.length} 条提示词。清除筛选以查看全部，或选择上方的其他任务。`)}</p><button className="btn pri" type="button" onClick={explorer.clear}>{uiText(uiLocale, "Clear filters")}</button></> : <><b>{text(uiLocale, `No ${task.label} prompts in the library yet.`, `提示词库中暂无${task.label}提示词。`)}</b><p>{uiText(uiLocale, "Explore another task or browse the library.")}</p><a className="btn pri" href={`/${catalog.locale}/prompts`}>{uiText(uiLocale, "Browse all prompts")}</a></>}</div></div></section> : <>
        {findings.map((finding, index) => <section className="finding" key={finding.key} data-finding={finding.key} data-count={finding.count}><div className="wrap"><h2>{text(uiLocale, finding.heading, `${finding.count} 条提示词${({portrait:'标注为人像',structured:'使用结构化文本',camera:'标注了镜头语言',video:'用于视频生成',author:'注明了作者'} as Record<string,string>)[finding.key]}。`)}</h2><div className="arg"><p>{text(uiLocale, finding.body, ({portrait:'模型需要在多次生成中保持同一张脸的骨骼、雀斑等特征。',structured:'括号与带引号的字段组织了这些指令。原有格式完整保留，可逐项阅读和设置占位符。',camera:'共同的技巧标签连接这些提示词。阅读示例，了解作者如何描述镜头和拍摄。',video:'这些记录标注为视频提示词，可逐条阅读作者描述的动作、时序和场景。',author:'这些记录保留作者署名与来源链接。查看原帖可了解提示词的背景。'} as Record<string,string>)[finding.key] ?? '')}</p></div><article className="spec" data-prompt-id={finding.prompt.id} data-lg-row="" data-lg-chars={finding.prompt.prompt.length} data-lg-words={promptWords(finding.prompt.prompt)}>
          <p className="sno"><span>{text(uiLocale, "Specimen", "示例")} {String(index + 1).padStart(2, '0')}</span><a href={finding.prompt.source.url} target="_blank" rel="nofollow noopener noreferrer">{finding.prompt.handle || uiText(uiLocale, "Source post")} ↗</a></p>
          <figure><PromptMedia uiLocale={uiLocale} prompt={finding.prompt} width={800} height={500} /></figure><h3 lang={sourceLanguage(finding.prompt.title)}><a href={finding.prompt.href}>{finding.prompt.title}</a></h3>
          {catalog.mode === 'git-beta' && <p className="eyebrow">{originalLanguage(uiLocale, finding.prompt.language, finding.prompt.originalPrompt !== undefined)}</p>}<p className="verbatim" lang={finding.prompt.language}><PromptWords text={finding.prompt.prompt} /></p>
          <p className="cred"><span>{finding.prompt.models.map(r => r.label).join(', ') || uiText(uiLocale, "no model named")}</span>{finding.prompt.likes !== null && <span>{text(uiLocale, `${finding.prompt.likes.toLocaleString('en-US')} likes`, `${finding.prompt.likes.toLocaleString('zh-CN')} 次点赞`)}</span>}<span>{isStructuredPrompt(finding.prompt) ? uiText(uiLocale, "Structured text") : uiText(uiLocale, "Prose")}</span></p>
          <p className="cred note">{text(uiLocale, finding.note, ({portrait:'根据登记的主题标签统计，不根据图片外观推断。',structured:'根据正文中的括号或带引号字段识别，不代表已验证 JSON 有效。',camera:'按技巧标签统计，不代表指令的排列顺序。',video:'按每条提示词登记的媒介类型统计，不作推断。',author:'作者署名是记录的一部分。'} as Record<string,string>)[finding.key] ?? '')}</p><div className="rr"><a className="btn pri" href={finding.prompt.href}>{generationLabel(finding.prompt.kind, uiLocale)}</a></div>
        </article></div></section>)}
        <section className="finding"><div className="wrap"><h2>{uiText(uiLocale, "And the rest of them.")}</h2><div className="arg"><p>{rest.length ? text(uiLocale, `The other ${spellCount(rest.length)} ${task.label.toLowerCase()} ${rest.length === 1 ? 'prompt' : 'prompts'} in this set, in the order the library holds them.`, `此集合中的其他 ${rest.length} 条${task.label}提示词，按提示词库中的顺序展示。`) : text(uiLocale, 'Every prompt in this set is already shown above as a specimen.', '此集合中的全部提示词已在上方作为示例展示。')}</p></div>{rest.length > 0 && <CompactIndex uiLocale={uiLocale} list="div" listClassName="allof" label={uiText(uiLocale, "And the rest of them.")}>{rest.map((prompt, i) => <span key={prompt.id}>{i > 0 && <span className="sep" aria-hidden="true">·</span>}<a href={prompt.href} title={prompt.handle} lang={sourceLanguage(prompt.title)}>{prompt.title}</a></span>)}</CompactIndex>}</div></section>
      </>}
    </div><SignInGate uiLocale={uiLocale} /></>;
}
