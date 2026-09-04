# 0011｜PromptLab YouMind-style CMS 发布与 Git 公开镜像策略

Status: Accepted v1.4; CMS approval and generated mirror operational, Internal Beta exact-mirror Preview deployed, formal release receipt pending
Owner: BO
Last updated: 2026-09-03
Product contract: [0008-prd.md](./0008-prd.md)
Technical contract: [0009-pseo-tech-arch.md](./0009-pseo-tech-arch.md)

## 0. 决策与取代范围

PromptLab 采用 **CMS-first 内容治理 + GitHub 生成镜像**：

- Payload CMS 是 Prompt、Article、locale、taxonomy、来源、权利审核和编辑状态的唯一内容事实源；
- GitHub `main` 中的 Markdown、JSON、索引和多语言 README 是由已审核 CMS 快照确定性生成的公开镜像，不是反向编辑入口；
- 人工审核发生在 GitHub Issue intake 和/或 Payload CMS；通过审核的数据才可进入 export snapshot；
- 专用 mirror bot 可以在校验成功后直接 fast-forward push 公开镜像仓库的 `main`，不为每条内容创建 PR；
- 代码、schema、workflow、Agent 规则和 exporter 本身仍必须通过普通 branch、CI 和人工 PR 修改；
- CMS `approved`、Git mirror commit 和生产站 `released` 是三个不同事实，不得相互冒充。

本文件自 2026-09-03 起取代 `0008-prd.md`、`0009-pseo-tech-arch.md` 以及项目 Agent 文档中所有以下旧策略：Git `main` 是内容事实源、Payload 只是 Git 草稿投影、每条内容必须经 branch/PR/merge 发布、Agent 直接编辑 canonical `content/**`、CMS 不得由受控机器人直推镜像 `main`。旧 PR #3/#4/#5 及其验证结果只保留为历史实现证据，不再定义当前发布路径。发生冲突时以本文件为准。

### 0.1 当前实现与上线边界（2026-09-03）

已实现 revision-bound approval、独立 rights revision、只读 snapshot endpoint、PostgreSQL repeatable-read/pagination-closed producer、严格 generated-mirror consumer、空 removal snapshot 和 expected-main-SHA fast-forward workflow。旧 per-content publisher/endpoint/UI 已从 active runtime 移除；旧 Markdown/worktree content-agent CLI 与 runner 固定 fail closed。受限 create-Prompt CMS proposal endpoint、`agent_proposer` API 身份、不可变 audit 与 host client 已在本地实现并通过验证，但尚未部署到当前线上 Worker；edit/route 与自然语言/SDK orchestration 仍未实现。

2026-09-03 已把 Cloudflare CMS 从 D1 切换到 Neon PostgreSQL + Hyperdrive，并把 Worker 升级到 Paid CPU 配置；首 admin 创建后线上 user 为 1。当前已部署版本 `51e73e54-3282-4228-9ac2-6ebbb9d171d0` 使用 request-scoped PostgreSQL pool、`CMS_DATABASE_ADAPTER=postgres`、`CMS_POSTGRES_TRANSPORT=hyperdrive`，且没有 D1 binding。D1 export 到 PostgreSQL 的 apply 与独立 repeatable-read verify 均得到 51 张共享表、940 行 checksum parity。

