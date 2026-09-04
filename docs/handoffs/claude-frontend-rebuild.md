# Claude 前端重写 Handoff

日期：2026-09-04（Asia/Shanghai）  
项目：`/Users/ziye/Desktop/pseo`  
任务：重建 `frontend/`，一比一还原用户指定的新版设计、文案和 wireframe，并接入现有产品、数据与发布合同。  
本文件是本轮交接要求；本次只编写文档，尚未实施前端、修改内容或部署。

## 1. 先理解这次重写

用户已经反复调整过文案和 wireframe。**本次目标是忠实实现已选设计，不是再提一轮风格方案。** “优化 UI/UX”指把这套设计实现得完整、可用、响应迅速、无障碍、适合生产，不授权重新排版、改写文案或挑选其他候选方案。

- 主设计母版：[`specs/images/flow-proto-full.html`](../../specs/images/flow-proto-full.html)。这是包含五个页面的可运行 HTML，并非静态图片目录。
- 风格补充：[`linear-design-token-reference.md`](../../specs/images/linear-design-token-reference.md) 与 [`linear-design-tokens.css`](../../specs/images/linear-design-tokens.css)。它们是参考资料；冲突时以母版已选页面的实际表现为准。
- 默认按当前母版开工。用户稍后明确提供替代文件或指定新版时，只更新对应基线并记录差异；不要自行寻找“看起来更新”的探索稿替换它。
- 用户要求一比一的是布局、信息层级、组件形态、静态界面文案和交互意图。公开内容、数量、来源、许可与发布资格仍必须来自经批准的 CMS public snapshot。

### 1.1 权威文件与冲突裁决

| 事项 | 生效依据 |
| --- | --- |
| 本轮视觉、已选版式、模块顺序、静态文案 | 用户本轮要求 + 本文件锁定的 `specs/images/flow-proto-full.html` |
| 产品任务、真实路由、搜索语义、SEO、多语言与无障碍 | [`0008-prd.md`](../../specs/0008-prd.md)、[`0009-pseo-tech-arch.md`](../../specs/0009-pseo-tech-arch.md) 中未被本轮视觉要求取代的合同 |
| 内容事实源、审核、snapshot、mirror、上线证据 | [`0011-promptlab-youmind-cms-publication.md`](../../specs/0011-promptlab-youmind-cms-publication.md)，优先于所有旧 Git-first 描述 |
| 已实现 HTTP 请求/响应 | [`backend/openapi/openapi.json`](../../backend/openapi/openapi.json)、实际 router/schema 与合同测试；spec 中存在但代码没有的端点须标为缺口 |
| 编辑权限与并发纪律 | 根 [`AGENTS.md`](../../AGENTS.md)、[`CLAUDE.md`](../../CLAUDE.md)；目标目录存在新规则时也必须读取 |

旧文档的业务要求不能被一句“遵循新视觉”整体抹掉。冲突按事项处理：已选版式覆盖旧版式；公开资格、数据真实性、来源证据、locale 和安全边界继续生效。需要给这些必需能力补视觉位置时，使用母版的组件语言，记录补充位置，不自行恢复旧大模块。

以下旧口径**不再指导本轮实现**：

- `docs/handoffs/claude-frontend-mvp.md` 的“非 pixel-perfect”、Bauhaus、只用 fixture、不接 API。
- `claude-frontend-mvp-result.md` 的旧阶段排除项、测试数量和构建结果；它们不能证明重写后可用。
- `claude-visual-spec-proposal.md` 的 neutral/Bauhaus 主题切换及 `NEXT_PUBLIC_THEME=bauhaus`。
- `claude-l4-scope-ruling.md` 对旧 fixture 作出的“永久删除使用步骤”等裁定。本轮 L4 已明确选择 Recipe 四步布局。
- PRD §14.2 和历史前端规则中的红蓝黄、Outfit、硬阴影，以及旧 `0010`/`0008-bo-pseo-ui.md` 路径。
- `docs/wireframes/proto-*.html`、`full-proto-copy-polish.html`、`prompt-library-proto.html` 的其他候选方向；`prompt-titles-proposed.md` 也不是 CMS 已批准的内容。

开始实现时，先在本轮工程变更中同步 PRD §14、Tech Arch 的前端视觉引用，并重建 `frontend/AGENTS.md` / `frontend/CLAUDE.md` 的有效入口，使它们指向本母版与当前 CMS-first 合同。只做必要的引用与冲突修正；涉及多人正在编辑的文件，先协调，不重写整个 spec。

## 2. 精确锁定设计基线

### 2.1 当前文件指纹

