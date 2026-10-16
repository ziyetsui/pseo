# 按变现场景浏览：技术设计

状态：分类方向与 L1～L4 方案已于 2026-10-16 获用户确认；本书面设计待评审。本文不表示功能已实现或发布。

配套验收：[验收规范](./2026-10-16-monetization-views-acceptance.md)。检查时数据证据：[基线回执](./2026-10-16-monetization-baseline.json)。

## 1. 目标与已确认范围

在 beta 提示词网站新增独立的“按变现浏览”维度，从已有图片、视频、网站案例中发现商业用途；保留现有任务、模型、风格分类。同一案例允许映射到多个场景，不复制原正文、不新增虚构案例。

用户举例：AI 女装带货、电商广告（包括适用的海报设计）、电商网站、漫画情感图文、小红书带货图文、公众号封面。采用 8 个大类、40 个初始候选场景，按真实内容证据决定实际展示项目。首页增加卡片区，页脚增加第五列，完整目录同步更新。中文、英文分别提供完整界面。变现场景表示可用于何种交付，不宣称来源作者已靠该案例获得收入。

## 2. 现状、数据基线与代码基线

- 2026-10-16 读取 `https://beta.ancher.site/zh-CN/prompts`：首页显示 2,034 条提示词。
- 对应本地 beta 数据在 `/Users/ziye/Developer/ancher pseo release`，检查提交 `2e38b47`。其 `git-beta.ts` 合并原有 fixture、694 条图谱提示词及 1,306 条 Queenie 图片记录；Queenie 现有任务分组为文章封面 814、社交图文 416、梗图 76。
- 网站图谱另外包含 58 个 `website-case` 节点。现有 225 个网站入口包含提示词入口与项目案例，不能直接与 2,034 相加当成不同内容数。
- 文档承载仓库是用户指定的 `streamify-one/streamify-one-design-system-prompts`，文档分支从本地 `545c028` 创建。这个工程版本尚未包含全部 beta 数据，实施前必须同步并核验 beta 代码与数据；不得用旧 728 条目录替代当前 beta。
- 数据基线以实施时冻结的目录 revision、唯一 ID 集合、源文件 SHA256 和路由清单为准。本文数字是检查时观测值，不是未来目录的硬编码常量。
- 构建时读取仓库数据，浏览器使用静态投影；无需新增运行中的后端或 CMS。现有直接 Git-beta 授权适用，不修改 `content/**` mirror、CMS 状态或权利字段。

实施首先生成基线回执：提交 SHA、目录 revision、两语言 ID 集合、提示词/网站项目数量、源文件哈希和已有详情 URL。若两语言 ID 不一致或发布版本已漂移，先对齐，不继续使用旧映射。

## 3. 方案选择

1. 把变现词直接塞入任务 taxonomy：改动少，但会混淆“生成什么”与“交付给谁/用于什么商业用途”，并影响现有 API 与任务计数。
2. **推荐：独立的、可审计的变现视图投影。** 复用现有对象与图谱思路，新增大类、场景节点及成员关系；前端独立加载，不改变公共 API 的现有 `Axis` 合同。
3. 为每个场景复制内容与详情：会产生正文、署名和 URL 漂移，不采用。

只执行方案 2。当前范围首先服务 Git-beta；public-api 模式在没有同版本已批准投影时不展示此入口，不虚构后端端点，也不把 Git-beta 映射暗中混入 public snapshot。

## 4. 初始分类表

slug 与 ID 跨语言稳定；下列中文名称对应独立英文显示文案。每个场景只有一个大类父节点，内容可跨场景关联。候选不等于已发布分类。

