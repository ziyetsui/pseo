import type {Catalog} from '@/lib/catalog/types';
import {xhsCurationHref,xhsObservedAt,xhsProfile,xhsStudies} from '@/data/xhs-curation';
import {SiteHeader,SiteFooter} from './Chrome';
import '@/styles/xhs-curation.css';

export function XhsCurationBand({catalog}:{catalog:Catalog}) {
  if(catalog.mode!=='git-beta')return null;
  const zh=catalog.locale==='zh-CN';
  return <section className="sec xhs-feature" aria-labelledby="xhs-feature-title"><div className="wrap xhs-feature-inner">
    <div><p className="eyebrow">{zh?'账号精选 · 小红书':'Creator selection · Xiaohongshu'}</p><h2 id="xhs-feature-title">{zh?'珍珠奶茶的 8 个高互动案例':'Eight standout cases from 珍珠奶茶'}</h2><p>{zh?'图文、视频、电商主图、详情页等类型各选一条。依据 2026 年 10 月 16 日主页可见点赞数。':'One example each across image posts, videos, product hero images, detail pages and more. Ranked using visible likes on 16 October 2026.'}</p><a className="btn pri" href={xhsCurationHref(catalog.locale)}>{zh?'查看精选案例 →':'Explore the cases →'}</a></div>
    <div className="xhs-feature-covers" aria-hidden="true">{xhsStudies.slice(0,3).map(study=><img key={study.id} src={study.cover} alt="" width={180} height={240} loading="lazy"/>)}</div>
  </div></section>;
}

export function XhsCurationPage({catalog}:{catalog:Catalog}) {
  const zh=catalog.locale==='zh-CN',href=xhsCurationHref(catalog.locale);
  return <div className="prototype-magnetic xhs-curation"><div className="taste"><SiteHeader bilingual currentHref={href} level="deck" locale={catalog.locale}/><main id="main">
    <header className="wrap xhs-curation-hero"><p className="eyebrow">{zh?'小红书 · 创作者案例':'Xiaohongshu · creator cases'}</p><h1>{zh?'珍珠奶茶：每类一个代表案例':'珍珠奶茶: one case per format'}</h1><p className="lede">{zh?'从账号公开笔记中，按用途与内容形态各选一条高互动作品。每张卡片保留作者、原帖和观察时的点赞数。':'A selection of one highly engaged public post for each format and use. Each card links to the creator and original post, with likes at the time of review.'}</p><div className="xhs-curation-facts"><span>{zh?'8 个案例':'8 cases'}</span><span>{zh?'图文与视频':'Image posts and videos'}</span><span>{zh?`数据观察：${xhsObservedAt}`:`Observed: ${xhsObservedAt}`}</span></div><a className="xhs-profile-link" href={xhsProfile} target="_blank" rel="nofollow noopener noreferrer">{zh?'查看珍珠奶茶的账号 ↗':'Visit 珍珠奶茶’s profile ↗'}</a></header>
    <section className="wrap xhs-curation-list" aria-label={zh?'精选案例':'Selected cases'}>{xhsStudies.map((study,index)=><article className="xhs-study" id={`case-${study.id}`} key={study.id}>
      <a className="xhs-study-cover" href={study.sourceUrl} target="_blank" rel="nofollow noopener noreferrer" aria-label={`${study.title} · ${zh?'查看原帖':'Open original post'}`}><img src={study.cover} alt={zh?`${study.title}原帖封面`:`Cover of ${study.title}`} width={480} height={640} loading={index<2?'eager':'lazy'} /></a>
      <div className="xhs-study-copy"><div className="xhs-study-top"><span className="xhs-study-number">{String(index+1).padStart(2,'0')}</span><span className="xhs-study-category">{zh?study.category:study.categoryEn}</span><span className="xhs-study-medium">{study.medium==='video'?(zh?'视频':'Video'):(zh?'图文':'Image post')}</span></div><h2 lang="zh-CN">{study.title}</h2><p>{zh?study.summary:study.summaryEn}</p><div className="xhs-study-meta"><strong>{study.likes.toLocaleString(zh?'zh-CN':'en-US')}</strong><span>{zh?'赞 · 观察时':'likes · at observation'}</span></div><a className="btn" href={study.sourceUrl} target="_blank" rel="nofollow noopener noreferrer">{zh?'查看小红书原帖 ↗':'View original post ↗'}</a></div>
    </article>)}</section>
    <p className="wrap xhs-curation-note">{zh?'点赞数为 2026 年 10 月 16 日公开主页快照，会随时间变化。封面来自原帖；完整图片、视频和教程请在小红书查看。':'Likes are a snapshot of the public profile on 16 October 2026 and may change. Covers come from the posts; visit Xiaohongshu for the complete images, videos and tutorials.'}</p>
  </main><SiteFooter catalog={catalog}/></div></div>;
}