以下为交接时实际读取到的 SHA-256，记录的是文件字节，不是 CMS 内容 revision：

| 文件 | 字节数 | SHA-256 |
| --- | ---: | --- |
| `specs/images/flow-proto-full.html` | 840549 | `7bc354e93c6399533b48a1bf6681d92a0e895f4b40af486c9b45029292e4256c` |
| `specs/images/linear-design-token-reference.md` | 30012 | `82594169a778ed5920739b9652190e57d2976c76503b14c16f2ad4b3472709bf` |
| `specs/images/linear-design-tokens.css` | 11550 | `52788e2aebe5599eaba990b5132198fa592557fb77e2e982f40aa8fa4fd3a53b` |
| `backend/openapi/openapi.json` | 78808 | `9b6c45ed8eeb61a57cfd4a5c076bbb75b096ca073cad8565e88da4667bce8940` |

开工记录当前文件指纹。指纹不同意味着需要核对新版内容，不能忽略变更，也不能自动恢复本表的旧字节。

母版把内页存放在 `const PAGES` JSON 字符串中，一行非常长。用 JSON parser 解包到临时目录，再读取各内页的 CSS、函数、文案和最终 `paint`；不要用全文 `eval` 提取，不要对母版做正则批量替换。必须实际在浏览器查看五个内页，不能只读前几行 token 就开始编码。

### 2.2 已经选好的页面

最终 `paint` 才是选中状态。母版仍保留大量未被执行的候选函数；它们不是待实现功能清单。

| Page key / 原型 hash | 已选方案 | 最终入口 | 生产路由 |
| --- | --- | --- | --- |
| `l1` / `#/l1` | Quotations | `variants[2]` → `vQuotes` | `/{locale}/prompts` |
| `l2` / `#/l2` | Deck · Images | `variants[2]` → `v4` | `/{locale}/prompts/image` |
| `l2v` / `#/l2v` | Deck · Videos | `variants[2]` → `v4` | `/{locale}/prompts/video` |
| `l3` / `#/l3` | Anthology | `variants[2]` → `v4` | `/{locale}/prompts/models/{modelSlug}` |
| `l4` / `#/l4` | Recipe | `variants[1]` → `v3` | `/{locale}/prompts/{promptSlug}` |

五个入口的注释均注明 `promoted 2026-09-04`。不要因 variant 名称的序号与数组下标不同而选错页面。

### 2.3 一比一的具体含义

1. 保留内容宽度、留白、段落宽度、字号/字重/行高/字距、标题换行、网格、图片比例与裁切、边框、圆角、层次和动效节奏。
2. 保留已选页面的差异：L1 引用式阅读、L2 单张突出卡组、L3 全文选集、L4 编号步骤。共享组件不得把四者统一成普通卡片网格。
3. 静态界面文案逐字提取，保留大小写、标点、强调、按钮标签和段落顺序。不要“润色”、概括或补营销口号。将文案集中管理，并保留源页面/区块到 copy key 的对照。
4. 优先实现母版已有的排版与 token，再抽取语义变量；不要先套组件库默认皮肤，再称为“Linear 风格”。
5. 当前母版使用 `light-dark()`，部分内页另有 `data-theme="linear-dark"` 样式；没有默认启用该属性。交接时浏览器默认浅色呈现。**不能因为参考文件介绍 Linear 深色站，就擅自把全部页面改成默认深色。** 按母版实际支持的主题与系统条件验证，若用户后来指定默认主题则更新基线；不新增母版不存在的主题选择 UI。
6. 字体以各已选页面实际 CSS/渲染为准，尤其 L1/L3 的 serif 标题。不要统一换成 Outfit，也不要因参考文件列出商业字体就默认有字体文件授权。缺字体/素材时记录具体差异。
7. 响应式沿用母版已有断点。没有覆盖到的窄屏，用同一层级和组件收纳规则补全，保持段落顺序与全部有效链接。
8. 只复制原型的设计语义；iframe、`srcdoc`、hash 页面路由、直接注入整页 HTML、候选切换器不进入生产架构。

## 3. 页面与交互实现要求

