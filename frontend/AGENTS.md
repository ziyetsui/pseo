# Frontend Agent 协作规范

适用于 `frontend/**`。2026-09-04 用户要求重建前端，使用 TypeScript、CSS、Tailwind，逐页还原 §7 指定的已定稿设计和文案（L1 Magnetic；L3 任务页 Findings、风格页 Plate；其余 L2–L4 为 `specs/images/` 已选母版）。本文件 §7 是前端视觉与交互的有效入口；根规则、CMS 发布权利和安全边界继续生效。

## 1. 开工、所有权与合同

- 开工先读根 `AGENTS.md`、`specs/0008-prd.md`、`specs/0009-pseo-tech-arch.md`、`specs/0011-promptlab-youmind-cms-publication.md`、`content/README.md` 和 `docs/handoffs/claude-frontend-rebuild.md`。查看 `git status`，保留所有并发修改；只读参考旧版本，不整包恢复已删除前端。
- 用户明确要求优先；PRD/Tech Arch 定义产品和架构；0011 定义 CMS-first 发布。§7 指定的新母版替代旧 Bauhaus/neutral 候选和旧 L4 模块裁定，不替代数据真实性、来源证据、SEO 或无障碍要求。
- 子 Agent 必须有明确文件/模块所有权，并被告知还有其他 Agent 工作。基础工程、共享类型、全局 CSS 与页面模块分别分工；修改共享接口先通知调用方。其他目录缺口交对应 owner，未经分配不修改 Backend/CMS/内容镜像。
- 编辑应小而可审查。脚本删除后立刻检查 `git diff --stat`；删符号后查调用方、旧值和注释。不恢复只有测试调用的死 API，不覆盖他人中间态。

## 2. 技术与组件边界

- Next.js App Router + React + strict TypeScript + Tailwind CSS + 必要的模块/全局 CSS，使用 `pnpm` 和锁文件。生产代码使用 `.ts` / `.tsx`，CSS 承载设计 token；不混用包管理器或顺带升级全栈。
- Cloudflare Pages 使用 `output: "export"`。不使用 ISR、Draft Mode、Server Actions 或依赖运行时的默认图片优化；图片明确尺寸，使用静态兼容 loader/unoptimized 策略。
- Server Components 默认；Deck、变量、scratchpad、菜单及必要筛选使用最小 Client 边界。核心正文仍在初始 HTML。共享动作插槽用 `ReactNode`，不用回调把服务端调用方变成 client。
- `src/app/` 负责路由/metadata；`src/components/` 或 `features/` 负责展示/交互；`src/lib/api/` 是 HTTP 唯一入口；内容 repository 负责读取与映射；`src/lib/i18n/` 集中 locale/URL；`src/styles/` 集中样式。页面不承担请求解析与业务映射。
- DTO、领域模型与 ViewModel 分开。外部输入为 `unknown`，运行时 schema 通过后显式映射；不以 `any`、`@ts-ignore`、可选字段堆叠或类型断言掩盖协议差异。基础 UI 不反向依赖页面。

## 3. CMS、正式数据与 Preview

- Payload CMS 中经版本化校验和人工 editorial/translation/rights review 的 public 内容是唯一 canonical。正式站只消费不可变 public snapshot 对应的已校验公共读模型，并固定 snapshot revision、mirror commit、manifest；Git 是 generated mirror。
- 母版 fixture 仅用于显式本地/受保护视觉验收，必须 noindex；正式构建不自动选择 fixture，不允许未审核样本进入生产 HTML、metadata、JSON-LD、RSS、sitemap 或公开数据包。正式数据失败即失败，不 fallback 为样本/空库。
- CMS draft Preview 与正式构建隔离，只能通过 server-only/host adapter 读取受保护 Preview contract，使用 no-store/noindex 和 Access。不能在浏览器直连 Payload DB/SDK，也不把凭据放入 `NEXT_PUBLIC_*`、URL、bundle、日志或报告。
- 实际 CMS endpoint 是 `/api/internal/v1/preview-catalog`；其 DTO（如 `promptText`、`media.src`）不同于 public API，必须独立校验/映射。现有 Preview 有限定数据范围，不能据此承诺通用 CMS 预览。
- `/api/internal/v1/public-snapshot` 是专用 mirror worker 的 files/base64/manifest envelope，不是页面 catalog API；前端不取得其 Bearer、mirror 或发布凭据。
- Agent 不修改 `content/**`、不批准 rights/public/released、不写 CMS DB、不启用生产 Preview、不部署或修改 Cloudflare/Access/DNS。工程完成、CMS public、mirror synced、deployment、smoke 分开报告。

## 4. 接口一致性

