import type { Catalog } from '@/lib/catalog/types';
import { SiteHeader, SiteFooter } from './ChineseChrome';
import { HubBrowse } from './ChineseBrowse';
import { ChineseReader } from './ChineseReader';

// The same Magnetic page structure, images and tokens as components/Hub.tsx.
export function ChineseHub({ catalog }: { catalog: Catalog }) {
  return <div className="prototype-magnetic"><div className="vme m-run taste" data-mode="run" data-field="magnet"><SiteHeader level="hub" locale={catalog.locale} /><main id="main"><section className="wrap argument"><h1>早有人写好了。</h1><div className="body">
    <p>这个库里的每一条提示词，都由创作者公开分享。它们后来大多被信息流淹没——信息流总是追逐下一件新鲜事，而不是留下真正有用的东西。</p>
    <p>我们做的，是让这些创作<em>重新被找到</em>。从作品效果出发，按任务、模型和风格浏览，找到适合你的提示词，再把它变成自己的创作。</p>
    <p>这里保留创作者的署名，也保留回到原帖的链接。一个好起点，值得被更多人看见。</p>
  </div></section><div className="after"><ChineseReader catalog={catalog} /><HubBrowse catalog={catalog} /></div></main><SiteFooter catalog={catalog} level="hub" /></div></div>;
}
