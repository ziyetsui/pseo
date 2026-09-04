# 母版文案与实现对照

日期：2026-09-04。范围：本轮重建的 `frontend/`。这是静态文案/模板的定位表与已知差异记录，不是整页像素验收结果，也不证明内容公开或生产发布。

母版：`specs/images/flow-proto-full.html`，SHA-256 `7bc354e93c6399533b48a1bf6681d92a0e895f4b40af486c9b45029292e4256c`。用 JSON parser 解包 `const PAGES` 读取选中函数；文案保留在对应组件中，下表 key 为审阅定位名。当前没有独立多语言文案字典；英文静态 UI 不表示中文界面翻译已经完成。

## 五页选中方案与文案

| 审阅 key | 母版页面/区块 | 固定文案或模板 | 实现位置 |
| --- | --- | --- | --- |
| chrome.brand | 五页导航 | `Prompt Library` | `src/components/Chrome.tsx` |
| chrome.breadcrumb | L2/L3/L4 | 原页面 Home / Images / Models / 当前对象；Videos 类型纠正 | `Deck.tsx`、`Anthology.tsx`、`Recipe.tsx` |
| l1.title | l1 `variants[2]` / vQuotes Hero | `Somebody already wrote this` | `src/components/Hub.tsx` |
| l1.argument | 同上三段正文 | 从 `Every prompt in this library was published in the open…` 到 `That is the entire product.`；保留 `not editing` 强调 | `src/components/Hub.tsx` |
| l1.signature | Hero 签名行 | 2026-09-04 用户在浏览器批注中明确删除 | 已从 `src/components/Hub.tsx` 移除 |
| l1.library | 引用列表 | `The library` / `Everything, in the order it gets copied` | `src/components/HubReader.tsx` |
| l1.detailCta | 每条引用的详情入口 | 2026-09-04 用户最终指定 `Generate image` / `Generate video`，链接至对应 Prompt 的 L4；移除复制与页内展开 | `src/components/HubReader.tsx` |
| l1.search | 搜索 | `Search prompts, models, styles, creators…` | `src/components/Filters.tsx` |
| l1.browse | 浏览段落 | Category → Task → Model → Style → Creators；末尾 `Take a prompt and start` | `src/components/Browse.tsx` |
| l2.image | l2 `variants[2]` / v4 | Images Hero、图片搜索、Deck 提示段落 | `src/components/DeckReader.tsx`、`Deck.tsx` |
| l2.video | l2v `variants[2]` / v4 | Videos Hero；原型误留的 Image 文案改为对应 Video | `src/components/DeckReader.tsx`、`Deck.tsx`、`Filters.tsx` |
| l2.facets | 两个 Deck | `Narrow the deck` / `Use case` / `Style` / `Subject` | `src/components/DeckReader.tsx`、`Filters.tsx` |
| l2.pick | 卡组 | `Editor's pick`、当前卡/位置、Previous/Next、全文及按类型的详情 CTA | `src/components/DeckReader.tsx` |
| l2.browse | Deck 后 | Browse by model / tag 与真实分类链接 | `src/components/Browse.tsx` |
| l3.hero | l3 `variants[2]` / v4 | `{model} prompts` / `All {total}, printed whole. The shortest is {min} characters and the longest is {max}; nothing here is cut to fit a card.` | `src/components/AnthologyReader.tsx` |
| l3.index | Anthology 目录 | 标题/字符数；`All prompts` 与过滤后计数 | `src/components/AnthologyReader.tsx` |
| l3.groups | 正文选集 | `Prose prompts` / `Structured JSON prompts` | `src/components/AnthologyReader.tsx` |
| l3.actions | 选集动作 | `Generate image` 或 `Generate video` / `Send to the scratchpad` / `View on X ↗` / `Back to the index ↑` | `src/components/AnthologyReader.tsx` |
| l3.scratchpad | 文末编辑 | `Write your own`、scratchpad 说明段落、placeholder；复制按钮已按用户要求移除，生成 CTA 按已载入内容/模型目录类型显示 | `src/components/AnthologyReader.tsx` |
| l3.about | 关于模型 | `About this model` / `What is here` / `What this page is` / `How to read them` | `src/components/Anthology.tsx` |
| l4.hero | l4 `variants[1]` / v3 | `{title}` / `Four steps from this page to your own version.` / 作者署名 | `src/components/Recipe.tsx` |
| l4.step1 | Recipe 01 | `See what it makes`，有媒体/无媒体各自说明 | `src/components/Recipe.tsx` |
| l4.noMedia | 无媒体 | `No image was published with this prompt`、不伪造渲染的解释、`Browse prompts that have results →` | `src/components/RecipeMedia.tsx` |
| l4.step2 | Recipe 02 | `Set the placeholders` / `{n} placeholders` / `Choose values` / `Placeholders` | `src/components/RecipeText.tsx` |
| l4.noVariables | 无变量 | `This prompt has no placeholders — nothing to set. Skip to the text.` / `This prompt has no placeholders. Copy it as it is.` | `src/components/RecipeText.tsx` |
| l4.step3 | Recipe 03 | `Take the text` / `{n} characters. Copy the whole thing — the render settings at the end are part of it.` | `src/components/RecipeText.tsx` |
| l4.verbatim | 原文状态 | `Word for word, as published.` | `src/components/RecipeText.tsx` |
| l4.step4 | Recipe 04 | `Run it` / `Generation happens in bo. This page hands you the words.` / `Model` / `What to expect` / `Run four at once; how far the result drifts varies a lot.` | `src/components/Recipe.tsx` |
| copy.status | 所有页面复制 | 2026-09-04 用户要求移除所有复制按钮及其状态反馈 | CopyButton 组件已删除 |
| chrome.footer | 五页完整页尾 | By model / By task 或 By use case / By style / By subject / Browse 及归属声明 | `src/components/Chrome.tsx` |