| 页面 | 必须保留的结构与动作 |
| --- | --- |
| L1 Quotations | `Somebody already wrote this` 大标题与原版论述段落；`The library` → `Everything, in the order it gets copied`；搜索与四轴筛选；以 Prompt 引用为主、缩略图在侧的列表；JSON 保留 raw 排版；`Read it all` / `Show less`、全文 Copy；category → task → model → style → Creators → `Take a prompt and start` → 完整 footer。 |
| L2 Images / Videos Deck | 面包屑、对应类型 Hero、搜索、`Narrow the deck`、Use case / Style / Subject、`Editor's pick` 卡组、Browse by model / tag 与 footer。一次突出一张卡，图片与可读 Prompt 相邻；Previous/Next、位置反馈、聚焦卡组后的左右方向键、首尾禁用、非当前卡不进入 Tab 顺序。筛选改变后回到首张并播报结果。保留真实详情与模型入口。 |
| L3 Anthology | 动态模型标题；标题/字符数目录；Use case / Style / Variables / Subject；`Prose prompts` 与 `Structured JSON prompts` 分组并展示全文；Copy / Send to the scratchpad / Full prompt / View on X / Back to the index；文末 `Write your own` scratchpad、Creators、About this model、footer。目录和正文必须从同一分组后有序集合生成编号。 |
| L4 Recipe | 标题、署名；`01 See what it makes` → `02 Set the placeholders` → `03 Take the text` → `04 Run it`。保留无媒体、无变量的诚实说明；变量替换同步到所有同名位置，保留原文，Copy 使用当前解析后的全文。不要加入未选中的 Playground 全文编辑器或 Sheet 抽屉。来源/权利/证据和关系链接按真实合同补到相应步骤或页尾。 |

### 3.1 文案与数据分开处理

| 类型 | 处理方式 |
| --- | --- |
| 页面结构性文案，如 `Somebody already wrote this`、`Take the text`、`Write your own` | 按母版逐字实现；必要的中文界面译文单独管理，不用英文内容冒充中文完成。 |
| Prompt 标题、正文、模型说明、作者、时间、媒体、变量候选值 | 视觉验收使用隔离的母版 fixture；公开页面使用批准 snapshot 的对应字段。新版原型标题不等于 CMS 已审核标题，不写入 `content/**`。 |
| 总数、最短/最长字符数、likes/saves、Popular、Editor's pick、排序声明 | 从同一真实数据版本计算或采用有来源的编辑/排序字段。`null` 不变成 `0`，列表样本长度不变成全库总数。缺依据时列明内容缺口。 |
| `Free to copy`、`every one credited`、`every one links to its source`、`in the order it gets copied` 等事实性承诺 | 保留为设计 copy 基线，同时逐条核对生产依据。不能用原型文字替代许可/来源/复制排名证据；不自行改写已定稿文案掩盖冲突。把原句、缺少的依据与受影响位置交给内容 owner 处理。 |

双轨验收：**相同 fixture 验证视觉一比一；真实 public snapshot 验证生产数据与发布资格。** 后者内容少于原型时应呈现真实结果，不把 35 条未审核样本带进生产凑版面。局部草稿编辑只留在浏览器，不反向改 CMS 原文；界面应区分原文、变量已填和用户编辑稿。

### 3.2 已发现、必须修复的原型缺陷

这些是生产实现修复项，不需要重新选择设计方向，也不得回头修改母版来降低验收标准：

- 所有内页把 clipboard rejection / 无 clipboard 也当作 `Copied`。只有写入成功才显示成功；失败提供可选择全文的手工复制回退，并用 live region 反馈。
- L2 Videos **数据已按 `kind === "video"` 过滤**，但 eyebrow、面包屑、导航 active、搜索 placeholder、count、empty 和 aria-label 仍残留 Image。统一纠正类型语义，保留其余文案和 Deck 版式，将改动列入差异清单。
- L2 Images 原型用 `kind !== "video"`，还包含一条未知类型样本；生产按 `contentType=image` 查询，不把 unknown/text 内容塞进图片分类。
- L3 的筛选/清空/发送到 scratchpad 仍引用已删除的 `mount(current)`。用实际 React 状态实现；筛选不得抹掉用户已输入的 scratchpad 草稿。
- L3 TOC 与正文分别排序导致编号不一致；统一排序来源。`All 14`、303、3990 等是样本值，改为数据驱动。
- L4 初次 Recipe 可以渲染；出错引用位于 `Showing` 用例切换。`Showing`、`the baseline is fixed to the first record` 是测试控件，只留在视觉验收工具中，不作为产品 UI。
- L4 填变量后仍显示 `Word for word, as published.`，与当前文本不一致。保留未改原文并准确呈现填值状态，差异要记录。
- 原型有大量 `href="#"`、无 handler 按钮和拦截全部链接的逻辑。真实导航用 `Link`/`a` 和合同中的 href；页内目录才用锚点。卡片标题或 `Full prompt` 必须能到真实 L4。
- `Generate in bo` 只能接合同已提供且有效的 `actions.tryUrl` / 已确认跳转。缺少地址时呈现明确不可用状态，保留 Copy，不伪造生成进度或结果。
- L3 scratchpad 是本地编辑与复制能力，不是 AI 生成服务。L4 的示例变量选项也不自动成为作者提供的 CMS 数据。

