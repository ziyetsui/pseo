# 0009｜PSEO CMS-first + Git Public Mirror 技术架构

Status: Implementation-ready v1.2 (YouMind-style CMS publication)
Owner: BO
Last updated: 2026-09-04
Product contract: [0008-prd.md](./0008-prd.md)
Publication contract: [0011-promptlab-youmind-cms-publication.md](./0011-promptlab-youmind-cms-publication.md)
Visual contract: [frontend/AGENTS.md §7](../frontend/AGENTS.md#7-唯一视觉合同已选母版的-11-还原)；用户定稿母版 [flow-proto-full.html](./images/flow-proto-full.html)（2026-09-04）

> **Architecture supersession（2026-09-03）：** 0011 取代本文中所有 Git-first 内容发布条款，包括 Git `main` 作为内容事实源、Payload 只是草稿投影、每内容 branch/PR/merge、Agent 直接编辑 canonical `content/**`，以及 CMS/Backend 绝不直推镜像 `main`。未逐段删除的相关文字只保留为历史实现记录。当前规范是 Payload CMS canonical → revision-bound human approval → immutable export snapshot → deterministic mirror → 专用 bot direct fast-forward push `main` → exact-commit deploy/smoke。代码、schema、workflow、license 和 exporter 本身仍走 PR。

## 0. 结论先行

采用 **CMS-first、人工批准、确定性 Git 公开镜像、静态发布**：

~~~text
Source / X / RSS / URL
        ↓
Python Fetch + Normalize
        ↓
Candidate / Evidence / Taxonomy              自然语言内容请求
        ↓                                             ↓
Payload CMS draft ← Codex / Claude / SDK proposal（不写生成镜像）
        ↓ human editorial + rights approval bound to revisions
Immutable CMS export snapshot（canonical content authority）
        ↓
deterministic exporter + offline gates + manifest
        ↓
generated Markdown / JSON / README
        ↓ mirror bot compare-and-swap fast-forward push
GitHub mirror main（公开镜像，不是反向编辑入口）
        ↓ post-push verify
Cloudflare 正式站 + RSS + Sitemap
        ↓ exact commit + manifest deployment/smoke receipt
Payload release projection：mirrored / released / deploy_failed
~~~

关键边界：

1. Payload CMS 的版本化内容、来源和权利审核是唯一内容事实源；Git `main` 是可重建公开镜像。
2. Payload CMS 是 TypeScript/Node 系统，不是 Python 后端；单独放在 cms/。
3. Payload 保存 draft/approved revision、rights decision 和 mirror/release receipt；只有 reviewer/admin 能批准精确 revision。
4. Backend 负责采集、规范化、不可变 snapshot、确定性导出、校验、幂等与薄 API。
5. 前台首屏从已校验 mirror commit 静态生成；运行时不依赖 CMS 可用性，CMS 仍是下一版本权威。
6. 每个内容对象、每个 locale 一个 Markdown 文件，同时生成 YouMind 风格的多语言 README 和机器索引。
7. 公开构建禁止语言 fallback。某语言没有完整内容，就不生成该 URL、hreflang 或 sitemap 记录。
8. Codex/Claude Code 或受控 SDK 只生成 CMS draft proposal 和 review-ready diff；不编辑生成镜像、不批准 rights、不持有 mirror/deploy 权限。
9. Mirror bot 是唯一内容 direct-main 例外，只能提交完整、allowlisted、已校验 snapshot；人和 Agent 仍禁止 direct/force push。
10. CMS `approved`、mirror commit 与生产 `released` 分离；只有 exact commit/hash 部署和 smoke 成功才写 released。

这套方案保留 Git 的公开历史与可引用文件，但不制造 Git/Payload 双主：内容错误回到 CMS 修正，镜像禁止人工编辑；生成失败时继续服务 last-known-good release。

## 1. 当前仓库审查

### 1.1 已有资产

- specs/ 中已有 PSEO 第一性原理、X 采集、Prompt Artifact 和验收标准。
- specs/images/flow-proto-full.html 包含当前已选 L1 Quotations、L2 Images/Videos Deck、L3 Anthology、L4 Recipe；旧 docs/wireframes 原型只作历史参考。
- assets/raw/ 中已有可用快照：5,564 条候选、982 条 Prompt、99 条 high-like、99 条 high-value。
- frontend/AGENTS.md §7 定义母版 1:1 还原合同，Linear token 文件仅补充；旧 Bauhaus 视觉规则已被用户 2026-09-04 指令取代。

### 1.2 历史实现快照（2026-09-03，已被 0011 发布策略取代）

以下条目准确记录此前 Git-first/PublicationRequest PR proof，但不再定义当前内容发布架构。已有 PR #3/#4/#5 可保留为历史证据；后续实现以 CMS approved snapshot 与 direct-main mirror exporter 为准。

- 根目录已经初始化 Git；`frontend/`、`cms/`、`backend/`、`content/`、`schemas/` 和 `infra/` 均已有可执行代码或合同。
- 35 条 Prompt Artifact、35 条 locale variant、35 条 source evidence 与 66 条 taxonomy 已作为 wireframe seed 导入本地 Payload；CMS draft → server-only Preview adapter → 前端刷新链路已通过本地 E2E。这些 wireframe seed 仍为 `needs_review` / `rightsStatus: review_required`，不能发布。另有黄金 seed 新增 1 artifact / 1 `zh-CN` locale / 2 evidence / 5 taxonomy，因此 CMS 当前共有 36 条 Prompt Artifact。
- Cloudflare 初始基础设施 checkpoint：account `9e27095eb80b9e4ffd09d8b590759311` 的远端 D1 `pseo-cms-beta`（`aeec1c88-bc9c-4d6e-a4c2-9f8bda4f7a7b`）完成 migration/seed/readback 后为 36 Prompt、36 locale、37 source-evidence、71 taxonomy，foreign-key check clean；CMS Worker 首次以无 route 版本 `1a47e1f9…` 验证了 Free Workers 包体门禁。该历史 checkpoint 已由下一条线上 runtime 状态取代。
- 历史 D1 runtime checkpoint：CMS Worker `pseo-cms-beta` 版本 `18b56753-2204-4b31-b51d-313f132b1e07` 曾在 `workers.dev` 上线，最终 gzip 2589.06 KiB；Worker-level Access 覆盖生产与预览 URL，只允许已批准的 owner 邮箱。Pages `pseo-internal-beta-preview` 的 `internal-beta` branch deployment `c75633aa` 也已上线并受 owner-only Access 保护；分支别名与 immutable URL 的匿名请求都被 Access 拦截，生产根域仍为 404。owner 鉴权后的 Pages catalog/detail/404 与 CMS Admin 到 Payload 首用户初始化页当时通过线上 smoke。远程 D1 部署后读回为 36 / 36 / 37 / 71，foreign-key check clean。该 checkpoint 已被下文的 PostgreSQL/Hyperdrive runtime 与 1102 状态取代，不得据此认定当前 CMS、public mirror 或 production release 可用。
- 旧 GitHub-PR adapter 曾证明 CMS 可以生成 Git 对象和内容 PR，但该可执行路径已被废弃，不能作为回滚机制或隐藏开关保留在可部署运行时。公开 owner approval Issue [#1](https://github.com/ziyetsui/prompt-lab/issues/1) 和 PR [#2](https://github.com/ziyetsui/prompt-lab/pull/2)、[#3](https://github.com/ziyetsui/prompt-lab/pull/3)、[#4](https://github.com/ziyetsui/prompt-lab/pull/4)、[#5](https://github.com/ziyetsui/prompt-lab/pull/5) 只保留为历史审计；#3 是 **DO NOT MERGE**，#4/#5 不再构成当前发布顺序。任何旧 PR、CI、branch 或 SHA 都不证明 CMS public、镜像同步或生产 released。
- Prompt L1–L4 与独立 Article schema/author-category-tag taxonomy/Blog index-detail/RSS-Sitemap 内容编译合同已落地；3 条真实状态为 draft/noindex 的 Article fixture 不会进入公开投影，published fixture 用于合同测试。
- `.agents/skills/pseo-content-{create,edit,validate,pr}` 已改为 CMS proposal/review-package 语义；名称中的 `pr` 仅为兼容别名，不得创建内容 PR。新 Prompt/Article 默认 draft/noindex/review-required。
- `tools/content-agent/` 的旧 Markdown worktree runner 已退出内容发布路径并 fail closed：CLI 固定以 `CMS_PROPOSAL_ADAPTER_REQUIRED` 非零退出，`runContentAgent()` 在读取依赖、启动 SDK、创建 worktree 或写 artifact 前返回 `retired_workflow`。剩余模块只作历史安全研究。受限 create-Prompt CMS proposal endpoint、仅能调用该端点的 `agent_proposer` API 身份、不可变审计和 host client 已在本地实现；尚未部署到当前线上 Worker。edit/route 与自然语言/SDK orchestration 仍未实现。
- 独立公开仓库 <https://github.com/ziyetsui/prompt-lab> 已创建，但现有远端配置和旧 PR 不代表新的 generated-only mirror 已启用。上线必须先安装固定版本的 snapshot consumer、为专用 bot 配置 direct-main 例外，并验证普通人/Agent 仍不能直推或强推。

### 1.3 当前 CMS-first cutover 实现状态

- CMS 已有只读、默认关闭、Bearer-protected 的 `/internal/v1/public-snapshot` endpoint；producer 从精确 approval revision 生成闭合 envelope/manifest，并在 PostgreSQL 上使用一个 repeatable-read、read-only transaction 完成分页读取。
- 当前 Cloudflare runtime 已使用 Neon PostgreSQL + Hyperdrive；production Worker 的数据库 binding 只有 `HYPERDRIVE`。Payload adapter 可以跨请求缓存，但底层 `pg.Pool` 由 Worker 入口和共享 `AsyncLocalStorage` scope 代理成 request-scoped pool，并在 response body 与传递式 `waitUntil` 完成后释放引用；snapshot 仍以 repeatable-read、read-only transaction 读取。D1 只保留为已验证的回滚 version，不是当前流量的数据源。
- `prompt-lab-template` 已有严格 snapshot consumer、完整生成树替换、manifest/file hash/rights/path/secret/HTML 门禁，以及 expected-main-SHA CAS 的普通 fast-forward workflow；本地合同测试不等于该 workflow 已安装或获得线上写权限。
- 空 Prompt snapshot 是合法 removal projection：它删除最后一条 Prompt 与无引用 taxonomy，仍生成空 catalog/locale indexes；本地 compiler 保留 site locale 与安全 hub，并从路由、RSS、Sitemap 排除已撤下目标。
- CMS migration 与 Cloudflare PostgreSQL projection 已部署；51 张共享表、940 行完成 count/checksum parity。Worker 已升级到 Paid CPU 配置，授权人已在 CMS 对黄金 Prompt 完成 revision-bound approval；35 条 X seed 仍为 `review_required`。
- 线上 snapshot 已由生成镜像 workflow 成功消费。GitHub Actions run [33761670885](https://github.com/ziyetsui/prompt-lab/actions/runs/33761670885) 的 prepare、push、post-push verify 全绿；mirror commit `1a3352b85e5394fe899220418d9a8d8e67082661` 与 manifest `sha256:9fab060d9d201645ac49eeff72bd4fbbf71e9e2ef353a3cbea2d0b7ebb039ee6` 已固定到 Pages Preview 构建。正式 release receipt/callback 尚未实现，approved、mirrored、Preview deployed 与 production released 必须继续分别报告。

### 1.4 初始基线（历史背景）

架构立项时，本仓库还不是“已有应用待重构”：

- frontend/ 与 backend/ 尚无应用代码；
- 尚无 package.json、pyproject.toml、数据库迁移、OpenAPI、测试、CI 或 Git repository；
- 原型使用 iframe、srcdoc 和 hash 路由，只能表达交互，不能作为生产 SEO 实现；
- 原型外壳缺少显式 charset，本地 HTTP 渲染可出现中文 mojibake；
- 原型的部分声明数量来自完整数据，页面实际只嵌入样本卡片；
- 原始数据约 169 MB，不应进入前端构建上下文或普通内容 PR。

因此本次“手术”本质是从规格工作区建立 monorepo、事实源、接口和发布闭环，而不是移动现有业务代码。

### 1.5 已发现的技术债

- 0006/0007 的部分相对链接仍指向不存在的旧文件名。
- 采集环境变量绑定个人绝对路径，不适合 CI。
- 当前快照未包含可复现它的完整 Python 工程。
- media_refs 仍是外链引用，不是稳定归档；需要版权、失效和删除策略。
- Prompt 到 model/use_case/technique/style 四轴 taxonomy 的映射尚未成为可执行规则。
- Google Indexing API 不用于普通博客/PSEO 页；本项目使用 sitemap、内部链接、Search Console 监测，不把 Indexing API 当通用提交器。

## 2. 目标与非目标

### 2.1 目标

| ID | 目标 | 可验证结果 |
| --- | --- | --- |
| A1 | CMS canonical 发布 | 所有公开内容都能追溯到 CMS approved revision、rights decision 和 mirror commit |
| A2 | Payload 审核 | 内部用户能保存草稿并对精确 revision 执行人工审核 |
| A3 | 多语言独立版本 | zh-CN 与 en 各有独立 Markdown、slug 和状态 |
| A4 | 前后端清晰边界 | OpenAPI、领域层、存储端口和 typed client 可独立测试 |
| A5 | SEO 静态基础设施 | 真实 URL、canonical、hreflang、RSS、sitemap、robots 可构建 |
| A6 | PSEO 质量门禁 | 只有证据、任务完成度和翻译状态合格的页可 index |
| A7 | Cloudflare 可预览 | CMS revision 有 Access/noindex preview，mirror verify 后才可进入正式站 |
| A8 | 可恢复 | Intake、snapshot、mirror push、部署和 takedown 具备幂等、审计和重试 |
| A9 | Agent-native 提案 | 自然语言变更被限制为合规 CMS draft proposal，并由人完成批准 |

### 2.2 非目标

Internal beta 不包含：

- 实时、全量 X 抓取；
- OCR、自回复线程、作者基线的完整补齐；
- 自动本体发现或图数据库；
- 无人审核的自动发布；
- 自动翻译后直接上线；
- Payload 与 Git 的无损实时双向富文本同步；
- 多租户、复杂 RBAC、商业计费；
- 高级全文检索集群；
- 把 982 条记录全部自动变成可索引页面。
- 在 Payload 内嵌通用聊天 Agent、Claude Agent SDK runtime 或无人值守内容生成。

## 3. 核心架构决策

### ADR-001｜Payload CMS 是内容事实源，Git main 是生成镜像

Payload 保存 canonical draft/approved revision、来源、rights decision 与审核记录。只有绑定当前 content/source/rights revisions 的 human approval 才能进入 immutable export snapshot。GitHub `main` 保存该 snapshot 的确定性 Markdown/JSON/README 镜像，供公众浏览、引用、版本比较和静态构建，但不能反向覆盖 CMS。

专用 mirror bot 在完整门禁后可以直接 fast-forward push 镜像 `main`，不为每条内容创建 PR。mirror commit 只表示公开镜像完成；生产部署及 smoke 匹配 exact commit/manifest 后才是 `released`。代码、schema、workflow、license、Agent 规则和 exporter 修改仍必须走 PR。

### ADR-002｜Payload 与 Python 分离

Payload 是 Node/TypeScript 应用，位于 cms/；backend/ 保持 Python。两者通过版本化 HTTP 合同和 Webhook 协作，不共享内部数据库模型。

### ADR-003｜每内容、每语言一个文件

~~~text
content/
├── prompts/
│   └── prm_01JABC.../
│       ├── en.md
│       └── zh-CN.md
├── articles/
│   └── art_01JDEF.../
│       ├── en.md
│       └── zh-CN.md
└── taxonomies/
    └── model/
        └── mdl_nano-banana-pro/
            ├── en.md
            └── zh-CN.md
~~~

目录使用 immutable ID，localized slug 放 frontmatter。改标题或 slug 不触发内容身份变化；旧 slug 通过 redirects 管理。这些文件由 CMS snapshot 确定性生成，不是人工或 Agent 的 canonical 编辑入口；同一 export revision 必须产生 byte-identical 文件与 manifest。

### ADR-004｜前台静态优先

Next.js App Router 使用静态导出。构建时读取已校验的内容快照，HTML 内必须包含首屏内容和内部链接。客户端 API 只处理搜索、筛选、建议和后续分页，不负责补上首屏 SEO 正文。

### ADR-005｜原始数据与公开内容分仓储

| 数据 | 权威存储 | 规则 |
| --- | --- | --- |
| 原始 API payload、媒体归档 | Cloudflare R2 | 不可变、按 run/hash 寻址 |
| 运行、候选、审核、任务、幂等记录 | PostgreSQL（当前 beta）；D1 仅作回滚版本 | 不写入 Markdown |
| Payload 内容、locale、taxonomy、来源与 rights review | Payload DB + versions | 唯一内容事实源；approval 绑定精确 revision |
| 已批准多语言公开镜像 | Git main generated Markdown/JSON/README | mirror bot 从 immutable snapshot 生成；禁止反向编辑 |
| 公共查询索引 | 由 CMS export revision / mirror manifest 编译的 D1/静态 JSON | 可随时重建 |
| 图片/视频 | R2 | Markdown 只存 assetId 与稳定 URL |

### ADR-006｜公开语言不静默 fallback

Payload 编辑器可显示 fallback 提示，但公开 API和构建均使用 fallbackLocale=false。缺译文返回 404，并在 Problem meta 中提供 localeVariants；成功详情也通过 localeVariants 返回每种语言的 slug 与 href，不能用英文正文伪装成中文已发布页。

### ADR-007｜有选择地移植现成底座

- OpenBlog：移植 Blog list/post/category、RSS、Sitemap、robots、JSON-LD 和内容 CI 模式；不让它承担 Payload、Python ingest 或 Prompt L1–L4。
- Payload Website Template：借用 collections、draft/preview、SEO field 和 Admin 模式，并以 Payload version/approval 作为 canonical 编辑与审核层。
- payloadcms/website：只参考 Markdown/MDX ↔ Lexical 与 branch 写回模式，不直接 fork 整站。
- YouMind：采用 Issue 人工批准→CMS、定时生成多语言 README/索引和 bot 直推镜像 `main` 的发布方向；增加 revision-bound approval、path-aware rights、deterministic snapshot、post-push verify 与 released attestation。

这能缩短 Blog 基建开发，但仍需本项目自己的 Prompt schema、CMS export snapshot / deterministic mirror exporter、多语言门禁和 Cloudflare 集成。

### ADR-008｜多草稿入口、单 CMS 权威与生成镜像管线

本项目采用两个草稿入口、五个清晰阶段：

| 阶段 | 权威载体 | 含义 |
| --- | --- | --- |
| Working draft | Payload draft 或 Agent CMS proposal | 可编辑，未进入发布审核 |
| Approved source | CMS revision + rights review | 内容权威，允许进入 export snapshot |
| Export snapshot | 不可变 CMS export revision | exporter 的唯一输入 |
| Mirrored | Git `main` mirror commit + manifest | 已公开镜像，未必已部署站点 |
| Released | 匹配 mirror commit/hash 的生产部署成功证据 | 该 snapshot 已在公开站生效 |

- Agent proposal：Codex/Claude Code 根据自然语言和用户材料，通过受保护 API 提议 CMS draft；不能直接写数据库、生成镜像或 approval/rights/released 字段。
- CMS form：编辑者直接保存相同 canonical CMS model。两种入口都由 reviewer/admin 对精确 revisions 人工批准。
- Exporter 只读取 immutable approved snapshot，确定性生成 allowlisted Markdown、rights registry、索引、README 和 manifest；不接受任意自然语言。
- Mirror bot 只负责 compare-and-swap fast-forward push，无法批准 CMS 内容；CMS sync/webhook 不获得 Git 写凭据。
- post-push verify 通过后才能部署，exact commit/hash smoke 成功后才将 release receipt 回写 CMS；回写不能覆盖内容字段。
- Internal Beta 不嵌入 `@anthropic-ai/claude-agent-sdk`。未来若需要 CMS 内 Agent UI，作为独立 ADR 设计认证、授权、工具 allowlist、预算、超时、审计和逐次人工确认。

### ADR-009｜Codex SDK 是可替换执行适配器，不是发布服务

允许使用官方 Codex SDK 把内容 proposal Skills 接入脚本或内部工具：TypeScript 适配器使用 `@openai/codex-sdk`，Python 适配器使用 `openai-codex`。本项目首选独立 `tools/content-agent/` wrapper，避免把通用 Agent runtime 放进 CMS hook、exporter 或公共 Backend API。

执行协议：

1. wrapper 固定到已版本化的 CMS proposal/schema contract，在隔离环境中启动 Codex thread，注入 exact type/id/locale、当前 CMS revision、显式关系与验收条件；
2. `create|edit|route` 只能生成结构化 draft proposal；`validate|review-ready` 全程只读，严禁 `danger-full-access`；
3. wrapper 对 proposal fields、source/evidence、路径、链接、媒体、secret 和 schema 做独立门禁；不向模型提供 CMS admin、mirror bot 或 deploy 凭据；
4. 第二次复审 turn 使用 `read-only`，不得在 review 中继续修改 proposal；
5. wrapper 生成自己的 run record（thread id、CMS base revision、proposed fields、命令/退出码、最终状态），不能把模型 final response 当作验证证据；
6. 通过后只产生 proposal/audit review-ready 包，或经调用者权限写入 CMS draft endpoint；不得设置 approved、rights decision、commit、push 或 deploy。失败、超时、审批请求或越界改动均 fail closed。

Codex SDK、OpenAI Agents SDK 和 Claude Agent SDK 是不同产品。本 ADR 只授权 Codex SDK 作为 draft proposal 执行适配器，不引入另外两种 SDK，也不改变 CMS 人工批准、mirror bot 隔离、deployment attestation 或 released 状态机。

## 4. 服务和代码边界

### 4.1 frontend/

职责：

- L1–L4 Prompt 路由；
- Blog 列表、文章、分类；
- 静态 metadata、JSON-LD、RSS/Sitemap 输出；
- 搜索、筛选、复制、语言切换；
- 使用 TypeScript、CSS、Tailwind，在 Next.js App Router 静态导出合同内 1:1 还原用户定稿母版，并完成可访问性和响应式。

禁止：

- 直连 Payload、D1/PostgreSQL；
- 在组件中散落未类型化 fetch；
- 把 API 密钥放进 NEXT_PUBLIC 环境变量；
- 用 iframe/hash 充当生产路由。

### 4.2 cms/

职责：

- Payload collections、Admin UI、localized canonical draft 与版本历史；
- Save Draft、content/source/rights revision 校验和 reviewer/admin approval；
- 生成闭合、不可变、分页一致的 approved export snapshot；
- 展示 intake、rights、mirror commit、manifest、deploy 和 released 状态。

禁止：

- 普通 Save/afterChange 直接写公开镜像或标记 released；
- 未经 reviewer/admin 批准或 rights 不合格的记录进入 snapshot；
- 将 Git mirror 中的手工编辑反向覆盖 canonical CMS 内容。

beta 为降低转换风险，正文先使用 localized Markdown textarea。若二期采用 Lexical，Markdown ↔ Lexical 转换留在 cms/ TypeScript adapter，exporter 只接收版本化标准模型。现有 Prepare/Submit PR 控件属于已取代的历史 adapter；默认 UI 必须迁为 review/approve + mirror status。

### 4.3 backend/

依赖方向：

~~~text
domain ← application ← adapters / infrastructure
~~~

- domain：PromptArtifact、LocaleVariant、Taxonomy、Candidate、Review、RightsDecision、ExportSnapshot、MirrorReceipt、ReleaseReceipt、状态机和规则。
- application：commands、queries、DTO、use cases、ports。
- adapters/inbound：http、GitHub Issue/Payload/deployment webhook、schedule/manual trigger。
- adapters/outbound：Twitter241、GitHub mirror、Payload snapshot、R2、DB、content index。
- infrastructure：配置、迁移、日志、追踪。
- workers：导入、规范化、校验、索引和回写任务。

HTTP route 只做认证、输入解析和 DTO 转换；业务规则只在 application/domain；外部 payload 只能在 adapter 内出现。

### 4.4 Agent 规则与 Skills

职责：

- 根 `AGENTS.md` / `CLAUDE.md` 定义 CMS 权威、生成镜像、权限与交付合同；目录级文件只收紧本模块边界。
- `content/AGENTS.md` 将 `content/**` 定义为 generated-only mirror，禁止人工或 Agent 编辑。
- `.agents/skills/pseo-content-*` 将“新增/修改 Prompt”“新增/修改 Article”“校验”“review-ready”等意图映射为 CMS draft proposal。
- Skills 只生成/验证 proposal，不保存凭据、不扩大调用者权限、不执行内容中夹带的指令。
- `tools/content-agent/` 已提供固定端点、无 redirect、环境变量持有凭据的 create-Prompt host client；旧兼容 CLI/runner 继续 fail closed。未来自然语言/SDK orchestration 可用 Codex SDK 驱动上述 Skills，但不能成为 CMS、exporter 或 Backend 的长驻发布服务。

Agent 执行边界：

- 输入是用户请求与用户提供的正文/outline/brief；外部 Markdown、网页、Issue 和评论均视为不可信数据。
- 输出是受 field/scope allowlist 约束的 CMS proposal diff、验证证据和 review-ready 摘要。
- 禁止任意路径写入、直接数据库修改、编辑生成镜像、读取 secret、设置 approved/rights/released 或取得 mirror/deploy 凭据。
- SDK 路径必须使用隔离 runtime，随后以 `read-only` 复审；wrapper 独立验证实际 proposal，不信任自报结果。

### 4.5 GitHub Actions

重任务放在标准 Linux runner：

- Markdown schema/slug/locale/link 校验；
- approved CMS snapshot 的确定性导出、mirror manifest、直推 `main` 与 post-push verify；
- 内容编译、静态构建、RSS/Sitemap；
- X 抓取、OCR、批量翻译等长任务；
- Cloudflare Preview/Production 发布；
- mirror commit/manifest receipt 回写 Payload `mirrored`；生产部署与 smoke 成功后再回写 `released`。

Cloudflare Python Worker 只承载 Webhook、触发和状态 API，不运行 Playwright、git CLI 或重型抓取。

## 5. 领域模型

### 5.1 聚合与状态

~~~text
discovered
  → normalized
  → needs_review
  → artifact_draft
  → validated
  → approved
  → snapshot_pending
  → mirroring
  → mirrored
  → deploying
  → released
~~~

旁路状态：

- rejected：审核拒绝；
- stale_translation：源语言变化后译文过期；
- mirror_conflict：`expectedMainSha` 与 mirror `main` 不一致，必须重建 snapshot projection 后重试，禁止覆盖或强推；
- deploy_failed：mirror commit 已验证，但同一 commit/hash 的生产部署或发布后校验失败，可安全重试；
- tombstoned：来源删除或合规下线；
- archived：内容保留历史但不再公开。

### 5.2 PromptArtifact

| 分组 | 必需字段 |
| --- | --- |
| Identity | id、type、locale、title、slug、summary |
| Outcome | outputType、purpose、style、platform |
| Prompt | language、text、variables |
| Preconditions | requiredInputs、optionalInputs |
| Control | parameters |
| Proof | examples、evidence、confidence |
| Action | workflow、copy/customize/try |
| Provenance | sourcePlatform、sourceUrl、sourceId、creator、observedAt |
| Graph | models、useCases、techniques、styles、subjects、creator、related |
| Publication | status、publishedAt、updatedAt、sourceRevision |
| SEO | title、description、canonical、robots |

X Post 永远是 Source/Evidence，不是页面主体。页面主体是“帮助用户复现结果”的 Prompt Artifact。

### 5.3 LocaleVariant

| 字段 | 规则 |
| --- | --- |
| locale | BCP 47，如 zh-CN、en |
| sourceLocale | 本版本的源语言 |
| slug | locale 内唯一 |
| translationStatus | missing、draft、review、ready、stale |
| translatedFromRevision | 源 locale 可为 null；翻译 locale 必须绑定源 CMS revision/content hash |
| reviewer | ready 前必填 |
| prompt.language | Prompt 原文本身语言；不得假装已翻译 |

### 5.4 Git mirror 序列化合同与可执行示例

#### Prompt mirror schema（现有 schema；本地 CMS-first producer/consumer 已实现，线上 D1 尚不可用）

- mirror schema：`schemas/content.schema.json`；它当前只接受 `type: prompt`，Frontmatter 不允许未声明字段。CMS canonical model 必须能确定性映射到该 schema，但 schema 文件不是内容事实源。
- 可执行的生成镜像示例：`content/prompts/prm_2063814043631280180/zh-CN.md`。该文件必须通过 `node infra/bin/content.mjs validate`，不得人工编辑；本 Spec 不再复制一份容易漂移的缩减 YAML。
- `schemaVersion` 升级必须带迁移器、golden fixture 和向后兼容/失败策略。

Prompt 的状态字段必须成组变化：

| 字段 | 新建/新翻译默认值 | 允许公开的值 |
| --- | --- | --- |
| `status` | `draft` | `published` |
| `indexable` | `false` | Page Qualification 通过后才可 `true` |
| `seo.robots` | `noindex,nofollow` | 可索引时 `index,follow` |
| `publication.publishedAt` | `null` | CMS revision-bound approval 后由 exporter 投影的受控时间戳 |
| `translation.status` | `draft` | `ready` 且 revision/reviewer 完整 |

以上只是状态差异表，不是可独立解析的 Frontmatter；其他必填字段仍必须完整符合当前 schema。Agent 不得为了让 draft 通过而编造 source、evidence、metrics 或 publication 数据。

#### Article（Stable Internal Beta 目标合同）

Article 使用独立的 `schemas/article.schema.json`，不能硬塞进 Prompt 的 `schemas/content.schema.json`。在该 schema、validator、golden fixture、Blog compiler/route 和 RSS 测试落地前，`content/articles/**` 必须 fail closed，不能声称 Article 已可发布。

Article schema 至少覆盖：

| 分组 | 必需字段/规则 |
| --- | --- |
| Identity | schemaVersion、`art_*` immutable id、type、locale、sourceLocale、slug、title、summary |
| Editorial | authorId、categoryIds、tags、Markdown body；coverAssetId 可空 |
| Provenance | `origin: original \| sourced`；sourced 内容需要 source/evidence，原创文章需要可追溯 author/revision，事实性主张需要 citations |
| SEO | indexable、title、description、canonical、robots |
| Publication | status、publishedAt、updatedAt、sourceRevision |
| Translation | status、translatedFromRevision、reviewer；缺译文不得 fallback |

Article 同样使用上表的 draft/noindex → published/indexable 状态组合。正式 schema 必须提供一个能真实 validate 的 draft/noindex fixture 和一个 published/indexable fixture；在此之前，文档中的字段表不能被当成已实现的 YAML 合同。

Taxonomy 文件至少包含 id、type、locale、slug、name、description、translation、seo 和 publication；Model 可追加 officialUrl、capabilities、inputs、outputs、limitations。

## 6. Page Qualification 与索引门禁

禁止对所有关键词或 Graph 边做笛卡尔积。所有内容只有同时满足以下共同条件才可 index：

1. 有明确且不同的用户任务；
2. Identity、SEO、publication 和内容类型自己的必需模块完整；
3. locale 状态为 ready，且没有 stale_translation；
4. slug、title、description 在 locale 内唯一；
5. 不是仅替换一个无价值 token 的重复页面；
6. 页面有真实内部关系，不靠随机内链；
7. 合规审核、构建、链接、schema、可访问性和 SEO 门禁通过。

Prompt 还必须满足：

- Outcome、Prompt、Inputs、Workflow、Source/Evidence 完整；
- Prompt 可执行，来源可追溯，示例/媒体有权使用或可安全引用。

Article 还必须满足：

- author、summary、正文、category 和 provenance 完整，正文真正完成目标任务；
- sourced 文章至少有一个可追溯 source/evidence；原创文章可不依赖外部 source，但必须有 author/revision 审计，事实性主张有 citations；
- 不以 Prompt 专属的 Outcome/Prompt/Inputs/Workflow 字段作为 Article 门禁。

不合格内容保持 draft/noindex，不进入 sitemap 或 RSS。不存在统一字数门槛；以任务完成度、信息增量和证据为准。

## 7. 前端路由合同

| 页面 | 路由 | 数据来源 |
| --- | --- | --- |
| L1 Prompt Hub | /{locale}/prompts | home + prompts |
| L2 媒介/分类 Gallery | /{locale}/prompts/image | category projection |
| L2 视频 Gallery | /{locale}/prompts/video | content-type/video projection，筛选固定 contentType=video |
| L3 模型实体 | /{locale}/prompts/models/{modelSlug} | model + prompts |
| L3 任务 Findings | /{locale}/prompts/use-cases/{taskSlug} | 同 revision 的完整 catalog + 固定 useCase 关系；公共分类合同为 categories/use-case/{slug} |
| L3 风格 Plate | /{locale}/prompts/styles/{styleSlug} | 同 revision 完整 catalog + 固定 style 关系；公共分类合同 categories/style/{slug} |
| L4 Prompt 对象 | /{locale}/prompts/{promptSlug} | prompt detail |
| Blog 列表 | /{locale}/blog | articles |
| Blog 文章 | /{locale}/blog/{slug} | article detail |
| Blog 分类 | /{locale}/blog/category/{slug} | category + articles |
| Prompt RSS | /{locale}/prompts/rss.xml | build output |
| Blog RSS | /{locale}/blog/rss.xml | build output |
| Sitemap index | /sitemap.xml | build output |
| Robots | /robots.txt | build output |

筛选状态使用 URL query；页面级筛选组合默认 canonical 到无 query 的主投影。只有经过 Page Qualification 的筛选组合才有独立静态 URL。

2026-09-04：任务 Findings 只用于 Browse by task 卡片的落地页与同类任务导航；母版 `docs/wireframes/proto-l3-task.html?v=4`。路由沿用 backend `_term_href` 的 use-cases 路径，静态参数由真实 task registry 生成，未知任务为 404。普通 taxonomy query href、模型 Anthology、其他分类版式保持原合同。Within 使用同 snapshot 静态索引增强，同轴 OR、跨轴 AND，筛选写 URL 并可回退；原型统计在固定任务的当前结果中计算，不能把 UI 状态传入分类 API。 同日用户追加要求：Task L3 页暂时移除页尾任务、模型、风格的大图导航卡片区，保留顶部 Task / Within 导航筛选及提示词正文。

## 8. API 总则

- 公共前缀：/api/v1
- 内部前缀：/internal/v1
- locale 对公共内容请求必填，不使用 Accept-Language 猜测。
- ID 始终是 string；时间为 UTC ISO 8601。
- 列表使用 opaque cursor；limit 默认 24，范围 1–50。
- GET 返回 ETag 和 X-Content-Revision。
- 更新使用 If-Match；冲突返回 409。
- 命令支持 Idempotency-Key。
- 对外 JSON 统一使用 camelCase；Python 内部 snake_case 通过 Pydantic alias 映射。
- 异步命令返回 202、jobId 和 statusUrl。
- 错误使用 application/problem+json。
- OpenAPI 3.1 文件是前后端合同；TypeScript client 从它生成。
- 公共 /api/v1 为匿名只读接口；/internal/v1、Payload、Preview 才受 Cloudflare Access 和 RBAC 保护。

### 8.1 公共 API

本节表格包含目标合同；实际已实现路径与字段以 `backend/openapi/openapi.json`、router/schema 和合同测试为准。当前 collections/creators detail、Article HTTP API、article-categories 与 suggestions 不在已实现 router；前端不得虚构端点。Article 可使用同 approved snapshot 的既有 compiler 产物，必须独立校验映射。HTTP list `promptPreview` 为截断字段，L1–L3 全文展示/复制必须读取同 revision detail 或完整静态读模型；构建中途 revision 漂移时 fail closed。

| 方法与端点 | 请求 | 200 响应用途 |
| --- | --- | --- |
| GET /api/v1/locales | 无 | locale、displayName、default、enabled |
| GET /api/v1/home | locale | stats、featured、trending、四轴 browse、collections、creators |
| GET /api/v1/prompts | locale、q、contentType、model、useCase、technique、style、subject、creator、window、sort、cursor、limit | PromptSummary[]、facets、page |
| GET /api/v1/prompts/{slug} | locale | PromptDetail、localeVariants、revision |
| GET /api/v1/facets | locale、contentType、q、model、useCase、technique、style、subject、creator、window | 当前结果集可用的各轴 value/slug/count |
| GET /api/v1/models/{slug} | locale、cursor、limit、sort | ModelDetail 与 PromptSummary[] |
| GET /api/v1/categories/{axis}/{slug} | locale、cursor、limit、sort | L2 taxonomy 投影；axis 仅允许 content-type、use-case、technique、style、subject |
| GET /api/v1/collections/{slug} | locale、cursor、limit | 合集和成员 |
| GET /api/v1/creators/{handle} | locale、cursor、limit | 创作者来源和 Prompt |
| GET /api/v1/articles | locale、category、cursor、limit、sort | ArticleSummary[] |
| GET /api/v1/articles/{slug} | locale | ArticleDetail |
| GET /api/v1/article-categories/{slug} | locale、cursor、limit、sort | Blog 分类信息与 ArticleSummary[] |
| GET /api/v1/search/suggestions | locale、q、limit | prompt/model/category/creator 建议 |
| GET /healthz | 无 | service、indexRevision、dependencies |

#### 8.1.1 公共响应类型

除 /healthz、RSS、Sitemap、robots 外，200 响应使用以下 envelope：

~~~typescript
type PublicEnvelope<T> = {
  data: T
  meta: {
    requestId: string
    contentRevision: string
    indexVersion: string
    rankingVersion: string
  }
}

type PageEnvelope<T> = {
  data: T[]
  page: {
    nextCursor: string | null
    hasMore: boolean
    limit: number
    total: number
  }
  facets: FacetSet | null
  meta: {
    requestId: string
    contentRevision: string
    indexVersion: string
    rankingVersion: string
  }
}
~~~

Nullability 规则：

- schema 标为 nullable 的值不可用时返回 null，不得以 0、空字符串或虚构值代替；
- 集合没有成员时返回空数组，不返回 null；
- nextCursor 在末页必须为 null；
- 发布对象的 source、localeVariants、seo 和 revision 为必填；
- 未声明的字段不得依赖，新增字段必须先进入 OpenAPI。

公共基础类型：

~~~typescript
type LocaleVariantRef = {
  locale: string
  slug: string
  href: string
}

type LocalizedRef = {
  id: string
  slug: string
  name: string
  href: string
}

type Media = {
  assetId: string
  type: "image" | "video"
  url: string
  width: number
  height: number
  alt: string
  posterUrl: string | null
}

type SourceSummary = {
  platform: "x" | "rss" | "url" | "manual"
  sourceId: string
  url: string
  authorHandle: string | null
  observedAt: string
}

type Metrics = {
  likes: number | null
  bookmarks: number | null
  comments: number | null
  reposts: number | null
  views: number | null
  observedAt: string
}

type FacetValue = {
  id: string
  slug: string
  label: string
  count: number
  selected: boolean
}

type FacetSet = {
  models: FacetValue[]
  useCases: FacetValue[]
  techniques: FacetValue[]
  styles: FacetValue[]
  subjects: FacetValue[]
  creators: FacetValue[]
}
~~~

PromptSummary 必填字段：

~~~typescript
type PromptSummary = {
  id: string
  slug: string
  href: string
  locale: string
  title: string
  excerpt: string
  contentType: "image" | "video" | "text" | "other"
  promptPreview: string
  models: LocalizedRef[]
  useCases: LocalizedRef[]
  techniques: LocalizedRef[]
  styles: LocalizedRef[]
  subjects: LocalizedRef[]
  media: Media[]
  source: SourceSummary
  metrics: Metrics
  publishedAt: string
  updatedAt: string
}
~~~

PromptDetail 在 PromptSummary 之外必须返回：

~~~typescript
type PromptDetail = {
  summary: PromptSummary
  localeVariants: LocaleVariantRef[]
  identity: {
    title: string
    summary: string
    contentType: string
  }
  outcome: {
    outputType: string
    purpose: string
    platforms: string[]
    characteristics: string[]
  }
  prompt: {
    language: string
    text: string
    variables: Array<{
      key: string
      label: string
      required: boolean
      defaultValue: string | null
      options: string[]
    }>
  }
  inputs: {
    required: string[]
    optional: string[]
  }
  parameters: Array<{
    key: string
    label: string
    type: "text" | "number" | "enum" | "boolean"
    required: boolean
    options: string[]
  }>
  examples: Array<{
    id: string
    input: string | null
    output: Media
    caption: string | null
  }>
  workflow: Array<{
    position: number
    title: string
    body: string
  }>
  variations: PromptSummary[]
  source: SourceSummary
  evidence: Array<{
    type: string
    url: string | null
    confidence: number | null
  }>
  relations: {
    models: LocalizedRef[]
    useCases: LocalizedRef[]
    techniques: LocalizedRef[]
    styles: LocalizedRef[]
    subjects: LocalizedRef[]
    creator: LocalizedRef | null
    relatedPrompts: PromptSummary[]
  }
  actions: {
    canCopy: boolean
    tryUrl: string | null
  }
  seo: {
    title: string
    description: string
    canonicalUrl: string
    hreflang: Record<string, string>
    robots: "index,follow" | "noindex,nofollow"
  }
  revision: string
}
~~~

ArticleSummary、ArticleDetail：

~~~typescript
type ArticleSummary = {
  id: string
  slug: string
  href: string
  locale: string
  title: string
  excerpt: string
  cover: Media | null
  author: LocalizedRef
  category: LocalizedRef
  tags: LocalizedRef[]
  publishedAt: string
  updatedAt: string
  readingTimeMinutes: number
}

type ArticleDetail = {
  summary: ArticleSummary
  localeVariants: LocaleVariantRef[]
  bodyHtml: string
  toc: Array<{id: string; label: string; level: number}>
  source: SourceSummary | null
  citations: Array<{
    label: string
    url: string
    accessedAt: string | null
  }>
  related: ArticleSummary[]
  seo: {
    title: string
    description: string
    canonicalUrl: string
    hreflang: Record<string, string>
    robots: "index,follow" | "noindex,nofollow"
  }
  revision: string
}

type ArticleFacetSet = {
  categories: FacetValue[]
  tags: FacetValue[]
  authors: FacetValue[]
}

type ArticlePageEnvelope = {
  data: ArticleSummary[]
  page: {
    nextCursor: string | null
    hasMore: boolean
    limit: number
    total: number
  }
  facets: ArticleFacetSet
  meta: {
    requestId: string
    contentRevision: string
    indexVersion: string
    rankingVersion: string
  }
}

type ArticleProjection = {
  entity: {
    id: string
    slug: string
    name: string
    description: string
    articleCount: number
    updatedAt: string
    localeVariants: LocaleVariantRef[]
    seo: {
      title: string
      description: string
      canonicalUrl: string
      hreflang: Record<string, string>
    }
  }
  items: ArticleSummary[]
  page: {
    nextCursor: string | null
    hasMore: boolean
    limit: number
    total: number
  }
}
~~~

Projection 响应统一：

~~~typescript
type Projection<T> = {
  entity: T & {
    id: string
    slug: string
    name: string
    description: string
    localeVariants: LocaleVariantRef[]
    seo: {
      title: string
      description: string
      canonicalUrl: string
      hreflang: Record<string, string>
    }
  }
  items: PromptSummary[]
  page: {
    nextCursor: string | null
    hasMore: boolean
    limit: number
    total: number
  }
  facets: FacetSet
}

type ModelDetail = {
  officialUrl: string | null
  updatedAt: string
  capabilities: string[]
  inputs: string[]
  outputs: string[]
  limitations: string[]
}

type CategoryDetail = {
  axis: "content-type" | "use-case" | "technique" | "style" | "subject"
  updatedAt: string
}

type CollectionDetail = {
  curator: string | null
  updatedAt: string
}

type CreatorDetail = {
  handle: string
  avatar: Media | null
  sourceUrl: string
  updatedAt: string
}
~~~

#### 8.1.2 端点的完整行为

| 端点 | 必填与默认 | data 类型 | 额外状态 |
| --- | --- | --- | --- |
| GET /locales | 无 | LocaleInfo[]；每项 locale、displayName、default、enabled、href | 503 |
| GET /home | locale 必填 | HomeData；stats、featured、trending 7d/30d/all、browse、collections、creators 均为必填数组/对象 | 400、404 locale、503 |
| GET /prompts | locale；limit=24；sort=relevance；window=all | PageEnvelope<PromptSummary> | 400、429、503 |
| GET /prompts/{slug} | slug path、locale query | PublicEnvelope<PromptDetail> | 308 old slug、404、410、429、503 |
| GET /facets | locale；其余 filter 可选 | PublicEnvelope<FacetSet> | 400、429、503 |
| GET /models/{slug} | locale；limit=24；sort=value | PublicEnvelope<Projection<ModelDetail>> | 308、404、410、503 |
| GET /categories/{axis}/{slug} | axis allowlist；locale；limit=24；sort=value | PublicEnvelope<Projection<CategoryDetail>> | 400、308、404、410、503 |
| GET /collections/{slug} | locale；limit=24 | PublicEnvelope<Projection<CollectionDetail>> | 308、404、410、503 |
| GET /creators/{handle} | locale；limit=24 | PublicEnvelope<Projection<CreatorDetail>> | 404、410、503 |
| GET /articles | locale；limit=20；sort=newest | ArticlePageEnvelope；facets 含 categories、tags、authors | 400、429、503 |
| GET /articles/{slug} | slug path、locale query | PublicEnvelope<ArticleDetail> | 308、404、410、503 |
| GET /article-categories/{slug} | locale；limit=20；sort=newest | PublicEnvelope<ArticleProjection> | 308、404、410、503 |
| GET /search/suggestions | locale、q 必填；limit=8，范围 1–20 | PublicEnvelope<Suggestion[]> | 400、429、503 |
| GET /healthz | 无 | service、status、indexRevision、dependencies | 200 或 503 |

HomeData：

~~~typescript
type HomeData = {
  stats: {
    promptCount: number
    modelCount: number
    updatedAt: string
    indexVersion: string
  }
  featured: PromptSummary[]
  trending: Array<{
    window: "7d" | "30d" | "all"
    rankingVersion: string
    items: PromptSummary[]
  }>
  browse: {
    models: LocalizedRef[]
    useCases: LocalizedRef[]
    techniques: LocalizedRef[]
    styles: LocalizedRef[]
  }
  collections: LocalizedRef[]
  creators: LocalizedRef[]
}

type LocaleInfo = {
  locale: string
  displayName: string
  default: boolean
  enabled: boolean
  href: string
}

type Suggestion = {
  type: "prompt" | "model" | "category" | "creator"
  id: string
  label: string
  href: string
}
~~~

公共 GET 均支持 If-None-Match 并可返回 304。列表空结果返回 200 + 空数组；资源不存在返回 404；旧 slug 有明确替代时返回 308 + Location；已下线且无替代时返回 410 CONTENT_GONE。所有非 2xx 使用 §8.3 Problem。

GET /prompts 约束：

- window：7d、30d、all；
- sort：relevance、trending、value、newest；
- 多值筛选使用重复 query 参数；
- 同一轴为 OR，不同轴为 AND；
- 未知 filter 或 enum 返回 400，不静默忽略；
- count 必须由当前索引计算，不允许前端硬编码。

Prompt、Article 和 Projection 的完整必填、nullable 与 localeVariants 合同以 §8.1.1 为准；OpenAPI 示例必须包含全部必填字段，不得维护另一份缩减 DTO。

### 8.2 内部 API

| 方法与端点 | 请求 | 响应 |
| --- | --- | --- |
| POST /internal/v1/imports | sourceType、snapshotRef | 202 job |
| GET /internal/v1/jobs/{id} | 无 | state、progress、errors、result |
| GET /internal/v1/candidates | status、filters、cursor | 审核队列 |
| GET /internal/v1/candidates/{id} | 无 | rawRef、normalized、evidence、classification |
| POST /internal/v1/candidates/{id}/reviews | decision、overrides、notes | review 与新状态 |
| POST /internal/v1/artifacts | candidateId 或 draft | Artifact draft |
| GET /internal/v1/artifacts/{id} | locale | 编辑模型与 ETag |
| PATCH /internal/v1/artifacts/{id} | Merge Patch + If-Match | 新 revision |
| PUT /internal/v1/artifacts/{id}/locales/{locale} | LocaleVariant | locale revision |
| POST /internal/v1/artifacts/{id}/validate | locales | errors、warnings |
| POST /internal/v1/artifacts/{id}/approvals | expected content/source/rights revisions、decision、notes | approved/rejected revision-bound receipt |
| POST /internal/v1/export-snapshots | expectedPolicyVersion、reason | 202 immutable snapshot job |
| GET /internal/v1/export-snapshots/{id} | 无 | exportRevision、records、manifest inputs、status |
| POST /internal/v1/mirror-syncs | exportRevision、expectedMainSha、trigger | 202 mirror job |
| GET /internal/v1/mirror-syncs/{id} | 无 | commit、manifestHash、checks、deploy status |
| POST /internal/v1/webhooks/github | Issue/verification event + signature | 204，幂等 |
| POST /internal/v1/webhooks/payload | Payload event + signature | 202 job |
| POST /internal/v1/webhooks/deployment | provider event + deployment URL + commit SHA + signature/OIDC | 204，幂等 |

已被 0011 取代的历史 Internal Beta routes 是
`POST /api/internal/v1/publication-requests/prepare` 与
`POST /api/internal/v1/publication-requests`。前者只返回 current base、source/content
revision 与文件 path/size/hash metadata，不返回正文且不写 Git；后者用同一 saved
projection 再验证后调用 mock 或 allowlisted GitHub PR adapter。这些 route 和 PR #3/#5
仅保留回归/审计，不再是默认发布入口；上表 approval/snapshot/mirror routes 是当前目标合同。

mirror sync request：

~~~json
{
  "exportRevision": "sha256:...",
  "expectedMainSha": "7c71d5a",
  "trigger": "scheduled-reconciliation"
}
~~~

服务必须：

1. 读取并锁定闭合的 approved CMS snapshot，校验其中每条 approval 与 content/source/rights revisions；
2. 在临时空目录生成确定性的 Markdown、JSON、rights registry、README 与 manifest；
3. 运行 schema、rights、locale/slug、links、media、secret、unsafe HTML、索引和 determinism 门禁；
4. 校验 changed-path allowlist，任何代码/schema/workflow/license/Agent 规则变化都 fail closed；
5. 比较 `expectedMainSha`，只允许 compare-and-swap fast-forward；冲突后重取 snapshot/main 并重建，绝不 force-push；
6. 使用专用 mirror bot 创建一个完整 snapshot commit 并直接 push `main`；相同 export revision 返回 no-op；
7. post-push verify 通过才触发精确 commit/manifest 的生产部署；
8. mirror/deploy receipt 回写 CMS 只读状态字段，不反向覆盖 canonical 内容；
9. 重复 Idempotency-Key、schedule/event 并发或 Webhook 重放返回同一结果；
10. deployment callback 验证签名/OIDC、commit 和 manifest，只有 smoke 成功才写 `released`。

Agent 内容操作只能产生 CMS draft proposal，不能调用 approval、snapshot 或 mirror-sync 接口伪造状态。未来 Agent SDK 集成不得复用 mirror bot、exporter 或 deployment endpoint 作为任意工具代理。

### 8.3 标准错误

~~~json
{
  "type": "https://ancher.space/problems/locale-variant-not-found",
  "title": "Locale variant not found",
  "status": 404,
  "code": "LOCALE_VARIANT_NOT_FOUND",
  "detail": "zh-CN variant is not published",
  "instance": "/api/v1/prompts/example?locale=zh-CN",
  "traceId": "req_01J...",
  "errors": [
    {
      "path": "locale",
      "code": "VARIANT_NOT_PUBLISHED",
      "message": "Requested locale is not published",
      "meta": {
        "localeVariants": [
          {
            "locale": "en",
            "slug": "example",
            "href": "/en/prompts/example"
          }
        ]
      }
    }
  ]
}
~~~

错误码：

- INVALID_QUERY 400
- UNAUTHENTICATED 401
- FORBIDDEN 403
- RESOURCE_NOT_FOUND 404
- LOCALE_VARIANT_NOT_FOUND 404
- CONTENT_GONE 410
- REVISION_CONFLICT 409
- SLUG_CONFLICT 409
- INVALID_STATE_TRANSITION 409
- SCHEMA_VALIDATION_FAILED 422
- RATE_LIMITED 429
- UPSTREAM_PROVIDER_ERROR 502
- DEPENDENCY_UNAVAILABLE 503

## 9. Monorepo 目标目录

~~~text
/
├── AGENTS.md                         # 项目级事实源、权限和 Agent 工作流
├── CLAUDE.md                         # Claude Code 入口，继承根规则
├── .agents/skills/
│   ├── pseo-content-create/          # Prompt / Article 新增
│   ├── pseo-content-edit/            # 受限字段与正文修改
│   ├── pseo-content-validate/        # 确定性内容门禁
│   └── pseo-content-proposal/        # CMS proposal diff 与 review-ready 输出
├── tools/content-agent/               # 已退役兼容入口；未来可替换为 CMS proposal runner
│   ├── package.json
│   ├── src/
│   └── tests/
├── frontend/
│   ├── AGENTS.md
│   ├── CLAUDE.md
│   ├── src/
│   │   ├── app/[locale]/
│   │   ├── components/
│   │   ├── features/
│   │   ├── lib/api/
│   │   ├── lib/content/
│   │   ├── lib/i18n/
│   │   ├── lib/seo/
│   │   └── styles/
│   ├── public/
│   └── tests/
├── cms/
│   ├── AGENTS.md
│   ├── CLAUDE.md
│   ├── src/collections/
│   ├── src/hooks/
│   ├── src/endpoints/
│   ├── src/access/
│   └── tests/
├── backend/
│   ├── AGENTS.md
│   ├── CLAUDE.md
│   ├── pyproject.toml
│   ├── src/pseo/
│   │   ├── domain/
│   │   ├── application/
│   │   ├── adapters/inbound/
│   │   ├── adapters/outbound/
│   │   ├── infrastructure/
│   │   └── workers/
│   ├── migrations/
│   ├── openapi/openapi.yaml
│   └── tests/
├── content/
│   ├── AGENTS.md
│   ├── CLAUDE.md
│   ├── prompts/                       # exporter 生成的公开镜像；禁止手改
│   ├── articles/                      # exporter 生成的公开镜像；禁止手改
│   └── taxonomies/                    # exporter 生成的公开镜像；禁止手改
├── schemas/
│   ├── content.schema.json            # 当前 Prompt 合同
│   ├── article.schema.json            # Stable Beta Article 合同
│   ├── taxonomy.schema.json
│   └── surfaces.schema.json
├── assets/
│   ├── fixtures/                     # 小型、脱敏、可提交
│   └── raw/                          # 迁移到 R2 后仅留 manifest
├── infra/cloudflare/
├── docs/
├── specs/
└── .github/workflows/
    ├── mirror-reconcile.yml
    ├── mirror-verify.yml
    ├── deploy-production.yml
    └── sync-mirror-receipt.yml
~~~

## 10. CMS approval、Git mirror 与发布协议

- CMS approval 必须绑定 content/source/rights revisions、reviewer、UTC timestamp 和 policy version；任何相关字段变化都使旧批准失效；
- exporter 只读取 immutable approved snapshot，并在临时空目录生成完整镜像；
- mirror `main` 保存生成的 `content/**`、rights registry、README/索引和 manifest，不接受人工内容编辑；
- 专用 mirror bot 是唯一 direct-main 例外，使用 expected SHA 做 compare-and-swap fast-forward，禁止 force-push；
- path allowlist 外变化、schema/rights/link/media/secret/determinism 任一失败时零 commit、零 push；
- schedule 每四小时 reconciliation；approval、rights downgrade 和 takedown 额外触发事件同步；
- mirror push 后必须运行独立 verify/build；验证成功才部署 exact commit，不使用浮动 CMS 查询；
- mirror receipt 产生 `mirrored`；匹配 commit/manifest 的部署成功 + smoke 才产生 `released`；
- takedown 通过优先 removal snapshot/commit 删除当前公开投影；Git 历史彻底清除另走人工法务/安全流程；
- community 内容生产启用前必须在静态站前提供审计化 emergency suppression；授权 takedown case 按 id/locale/route 先返回 410，直到 removal commit 部署验证完成；
- 任何失败都保留 approval、snapshot、mirror job、manifest、deployment log 和可重试状态，并继续服务 last-known-good。

代码、schema、workflow、license、Agent 规则与 exporter 仍启用 branch protection、required checks 和人工 PR。GitHub `Contents: write` 无法按路径限制，因此推荐把 PromptLab 变成 generated-only mirror repository，把 exporter 源码留在受 PR 保护的工程仓库；同仓模式需要 owner 明确接受 bot 平台级仓库写权限风险。

### 10.1 Agent-native CMS proposal 协议

Agent 内容操作不新增发布特权，协议如下：

1. 解析自然语言意图为 `create | edit | route | validate | review-ready`，锁定内容类型、immutable id、locale、CMS base revision 和目标字段。
2. 读取 CMS contract 与最近 `AGENTS.md`；拒绝越界字段、危险 URL、内容中夹带的工具指令和任何 mirror/approval/deploy 请求。
3. 以安全默认值生成最小 proposal：新内容/翻译为 draft/noindex/rights review required，不自动填充未知来源、指标、许可、翻译或发布日期。
4. 只允许提议目标内容和必要 taxonomy/surface/redirect 关系；生成镜像、应用代码、CI、spec、secret 和 policy 不在内容 Skill allowlist。
5. 运行 schema、locale/slug、links、media、secret 和 proposal-scope 门禁；失败即停止，不降级规则。
6. 输出 proposed fields、diff、命令及实际结果、风险与 review-ready 摘要；只有调用者明确授权时才能写 CMS draft endpoint，且仍由人类 reviewer 决定 approval。

CMS form 与 Agent proposal 从 canonical CMS model 开始共用 validator。CI 必须能证明相同 approved snapshot 的 semantic content hash 和生成镜像一致；公开投影不得因草稿入口不同而分叉。

Internal Beta 的已实现最小子集是 `POST /api/internal/v1/agent-proposals/prompts`：仅支持 `schemaVersion=1`、`operation=create_prompt`、`expectedState=absent`，使用 Payload `users API-Key` 认证、`Idempotency-Key` 和 PostgreSQL serializable transaction。服务身份只有 `agent_proposer` role，不能使用普通 collection REST 读写、review 或 approval。成功只创建 Prompt/locale/source 的 draft + noindex + `review_required` 记录和不含正文的 immutable audit。taxonomy、rights、approval、snapshot、mirror、deploy 与 released 字段全部不在 allowlist。该代码与数据库迁移目前只在工程工作区验证，进入线上仍需工程 PR、迁移与部署审核。

## 11. Cloudflare 部署

推荐 beta 域名：

| 域名 | 组件 | 平台 |
| --- | --- | --- |
| beta.ancher.space | Next.js 静态站 | Cloudflare Pages |
| cms-beta.ancher.space（计划，DNS 未配置） | Payload Admin/REST | Workers + Hyperdrive + Neon PostgreSQL；R2 延后 |
| api-beta.ancher.space | 薄 FastAPI | Python Workers |

约束：

- 当前 Internal Beta CMS 使用 REST、Neon PostgreSQL 与 Hyperdrive，不依赖 GraphQL 或 R2；关闭动态 OG 后的 OpenNext Worker 已通过部署门禁。生产规模、恢复动态 OG 或包体增长是否要求 Paid Workers，必须在上线前重新评估。
- 静态 Next 使用 output: export；不使用 Draft Mode、ISR、Server Actions 或默认图片优化。
- Payload 预览读取带 revision 的 CMS draft snapshot，不通过生产站 Draft Mode；必须 noindex 且受 Access 保护。
- Python Worker 文件系统视为临时；不在其中运行 git 或保存 raw archive。
- Pages Preview、CMS 和 /internal/v1 使用 Cloudflare Access；匿名只读 /api/v1 不受 Access 登录墙保护，但启用速率限制、缓存和严格 CORS。
- PSEO 扩量前监控 Pages 文件数和 20 分钟构建上限；一个内容页通常产生多个输出文件。
- 若 Payload Worker 兼容性 spike 失败，允许将 cms 暂放 Node container；CMS snapshot、mirror 和 exact-commit deploy 合同不变。

历史部署 checkpoint（2026-09-03，实施 0011 前的基线，不代表当前目标链路已完成）：

- 远端 D1 已迁移并写入受审计 seed；读回数量为 36 / 36 / 37 / 71，foreign-key check 无异常。
- CMS Worker version `18b56753-2204-4b31-b51d-313f132b1e07` 已上线，`PAYLOAD_SECRET` 名称存在；`workers.dev` 由 Worker-level owner-only Access 覆盖，`preview_urls=false`。
- 最终构件的本地 workerd smoke：`/admin` 与静态资产 200，`/api/users/me` 200/null，受保护 collection 403，`/api/og` 为预期 400。
- Pages `internal-beta` deployment `c75633aa` 已上线，49/49 HTML 带 Preview 标识与 `noindex,nofollow`，并受 owner-only Access 保护；分支别名与 immutable URL 的匿名请求都已验证被拦截，生产根域仍为 404。
- owner 鉴权后的线上 smoke 已通过 Pages catalog、代表性 detail、远程媒体与 custom 404；CMS `/admin` 通过 Access 到达 Payload `/admin/create-first-user`。首 admin 明确创建前不宣称 authenticated collection/API UI 已验证。
- Backend/API 未部署；旧 Git publisher 已从 active runtime 移除，CMS Preview 默认关闭，PromptLab PR #4/#5 只保留为历史证据。基础设施 Worker 的存在不能被解释为当前 snapshot/mirror 链上线或 `released`。

当前 PostgreSQL cutover checkpoint（2026-09-03）：

- 首 admin 创建成功；随后 collection 页面暴露出全局 `pg.Pool` 跨 request context 复用的 1101。该故障由 request-scoped pool 修复，当前 Paid-CPU Worker 版本为 `51e73e54-3282-4228-9ac2-6ebbb9d171d0`；配置为 PostgreSQL/Hyperdrive，且没有 D1 binding。
- D1 export 到 Neon 的 dry-run、apply 与独立 repeatable-read verify 对 51 张共享表、940 行得到相同 checksum；迁移核心数量为 36 Prompt / 36 locale / 37 source-evidence / 71 taxonomy / 0 user，首用户创建后线上 user 为 1。
- owner 登录态 Dashboard、Users、Prompt list/detail 和 `/api/users/me` 曾在点状 smoke 中成功；四页并发 reload 与 dummy multipart login smoke 也曾无 1101。后续持续验证在同一线上版本捕获到多个 1102：`/admin`、Prompt collection、黄金 Prompt detail 与 `/api/users/me` 均出现 `Exceeded CPU Limit`。这证明 request-scope 正确性测试通过不等于 Free 计划运行预算足够；当前线上 CMS 不稳定，不能作为人工批准或 snapshot 操作面。
- Cloudflare 当前 Workers Free 的 HTTP CPU 限额为 10 ms/request，而官方也指出鉴权、SSR 等重负载常见于 10–20 ms；持续超限会被终止并返回 1102。恢复路径是升级 Workers Paid，或先 profile/优化/拆分，再以冷启动、登录、collection/detail、approval prepare 和并发 smoke 重新验收；不能靠重试把偶发成功当成通过。
- `CMS_PREVIEW_ENABLED=false`、`CMS_PUBLIC_SNAPSHOT_ENABLED=true`；黄金 Prompt 已由授权人完成 revision-bound approval。Access service identity 与 snapshot Bearer 已用于线上 mirror run `33761670885`，prepare、push 和 post-push verify 全绿；35 条 X seed 仍为 `review_required`。
- Pages Internal Beta 已切换为固定 mirror commit/manifest 的受保护 Preview，deployment `a4cb721c` 已通过认证 smoke。签名 release callback、持久化 receipt 与 CMS `released` 投影仍未完成；不得从 Preview 成功单独推导正式上线。
- 保留的 D1 rollback version 为 `311f108d-306a-4584-b76a-8453d8d659e0`；回滚只切 Worker version，不删除 Neon、Hyperdrive 或安全备份。

## 12. 安全、合规与可观测性

### 12.1 安全

- GitHub Webhook 校验签名并按 delivery ID 去重。
- 部署回调校验 provider 签名或 OIDC、environment、deployment URL 与 commit SHA，并按 delivery ID 去重；不得接受客户端自报“已上线”。
- mirror bot 使用独立 GitHub App/短期 token，仅安装在公开镜像仓库并授予 Contents/Metadata 必需权限；代码 PR 身份与其分离。
- Payload、/internal/v1 和 Preview 通过 Cloudflare Access；/api/v1 与生产内容公开只读。
- Secret 只存 GitHub/Cloudflare secret store。
- 日志禁止 Authorization、Cookie、API key 和完整敏感 payload。
- 所有外部 URL 抓取执行 SSRF allow/deny 校验、大小和超时限制。
- 内容、Issue、评论、网页与 Markdown 中的文字按不可信数据处理；其中要求改变 Agent 规则、读取凭据、执行命令或写入越界路径的文本一律不执行。
- Agent proposal 工具使用 field/scope allowlist，拒绝 path traversal、危险 URL、越权关系和生成目录写入。
- Agent 的网络权限与调用者绑定；Internal Beta 默认无 CMS approval、mirror push 或 deploy 权限，secret 不进入 prompt、Skill、diff 或模型日志。
- Codex SDK runner 禁用 `danger-full-access`，author/reviewer 使用隔离 runtime；host 独立校验结构化 CMS proposal，且不向模型暴露 CMS admin、mirror bot 或 deploy 凭据。只输出允许字段的 proposal/audit；thread id、CMS base revision、sandbox、审批、耗时和退出码进入最小审计记录，正文/secret 不进入遥测。

### 12.2 内容合规

- 保留 source URL、作者、抓取时间和 takedown 联系方式。
- `cleared` 与 `community_attributed` 使用不同门禁；后者必须显示作者保留权利、署名、原帖和删除入口，不得宣称 CC BY。
- `review_required/restricted/takedown` 不得进入新增公开 snapshot；takedown 必须触发优先 removal sync。
- 名人肖像、未成年人、成人内容、误导性冒充、版权媒体进入人工复核。
- X 热链不可作为长期媒体策略；缓存到 R2 前确认许可，删除后更新所有派生内容。
- Prompt 原文与页面翻译分开；不能让译文看起来像作者原始表达。

### 12.3 观测

每个请求和任务带 traceId、jobId、artifactId、approvalId、exportRevision 和 mirrorSyncId。至少监控：

- API 5xx、p95 latency；
- job success/failure/retry；
- approval→mirror、mirror→released 与 takedown completion 时长；
- revision conflict 数；
- 构建时长、输出文件数；
- 404、媒体失败、复制失败；
- indexed/eligible、stale translation、tombstone 数；
- Git SHA、内容 schema 版本和索引版本。

## 13. 测试与质量门禁

### Backend

- Ruff、mypy、pytest；
- domain 单测不访问网络；
- adapter contract fixture；
- OpenAPI breaking-change 检查；
- GitHub/Payload webhook 签名、幂等和重放测试；
- approved→mirrored、同 commit/manifest deployment→released、SHA/hash 不匹配或部署失败→deploy_failed 的状态机测试；
- Markdown golden file、slug 冲突和 locale stale 测试；
- migration upgrade/downgrade smoke。

### Frontend

- TypeScript strict、lint、unit；
- Playwright 四层路由 + Blog smoke；
- axe 无 critical/serious；
- 320、375、768、1024、1440 宽度；
- 关闭 JavaScript仍有 H1、正文和主要内链；
- Copy 成功与权限拒绝都要测试；
- Lighthouse 移动端 Performance、Accessibility、SEO ≥ 90，CLS < 0.1。

### CMS snapshot 与公开镜像

- frontmatter schema 100%；
- locale/slug 冲突 0；
- broken internal links 0；
- draft/preview 进入 sitemap/RSS 的数量 0；
- 缺 source/evidence 的 indexable 页数量 0；
- stale locale 生成 hreflang 的数量 0；
- secret scan 命中 0；
- mirror changed-file allowlist 越界数为 0，危险 symlink/path traversal fixture 必须失败；
- 新内容/翻译默认 draft/noindex/rights review required，Agent proposal 与 CMS form canonical semantic hash 一致；
- 相同 export revision 的输出 byte-identical，第二次运行 no-op；main SHA 漂移不 force-push；
- `cleared/community_attributed/review_required/restricted/takedown` 各有正负 contract fixture；
- 自然语言意图路由、目标 CMS 字段、最小 proposal、缺失字段不编造和 prompt-injection 拒绝均有回归测试；
- 测试不得调用真实 Claude/OpenAI 网络服务；用固定意图/文件 fixture 验证 Skill 与执行器合同。
- Codex SDK adapter 测试使用 fake SDK/thread：覆盖独立 runtime、CMS base revision 漂移、read-only review、超时/取消、审批、越界 proposal、失败清理和重复 run；普通 CI 不消耗真实模型额度。

## 14. Internal beta 定义与一天可行性

### 14.1 Day 1 walking skeleton

只有满足以下前提时，一天可做出可演示闭环：

- Cloudflare 账号、GitHub 权限已准备；CMS 包体可以部署，但当前动态 Admin/鉴权路径不满足 Workers Free 10 ms/request CPU 预算，必须先升级 Paid 或完成优化/拆分并复验；Access 必须在暴露任何平台或自定义 hostname 前准备，自定义 DNS 仅在绑定自定义域名时需要；
- 只做 Prompt 一个内容类型；
- 只做 en、zh-CN 两个 locale；
- 使用现有快照的 5–10 条 fixture，不在线抓 X；
- 一个 reviewer；内容由 CMS 人工批准，mirror bot 自动同步；
- Payload 正文用 Markdown textarea；
- 不做自动翻译、Lexical、全文搜索、冲突 UI 或生产备份；
- Agent proposal 直接使用 Codex/Claude Code + 仓库 Skills，不做 CMS 内嵌聊天 UI 或 Agent SDK runtime。
- Day 1 不依赖 Codex SDK；SDK runner 可在 Stable Internal Beta 并行接入，不阻塞交互式路径。

必须跑通一条黄金路径：

~~~text
fixture
→ normalize
→ Payload draft
→ content/source/rights revision-bound human approval
→ immutable export snapshot
→ 两个 locale Markdown + rights registry + README + manifest
→ deterministic gates
→ mirror bot direct fast-forward push main
→ post-push verify
→ Production
→ RSS/Sitemap
~~~

同时跑通一条最小 Agent-assisted CMS proposal 路径：

~~~text
“修改一个 Prompt 标题/正文” + 用户提供内容/brief
→ Codex / Claude Code
→ AGENTS + CMS proposal Skill
→ 受限 CMS draft proposal（draft/noindex/rights review required）
→ validate + proposal diff
→ CMS Preview / review-ready 摘要
→ 人工批准后进入同一 snapshot/mirror/deploy 链
~~~

Article 的“加一篇博客 / 挂到 `/blog`”合同改为先生成 draft/noindex CMS proposal，经 Article schema、Blog compiler/route、RSS/Sitemap 排除门禁后交给人工审核；进入公开 Blog 仍需 CMS approval、mirror verify 和 exact commit/hash 成功部署。

### 14.2 时间判断

- 单人估算：18–26 个专注工时。
- Claude + Codex 两条并行流：约 11–16 小时墙钟，节省约 35–45%。
- 三条执行流且合同提前冻结：约 9–13 小时。
- 在既有 Git/CMS/Preview 管线之上补齐 Agent-native Internal Beta：约 4–6 小时墙钟，可与 Article schema/Blog 路由并行。
- 在 Skills 已稳定后增加最小 Codex SDK runner：约 2–4 小时（wrapper、隔离 worktree、审计、fake SDK 测试）；可与 Article 实现并行。
- 若改为 Payload 内嵌 Claude Agent SDK、会话 UI、工具授权和运行时审计，额外增加约 0.5–1 天；不计入本 Internal Beta。
- 无法并行消除：Schema/URL 决策、D1 migration、真实 secrets/DNS、跨系统 E2E、mirror/release receipt 回写和人工验收。

因此：

- **一日端到端 demo：有条件可行。**
- **稳定 internal beta：建议 Day 2 完成 hardening 后命名。**
- **生产级抓取、多语言、冲突恢复和运营闭环：另行排期。**

### 14.3 分阶段手术顺序

1. Phase 0｜初始化 Git、分支保护、环境和 OpenAPI。
2. Phase 1｜内容 schema、根/目录 AGENTS/CLAUDE、内容 Skills、5–10 条 fixture、Python 编译器。
3. Phase 2｜Next L1–L4（含图片/视频 L2）+ Blog 静态路由、用户已选母版和 TypeScript/CSS/Tailwind 实现。
4. Phase 3｜Payload collections、Save Draft、revision-bound human approval。
5. Phase 4｜Agent 最小 proposal/validate/review-ready 与 CMS form canonical 一致性。
6. Phase 5｜可选 Codex SDK proposal runner、隔离 runtime、fake SDK 与 read-only 复审。
7. Phase 6｜CMS approval、immutable export snapshot、deterministic mirror 与 direct-main bot。
8. Phase 7｜post-push verify、RSS/Sitemap、exact commit/hash 部署与 release receipt。
9. Phase 8｜edge suppression、takedown、E2E、失败恢复、安全、prompt-injection 与可观测性。
10. Phase 9｜接真实 ingest、翻译工作流和规模化索引。

依赖顺序不可颠倒：先冻结内容/API 合同，再并行 frontend、cms、backend，最后做集成。

历史状态（已被 0011 取代）：旧 public repo/CI 与 CMS create-PR proof 曾运行，Cloudflare 远端 D1、
owner-only Access、CMS Worker 与 Pages Internal Beta Preview 也曾部署并通过对应 smoke。PR #2–#5
仅是历史证据，其中 #3 为禁止合并的失败候选；它们没有当前发布顺序，不得 merge/rebase 来发布内容。
远程 Cloudflare checkpoint 早于本次 cutover；新的 CMS approval/snapshot/direct-main mirror 与 release
receipt 必须分别以当前实现和新部署证据验收，不能从旧 PR、旧 Worker 或镜像 commit 推导上线完成。

当前 checkpoint：approval 与 PostgreSQL public snapshot producer、严格 mirror consumer/工作流和空 removal snapshot 合同已有实现与测试；旧 content-agent CLI/runner 已 fail closed。CMS 已在 Paid CPU 配置下完成黄金 Prompt 的 revision-bound approval；Access service identity、snapshot Bearer、direct-main mirror 与 post-push verify 已在 run [33761670885](https://github.com/ziyetsui/prompt-lab/actions/runs/33761670885) 跑通。前端固定读取 mirror commit `1a3352b85e5394fe899220418d9a8d8e67082661` 与 manifest `sha256:9fab060d9d201645ac49eeff72bd4fbbf71e9e2ef353a3cbea2d0b7ebb039ee6`，并部署到 Pages Internal Beta Preview `a4cb721c`；认证 smoke 已通过。签名 deployment callback、持久化 receipt 和 CMS `released` 投影尚未实现，因此该状态不是正式 production released。

## 15. Internal beta 验收

| Gate | 通过条件 |
| --- | --- |
| B-01 | 一个真实 PromptArtifact 有 en、zh-CN 两个独立文件 |
| B-02 | Payload Save Draft 与 revision-bound approval 分离；只有 reviewer/admin 能批准 |
| B-03 | approved snapshot 产生 exportRevision、mirror commit、manifest hash 和审计记录 |
| B-04 | schema、slug、locale、link、build 检查全部通过 |
| B-05 | CMS revision Preview 可访问、noindex、受 Access 保护 |
| B-06 | approval 前公开镜像无该内容；mirror verify 与部署后生产才有该内容 |
| B-07 | L1→L2→L3→L4 使用真实路径且可前进后退 |
| B-08 | zh-CN 页面不 fallback 英文页面正文 |
| B-09 | canonical、双向 hreflang、RSS、sitemap 正确 |
| B-10 | 页面计数与 API/索引一致，无硬编码虚假总数 |
| B-11 | Issue/Webhook/schedule 重放不产生重复 CMS 记录、mirror commit 或发布 |
| B-12 | 页面可追踪到 CMS revision、mirror commit 与 manifest；同 commit/hash 部署成功后才显示 released |
| B-13 | Preview、CMS、API secret 与日志泄漏数为 0 |
| B-14 | axe 无 critical/serious，Lighthouse 三项 ≥ 90 |
| B-15 | Codex/Claude Code 能把“加/改 Prompt、加/改 Article、挂到 /blog”路由为受限 CMS proposal |
| B-16 | 新内容默认 draft/noindex/rights review required，Agent 无 approval、mirror 或 deploy 路径 |
| B-17 | Agent proposal 与 CMS form 使用同一 schema/validator，canonical semantic hash 无分叉 |
| B-18 | proposal/mirror allowlist、path traversal、symlink、prompt injection 和 secret scan 负例全部通过 |
| B-19 | Agent 输出 proposed fields、实际验证结果、风险和 review-ready 摘要，人可在 CMS diff/Preview 中确认 |
| B-20 | 相同 export revision byte-identical 且重跑 no-op；main 漂移不 force-push，越界输出零 commit |
| B-21 | community 内容显示署名、原帖、作者保留权利和 takedown，且不显示 CC BY 再许可 |
| B-22 | takedown 通过优先事件生成 removal mirror/deploy，不只依赖四小时 schedule；edge suppression 在配置 SLA 内返回 410 并保持到移除验证完成 |

## 16. 风险与回退

| 风险 | 早期信号 | 回退 |
| --- | --- | --- |
| Payload Worker bundle/adapter 不兼容 | 构建超限、D1 migration 失败 | cms 转 Node container，合同不变 |
| approval 后 canonical revision 漂移 | snapshot 读取到的 revision/hash 与 approval receipt 不一致 | 终止导出并要求对新 revision 重新人工批准 |
| mirror `main` 并发漂移 | `expectedMainSha` compare-and-swap 失败 | 从新 head 重建完整 projection 后重试；禁止 force-push 或覆盖未知提交 |
| 静态文件数过快增长 | Pages 输出接近限制 | 分站/分批构建或迁移 Workers |
| 巨型 raw 数据拖慢 CI | checkout/build 时间上升 | raw 移 R2，Git 留 manifest/fixture |
| 翻译过期 | translatedFromRevision 不匹配 | 标 stale，撤 hreflang/sitemap |
| X 媒体失效/投诉 | 4xx 或 takedown | 优先 removal snapshot/mirror/deploy；有独立媒体权利时才保留 R2 副本 |
| 薄内容批量进入索引 | eligible 比例异常增长 | 默认 noindex，人工提高门禁 |
| UI spec 与 wireframe 冲突 | 偏离已定稿页面 | 以用户指定 flow-proto-full.html 已选方案和 frontend/AGENTS.md §7 为准；公开数据/安全合同不变 |
| Agent proposal 范围失控 | 提议越界字段、approval 或生成镜像变更 | CMS field/scope allowlist、base revision、最小 proposal；Agent 无发布凭据 |
| 内容携带 prompt injection | 读取 secret、执行命令或绕过审核 | 内容只作数据、工具 allowlist、无生产凭据、人工 diff |
| CMS/exporter 投影漂移 | 同一 snapshot 产生不同 Markdown/索引 | snapshot hash、byte-for-byte determinism、双跑 golden test，失败零 commit |
| mirror push 被误报为上线 | 部署失败但 CMS 显示 released | mirrored/deploying/released 分离、部署 attestation 匹配 commit/manifest、post-deploy smoke |
| community 内容被错误再许可 | 页面或 LICENSE 将第三方 Prompt 标成 CC BY | rights-aware exporter、license-scope 测试、署名/原帖/作者保留权利/takedown 固定披露 |
| mirror bot 权限过大 | token 可改 workflow、代码或非生成路径 | generated-only mirror repo、短期 GitHub App token、输出路径 allowlist、独立审计；同仓需 owner 明确接受残余风险 |

## 17. 实现前必须确认

1. 当前精简 CMS Worker 已证明包体可部署，但未兼容 Workers Free 的 10 ms/request CPU 预算；线上 1102 阻塞审批与 snapshot。需确认升级 Paid，或先完成 profile/优化/拆分并通过稳定性复验。
2. 是否确认继续把 `ziyetsui/prompt-lab` 作为 generated-only 公开镜像，或迁移至 `Ziye-OpenLab/prompt-lab`；若与代码同仓，owner 必须明确接受 GitHub Contents write 不能按路径限制的残余风险。
3. beta 是否接受 Payload Markdown textarea。
4. 首发 locale 是否固定 en + zh-CN。
5. X 媒体允许热链、缓存到 R2，还是先用占位图。
6. cms 是否必须全量运行在 Cloudflare；若官方模板 spike 失败，是否允许 Node host 回退。
7. 现有 35 条 X 来源记录是否逐条保留 `review_required`，还是由 owner 明确接受 YouMind 式风险后逐条迁移为 `community_attributed`；不得静默批量标为 `cleared`。
8. takedown 的人工响应 SLA、紧急停发责任人，以及何时需要进行 Git 历史清除。

这些决定不会改变 CMS-first / generated mirror 核心架构，但第 2、7、8 项会阻塞 direct-main mirror 的生产启用或社区内容迁移。

## 18. 一手资料

- [YouMind Markdown generator](https://raw.githubusercontent.com/YouMind-OpenLab/awesome-nano-banana-pro-prompts/main/scripts/utils/markdown-generator.ts)
- [YouMind CMS client](https://raw.githubusercontent.com/YouMind-OpenLab/awesome-nano-banana-pro-prompts/main/scripts/utils/cms-client.ts)
- [YouMind Issue → CMS workflow](https://raw.githubusercontent.com/YouMind-OpenLab/awesome-nano-banana-pro-prompts/main/.github/workflows/sync-approved-to-cms.yml)
- [YouMind README update workflow](https://raw.githubusercontent.com/YouMind-OpenLab/awesome-nano-banana-pro-prompts/main/.github/workflows/update-readme.yml)
- [Payload v3.88.0 release](https://github.com/payloadcms/payload/releases/tag/v3.88.0)
- [Payload Website Template](https://github.com/payloadcms/payload/tree/main/templates/website)
- [Payload localization](https://payloadcms.com/docs/configuration/localization)
- [Payload drafts](https://payloadcms.com/docs/versions/drafts)
- [Payload Markdown conversion](https://payloadcms.com/docs/rich-text/converting-markdown)
- [Payload Cloudflare D1/R2 template](https://github.com/payloadcms/payload/tree/main/templates/with-cloudflare-d1)
- [OpenBlog README](https://raw.githubusercontent.com/kostja94/openblog/main/README.md)
- [OpenBlog AGENTS.md](https://raw.githubusercontent.com/kostja94/openblog/main/AGENTS.md)
- [OpenBlog create-post Skill](https://raw.githubusercontent.com/kostja94/openblog/main/skills/create-post/SKILL.md)
- [OpenBlog publish Skill](https://raw.githubusercontent.com/kostja94/openblog/main/skills/publish/SKILL.md)
- [OpenAI Codex SDK](https://learn.chatgpt.com/docs/codex-sdk)
- [Cloudflare Next.js static deployment](https://developers.cloudflare.com/pages/framework-guides/nextjs/deploy-a-static-nextjs-site/)
- [Cloudflare Preview Deployments](https://developers.cloudflare.com/pages/configuration/preview-deployments/)
- [Next.js static export limits](https://nextjs.org/docs/app/guides/static-exports)
- [Cloudflare Python Workers](https://developers.cloudflare.com/workers/languages/python/)
- [Cloudflare FastAPI](https://developers.cloudflare.com/workers/languages/python/packages/fastapi/)
- [Cloudflare Pages limits](https://developers.cloudflare.com/pages/platform/limits/)
- [GitHub REST create refs](https://docs.github.com/en/rest/git/refs?apiVersion=2022-11-28)
- [GitHub REST pull requests](https://docs.github.com/en/rest/pulls/pulls)
- [GitHub status checks](https://docs.github.com/en/pull-requests/reference/status-checks)

2026-09-04 页脚导航追加裁定：Footer 的模型、任务、风格、主题项分别进入对应 models/use-cases/styles/subjects 实体路径；任务延用 Findings，风格延用 Plate，主题采用现有分类列表。All models / All creators 分别进入独立目录。只使用真实 registry，不再使用关键词搜索或首页锚点替代对应页面；本地 fixture 中已登记的空分类保留真实空状态，正式站仍以 approved catalog 为准。

2026-09-04 模型系列合并：全站 Browse by model、Footer By model、All models 目录按系列展示。Nano Banana 合并 nano-banana / nano-banana-pro / nano-banana-2，GPT Image 合并 gpt-image / gpt-image-2；其余已登记模型保持独立。系列页使用 /{locale}/prompts/model-families/{familySlug}，沿用 Anthology，汇集成员模型提示词并按 immutable id 去重计数；原具体版本页和精确模型筛选保留原语义。分组是前端导航投影，不新增 CMS taxonomy 或虚构 backend family API；正式系列页默认 noindex，不能继承单个版本的 SEO 审核状态。

2026-09-04 用户追加 L4 生成入口裁定：所有 Recipe 页的 Generate image / Generate video / Generate CTA 直接打开 https://bo.video/home（新标签页），不再因单条 actions.tryUrl 为空而禁用。该导航不自动提交 Prompt、变量或启动生成；L1–L3 仍进入各 Prompt 的 L4，scratchpad 的行为保持原合同。


### 2026-09-04 SEO 输出一致性修复

- public-api配置必须校验FRONTEND_SITE_URL为HTTPS纯origin；缺失/无效终止，不能以成功构建的Disallow全站代替。
- Prompt SEO领域映射保留已验证DTO的hreflang，不由部署origin重建。canonical origin必须与公开构建站点一致；语言变体仍按合同数据保留。
- 前端只读surface SEO桥从同revision、hash校验的route-manifest.json及sitemap.xml读取L1/Blog列表资格；不新增后端不存在的home.seo，也不编辑生成镜像。别名路径与无资格系列页不提升索引。
- finalizer复制sitemap前检查每个loc的HTML canonical精确一致且没有noindex；错误构建失败。fixture仍空sitemap/noindex。
- SEO兜底文案按页面类型与真实关系生成；CMS SEO优先。favicon为静态资产，兼容Cloudflare export。

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


2026-09-04 全链路工程验证补充：视觉样本验证必须显式使用 `build:visual`；匿名公共读链使用 `scripts/check-public-frontend.mjs`，从仓库合同 fixture 编译、启动临时只读 API、固定 revision 构建前端并校验导出。CI 的 noindex Preview artifact 使用该链后由 prepare-preview 合并和隔离。该入口仅验证工程合同，不把 repository fixture 当作 CMS canonical 内容，不推进 public/mirror/release 状态。CMS snapshot→generated mirror→root compiler 的 surface 合同、CMS draft Preview、撤下事件派发与部署回执仍须分别验证，不得用单模块绿灯替代端到端发布证据。