## 动态值的依据

- Prompt 标题、原文、作者、来源、模型、taxonomy、变量、媒体、日期与指标由 `Catalog` / `Prompt` 提供；正式模式在 `src/lib/catalog/public.ts` 从生成 DTO 显式映射，视觉模式在 `fixture.ts` 隔离读取母版/既有 fixture。
- 数量、字符数、最长/最短、过滤结果由同 revision 数据计算；原型的固定数不作为生产事实。没有值的指标保持未知，不补 0。模型说明采用实际 entity description。
- 复制使用 `prompt.prompt` 全文；Recipe 填值后复制解析全文，保留空白/换行。模板数不等于权利审查，Popular / Editor's pick / copied-order / attributed 等事实性标签仍需生产字段支撑。
- 原型里的变量示例与作者正式字段是不同来源。正式数据无选项时用自由输入，不虚构 Alpha/Beta/Gamma。placeholder token 匹配次数从全文解析，不硬编码。
- `prompt.language` 表达 Prompt 原文语言；Recipe 原文区显式 `lang`。页面 locale、界面静态文案语言和原文语言必须分别审核，不能从英文母版推导中文文案已完成。
- 路由现使用多个原生 root layout：`app/(entry)/layout.tsx` 为入口输出 `html lang=en`；`app/[locale]/layout.tsx` 输出 `html lang={locale}` 与固定英语 UI 的 `body lang=en`。Recipe 公共标题/原文及 Blog 标题/摘要/正文分别按内容 locale/language 覆盖。此标记如实表达语言，不冒充中文 UI 翻译。

## 为真实功能做的差异

| 差异 | 原因 / 当前实现 |
| --- | --- |
| 移除五页 prototype 导航、L4 Showing/样本选择器 | 这些是 harness；生产使用真实 L1–L4 路由。 |
| `href="#"` 改真实 href，保留目录锚点 | 刷新/返回/直达可用；未知目标不造空详情。 |
| Videos 中 Image 残文统一纠正 | 标题、搜索、breadcrumb、active/aria 和数据类型一致。 |
| Copy 失败不显示 Copied | 增加 `Copy failed. Select the prompt text and copy it manually.` 与 live region；可选择完整原文。 |
| Recipe 填值后状态变化 | 改为 `Placeholders filled. The author's original is preserved below.`，增加原文展开、Reset、未填 token 提示；原文初始状态仍保留母版句。 |
| Recipe 无 tryUrl 的按钮不可用 | 保留动作位置并解释 `No generation link is available…`；未造生成服务或目标地址。 |
| L3 筛选不会清 scratchpad；目录编号共用分组结果 | 修复原型失效 `mount(current)` 和目录/正文排序不一致；草稿在会话存储不可用时仍可编辑复制。 |
| 来源/证据/observedAt/真实关系补入 Recipe 步骤尾 | 履行现行数据合同，采用现有小号 kv 形式；缺公开证据链接如实说明，不合并成媒体。 |
| 媒体失败回退；主图有尺寸并优先加载 | 网络/媒体不可用时不冒充结果；完整布局与复制仍可使用。 |