## 4. 范围与工程边界

### 4.1 当前仓库状态

交接时 `frontend/` 是空目录；Git 中大量原前端文件处于删除状态，且有既有暂存/未暂存混合变更。其他目录也有大量并发工程修改。本次交接没有删除、恢复或改写这些文件。

- 开工先看 `git status`，确认工作目录与分支，保留他人修改。工程分支默认 `codex/` 前缀，不直推主分支，不自动合并或部署。
- 不执行批量 `git restore`、`git reset --hard`、`git clean` 或从 HEAD 整包恢复前端。
- `git show HEAD:frontend/...` / `git show :frontend/...` 可只读参考旧接口与工具脚本；HEAD 里的 `frontend/AGENTS.md` 是过时的 Bauhaus/Git-first，不能恢复成现行规范。
- 新建前端应用、测试、适配器、有效规则和说明文档。默认实现所有权是 `frontend/**`，外加经协调的最小 spec 引用同步；不得越界补写 Backend/CMS 或内容 mirror。
- 脚本化删除后立即核对 `git diff --stat`。删改符号后检查调用方、旧值和注释；不要恢复仅测试消费的死 API。

### 4.2 本轮页面范围

第一组必须完成五个母版页面及完整 L1 → 图片/视频 L2 → L3 → L4 路径；同一模板按真实 locale、slug、model 和内容复用，不为每条 Prompt 手写页面。

整体产品还包含 PRD §11 / Tech Arch §7 的 Blog 列表、文章、分类，Prompt RSS、Blog RSS、sitemap、robots、404、语言不可用与错误状态。**新 Prompt 母版没有给 Blog 定稿，不能声称 Blog 也已经一比一。** 用已定 token/组件做派生设计，记录未提供基线；不能因旧 MVP 没做 Blog 就从范围中删掉。

公开路由包括 `/{locale}/blog`、`/{locale}/blog/{slug}`、`/{locale}/blog/category/{slug}`、`/{locale}/prompts/rss.xml`、`/{locale}/blog/rss.xml`、`/sitemap.xml` 和 `/robots.txt`。分类、合集、创作者等其他入口优先采用数据提供的真实 `href`；接口或路由资格缺失时记录缺口，不造 200 空详情页。

支持 `en`、`zh-CN` 的工程能力，但只生成 registry 启用、翻译审核 ready 且允许公开的 locale 内容。英文母版不能证明内容英文已就绪。全站 locale 切换必须导航到真实 URL，缺译文不得静默 fallback；Prompt 原文语言与页面 UI 语言分开。

### 4.3 技术基线

- Next.js App Router + React + strict TypeScript + Tailwind CSS / 模块 CSS，`pnpm`；锁定依赖，不顺便做全栈升级。历史 package 使用 Next `16.3.4`、React `19.2.8` 系列、Tailwind `4.3.3`、pnpm `11.7.0`，仅作为重建兼容性线索，安装时核对实际依赖与锁文件。
- 默认 Server Components；Client Components 仅用于复制、Deck 控制、变量、scratchpad、菜单和必要的筛选交互。共享动作槽传 `ReactNode`，不要用函数 prop 把服务端页面变成 client。
- 页面、DTO、领域模型、ViewModel 分离；集中 `src/lib/api/` 与内容 repository；组件不直接 `fetch`、调用 Payload SDK 或读取数据库。
- 外部响应先视为 `unknown`，运行时 schema 校验后映射；禁止 `any`、`@ts-ignore` 或 `as` 掩盖协议差异。
- Cloudflare Pages 采用 `output: "export"`；不引入 ISR、Draft Mode、Server Actions 或依赖 Next 运行时图片优化。图片使用明确尺寸及静态兼容 loader/unoptimized 策略。
- 不把框架版本、请求 ID、CMS revision、调试选择器等工程细节塞入普通用户浏览流程；状态证据放工程报告或受保护 Preview。

## 5. 数据接入：三种来源不能混用

### 5.1 正式内容路径

```text
CMS draft/proposal
  → schema + 人工 editorial / translation / rights approval
  → immutable public snapshot
  → 专用 Bot 生成、校验、CAS fast-forward Git mirror
  → 固定 snapshot revision / mirror commit / manifest 构建前端
  → 部署与 smoke receipt
```

CMS 是 canonical；Git 是生成镜像。前端消费与该 immutable snapshot 一致的已校验公共读模型，运行时不直连 CMS DB，也不依赖 CMS 在线来补全首屏。