- HTTP 类型从 `backend/openapi/openapi.json` 生成，核对 `backend/src/pseo/api/v1/router.py`、`backend/src/pseo/api/schemas.py` 与合同测试。Spec 描述的目标端点不自动视为已实现或已部署。
- 当前 public GET：`/api/v1/locales`、`/home`、`/prompts`、`/prompts/{slug}`、`/facets`、`/models/{slug}`、`/categories/{axis}/{slug}`（均带 `/api/v1` 前缀）；健康检查单独为 `/healthz`。公开读取匿名只读，内容请求显式传 locale。
- `/prompts` 查询 allowlist：`locale,q,contentType,model,useCase,technique,style,subject,creator,window,sort,cursor,limit`。同轴 OR、跨轴 AND、搜索与筛选 AND，多选用重复 query。`q` 最长 200；`limit` 默认 24、范围 1–50；`window=7d|30d|all`；`sort=relevance|trending|value|newest`。
- `/facets` 不接受 sort/cursor/limit；model/category projection 不接受全部组合筛选。实体信息走 projection，组合结果走附固定 model/contentType 的 `/prompts` 与 `/facets`。UI Deck 位置、scratchpad 等状态不传给 API。
- 列表 envelope 为 `{data,page:{nextCursor,hasMore,limit,total},facets,meta}`；详情/home/projection 为 `{data,meta}`。`meta.contentRevision/indexVersion/rankingVersion` 与详情 revision 区分；缺指标是 `null`，缺集合是 `[]`，末页 cursor 是 `null`。
- cursor 是绑定查询和 snapshot 的 opaque 值，不解码、猜测或把页码当 cursor；筛选、排序变化清 cursor。列表遍历与 detail 读取固定同 revision；构建期间漂移则整次失败重试，不能拼接版本。
- `PromptSummary.promptPreview` 只是截断文本。L2 卡片、L3 全文选集和 L4 正文从 detail `prompt.text` 或同 snapshot 的完整静态读模型取得全文，遵守 `actions.canCopy` / `actions.tryUrl`。不改写空白、换行或重新序列化 JSON 冒充原文。
- 错误按 `application/problem+json` 和稳定 code 处理：INVALID_QUERY、RESOURCE_NOT_FOUND、LOCALE_VARIANT_NOT_FOUND、CONTENT_GONE、429/503；缺译文候选来自 `errors[].meta.localeVariants`。不得解析自由文本、吞错成空数组或缓存错误为成功。统一超时/取消、ETag/304、requestId 与 X-Content-Revision。
- collections/creators detail、Article HTTP API、article-categories 和 suggestions 当前未在 router/OpenAPI 实现；记录缺口，不虚构 endpoint。Blog 可读取已验证的同 snapshot Article compiler 产物；没有 public Article 不造文章。
- Compiler JSON 与 HTTP DTO 不等价：目前 compiler index 的 `promptPreview` 存全文但缺完整详情字段。构建层校验 manifest/hash、locale、route membership，再显式映射已校验 mirror；不能用强转替代合同。

## 5. L1–L4 路由与跳转

| 层级 | 真实 URL | 导航责任 |
| --- | --- | --- |
| L1 Magnetic | `/{locale}/prompts` | 图片/视频分类到 L2，Browse by task 卡片到 L3 Findings，Browse by style 卡片到 L3 Plate，模型到 L3 Anthology，标题打开 Magnetic peek，Generate 到 L4；搜索和四轴筛选可组合 |
| L2 Images Deck | `/{locale}/prompts/image` | 固定 `contentType=image`；模型到 L3、当前 Prompt 到 L4、面包屑回 L1 |
| L2 Videos Deck | `/{locale}/prompts/video` | 固定 `contentType=video`；同上，所有标题/文案/aria 的类型语义正确 |
| L3 Task Findings | `/{locale}/prompts/use-cases/{taskSlug}` | 仅 Browse by task 卡片及任务页同类导航；固定真实 useCase，Within 筛选重算统计与示例，单条 CTA 到 L4 |
| L3 Style Plate | `/{locale}/prompts/styles/{styleSlug}` | 仅 Browse by style 卡片落地页；固定真实 style，编号目录定位图版与旁注，单条 CTA 到 L4 |
| L3 Anthology | `/{locale}/prompts/models/{modelSlug}` | 固定真实 model；目录到页内对应全文，Full prompt 到 L4；返回真实上层 |
| L4 Recipe | `/{locale}/prompts/{promptSlug}` | 模型/分类/相关内容通过真实关系返回 L1–L3 或其他 L4；来源跳真实原帖 |