`Free to copy`、`every one credited`、`in the order it gets copied` 等文字是母版基线，不是由本轮工程证明的许可/归因/真实复制排名。公开数据缺证据时是明确的内容合同缺口；本报告不批准这些承诺，也不把设计 fixture 发布为内容。

## Blog 为派生实现

母版没有 Blog 页面。`src/components/Blog.tsx` / `BlogBody.tsx` 使用同体系排版提供列表、详情、分类、TOC、引用和真实空/不可用状态，不能称为 1:1。其 `Field notes` / `The notebook` / 说明/状态 copy 是本轮派生文本，不是用户定稿。

`src/site/articles.ts` 只读显式 `FRONTEND_STATIC_DIR` 的 compiler 产物，校验 manifest 中全部文件 hash/bytes、catalog 同 revision 和路由闭合。未配置显示 unavailable；已校验且确无 Article 才显示 `No articles published yet`。本轮实际读取本地 compiler revision `sha256:133521b6a07f71ad2455e1e4bd25634cabf3f79c5643a2e81ce87c4c90952a01` 为 0 篇，不代表线上最新内容或生产发布状态。

## 本表的验收边界

已完成静态函数/实现定位与 Recipe 行为/Article adapter 测试；未把本表当作视觉逐像素通过报告。完整同 viewport/fixture/theme/font 的五页截图、overlay、交互与可访问性结果由本轮主验证报告记录。需要继续集中化静态 copy key 与审查缺少的界面 locale 文案；不得在交付时说已完成全部语言的逐字还原。

定位表完成后实际执行 `FRONTEND_DATA_MODE=visual-fixture pnpm build` 通过（58 个 Next 生成项）；`pnpm check:static` 通过（56 个 HTML、3092 个内部链接）。检查导出 HTML：zh-CN 页根语言正确、英语 UI 分层明确、404 `lang=en` / noindex / 样式存在，主体不在 hidden Suspense 容器中。无顶层 root 的原生 404 初次导出无语言和样式，因此采用本地 Next 文档规定的 `experimental.globalNotFound` 完整文档；没有恢复 `loading.tsx`。独立 localhost:4219 静态 HTTP smoke 因沙箱绑定 EPERM 未执行，不计为 HTTP 状态验收。

## 2026-09-04 最终 CTA 调整

全站移除 Prompt 与 scratchpad 复制按钮。L1–L3 的单条主 CTA 按真实 `prompt.kind` 显示 `Generate image` / `Generate video` 并跳对应 L4；未知类型显示 `Generate`。L4 与 scratchpad 同样按类型显示，未提供有效 tryUrl 时仍不可用。首页末尾的无类型 CTA 改为图片/视频两入口，分别进入相应 L2。历史截图中的 Copy 和 Generate in bo 是先前版本，不代表当前按钮。正文仍可选择，未变更后台 canCopy/actions 合同。

## 2026-09-04 L1 Magnetic override

L1 now uses `docs/wireframes/proto-continuous-peek.html?v=2`, `variants[1]/vMagnet`. Earlier Quotations rows above are historical.

- Hero heading and three paragraphs: unchanged verbatim; user-deleted signature stays absent.
- Library heading: `Everything, in the order it gets copied`.
- Form note: `No rows, no cards, no plates. The whole library as one paragraph of titles; the one you pick opens in place and splits the text around it.` Preserved verbatim despite the reference's stale description of an inline expansion: v2 actually uses an out-of-flow peek. No editorial rewrite was authorized.
- Titles remain catalog data; all 35 visual fixture titles/order match Magnetic reference.
- Generate image / Generate video / Generate links go to the corresponding L4; no copy buttons or prototype picker/theme toggle.
- Facet count ties preserve source occurrence order on L1, matching the Magnetic reference. L2/L3 sorting is unchanged.
