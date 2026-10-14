import { interfaceLocale, text } from '@/lib/i18n/text';
import type { Catalog } from "@/lib/catalog/types";
import { SiteHeader, SiteFooter } from "@/components/Chrome";
import { HubBrowse } from "@/components/Browse";
import { HubReader } from "@/components/HubReader";

export function Hub({ catalog }: { catalog: Catalog }) {
  const uiLocale = interfaceLocale(catalog);
  return <div className="prototype-magnetic"><div className="vme m-run taste" data-mode="run" data-field="magnet"><SiteHeader bilingual={catalog.mode === 'git-beta'} currentHref={`/${catalog.locale}/prompts`} level="hub" locale={catalog.locale} /><main id="main"><section className="wrap argument"><h1>{text(uiLocale, "Somebody already wrote this", "这条提示词，早已有人写好")}</h1><div className="body">
    <p>{text(uiLocale, "Every prompt in this library was published in the open by the person who wrote it, and then mostly lost — buried under a feed that is optimised for the next thing rather than the useful thing.", "这里的每条提示词都由作者公开发布，却往往被信息流淹没。信息流关注的是下一条内容，而不是有用的内容。")}</p>
    <p>{text(uiLocale, "So the whole of the work here is ", "因此，我们的工作是")}<em>{text(uiLocale, "not editing", "不改写")}</em>{text(uiLocale, ". No paraphrase, no house style, no distillation into a template. The text you copy is the text they posted, down to the render settings at the end that look like noise and are not.", "。不转述，不统一文风，不提炼成模板。你复制的就是作者发布的文字，包括末尾那些看似杂乱却有作用的生成参数。")}</p>
    <p>{text(uiLocale, "What we add is the index, the attribution, and a link back. That is the entire product.", "我们提供目录、署名和原始链接。这就是整个产品。")}</p>
  </div></section><div className="after"><HubReader catalog={catalog} /><HubBrowse catalog={catalog} /></div></main><SiteFooter catalog={catalog} level="hub" /></div></div>;
}