- 每页独立真实路径，支持直达、刷新、前进后退。生产不使用 iframe/srcdoc/hash 模拟页面或注入整页 HTML；hash 只用于页内目录。路由集中生成，不能从展示文案猜 slug。
- 支持 `en` / `zh-CN` 的工程能力，仅生成 registry enabled、translation ready、允许公开的 locale/关系；未知 locale/slug 返回真实 404。语言切换用 `localeVariants[].href`，缺译文不可静默 fallback；页面 locale 与 Prompt 原文语言分别表达。
- 筛选/搜索/排序/window/分页写入可分享 URL，恢复浏览器历史。静态 export 不支持任意 query 的动态 SSR：交互用同 revision 的静态索引或已部署 public API 增强，禁用 JS 后保留可读正文和真实链接。
- Footer/分类/创作者/合集使用数据提供且可到达的 href；没有合同的目标明确不可用，不能 `href="#"`、拦截所有链接或制造空 200 页面。L4 生成 CTA 按用户明确指定直达 `https://bo.video/home`；其他生成动作只接有效 `actions.tryUrl`，不虚构生成服务或自动提交。
- 保留 PRD 的 Blog 列表/文章/分类、Prompt 与 Blog RSS、sitemap、robots、404/错误/缺译文范围。Blog 没有本轮母版，按相同组件派生并说明，不能声称 1:1。

## 6. 渲染与 SEO

- H1、主体 Prompt、模型/分类说明、来源与核心链接在初始 HTML 中；`generateStaticParams` 与同 revision 路由 manifest 一致。只从 approved 数据生成，不靠 hydration 补 SEO 正文。
- title、description、canonical、lang、OG/Twitter、hreflang 与可见内容一致；JSON-LD 只描述实际内容。来源、证据、示例独立，来源作者/原帖/时间/许可有依据，不伪造指标、排名、数量或资格。
- Sitemap/RSS/robots 与页面使用同一 URL/locale/公开资格逻辑；draft、Preview、takedown、缺译文和错误页不进入索引。静态 headers/noindex/404/410/redirect 在最终产物和部署规则验证，不只改客户端 meta。
- 分页提供真实可抓取链接；构建层建立页码与 cursor/revision 映射。普通筛选 canonical 到主投影，只有 qualification 通过的组合拥有独立可索引 URL。

## 7. 唯一视觉合同：已选母版的 1:1 还原

- 2026-09-04 Creator 点击裁定：首页、Style、Task、模型页的 Creator 卡片及 All creators 目录条目优先直接打开数据提供的作者 X 主页，新标签页并使用 `nofollow noopener noreferrer`；不再优先进入站内 creator 筛选。没有经数据提供的主页 URL 时保留有效站内入口，不从展示名称猜造账号。普通 creator 筛选参数继续可用。

- 2026-09-04 分类审计裁定：分类依据完整 Prompt 的正向生成目标；negative prompt、否定表达、背景道具和参考网址中的关键词不能直接转成风格/任务标签。补充主体和技法须有明确正文依据，存在歧义的标签留待审核。当前视觉 fixture 的逐条证据及 40 项字段修正见 `evidence/catalog-audit/`；提取原型不得覆盖这些已审修正。视频封面 JPEG 是图片媒体，但视频 Prompt 仍属于 video；未知类型保持未知，不猜测归入图片或视频。正式内容修正仍走 CMS proposal/审核链。内链验收同时核对路径和目标锚点存在，筛选清除须移除时间范围。

- 2026-09-04 Style L3 导航最新裁定：Style Plate 页下方 Browse by category / task / model / style 统一使用带缩略图的横向单排小卡片，保留名称、真实数量和原跳转。参考用户所附 Browse by style 截图：16:10 封面在上、标题与计数在下、12px 间距、桌面约五张同宽卡片；少量卡片不拉伸铺满，窄屏横向滚动而不换成两列。模型保持系列合并；缺预览时保留有界真实空态，不虚构图片。此规则取代此前无图三列/两列小卡片；其他页面与 Plate 正文图版不受影响。

- 2026-09-04 展示数据质量裁定：用户要求移除以教程、操作指南、长文档或营销说明截图充当生成效果的展示记录。优先使用能直观看到实际生成结果的图片、视频或视频帧；文字海报/排版作品本身属于生成结果时不因含文字误删。已明确移除本地视觉数据 `2066531004924436614`（ICP pain map into seven ranked ad angles / @zackpaid），不得在提取原型时重新引入。移除记录时同步所有列表、分类计数、封面和 L4 路由，不以隐藏一张卡片代替。正式内容仍经 CMS proposal/审核链处理，不直写内容镜像或静默修改 public snapshot。

- 2026-09-04 模型系列合并：全站 Browse by model、Footer By model、All models 目录按系列展示。Nano Banana 合并 nano-banana / nano-banana-pro / nano-banana-2，GPT Image 合并 gpt-image / gpt-image-2；其余已登记模型保持独立。系列页使用 /{locale}/prompts/model-families/{familySlug}，沿用 Anthology，汇集成员模型提示词并按 immutable id 去重计数；原具体版本页和精确模型筛选保留原语义。分组是前端导航投影，不新增 CMS taxonomy 或虚构 backend family API；正式系列页默认 noindex，不能继承单个版本的 SEO 审核状态。