| 大类 slug / 中文 / 英文 | 五个场景 slug / 中文 / 英文 |
| --- | --- |
| commerce / 电商带货 / E-commerce content | womenswear-selling / AI 女装带货 / AI womenswear content；virtual-try-on / 虚拟模特试穿 / Virtual model try-on；beauty-recommendations / 美妆种草 / Beauty recommendations；product-hero-images / 商品主图 / Product hero images；product-detail-images / 商品详情与卖点图 / Product detail visuals |
| advertising / 商业广告 / Commercial advertising | ecommerce-advertising / 电商广告海报 / E-commerce ad posters；brand-campaigns / 品牌宣传海报 / Brand campaign posters；promotional-campaigns / 促销活动图 / Promotional graphics；product-launches / 产品发布图 / Product launch visuals；product-ad-videos / 产品广告视频 / Product ad videos |
| creator-content / 自媒体运营 / Creator content | xiaohongshu-shopping / 小红书带货图文 / Xiaohongshu shopping posts；wechat-covers / 公众号封面 / WeChat article covers；short-video-covers / 短视频封面 / Short video covers；relationship-comics / 漫画情感图文 / Relationship comics；educational-posts / 知识科普图文 / Educational posts |
| local-business / 商家获客 / Local business marketing | restaurant-marketing / 餐饮菜单与活动图 / Restaurant menus and promotions；cafe-bakery-marketing / 咖啡烘焙宣传 / Cafe and bakery marketing；beauty-services / 美业宣传 / Beauty service marketing；fitness-enrollment / 健身招生 / Fitness enrollment；travel-marketing / 文旅推广 / Travel marketing |
| design-services / 品牌设计接单 / Brand design services | logo-design / 标志设计 / Logo design；brand-identity / 品牌视觉 / Brand identity；packaging-design / 产品包装 / Packaging design；commercial-brochures / 宣传画册 / Commercial brochures；commercial-illustration / 商业插画 / Commercial illustration |
| web-services / 网站开发接单 / Website development services | ecommerce-websites / 电商网站 / E-commerce websites；brand-websites / 品牌官网 / Brand websites；sales-landing-pages / 销售落地页 / Sales landing pages；portfolio-websites / 个人作品集 / Portfolio websites；interactive-product-showcases / 交互式产品展示 / Interactive product showcases |
| digital-products / 知识与数字产品 / Knowledge and digital products | course-sales / 课程销售页 / Course sales pages；learning-cards / 教学卡片 / Learning cards；explainers / 信息图解 / Visual explainers；digital-publications / 电子刊物 / Digital publications；lead-magnets / 引流资料与领取页 / Lead magnets and download pages |
| personalization / 个性化定制 / Personalized commissions | avatar-portraits / 头像写真 / Avatar portraits；couple-keepsakes / 情侣纪念插画 / Couple keepsake illustrations；pet-portraits / 宠物画像 / Pet portraits；greeting-cards / 节日贺卡 / Greeting cards；art-prints / 文创海报与印刷品 / Art posters and prints |

纳入边界：女装场景必须围绕服装展示、穿搭或销售素材；虚拟试穿还须明确换装/服饰替换目标。漫画情感须同时满足漫画/序列图与关系/情感表达。电商网站须有商品/商店目标，不能仅因使用 3D 或包含按钮而纳入。医疗处方、界面截图等不能凭“可售卖”猜测用途。

电商广告可以包含需要替换商品、标题、利益点的通用海报，须标记为需要改编。公众号封面可复用适合文章标题与封面的编辑设计，标记改编并说明版式调整；不得把“文章封面”现有大标签整体等同于公众号原生模板。小红书场景同理，社交截图或平台标志不足以证明适合带货。

## 5. 数据合同与关系

新增独立文件（实施时创建）：

- `frontend/src/data/monetization-taxonomy.json`：8 个 group、40 个候选 scenario 的版本化定义、稳定 ID/slug、双语名称与说明、纳入/排除规则、排序及精选资格。
- `frontend/src/data/monetization-membership.json`：内容到场景的显式关系；禁止运行时关键词猜测。
- `frontend/src/data/monetization-audit.json`：源 revision、所有已检查内容的结果，以及未映射/待审核原因。
- `frontend/src/lib/catalog/monetization.ts`：验证、别名归一、成员查询、去重计数、路由及反向关系。

节点类型：`monetization-group`、`monetization-scenario`。边类型：scenario `belongs_to` group；原有内容 `applicable_to` scenario。这些属于导航投影，不替换原图谱，也不新增内容节点副本。

每条成员边必须具备：`contentId`、`scenarioId`、`fit`（`direct` 或 `adaptable`）、`evidence`（字段路径、可定位的正文片段或媒体引用、理由）、`adaptationNotes`（双语；需要改编时非空）、`sourceRevision`。缺正向证据的结果进入审计而非成员边。记录不采用无法解释的置信度分数。

逐条检查完整正向生成目标、已有真实关系、标题/说明和必要时效果图。关键词只能筛候选；negative prompt、否定、背景道具、参考网址、来源营销语不能独立构成成员证据。对 Queenie 使用其已标识的参考图拆解文本与媒体，保留 reconstruction 身份，不宣称是原作者提示词。

审计每个逻辑内容恰有一个结论：已映射、无相关场景、待审核。只有已映射结论产生一条或多条有效边；另外两种必须有原因，不能为了覆盖率硬归类。

网站项目与所附提示词共用一个 `contentKey`：能解析已存在 `promptHref` 时归一为该 Prompt ID，否则使用 WebsiteCase ID。网站入口和 Prompt 入口均作为原有引用保留。聚合优先展示项目入口，其余引用可在关联区到达；所有场景成员边按 `contentKey + scenarioId` 唯一。无提示词项目仍可浏览来源/演示/代码，不出现伪造的生成按钮。

计数：场景为其唯一 contentKey 数，大类为全部子场景成员的集合并集，整个维度同理。direct/adaptable 分组互斥；同一逻辑内容在同场景的证据合并，确有直接证据时用 direct。不同场景重复是合法的，不能把子项数量相加当总数。模型或媒体筛选后按同一规则重新计算。

至少有 1 条通过核验的成员才生成场景页面和入口；大类至少有 1 个有效场景才展示。零成员候选留在审核清单，不加入页脚、目录或静态路由。无关旧内容的缺失归类不阻塞已有站点功能。

## 6. L1～L4 与路由

以下为 beta 逻辑路径。所有链接通过现有 namespace 方法生成；若接入正式 `/prompts` 基路径，仅由统一路径配置加前缀，组件不得硬编码域名。

