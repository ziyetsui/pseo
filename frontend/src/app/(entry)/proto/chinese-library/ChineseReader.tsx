'use client';
import { Fragment, useEffect, useRef } from 'react';
import type { Catalog, Prompt } from '@/lib/catalog/types';
import { PromptMedia } from '@/components/PromptMedia';
import { mountMagnetic } from '@/components/magnetic-motion';
import { Filters, PromptWords, usePromptExplorer } from '@/components/Filters';

function MagneticField({ rows }: { rows: Prompt[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => ref.current ? mountMagnetic(ref.current) : undefined, []);
  return <div className="runbox" ref={ref}><p className="run">{rows.map(prompt => {
    const text = prompt.prompt.replace(/\s+/g, ' ').trim();
    const excerpt = text.length > 900 ? `${text.slice(0, 900).replace(/\s\S*$/, '')}…` : text;
    return <Fragment key={prompt.id}><span className="item" data-entry="" data-kind={prompt.kind}><button className="t" type="button" data-expand="" aria-expanded="false" aria-controls={`peek-${prompt.id}`}><span className="u" lang={/[\u4e00-\u9fff]/u.test(prompt.title) ? 'zh-CN' : 'en'}>{prompt.title}</span></button><span className="exp" id={`peek-${prompt.id}`} aria-label={prompt.title} inert>
      <span className="fig"><PromptMedia prompt={prompt} width={440} height={440} /></span><span><span className="txt" lang={prompt.language}><PromptWords text={excerpt} /></span><span className="meta"><a href={prompt.source.url} target="_blank" rel="nofollow noopener noreferrer">{prompt.handle || '来源未署名'}</a><span>{prompt.models[0]?.label ?? '未标注模型'}</span><span>{prompt.prompt.length.toLocaleString('zh-CN')} 字符</span></span><span className="acts"><a className="btn pri" href={prompt.href}>{prompt.kind === 'video' ? '创作视频' : prompt.kind === 'image' ? '创作图片' : '查看案例'}</a></span></span>
    </span></span>{' '}</Fragment>;
  })}</p><noscript><ul>{rows.map(prompt => <li key={prompt.id}><a href={prompt.href}>{prompt.title}</a></li>)}</ul></noscript></div>;
}
export function ChineseReader({ catalog }: { catalog: Catalog }) {
  const explorer = usePromptExplorer(catalog);
  return <><section className="wrap lede"><p className="eyebrow" style={{ marginBottom: 14 }}>提示词库</p><h2 className="tier-ref">你的下一次创作，或许就在这里。</h2><p className="formnote">所有提示词，连成一段灵感。点开其中一个，查看作品和提示词；再顺着任务、模型或风格继续探索。</p><form className="search hub-search" role="search" onSubmit={event => event.preventDefault()}><label className="vh" htmlFor="q">搜索提示词</label><input id="q" name="q" type="search" maxLength={200} value={explorer.q} placeholder="搜索提示词、模型、风格、创作者…" onChange={event => explorer.setQuery(event.target.value)} /></form><Filters prompts={catalog.prompts} explorer={explorer} variant="hub" limit={4} axes={[["model", "模型"], ["useCase", "任务"], ["style", "风格"], ["technique", "技巧"]]} /></section><section className="wrap" id="results"><h2 className="vh">全部提示词</h2><p className="meta count" aria-live="polite">共 {catalog.prompts.length} 条提示词，当前展示 <b>{explorer.rows.length}</b> 条{explorer.active && <button className="btn" type="button" onClick={explorer.clear}>清除筛选</button>}</p>{explorer.rows.length ? <MagneticField key={explorer.search} rows={explorer.rows} /> : <div className="empty" role="status"><b>没有匹配的提示词。</b><p>试着放宽筛选条件，或换一个关键词。</p><button className="btn primary" type="button" onClick={explorer.clear}>清除筛选</button></div>}</section></>;
}