- 2026-09-04 页脚追加裁定：所有页面共用的 Footer 按真实 registry 跳转：模型 → 模型 Anthology，任务 → Task Findings，风格 → Style Plate，Subject → 对应主题列表；All models / All creators → 独立目录页。Footer 是此前 Task / Style 卡片专属入口的明确新增入口；普通 query 筛选链接保持原行为。不得用首页锚点或关键词搜索代替分类目标；已登记但暂时无内容的分类展示真实空状态，不虚构提示词。

- 2026-09-04 Style 追加裁定：Browse by style 卡片的 L3 落地页采用 `docs/wireframes/proto-l1-editorial.html?v=3` 的 **Plate**（`variants[2]/vpl`）。这是独立于任务 Findings 和模型 Anthology 的风格专属母版；普通 style query refs、任务页内的 style 筛选、L2 和 L4 保持原行为。
- L3 Style Plate：固定真实 style 集合；沿用 serif 400 标题（34–58px）、88/44px 标题页、三列编号目录（1000px 两列、620px 一列）、78px 条目间距、大图与 268px 旁注交替左右、最多三张媒体并列且完整不裁切、图号/标题/Medium/Credit/Extent/Subject/原文片段/类型 CTA。860px 以下图文上下排列，620px 以下条目间距 48px。目录与正文来自同一有序筛选集合，锚点绑定 immutable id；搜索与其他轴筛选写 URL，清除后仍留在当前 style。缺图采用文字图版或真实失败状态；媒体数量、时长、署名、指标仅显示已有数据。默认 Linear 暗色，不引入 Copy prompt、占位链接、picker 或 iframe。