| 来源 | 用途 | 限制 |
| --- | --- | --- |
| 母版视觉 fixture | 本地/受保护视觉验收，复现相同内容与状态 | 显式隔离、noindex；不能被正式构建自动选中，不能进入生产 HTML、RSS、sitemap、JSON-LD 或公开数据包。 |
| approved snapshot / 已校验 generated mirror 对应公共读模型 | 正式静态构建与公开读取 | 固定版本与 manifest；schema/权利/完整性不通过则构建失败，不 fallback 到 fixture。 |
| CMS draft Preview | 编辑者受保护预览 | 独立 server-only adapter、私有凭据、no-store、noindex；不同部署/构建模式，不接入公开 export。 |

参考现有合同：`schemas/content.schema.json`、`schemas/article.schema.json`、`schemas/taxonomy.schema.json`、`content/README.md`、`infra/lib/content-pipeline.mjs`、`backend/src/pseo/adapters/git_catalog.py`。它们是校验/编译/映射依据，不授权前端直接编辑 `content/**`，也不能把某个本地 fixture 文件当作已发布 snapshot。

### 5.2 实际已实现的 public API

从 `backend/openapi/openapi.json` 生成 TypeScript typed client，并核对 `backend/src/pseo/api/v1/router.py`、`backend/src/pseo/api/schemas.py`、`backend/tests/contract/test_public_api.py`。compiler JSON 与 Preview 各用独立运行时 schema 和显式 mapper，不强转为 public DTO，也不另写一套手工 HTTP 接口类型。以下为本地已实现端点；本次未验证线上 Backend/API 部署。

| GET | 参数/用途 |
| --- | --- |
| `/api/v1/locales` | locale registry |
| `/api/v1/home` | `locale`；stats、featured、trending、browse、collections、creators |
| `/api/v1/prompts` | `locale`、`q`、`contentType`、`model`、`useCase`、`technique`、`style`、`subject`、`creator`、`window`、`sort`、`cursor`、`limit` |
| `/api/v1/prompts/{slug}` | `locale`；完整详情、正文、来源、关系、SEO、actions |
| `/api/v1/facets` | `locale` + 搜索/filter/window；不透传 sort/cursor/limit |
| `/api/v1/models/{slug}` | `locale`、`cursor`、`limit`、`sort` |
| `/api/v1/categories/{axis}/{slug}` | 同上；axis 为 `content-type/use-case/technique/style/subject` |
| `/healthz` | 健康状态；注意没有 `/api/v1` 前缀 |

必须准确处理：

- 内容请求显式传 locale；公共 API 匿名只读，不能给普通浏览加 CMS 登录依赖。
- 筛选同轴 OR、跨轴 AND、q 与筛选 AND；多选轴以重复 query 表达。`q` 最长 200；`limit` 默认 24、范围 1–50。
- `sort=relevance|trending|value|newest`；列表默认 relevance，model/category 默认 value。`window=7d|30d|all`，默认 all。排序名不能被自行解释为真实复制次数。
- 未知 query 返回 `400 INVALID_QUERY`。Deck 位置、scratchpad 等 UI 状态不能原样透传 API。
- cursor 为 opaque，绑定 query 和 snapshot revision；筛选/排序变化清 cursor，不能解码或自行拼接下一页。
- 列表为 `{data, page:{nextCursor,hasMore,limit,total}, facets, meta}`；详情/home/projection 为 `{data,meta}`。`meta` 含 requestId、contentRevision、indexVersion、rankingVersion；不要把它与单条详情 revision 混淆。
- `PromptSummary.promptPreview` 是截断文本。L1 展开/Copy、L2 全文卡、L3 Anthology 必须取得对应 detail 的 `prompt.text`，不能复制或打印 preview 冒充全文；遵守 `actions.canCopy` 与 `actions.tryUrl`。复制保留原文换行与空白，除明确的变量替换外不做 trim、改写或 JSON 重新序列化。
- media 为 `{assetId,type,url,width,height,alt,posterUrl}`。缺指标为 `null`，缺集合为 `[]`，末页 `nextCursor=null`。失败不能吞成空数组。
- 错误是 `application/problem+json`：按稳定 `code` 区分 INVALID_QUERY、RESOURCE_NOT_FOUND、LOCALE_VARIANT_NOT_FOUND、CONTENT_GONE，以及 429/503。语言候选在 `errors[].meta.localeVariants`；不要解析自由文本 detail。
- GET 支持 ETag/304、`X-Content-Revision`、`X-Request-ID`；错误不缓存成成功。410/限流等合同状态不等于其线上链路已经验收。