| 层级 | 路径 | 展示与跳转 |
| --- | --- | --- |
| L1 首页 | `/{locale}/prompts#monetization` | 在现有按任务区后增加“按变现场景浏览”横向卡片区；最多 8 个非空大类；卡片进入 L2；提供完整目录链接 |
| L2 大类 | `/{locale}/prompts/monetization/{groupSlug}` | 复用 Deck 卡片语言；场景卡片显示代表图、说明和唯一案例数；进入对应 L3 |
| L3 场景 | `/{locale}/prompts/monetization/{groupSlug}/{scenarioSlug}` | 复用 Findings/选集组件的正文与媒体表达；分别标识直接适用/需要改编；支持内容类型与模型筛选、URL 保存及历史恢复；标题/卡片进入 L4 |
| L4 详情 | 现有 Prompt 或 WebsiteCase URL | 不复制详情路由；新增相关变现场景链接与适用/改编说明；完整正文、变量编辑、来源和生成行为沿用原合同 |

另设 `/{locale}/prompts/monetization` 完整维度目录，列出所有有效大类与场景；这是索引入口，不增加内容详情层。L3 不再生成跨模型×媒体×平台的独立组合页，筛选只使用可分享 query。未知 group、scenario 或错误父子组合返回真实 404。

L4 原路由有多种来源，不凭 URL 前缀推断内容类型。从 L3 进入后浏览器返回恢复原筛选和位置；独立打开 L4 仍有稳定的相关场景链接，不依赖 query 来构造唯一返回目标。

继承现有生成规则：生成/使用按钮传完整当前正文至 `https://app.ancher.ai/?prompts=...`；标题与卡片打开详情。不能把场景卡片、来源、语言切换变成生成链接。应用端超长网址 431 是已知独立依赖，不通过截断或复制正文规避。

## 7. 首页、页脚与完整目录

首页：复用当前横向卡片、箭头、触摸滚动与键盘行为，8 个大类最多展示 8 张卡。封面来自已纳入成员；无真实媒体时提供既有有界空态，不外抓或生成假案例效果图。

页脚顺序：浏览、按模型、按任务、按风格、按变现。保留前四列的现有精选规则，第五列最多 6 项：优先 AI 女装带货、电商广告海报、电商网站、漫画情感图文、公众号封面，再加“全部变现场景”。若精选场景为空，依稳定 taxonomy 排序用其他非空场景补位；不足 5 个不填充假入口。

桌面 1,440px 五列，窄屏先重排再两列，320/375px 不横向溢出；最后一列可独占末行。所有 L1～L4 与目录页共用同一导航数据。更新 `site/navigation.ts` 的 `libraryNavigation`、`footerNavigation`、`libraryIndex`，目录包括全部有效大类/场景与唯一 href。

## 8. 本地化、SEO、性能

- group/scenario ID 与 slug 跨语言一致；中文/英文标签、解释、改编说明、按钮、空态和 aria 文案完整。保留原记录的正文语言、已有翻译及来源说明。
- 语言切换到同大类/同场景，保留合法筛选及 hash；不跳回首页。
- 初始 HTML 含标题、分类说明、有效计数、代表内容、来源和真实链接；无 JavaScript 仍可沿 L1→L2→L3→L4 浏览。
- 延续 beta 的 noindex 与 sitemap 排除；不把“变现”视图视为收入证明或自动赋予索引资格。后续正式收录另行审核。
- 构建时生成/验证投影。客户端仅获得当前页交互所需字段；不把完整 2,034 条正文或所有映射塞进每一页。
- 沿用 Deck 仅当前及预览卡片加载媒体的策略。不得为新维度恢复全目录图片预加载。
- 静态导出新增文件数必须实测；沿用现有 Pages 文件校验及已验证路由代理，保持最多 20,000 文件。8 大类+40 场景+1 目录、两语言最多新增 98 个逻辑页面，实际数量取有效分类；每页附属文件会更多，不把 98 当作文件数。

## 9. 实施边界、发布与回滚

现有代码参考：`components/Browse.tsx`、`Chrome.tsx`、`LibraryIndex.tsx`、`Recipe.tsx`、`WebsiteCases.tsx`、`site/navigation.ts`、`lib/catalog/website-views.ts`、`website.ts`、路由生成与静态导出校验。新视图提供独立类型和查询函数，尽量复用呈现组件，不重构无关 UI/API。

书面设计确认后才编写实施计划。实施计划先解决 beta 与目标发布仓库的代码/数据基线对齐，再完成全量分类审计、投影验证、页面与导航、浏览器验收和发布回执。不得顺带合并无关工作区修改；使用任务分支，只提交任务文件。

部署 beta 与目标仓库合并分别记录：PR、提交、构建 revision、部署 ID、真实别名与线上检查。推送到 streamify 仓库不能自动声称 beta 已更新。正式 ancher.ai 接入仍按用户既有暂缓决定，不扩大部署范围。

回滚以任务提交及同版本分类投影为单位，恢复前一发布包；已有 Prompt/WebsiteCase URL、正文及来源在整个过程中保持可达。