- 2026-09-04 用户最新裁定：L1 母版为 `docs/wireframes/proto-continuous-peek.html?v=2` 的 **Magnetic**（`variants[1]/vMagnet`）。L3 任务页独立采用 `docs/wireframes/proto-l3-task.html?v=4` 的 **Findings**（`variants[3]/vfd`），仅适用于 Browse by task 卡片的落地页及其中的任务导航；其他 L2–L4 母版仍为 `specs/images/flow-proto-full.html`；`linear-design-token-reference.md` / `linear-design-tokens.css` 仅补充。用户已调整设计和文案，“优化”指实现完整可用、响应式与无障碍，不授权重新设计、换候选或润色文案。
- 用 JSON parser 解包母版 `const PAGES`，不执行整份 HTML 来提取；浏览器查看实际已选 `paint`。默认选中：L1 使用前述 Magnetic（`data-field="magnet"`），不再使用 Quotations；`l2/l2v=variants[2]/v4`（Deck）；`l3=variants[2]/v4`（仅模型 Anthology）；任务页为独立 `proto-l3-task.html` 的 `variants[3]/vfd`（Findings）；`l4=variants[1]/v3`（Recipe）。残留候选、样本选择器、测试导航不是产品 UI。
- 还原宽度、留白、密度、字号/字重/行高/字距、换行、媒体比例/裁切、边框/圆角/阴影、模块顺序和交互节奏；不得统一为通用卡片网格。先匹配母版，再抽语义 CSS variables/Tailwind token，禁止组件库默认皮肤替代设计。
- 逐字提取静态 UI 文案，保留标点/大小写/强调并集中管理 copy key。Prompt 标题/正文/作者/数量/权利是内容数据，正式站来自 approved snapshot；视觉测试使用同母版隔离 fixture，不修改 CMS/镜像凑版面。
- `Free to copy`、`every one credited`、`in the order it gets copied` 等事实性 copy 需有生产依据；原文保留为设计基线，缺依据登记具体冲突交内容 owner，不伪造许可或复制排名，不自行改写定稿掩盖缺口。
- 使用各选中页面实际字体栈，保留 L1/L3 serif 标题；无字体/素材授权记录差异。2026-09-04 用户明确要求默认 Linear 暗色：全站默认使用现有 `light-dark()` 的暗色 token，系统浅色偏好不覆盖该默认值，不新增未设计的主题开关。
- L1：逐字、逐项还原 Magnetic 连续 serif 标题段落、筛选和完整 Browse/footer；不使用引用列表或卡片网格。标题点击显示不占文档流的 fixed peek，列表位置不变；不是旧版页内撑开。首屏 signature 已由用户明确删除，不恢复。2026-09-04 用户最终指定：全站移除 Prompt/草稿复制按钮，图片 CTA 为 `Generate image`、视频为 `Generate video`；未知类型使用 `Generate`，不猜测分类。L1–L3 的单条 CTA 通过真实 `prompt.href` 进入该条 L4；2026-09-04 用户追加：所有 L4 Generate CTA 直接在新标签页打开 `https://bo.video/home`，移除缺少生成链接的禁用按钮与提示；不追加 Prompt/变量参数，不自动启动生成。scratchpad 不受本次 L4 导航变更影响。不恢复 Copy 或 Read it all / Show less 按钮。2026-09-04 追加：全站统一移除 `Read it →` 按钮，Task Findings 示例只保留按类型的 Generate CTA。L2：突出单张 Deck、Previous/Next、位置反馈、首尾禁用、焦点在 Deck 时左右键；非当前卡不进入 Tab 顺序，筛选后回首张并播报。
- Magnetic 动效参数：220px 指针场，近度 `(1-d/220)^2`；吸附 13px、上浮 5px，弹簧 k=.055 / damping=.86，near lerp=.12。peek k=.05 / damping=.82、scale .94→1、lerp=.12；停指针 450ms 或移入 peek 后冻结，键盘/触屏定位锚定；入场 250ms、退出 150ms（170ms 后隐藏）。固定 60Hz 子步，在高刷新率屏幕上保持相同速度；缓存布局，不在每帧读取元素位置；离屏/后台/静止停止循环。点击依次保留六色阅读标记，色值从母版提取。Escape 关闭并回到标题，点击外部关闭，一次只开启一个 peek。
- Magnetic 默认使用母版 `linear-dark` 主题（背景 #08090a、surface #0f1011、card #141516）；保持本地授权 Inter Variable 和系统 serif。prefers-reduced-motion 实时禁用位移/渐变，触屏取消磁吸但保留点击预览和色标。不得加入原型候选切换器或主题开关。
- L3 Findings：保留居中 serif H1（96px 上限 / 40px 下限）、410px 论述栏、648px 示例栏、16:10 图片、Task / Within 两行粘性控制栏、统计→示例→余下标题段落→Creators / CTA / Footer 的顺序；2026-09-04 用户追加要求：所有 Task L3 页暂时移除页尾 Browse another task / Models / Styles 大图导航卡片区，任务切换与其他轴筛选保留在顶部 Task / Within 控制栏。统计来自固定任务的当前筛选结果；无依据的分类结论不展示，数量为 0 的 finding 不展示，单条集合使用正确单复数。Task 为真实链接且 aria-current=page；Within 为同轴 OR / 跨轴 AND 的 URL 筛选，刷新、后退恢复，清除筛选仍留在任务页。默认暗色；不引入 picker、原型 data-task/hash 页面路由或 Copy 按钮。L4 动作沿用 Generate image/video/Generate。普通 useCase query 链接、Browse by model、style、L2 和 L4 不因本次更新改版。原型文字若超过证据（例如标签推断镜头指令先后、正则推断合法 JSON、署名推断权利），只保留可证实的统计并在 evidence 登记差异。
- L3 Anthology（模型及模型系列页）：目录与正文从同一分组排序集合编号，区分 Prose / Structured JSON，保留全文、按类型的 L4 详情 CTA、来源及返回目录。2026-09-04 用户追加：统一移除 `Send to the scratchpad` 按钮及专用加载/焦点逻辑，不恢复此入口。scratchpad 保留手动输入和本地草稿；按下方模型首屏追加裁定移至 Signature 首屏，页尾不重复渲染。占位文案不得再提示使用已删除按钮，筛选不得清除用户输入。
- L4：严格保留 `01 See what it makes` → `02 Set the placeholders` → `03 Take the text` → `04 Run it`。同名变量全量同步替换，保留原文；无媒体/无变量如实说明。来源/权利/证据/关系按合同补到对应步骤或页尾，不恢复旧十四块堆叠，也不采用旧“永久删除步骤”裁定。
- 修复原型交互缺陷并登记差异：clipboard 拒绝不能报 Copied；Videos 残留 Image 语义纠正；image 不能吸入 unknown；L3 不使用残留 `mount(current)`；L4 填变量后不能继续声称 Word for word, as published；移除 Showing 等 harness。

## 8. 响应式、交互与可访问性

- 尊重原型断点，补齐 1440、1024、768、375/360、320px；200% zoom 无页面横向滚动。长 Prompt/JSON/URL 只在自身区域滚动，图像失败不塌布局，底部动作不遮正文/安全区。
- 语义 header/nav/main/footer、skip link、唯一 H1、连续标题；操作 button、导航 a/Link、搜索 form。持久 label、可见 focus、正确焦点顺序；图标有名称，装饰 aria-hidden，颜色不是唯一信号。
- WCAG 2.2 AA 对比度；触控目标至少 44×44 CSS px；菜单/Deck/筛选/生成入口/变量/语言切换全键盘可用。反馈 aria-live，尊重 prefers-reduced-motion；补无障碍不改变已定信息层级。
- loading、empty、no-results、error、retry、stale/unavailable、404、缺译文、媒体失败、Preview denied 可区分。正文保持可选择的完整值、空白和换行；不显示已移除的剪贴板操作状态。