### 5.3 接口缺口与可执行接入顺序

1. 当前 `frontend/` 已空，没有可宣称“保留现有”的 client。先重建 schema、映射与 repository，用隔离 fixture 验证五页。
2. 正式构建优先对接现有已校验 mirror 的公共投影链；核对 compiler 输出与 backend adapter，再实现前端只读映射。若通过本地/受控 public API 获取构建数据，列表遍历和详情请求必须固定同一 revision，限并发、去重；中途 revision 漂移则失败重试完整构建，不混用版本。
3. L1/L2/L3 需要全文而 list DTO 只有 preview：可在构建阶段按详情合同取得全文并生成前端所需的已批准静态读模型。不能用客户端请求补全可索引正文；数据规模超出构建预算时报告批量投影需求，由后端 owner 扩展合同，不偷偷截断 Anthology。
4. 以下 API **只有设计、尚无实际 router/OpenAPI 实现**：collections detail、creators detail、articles list/detail、article-categories detail、search suggestions。记录每项所需字段、路由、状态与验收；不要在客户端虚构 endpoint。
5. Article schema 与 compiler 已存在，不等于 Article HTTP API 已实现。Blog 可对接同一 approved snapshot 的既有 Article 编译产物，前提是实际产物与映射已验证；否则完成前端派生设计/状态并明确标为等待数据接入，不声称 Blog 已上线。
6. model/category endpoint 不接收全部交互筛选参数。组合筛选通过 `/prompts` 与 `/facets`，附对应 model/contentType 约束；实体描述从 model/category projection 获取。

具体静态接缝：`infra/lib/content-pipeline.mjs` 的 `buildStaticContent()` 输出 `infra/generated/static/build-manifest.json`、`route-manifest.json`、`{locale}/prompts/index.json` 和 `{locale}/taxonomies/index.json`。校验文件 hash、两份 manifest 的 contentRevision、locale 与路由成员，并记录 exact mirror SHA，不能只相信目录名。

**compiler index 不是 HTTP DTO**：当前 compiler 的 `indexRecord()` 把全文放在名为 `promptPreview` 的字段里，但缺少变量/actions/outcome/SEO 等完整详情。这不改变 HTTP `PromptSummary` 的截断语义。完整静态模型可在构建阶段从固定、已校验 mirror 的 `content/prompts/{artifactId}/{locale}.md` 读取 JSON frontmatter，经 schema 校验后显式映射；也可走上面的同 revision list → detail 路径。两者均只读，不能回写镜像。

Blog 现有产物为 `{locale}/articles/index.json`、`{locale}/articles/by-slug/{slug}.json`、`{locale}/article-categories/{slug}.json`；详情是直接对象，分类含 entity/items/page/schemaVersion，都不是 HTTP envelope。没有公开 Article 时不得生成虚构文章页。compiler 已生成 RSS/sitemap/robots，可复用同 revision 产物并验证与 Next 输出一致，避免另造资格规则。`infra/lib/preview-package.mjs` 合并前端与 compiler 产物并加 noindex，属于 Preview 打包，不是正式发布证明。

### 5.4 静态 export 与 URL 状态

所有公开页用真实路径和 `generateStaticParams` / 构建路由 manifest 生成。URL builder 与 locale 配置唯一，首页、分类、模型、详情的 H1、主体、来源和核心链接必须在返回 HTML 中。

搜索、筛选、排序、窗口、分页写入可分享、可刷新的 URL。**`output: export` 不提供按任意 query 动态服务端渲染的能力。** 前端必须明确使用同一批准数据版本的静态索引增强，或已部署匿名 public API 的交互增强；不能照搬需要运行时 `searchParams`、SSR 或 API route 的方案。无 JS 时仍有可读主体和真实分类/详情链接。

分页提供真实可抓取链接；静态页码到 opaque cursor / snapshot 的映射在构建数据层处理，不能假设 cursor 是页码。普通参数筛选 canonical 到无 query 主投影；仅 qualification 通过的组合获得独立静态可索引 URL。SEO 所需 noindex/headers 必须在最终静态产物/部署规则中验证，不能仅靠 hydration 后修改 meta。

### 5.5 CMS Preview 与 snapshot exporter

