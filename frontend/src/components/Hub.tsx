import { interfaceLocale, text } from '@/lib/i18n/text';
import type { Catalog } from "@/lib/catalog/types";
import { SiteHeader, SiteFooter } from "@/components/Chrome";
import { HubBrowse } from "@/components/Browse";
import { HubReader } from "@/components/HubReader";

export function Hub({ catalog }: { catalog: Catalog }) {
  const uiLocale = interfaceLocale(catalog);
  return <div className={`prototype-magnetic${uiLocale === 'zh-CN' ? ' chinese-type' : ''}`}><div className="vme m-run taste" data-mode="run" data-field="depth"><SiteHeader bilingual={catalog.mode === 'git-beta'} currentHref={`/${catalog.locale}/prompts`} level="hub" locale={catalog.locale} /><main id="main"><section className="wrap argument"><h1>{text(uiLocale, "Somebody already wrote this", "早有人写好了。")}</h1><div className="body">
    <p>{text(uiLocale, "Every prompt in this library was published in the open by the person who wrote it, and then mostly lost — buried under a feed that is optimised for the next thing rather than the useful thing.", "这个库里的每一条提示词，都由创作者公开分享。它们后来大多被信息流淹没——信息流总是追逐下一件新鲜事，而不是留下真正有用的东西。")}</p>
    <p>{text(uiLocale, "So the whole of the work here is ", "我们做的，是让这些创作")}<em>{text(uiLocale, "not editing", "重新被找到")}</em>{text(uiLocale, ". No paraphrase, no house style, no distillation into a template. The text you copy is the text they posted, down to the render settings at the end that look like noise and are not.", "。从作品效果出发，按任务、模型和风格浏览，找到适合你的提示词，再把它变成自己的创作。")}</p>
    <p>{text(uiLocale, "What we add is the index, the attribution, and a link back. That is the entire product.", "这里保留创作者的署名，也保留回到原帖的链接。一个好起点，值得被更多人看见。")}</p>
  </div></section><div className="after"><HubReader catalog={catalog} /><HubBrowse catalog={catalog} /></div></main><SiteFooter catalog={catalog} level="hub" /></div></div>;
}