## 9. 验证与交付

- `package.json` 提供并实际运行 `pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm build`、`pnpm test:e2e`、`pnpm check:static`。根 compiler 门禁：`node infra/bin/content.mjs validate`、`node infra/bin/content.mjs build --output infra/generated/static`、`node --test infra/tests/*.test.mjs`。未运行/失败逐项说明，旧报告不算本轮证据。
- 测试覆盖实际风险：生成 DTO/schema 与显式映射、revision/cursor/locale、L1→图片与视频 L2→L3→L4、直达/返回/刷新、筛选历史、按类型的 CTA 标签与真实目标、无复制按钮、变量多位置、Deck 焦点/边界、TOC 编号、scratchpad 保留、404/缺译文/故障与 fixture 不进入正式输出。不要只测实现常量。
- 执行 axe、人工键盘、禁用 JS 主体/链接检查；按 PRD 记录移动 Lighthouse Performance/Accessibility/SEO ≥90、CLS <0.1 的实际环境和结果。
- 视觉验收固定母版 hash、page key、variant、fixture、viewport、主题、DPR、字体/浏览器和滚动位置。五页首屏/主体/页尾及关键交互状态对照截图并检查叠加/diff；逐字核对文案。截图命令成功不等于视觉通过，不报告无依据相似度。
- `frontend/evidence/` 记录 reference manifest、copy map、visual review、contract gaps 和 test run。说明派生页面、缺字体/素材/内容、功能性修正及仍可见差异；没有基线的部分不称为 1:1。
- 交付说明文件范围、接口/工程入口、实际验证、数据 revision、权利/上线风险，并分别列出 CMS public、mirror synced、deployment、smoke 状态。UI 完成或本地通过不得冒充生产 released。

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->


## 10. 2026-09-04 SEO 审核修复约束

公开构建必须验证FRONTEND_SITE_URL；Prompt的canonical/hreflang直接投影已校验SEO合同，不能按env猜语言关系。L1/Blog索引资格由同revision已验证route-manifest和sitemap共同确认，缺失保持noindex，原型/fixture/未独立审核系列继续隔离。finalizer必须拒绝sitemap与HTML canonical/robots冲突。集合页meta按类型/关系区分，不改变Prompt正文或已定视觉文案；真实CMS SEO优先。图标沿用现有方形品牌记号。运营方联系/介绍/隐私/条款必须有真实资料及审核，不得为通过SEO检查填假页面。

2026-09-04 索引冲突补充：配置 FRONTEND_STATIC_DIR 的公开构建中，Prompt 自身 SEO 与同 revision compiler/surface 资格取更严格交集；不在已验证 sitemap 中的 Prompt 保持 noindex,nofollow，canonical/hreflang 仍保留 API 合同。禁止通过合并 sitemap 绕过 Internal Beta surface 限制；此修复不改变 CMS 或内容审核状态。

2026-09-04 模型页首屏追加裁定：用户再次指定 /proto/model-hero?v=3（用户称 Signature；本次源代码候选名 Ticker）作为 Browse by model 的模型及模型系列 L3 首屏。以该 URL 当前画面为准：四列交错漂移图墙、单行模型名/数量/版本链接、上移的输入面板。首屏后继续 Anthology 目录、筛选、全文、Creators、About 和 Footer；只有一个 H1、一个草稿输入框，保持原 sessionStorage 草稿与 URL 筛选历史。背景仅用当前模型集合素材，真实版本链接及按类型 L4 CTA 不变；不复制原型候选切换器、假生成地址或无效快捷键。无真实草稿生成合同的按钮仍禁用，不虚构生成。保留暂停动效、离屏/后台暂停、reduced-motion 和无 JS 主体。Task Findings、Style Plate、L1/L2/L4 不应用此首屏。

2026-09-04 Signature 截图定稿：以用户提供的 codex-clipboard-b007f254-406d-4ce2-a663-942faa241a85.png 为模型 L3 首屏视觉事实源，取代上一轮按 URL 解析的 Ticker 横排行。采用居中 92px 上限模型大标题、数量/版本/printed whole 事实行、Vincent Wu 与 Steve Li 两行 credit（各附手绘曲线）、半透明输入面板和面板下方版本链接。署名链接沿用已有用户提供的 https://x.com/VincentWu11 与 https://x.com/st3v3li；这是页面 credit，不替代每条 Prompt 的来源作者，也不添加作者结构化数据。继续仅应用模型及模型系列 L3，草稿/图墙/跳转/SEO 规则沿用；不带入截图底部原型候选切换器或无效快捷键。