- `GET /api/internal/v1/preview-catalog?locale=zh-CN`：见 `cms/src/endpoints/previewCatalog.ts`、`cms/src/preview/types.ts`。这是独立 Preview DTO，字段如 `promptText`、`media.src`、`contentType=image|video|unknown`，不是 public DTO。
- 当前 Preview 投影专用于 35 条 wireframe 记录，包含预期的 taxonomy/creator/model/collection 集合，并排除黄金 text Prompt；不能作为通用 CMS 预览能力承诺。仓库记录线上 Preview 默认关闭。
- Preview 凭据只在 server-only/host 层；disabled/auth/locale 错误分别处理；私有 no-store/noindex，失败不 fallback 到样本。密钥不进入 `NEXT_PUBLIC_*`、URL、日志或 bundle。
- `GET /api/internal/v1/public-snapshot`：见 `cms/src/endpoints/publicSnapshot.ts`、`cms/src/snapshot/types.ts`。这是专用 mirror worker 消费的 files/base64/manifest envelope，不是给页面调用的 catalog API。前端不要获取 snapshot Bearer 或承担 mirror/exporter 职责。
- 本轮不自动启用 Preview、不修改 CMS 发布/权利状态、不部署服务或修改 Cloudflare/Access/DNS。

## 6. SEO、可用性与真实性验收

- `en` / `zh-CN` 的 `lang`、title、description、canonical、OG/Twitter 与可见内容一致；hreflang 只指向真实 ready locale，使用 `localeVariants[].href`，不猜 slug。
- JSON-LD、BreadcrumbList、Article schema、RSS、sitemap 与同一 snapshot 一致；draft、preview、takedown、缺翻译、错误页不得被当成可索引内容。
- 真实 404 与内容/locale 缺失分开处理；schema 失败、超时、限流、数据不可用提供适当错误/重试，不出现“故障后空库成功”。
- loading、empty、no-results、error、retry、stale/unavailable、媒体失败、复制失败、Preview denied 都有清晰状态。无图保留合理占位/文案，布局不坍塌。
- WCAG 2.2 AA：语义 header/nav/main/footer、skip link、每页唯一 H1、连续标题层级、持久 label、可见焦点、键盘可完成操作、状态 live region、必要触控目标至少 44×44 CSS px。
- 320px 与 200% zoom 无页面级横向滚动；长 Prompt/JSON/URL、Deck、目录、图片和底部动作不遮挡；移动菜单真实可用。
- 保留 footer 全部有效 IA 内链，不因排版给链接数量设人为上限；无资格或不存在的目标不能伪造。
- `prefers-reduced-motion` 下保留反馈但去除非必要位移/缩放/连续动画；图片明确宽高，首屏主图策略与其实际可见性一致。

## 7. 实施顺序与交付物

按以下顺序推进；已经明确选中的设计不需要再次询问用户选方案。

1. **基线与合同**：记录 Git 状态、母版/OpenAPI 指纹、五页最终入口；核对全部母版页面；提取静态 copy/token/组件/路由对照；整理本文冲突与接口缺口，同步必要规则引用。
2. **重建工程与公共骨架**：Next/strict TS/pnpm、静态构建、路由、locale、token、语义布局、基础状态；建立 fixture 与 public-snapshot 模式的强隔离。
3. **还原五页**：先把一组固定数据下五页的完整页面做对，再实现 Deck、展开/复制、变量、scratchpad、菜单/筛选/历史恢复；不只交首页 hero。
4. **真实数据与 SEO**：接公共投影与全文、来源/权利/关系，完成 locale 与静态 metadata/RSS/sitemap/404；实现 Blog 派生页面，逐项报告未完成的外部合同。
5. **验证与工程交付**：修复截图差异和功能缺陷，提供可运行命令、测试结果、截图证据、接口缺口与发布状态。工程交付走可审查分支/PR；内容与生产发布遵守既有授权边界。

建议交付在 `frontend/evidence/`（或项目统一 evidence 目录）：

- `reference-manifest.json`：母版 hash、page key、variant、viewport、主题、DPR、浏览器/字体条件与 fixture revision。
- `copy-map.md`：原型区块 → 静态 copy key → 实现位置；动态模板的字段来源。
- `visual-review.md`：每页/状态参考图、实现图、叠加/diff 图、差异原因与处理结果。
- `contract-gaps.md`：未实现 API、缺失内容/译文/跳转、事实性文案冲突、owner 与验收方式。
- `test-run.md`：实际命令、退出结果、失败/未运行原因；区分 fixture 与正式数据模式。

这些文件在本次 handoff 编写时尚未创建，是 Claude 的实现交付要求。

### 7.1 一比一验收方法