授权人 `ziyetsui` 已在 CMS 对黄金 Prompt `prm_80934ec28db44eec9c8a500111072136` 完成 revision-bound approval；当前公开投影为 1 条 Prompt，35 条 wireframe/X seed 继续保持 `review_required`。带 Cloudflare Access service identity 与独立 snapshot Bearer 的线上快照已由生成镜像 workflow 消费；GitHub Actions run [33761670885](https://github.com/ziyetsui/prompt-lab/actions/runs/33761670885) 的 prepare、push、post-push verify 全部通过。公开镜像 commit 为 `1a3352b85e5394fe899220418d9a8d8e67082661`，export revision 为 `sha256:7ea734603e1ca5976d0f35636cb615ffd542c572521ccece86f8eabfe5601114`，manifest 为 `sha256:9fab060d9d201645ac49eeff72bd4fbbf71e9e2ef353a3cbea2d0b7ebb039ee6`。

前端已从上述精确 mirror commit/manifest 静态构建，并部署为受 Access 保护的 Cloudflare Pages Internal Beta Preview `a4cb721c`。认证黑盒 smoke 已验证 Prompt 列表、详情与 model 页为 200，未知 Prompt 为 404/noindex，CSS 为 200；详情显示来源证据与 `CC BY 4.0`。该部署由当前未整理的工程 worktree 生成，且 CMS 尚无签名 deployment callback、持久化 deployment/smoke receipt 与 release-state projection，因此只能报告为 `approved + mirrored + Internal Beta Preview deployed/smoked`，不得报告为正式生产 `released`。

## 1. 已验证的 YouMind 机制与我们的采用边界

YouMind OpenLab 当前公开实现提供四个可验证模式：

1. GitHub Issue Form 强制投稿者确认其有权提交，并同意 CC BY 4.0；
2. 维护者添加 `approved` 标签后，GitHub Actions 将 Issue 内容同步到 CMS；
3. 生成任务每四小时从 CMS 读取内容并重建多语言 README；
4. 机器人把生成的 README 直接提交并 push 到 `main`。

PromptLab 采用其 **Issue → 人工批准 → CMS → 定时生成 → bot push main** 的方向，但不复制以下弱点：

- `approved` 标签不能绕过当前 Issue 正文、必填授权确认、操作者权限和 CMS schema 校验；
- 不在日志中打印完整 Prompt、个人数据或 secret；
- 图片下载失败不能留下“正文已同步、证据未同步”的无声明部分成功；
- 社区公开采集内容不能因为仓库有 CC BY 4.0 就被自动再许可；
- mirror bot 不能成为修改代码、workflow、license 或 Agent 规则的通用凭据；
- 定时 push 成功不等于生产站部署成功。

## 2. 权威数据与投影

| 数据 | 权威位置 | 对外含义 |
| --- | --- | --- |
| 原始抓取 payload、原媒体归档 | R2/不可变对象存储 | 证据，不直接公开 |
| Prompt/Article、locale、taxonomy、来源和审核 | Payload CMS 数据库及版本记录 | 唯一内容事实源 |
| 权利决策 | CMS `SourceEvidence`/rights review 审计 | 决定能否进入 export snapshot |
| 公开 Markdown/JSON/README | `ziyetsui/prompt-lab` 的 `main` | CMS 审核快照的可重建公开镜像 |
| Preview | CMS draft snapshot + 受 Access 保护的 Preview | 未发布、noindex |
| 生产页面、RSS、Sitemap | 最后一个验证并部署成功的 mirror commit | 对外 released 版本 |

公开镜像的任何人工编辑都会在下一次全量生成时被覆盖。发现镜像错误时必须修正 CMS 或 exporter，再重新生成；不得把 Git 中的手工 hotfix 当成新的内容事实。

## 3. 内容入口与人工审核

### 3.1 GitHub Issue 投稿

至少提供两种互斥 intake 类型：

- **原创或获授权投稿**：投稿者必须确认有权提交，并明确同意适用的 CC BY 4.0 条款；
- **社区线索**：投稿者只提供作者、作者主页、原帖和内容线索，不声称拥有权利，也不能自动进入 `cleared`。

维护者添加 `approved` 标签前必须检查来源、重复、内容安全和对应 rights path。同步任务必须重新读取 GitHub 上的当前 Issue，而不是只信任事件 payload；必须校验模板类型、必填字段、checkbox、`prompt-submission` 标签、批准者身份、Issue `updated_at` 和正文 hash。Issue 在批准后发生实质修改时，旧批准失效并回到审核。

同一 `repository + issueNumber + issueRevision` 只产生一次 CMS intake；Webhook 或 label 事件重放不得产生重复记录。

### 3.2 CMS 编辑与 Agent 提案

编辑者可以直接在 CMS 保存草稿。Codex/Claude Code 或受控 SDK 只能：

- 生成符合 CMS schema 的 draft proposal；
- 通过调用者授权的受保护接口创建或修改草稿；
- 运行验证并展示 proposed diff；
- 请求人工审核。

Agent 不得直接编辑生成镜像、设置 `approved`、填写无法验证的权利信息、取得 mirror bot 凭据或调用 released 状态。自然语言请求不等于权利批准。

### 3.3 审核结果

CMS editorial state 至少区分 `draft | needs_review | approved | rejected | archived`。只有 reviewer/admin 能从 `needs_review` 进入 `approved`，且审批必须绑定：

- immutable content id 与 locale；
- content revision 与 source revision；
- rights policy version；
- approver id、UTC timestamp 和证据；
- 完整 schema/安全/locale/媒体校验结果。

任何正文、来源、rights 或媒体变化都会生成新 revision，并使旧审批失效。

## 4. Rights Status 与许可证边界

Rights status 是独立于 editorial/release state 的维度：

| 来源 | `rightsStatus` | 必需证据 | 发布处理 |
| --- | --- | --- | --- |
| 作者本人或获授权投稿并完成许可确认 | `cleared` | 投稿 Issue/直接授权、reviewer、时间、证据 URL、CC BY 4.0 或明确许可引用 | 可进入 approved snapshot |
| 原页面明确标注兼容许可证 | `cleared` | 原页面、许可证 URL/版本、作者归属、reviewer、时间 | 按来源许可证和署名要求导出 |
| 仅从 X/公开社区发现 | `community_attributed` | 作者、作者主页（如有）、原帖、reviewer、时间、policy version、风险接受记录、takedown URL | 作者保留权利；展示署名、原帖和删除入口；不得宣称 CC BY |
| 未完成审核 | `review_required` | 可保留采集证据 | 仅 CMS/受保护 Preview；不得导出公开镜像 |
| 明确限制或不允许使用 | `restricted` | 限制依据 | 不得导出；已公开时触发 removal |
| 投诉或删除决定 | `takedown` | case id、处理人、时间、适用范围 | 立即触发优先 removal sync |

状态规则：

- `unknown → review_required → cleared | community_attributed | restricted`；
- 任一可发布状态收到新风险、来源变更或投诉后可以退回 `review_required` 或进入 `restricted/takedown`；
- `takedown` 对当前 revision 为终止状态；重新发布必须产生新 revision 和全新人工审核；
- Issue checkbox 是投稿者声明，不是第三方权利的自动证明；
- `community_attributed` 是经人工接受的 notice-and-takedown 发布路径，不是版权许可或法律结论。

许可范围：

- 软件、schema、exporter 和自动化使用 MIT；
- 项目原创或权利人明确授权的 Prompt 内容可以使用 CC BY 4.0；
- `community_attributed` 的 Prompt 原文、第三方媒体、商标、肖像及引用继续由原权利人控制，公开页面和镜像记录必须明确 `Author retains rights / 作者保留权利`；
- 项目编写的说明或翻译与第三方 Prompt 原文必须分开标注，不得用项目说明的许可证覆盖原文；
- 社区内容的媒体若没有独立许可，不得复制到 Git/R2；只能使用经过策略允许的引用方式或占位图。

现有 35 条 wireframe/X seed 继续保持 `review_required`。采用本策略本身不构成逐条或批量公开授权；必须先输出 readiness report，并由 owner 明确批准迁移范围，随后逐条通过署名、来源、媒体、安全和 rights review。

## 5. CMS export snapshot

Exporter 只能读取不可变、分页闭合的 CMS snapshot。Snapshot 至少包含：

- `exportRevision`；
- 每条记录的 immutable id、locale、content revision、source revision 与 rights revision；
- editorial approval 与 rights decision 的不可变引用；
- taxonomy/site/surface revisions；
- exporter schema version。

一条 locale 只有同时满足以下条件才可导出：

1. editorial state 为 `approved`；
2. 审批绑定当前 content/source/rights revisions；
3. rights status 为完整的 `cleared` 或 `community_attributed`；
4. locale、slug、来源、证据、关系、媒体和安全校验通过；
5. translation ready 且 source revision 未过期；
6. 公开资格满足对应 index/noindex 规则。

Exporter 不能查询“正在变化的一组列表”后自行拼接；读取过程中 revision 变化必须整体失败并重取 snapshot。

## 6. 确定性 Git 公开镜像

同一 `exportRevision + exporterVersion` 必须产生 byte-identical 输出。允许的生成路径为：

```text
content/prompts/**
content/articles/**
content/taxonomies/**
content/site.json
content/surfaces.json
governance/content-rights.json
README.md
README_*.md
catalog.json
locales/**/index.json
locales/**/taxonomies.json
mirror-manifest.json
```

`mirror-manifest.json` 至少记录 CMS export revision、exporter version、排序后的生成文件 SHA-256 和内容数量。时间戳不能进入内容 hash；若需要展示生成时间，必须与确定性 revision 分开。

全量生成必须：

- 在临时空目录构建，不在 checkout 中边查 CMS 边写文件；
- 使用固定排序、稳定 JSON 和 LF；
- 删除已经不在 snapshot 中的旧生成文件；
- 校验 schema、rights、locale/slug、链接、媒体、secret、unsafe HTML、索引、RSS/Sitemap 和 manifest；
- 比较 allowlist，发现任何非生成路径变化即 fail closed；
- 校验失败时不 commit、不 push，并继续服务 last-known-good mirror/release。

## 7. Mirror bot 直推 `main` 协议

生成镜像不走逐内容 PR。通过完整门禁后，专用 mirror bot 可以把一个完整 snapshot commit 直接 fast-forward push 到 `ziyetsui/prompt-lab/main`。

最低安全合同：

1. 仅 mirror bot service identity 获得例外；人类、Agent、CMS hook 和普通 Backend 请求仍禁止直推、force-push 或删除 `main`；
2. bot 凭据只安装在镜像仓库，存于 GitHub/Cloudflare secret store；不进入 CMS 数据库、Prompt、日志、diff 或模型上下文；
3. exporter 使用只读 CMS snapshot token；CMS webhook 不持有 Git 写凭据；
4. checkout 不保留通用 Git 凭据；写入步骤只接收一次运行所需的短期 token；
5. push 前读取当前 `main` SHA 并执行 compare-and-swap；SHA 漂移时重新抓取、重建和校验，禁止 force-push；
6. 同一 export revision 已存在时返回 no-op，不制造空 commit；
7. commit message/trailer 记录 `CMS-Export-Revision`、`Mirror-Manifest-SHA256`、`Exporter-Version` 和触发来源，不记录敏感正文；
8. push 后运行独立的 mirror verify/build；失败时停止部署、报警，并保留 last-known-good release；
9. schedule 默认每四小时 reconciliation；CMS approval、rights downgrade 和 takedown 额外触发事件同步；
10. 生成 commit 不得再次无限触发生成任务；同一 revision 的 schedule/event 重叠由单并发锁和幂等键合并。

GitHub 仓库级 `Contents: write` 不能按路径限制。推荐把公开 PromptLab 变成 generated-only mirror repository，并把 exporter/schema/workflow 源码留在受 PR 保护的工程仓库。若继续在同仓保存代码，path allowlist 只是应用层防线，bot 在平台权限上仍能修改整个仓库；上线前必须由 owner 明确接受该剩余风险，并启用固定 exporter revision、独立 post-push 审计和异常冻结。

## 8. Preview、公开站与 released

- CMS draft Preview 读取带 revision 的 CMS snapshot，必须 `noindex,nofollow` 且受 Access/RBAC 保护；
- Git mirror commit 表示“该 CMS snapshot 已公开镜像”，不表示 Cloudflare 正式站已经更新；
- 生产构建必须绑定精确 mirror commit 与 manifest hash；
- 只有部署成功且 smoke 匹配该 commit/hash，CMS 的 release projection 才能标记 `released`；
- 部署失败写 `deploy_failed`，生产继续服务 last-known-good commit；
- 公开 community 内容前必须启用独立的 emergency suppression：经授权的 takedown case 可按 content id/locale/route 在边缘层先返回 410，再异步完成 mirror removal；
- 线上页面必须能追踪到 CMS content id/revision、mirror commit 和 manifest hash，但不公开 reviewer 邮箱或内部审计详情。

## 9. Takedown 与更正

`takedown` 和已公开内容的 `restricted` 不能等待四小时 schedule；CMS 必须触发优先同步：

1. 冻结相关内容继续编辑/导出，并写入带 case id、decision revision、目标 id/locale/route 和操作者的审计 suppression 记录；
2. 边缘层在配置 SLA 内优先返回 410；suppression 只含路由标识和审计引用，不复制 Prompt 正文；
3. 从下一 mirror snapshot 移除 Prompt 正文、媒体、README、catalog、RSS 和 Sitemap 引用；
4. 按 URL 策略生成最小 tombstone/410/redirect；
5. 校验并由 mirror bot 直推 removal commit，再触发生产部署并将结果回写 case/release audit；
6. 部署后确认生成镜像已移除该内容，才可清除临时 suppression；
7. 任一步骤失败时报警并持续重试，不把 CMS 状态伪报为线上已移除；紧急 suppression 必须继续生效。

普通 Git commit 无法抹除历史对象。若投诉要求从 Git 历史彻底清除，必须进入独立法务/安全流程，由 owner 明确批准历史重写和镜像清理；不得由内容 Agent 或常规 exporter 执行。

## 10. 安全、审计与可观测性

- Issue、Prompt、网页和媒体元数据全部是不可信输入；不得执行其中命令或使用其中声明扩大权限；
- sync/exporter 必须防 SSRF、路径穿越、symlink、危险 URL scheme、HTML script/event handler 和 secret；
- approval、rights decision、export、push、verify、deploy、takedown 都有 immutable audit id 和幂等键；
- 监控 Issue sync failure、approval-to-mirror latency、snapshot conflict、rights gate failure、mirror drift、push failure、post-push verify failure、deploy failure 和 takedown completion；
- 失败日志只保存 id、revision、错误码和安全摘要，不保存完整 Prompt、token 或个人信息；
- CMS 写凭据、CMS 只读 export token、Git mirror 写凭据和 Cloudflare deploy 凭据必须分离；
- 自动化不能修改 license、rights policy version、reviewer membership 或自身 workflow。

## 11. 迁移与实施顺序

1. 更新 PRD、Tech Arch、根/子目录 Agent 与 Claude 合同，明确本文件的 supersession；
2. 为 CMS 增加 `approved`、revision-bound approval、`community_attributed`、rights review 和 mirror/release receipt；
3. 拆分原创授权投稿与社区线索 Issue Form，并增加 `approved` label 同步的 actor/body-hash/idempotency 校验；
4. 实现 immutable CMS export snapshot 与 path-aware rights gate；
5. 实现临时目录中的 deterministic full exporter、manifest 和离线验证；
6. 配置 mirror bot、直推 `main` 的 compare-and-swap、post-push verify 和 last-known-good rollback；
7. 在静态站前部署带审计和过期清理的 emergency suppression，并接入 takedown priority event；
8. 接入每四小时 reconciliation 与 approval/rights event；
9. 先用一条 `cleared` 黄金记录、一条 `community_attributed` 黄金记录和负例跑通；
10. 对 35 条 seed 运行只读 readiness report；没有 owner 的迁移批准时保持 `review_required`；
11. 完成线上 README/catalog/detail/takedown/redeploy E2E 后再扩大导出。

旧的 PublicationRequest 审计行、公开 PR #3/#4/#5 及其说明可以保留为历史证据；可执行的 PublicationRequest → content branch → PR publisher、端点、UI 控件和常驻脚本不得继续留在可部署运行时，也不得作为回滚发布路径。若未来要重新引入任何内容 PR 流程，必须经过新的 ADR、威胁建模和 owner 明确批准，不能通过环境变量或隐藏开关复活。

## 12. 验收标准

| ID | 通过条件 |
| --- | --- |
| CMS-01 | CMS approved revision 是 exporter 的唯一内容输入；直接修改镜像不能改变下一次生成结果 |
| CMS-02 | 未授权用户、Agent 或 Issue label actor 不能设置 approved 或 rights decision |
| CMS-03 | 可部署 CMS/Backend 不包含可调用的 per-content Git branch/PR publisher、端点或 UI；旧 PR 只存在于外部历史和只读审计记录 |
| INTAKE-01 | 原创投稿缺任一授权 checkbox 时，即使有 `approved` 标签也不写入 approved CMS 记录 |
| INTAKE-02 | Issue 在批准后修改正文，旧 body hash 审批失效；事件重放不产生重复记录 |
| RIGHTS-01 | `review_required/restricted/takedown` 记录进入新增公开 snapshot 的数量为 0 |
| RIGHTS-02 | `cleared` 缺 basis/reviewer/time/evidence/license 任一项时导出失败 |
| RIGHTS-03 | `community_attributed` 缺作者、原帖、review、risk acceptance 或 takedown URL 时导出失败 |
| RIGHTS-04 | community 页面、README 与机器索引均显示署名、原帖、作者保留权利和删除入口，且不会显示 CC BY 再许可 |
| RIGHTS-05 | 未单独审核的第三方媒体复制到 Git/R2 的数量为 0 |
| MIRROR-01 | 同一 export revision 和 exporter version 两次生成 byte-identical；第二次运行不产生 commit |
| MIRROR-02 | exporter 产生 allowlist 外变化、secret、unsafe HTML、broken link 或 schema 错误时零 commit、零 push |
| MIRROR-03 | `main` SHA 漂移时不会 force-push；任务重新生成或安全失败 |
| MIRROR-04 | mirror commit 能追踪到 CMS export revision、manifest hash 和 exporter version |
| MIRROR-05 | 合法空 snapshot 可删除最后一条 Prompt 与无引用 taxonomy，保留 site locale/空索引，并确保详情 URL、RSS、Sitemap 不再引用被撤下内容 |
| RELEASE-01 | post-push verify 失败不部署；部署失败不写 released，并继续服务 last-known-good commit |
| RELEASE-02 | 线上页能追踪到精确 CMS revision 与 mirror commit，README/catalog/页面数量一致 |
| TAKEDOWN-01 | takedown 使用事件触发而非只等四小时 schedule；边缘 suppression 在配置 SLA 内返回 410，并最终生成可审计 removal commit 与部署结果 |
| SECURITY-01 | CMS、export、Git write、deploy 四类凭据相互隔离，日志与生成文件 secret 命中为 0 |
| MIGRATION-01 | 35 条 seed 在 owner 明确批准前仍为 `review_required`，不会因 schema migration 自动公开 |

## 13. 风险与未决决定

| 风险/决定 | 当前处理 |
| --- | --- |
| `community_attributed` 是否适合具体司法辖区和内容 | 这是 owner 的风险决定，不等于法律意见；逐条审核、署名、原帖、作者保留权利与 takedown 只能降低风险 |
| 现有 35 条是否批量采用社区归因路径 | 未授权；先 readiness report，再由 owner 明确确认范围 |
| takedown 的分钟级 SLA | 尚未确定具体数值；community 内容生产启用前必须确定，并验证 edge suppression、事件同步和升级责任人 |
| 同仓 bot 的平台级写权限过宽 | 推荐 generated-only mirror repo；同仓上线需要 owner 接受剩余风险 |
| Git 历史仍含被移除正文 | 普通 removal 只改变当前版本；彻底清理走单独法务/安全流程 |
| 第三方媒体权利 | 与 Prompt 文本分开审核；不明确时只用占位或安全引用 |
| CMS 不可用或 snapshot 不闭合 | 不生成新镜像，继续服务 last-known-good，不从 Git 反向覆盖 CMS |
| PostgreSQL/Hyperdrive 长期运行与 release receipt 尚未闭环 | Paid CPU、Access service identity、snapshot Bearer 与单条 approval→snapshot→mirror 已在线跑通；一次成功不能证明长期稳定。继续监控 CMS，并实现签名 deployment callback、持久化 receipt 与 CMS release projection；失败时停止新镜像并继续服务 last-known-good，不得降级为 best-effort 拼接 |

## 14. 一手资料

- [YouMind Prompt 投稿表](https://github.com/YouMind-OpenLab/awesome-nano-banana-pro-prompts/blob/main/.github/ISSUE_TEMPLATE/submit-prompt.yml)
- [YouMind approved Issue → CMS workflow](https://github.com/YouMind-OpenLab/awesome-nano-banana-pro-prompts/blob/main/.github/workflows/sync-approved-to-cms.yml)
- [YouMind CMS 同步脚本](https://github.com/YouMind-OpenLab/awesome-nano-banana-pro-prompts/blob/main/scripts/sync-approved-to-cms.ts)
- [YouMind 每四小时 README 生成并直推 main](https://github.com/YouMind-OpenLab/awesome-nano-banana-pro-prompts/blob/main/.github/workflows/update-readme.yml)
- [YouMind README 社区来源与删除声明](https://github.com/YouMind-OpenLab/awesome-nano-banana-pro-prompts/blob/main/README.md)
- [Creative Commons FAQ](https://creativecommons.org/faq/)