2026-09-04 用户追加：公开站统一移除可见 Breadcrumb 面包屑（模型/模型系列、图片/视频 L2、L4、Blog 文章），同时移除空外层和专用占位。Header、页内目录、正文关系链接与 Footer 保留；SEO 的真实 BreadcrumbList 结构化数据不因可见导航删除而改写。原型参考文件作为历史母版保留。

2026-09-04 Signature 文案追加：两行手绘曲线中的署名替换为当前集合事实，第一行“{N} prompts”（单条用 prompt），第二行“{V} versions · full text”（单版本用 version）；具体模型无版本集合时显示“Full text, as published”。移除标题下独立统计行及该位置的署名 X 链接，两行改为非交互文字，不更改每条 Prompt 的作者署名。

2026-09-04 模型首屏 Generate 入口裁定：所有模型及模型系列 Signature 首屏的 Generate image / Generate video / Generate 统一使用真实链接 https://bo.ancher.ai/home，在新标签页打开；取消原禁用状态。此入口是导航，不携带草稿、Prompt 或变量参数，也不自动执行生成。单条 Prompt 的 L1–L3 → L4 路由与已定 L4 CTA 不受本次变更影响。

2026-09-04 模型列表 Generate 行为更新：模型及模型系列 L3 的每条 Generate 点击后，将该条完整 Prompt 原文（含换行和变量）写入首屏生成框并保存当前模型草稿，平滑回到输入框并聚焦；减少动态效果时立即定位。列表标题仍进入真实 L4，无 JS 或修饰键打开链接时继续使用真实 L4 href。首屏 Generate 仍打开 https://bo.ancher.ai/home，不向外部 URL 追加 Prompt。此行为取代模型列表 CTA 默认进入 L4 的旧约定；不恢复旧 Send to the scratchpad 文案。

2026-09-04 全站可编辑模板裁定：用户要求 Prompt 正文直接使用带方括号变量的可编辑模板，取代逐字展示作者原文的旧约定；不另设作者原文展示或切换入口。逐条选取主体、产品、地点、标题文字等有意义的可替换片段，使用简短 `[UPPER_SNAKE_CASE]`，已有明确变量保留。保持其余句法、JSON 键、相机参数、换行及生成逻辑；不能整段套进一个变量或把 JSON 数组当占位符。L1 预览、L2、模型/任务/风格 L3、L4 和模型生成框使用同一模板与变量定义，统一高亮；L4 同名变量全量替换、可重置，替换内容不递归解析为变量。移除“逐字原文/未经编辑”等冲突文案，来源作者和原帖继续保留。当前 localhost 的34条视觉样本模板在隔离 fixture 中实现，修改模板计入 fixture revision；公共 API/CMS 内容仍经 proposal 与人工审核发布，不把本地样本或模板 overlay 注入生产快照。

2026-09-04 Weight CTA 裁定：全站 Prompt L1–L4 采用 docs/wireframes/proto-login-cta.html 的 Weight 大数字设计，取消旧“浏览到45%立即弹遮罩”策略。自动触发必须有实际浏览行为、当前内容进度≥45%、页面可见停留30秒、停滚1.2秒，且没有编辑输入、文本选择或打开预览；先显示不抢焦点、不锁滚动的可关闭小提示。点击小提示或实际前往生成平台的 Generate 才展开 Weight 对话框；集合/详情导航及模型列表回填不被拦截。主动弹窗每会话最多一次，关闭后7天不自动提醒，前往平台后90天暂停；已关闭后的再次 Generate 直接沿原链接继续。2026-09-04 用户更新：所有弹出的 Weight 对话框中 Continue to bo 统一链接 https://bo.video/home，覆盖此前继承触发按钮href的约定；保留新标签语义，不自动提交提示词；无JS/修饰键继续真实导航。数字来自当前可见集合或生成框的实际文本，不把滚过当作已读、不虚构注册数/免费额度/登录状态。CTA 使用 Continue to bo，保留取消、Escape、背景点击、焦点恢复与减弱动效。自动化浏览器与真实用户使用同一触发逻辑，不通过 navigator.webdriver 隐藏功能。


2026-09-04 模型同级页统一：Nano 已确认的 Signature 图墙、两行手绘事实文案、唯一生成框、列表模板回填、变量高亮与 Weight CTA 同样适用于 Browse by model 的所有模型/模型系列落地页（包括 Seedance、GPT Image、Higgsfield、Kling、Veo 及具体版本）。共同使用 Anthology → AnthologyReader → ModelSignatureHero，不按 Nano slug 特判。数量、背景、版本和生成类型从当前模型真实集合派生；草稿按 locale + 模型/系列隔离，跨模型导航重置阅读计时、已加载类型和临时编辑状态，保留对应模型已保存草稿及其真实生成类型，刷新后不丢失 Generate image/video 语义。空集合不虚构媒体、数量或图像/视频类型。