- 同 viewport、主题、DPR、字体加载状态、fixture、筛选与 Deck 位置分别截图；至少覆盖 1440、1024、768、375/360、320 宽度。参考图和实现图使用相同高度与滚动位置。
- 五页都比较首屏、主体和页尾；另外覆盖 L1 展开/筛选，L2 前中末卡和空结果，L3 分组/目录/scratchpad，L4 变量/无变量/长文/无媒体。
- 比较实际渲染的选中 variant，不把测试导航条、L4 样本选择器或隐藏候选 DOM 当产品目标；从对比裁切或单独记录这些 harness 元素。
- 静态文案逐字比对，只允许显式参数化的数据值、已列出的类型语义/真实性修复及已说明的 locale 译文差异。
- 叠加图检查页面宽度、对齐、换行、段落密度、媒体比例、组件尺寸与层级。差异逐项归因；不得只报一个相似度百分比，也不得只用“感觉像”验收。
- 除字体抗锯齿、不可控媒体与本文列明的修复外，不允许未解释的可见差异。外部图片加载失败要记录，不能拿空白参考图证明还原成功。
- 原型缺少的 Blog、错误态、补充来源证据位置单独标“派生实现”，接受业务/交互/同体系视觉验收，不伪称已有一比一基线。

### 7.2 必须执行的工程验证

在重建后的 `frontend/` 提供并执行：

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
pnpm check:static
```

覆盖实际风险：DTO/schema 与映射、locale/URL/cursor、全文复制成功与拒绝、变量替换、前进后退、视频分类、Deck 键盘与焦点、Anthology TOC/草稿保留、404/缺译文/错误、metadata/公开资格、fixture 不进入正式构建。测试应验证用户行为与边界，不只验证实现常量。

执行 axe 与人工键盘走查；抽查禁用 JS 后的五页主体与链接；按 PRD 记录移动 Lighthouse Performance/Accessibility/SEO ≥90、CLS <0.1 的结果和环境。视觉截图也必须审阅，不把“截图命令成功”视为视觉通过。

根目录要求的镜像/compiler 合同门禁：

```bash
node infra/bin/content.mjs validate
node infra/bin/content.mjs build --output infra/generated/static
node --test infra/tests/*.test.mjs
```

这些检查不批准内容公开。不调用旧 content-PR runner 发布内容，不读取或输出 `.env`/secret。任何未运行或失败的检查必须原样报告，不能引用旧测试报告代替本轮执行。

## 8. 当前交接证据与未完成项

本次已做：读取现行 spec/规则、设计文件、public OpenAPI/router/schema、CMS Preview/snapshot 合同与历史发布记录；只读解包母版五页；在浏览器查看 L1/L2 Images/L3/L4 的默认画面，检查 L4 首次渲染未记录到 console error；静态核对 L2 Videos 的选中方案与 video 数据过滤。没有完成五页全交互、全视口或暗色验收。

本次未做：重建前端、运行前端测试/build、调用线上 API、重新 smoke 线上、提交 CMS proposal、审核内容、更新 mirror 或部署。本文件里的验收清单是待执行要求，不是已通过报告。

仓库 `0011` / 最新 checkpoint 记录过：黄金 Prompt 的人工 approval、一次成功 mirror run、固定 mirror 的受 Access 保护 Pages Internal Beta Preview `a4cb721c`。35 条 wireframe/X seed 仍为 `review_required`；正式 signed deployment callback、持久化 deployment/smoke receipt 与 CMS `released` 投影仍不完整。上述是仓库历史记录，本次没有重新线上验证；不能称为本轮或正式 production released。

Claude 结束时分别报告：工程完成情况、视觉还原证据、实际数据来源及 revision、未接接口/未批准内容、测试结果，以及 CMS public / mirror synced / deployment / smoke 各自状态。存在接口或内容缺口时准确说清已完成范围，继续完成不受阻的前端工作，不把样本渲染成功说成整体产品上线。

## 9. 可直接交给 Claude 的启动指令

> 请在 `/Users/ziye/Desktop/pseo` 重写前端。先完整阅读 `docs/handoffs/claude-frontend-rebuild.md` 及其中列出的现行规范，再实施。用户要求一比一还原 `specs/images/flow-proto-full.html` 已选的五页及定稿文案：Quotations、Images/Video Deck、Anthology、Recipe；不要重新设计，不要恢复 Bauhaus，不要选择残留候选。先核对 Git 并保留现有删除和并发修改，重建前端工程。按 handoff 修复原型的交互缺陷，将视觉 fixture 与批准的生产 snapshot 隔离，严格对齐 OpenAPI、CMS-first、locale 与 SEO 合同。完成可运行实现、视觉对照与实际测试；接口/内容缺口明确记录，不伪造数据、权利或发布状态。新设计只有在用户明确指定替代版本时才更新基线。