2026-09-04 Signature 首屏文案润色：模型及模型系列两行手绘文案统一为“{N} prompts to build on”（单条用 prompt）与“Pick one. Make it yours.”，用明确的起点与操作意图替代 Full text, as published / Editable prompt templates 等说明文案。真实计数保留；版本仍由下方真实版本导航展示，不在手绘行重复。空集合显示“0 prompts”与“Explore another model.”，不虚构内容或承诺未来上架。手绘曲线、字号、布局及生成行为不变。此项取代之前两行统计/版本文案裁定。


2026-09-04 模型生成框占位符高亮：列表 Generate 回填到 Signature 生成框时，保留方括号变量的统一黄色文字/底色。使用原生 textarea 处理编辑、选区、输入法和草稿，配合同字体排版且 aria-hidden 的高亮层；同步滚动、尺寸和编辑值，不插入 HTML 到实际 Prompt，不改变空白或换行。高亮标记不能增加文字宽度导致光标错位，手动修改、粘贴与刷新后继续解析真实变量；强制颜色模式保留可读的原生输入。所有模型及模型系列共用实现。


2026-09-04 模型页底部相关推荐：所有模型及模型系列页将 About this model/model family 三张说明面板替换为 Related topics 真实缩略图导航。候选只来自当前模型 Prompt 已登记的 task/style/subject 关系，按当前模型关联 Prompt 数排序，按 immutable id 去重，最多6张。封面取该模型下该关系的真实预览；无预览不制造素材或说明卡。任务进入 Findings、风格进入 Plate、Subject 使用真实主题href；卡片数量取完整目标分类在catalog中的去重总数，与分类落地范围一致。标注Task/Style/Subject区分维度。沿用16:10缩略图、横向单排小卡片和窄屏横滑，少量卡片不拉伸；无候选则不渲染此区。Creators和Footer保留。


2026-09-04 L4 占位符选择题：Set the placeholders 中所有已定义变量统一采用原生单选选项，优先真实options与原值，再提供按变量语义编写的前端编辑建议；这些建议不是作者原文、模型官方参数或CMS内容，不写回数据源。保留Custom选项以输入自己的值，未选择时仍保留原占位符；切换建议与自定义不丢失本轮自定义输入，Reset清除选择与自定义值。选择/输入后同名变量在全文同步替换、保持黄色高亮、正确转义JSON且不递归替换。无语义的未知变量不造建议，保留原值（若有）与Custom；无变量页面维持真实空态。所有L4共用实现，原生radio支持键盘与屏幕阅读器，水合前禁用以免丢输入。


2026-09-04 Footer 空分类隐藏：全站Footer仅显示当前catalog中有真实Prompt的模型/系列、任务、风格、主题目标；以实际Prompt关系判断，不信任可能过期的Ref.count。模型系列按成员Prompt并集；真实有文本但无预览图的分类仍保留。Browse里的图片/视频入口按真实kind是否存在，All prompts/models/creators按实际对应内容是否存在；整列无有效项则隐藏。不删除分类registry、路由或内容，不用本页筛选结果代替全站catalog判断；此项取代此前Footer保留空分类链接的约定。


2026-09-04 同级页面全量一致性裁定：每类已确认设计/交互必须在该类型全部路由与locale中由共享组件生效，不以单个slug特判，也不把Task/Style/Model/Deck的不同已定母版互相覆盖。后续单页批注默认同步同类平行页面，数量、媒体和真实空态仍由各自集合决定。统一结构化文本统计使用isStructuredPrompt（不以变量开头冒充JSON）；媒体角标根据实际media.kind，混合集标Media；单条集合使用prompt。Task/Style真实空集合给有效Browse all prompts入口，与有内容但筛选无结果的Clear filters区分。全站Prompt创作者匹配优先真实creatorRef id/slug，仅无ref时按去@、trim、不区分大小写且非空handle回退，Creator卡片、头像与footer资格一致；不覆盖原帖来源链接。


2026-09-04 首页前两屏最终还原：用户指定 docs/wireframes/final/L1-hub-magnetic.html?v=2 的 Magnetic（vMagnet）为首页第一屏 argument 与第二屏 lede/results 的参考。第一屏恢复该原型的标题和三段正文，保留 not editing 的 serif 斜体；第二屏对齐其连续标题、搜索、筛选及磁吸动效；用户追加要求保留现有提示词悬浮卡片的样式、变量高亮和Generate按钮，不随原型回退。范围仅此前两屏；Browse、Creators、Footer、其他页面与当前真实数据不变。此前删除的署名区、signature统计句与Copy按钮不恢复；保留既定Generate到L4、可编辑模板、变量高亮、URL筛选、无障碍及bo.video弹窗行为。
