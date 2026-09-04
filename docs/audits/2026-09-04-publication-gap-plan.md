# CMS → mirror → compiler 发布合同缺口与工程计划

审计日期：2026-09-04。范围：只读核查规范与实现，仅新增本文档。本文不是新的 ADR、内容批准、发布授权或完成证明。其他 Agent 同时修改工作区；本文不覆盖其代码和审计记录。

结论：现有合法 CMS snapshot 能被 mirror consumer 接受，但不能直接被 root compiler 消费。没有找到已实现、可直接接通且保留 canonical 来源的 adapter。必须先补齐 CMS site/surface 与版本合同，再升级 producer、consumer 和工程构建输入。不能把仓库 `content/**` fixture 复制进 CMS mirror 补洞。

## 1. 现行规范已经决定什么

| 问题 | 已接受合同 | 尚未定义的可执行细节 |
| --- | --- | --- |
| canonical 内容来源 | [0011 §0、§2](../../specs/0011-promptlab-youmind-cms-publication.md) 指定 Payload CMS 为 Prompt、Article、locale、taxonomy、来源和审核的唯一事实源；§5 要求 snapshot 包含 taxonomy/site/surface revisions。 | site/surface 的 CMS collection 或 global、版本读取接口、审核绑定字段与迁移输入尚未落到代码。不能从“要求 revision”推导出某份 fixture 已获批准。 |
| mirror 可生成的路径 | 0011 §6 明列 `content/articles/**`、`content/taxonomies/**`、`content/site.json`、`content/surfaces.json`。 | 这是目标 allowlist，不表示当前 consumer 已支持这些全部类型；新增类型仍需具体 schema、rights 和关系校验。 |
| schema 的来源 | 0011 §0、§7 要求 schema/exporter/workflow 走工程 PR，并推荐留在受保护工程仓库。它们不是 CMS 内容，也不在 §6 生成路径内。 | 尚无将工程 schema 版本/摘要、exporter 版本与某个 CMS envelope 绑定的构建输入清单和兼容矩阵。不能让 mirror Bot 把 schemas 写入生成镜像。 |
| schema 升级 | [0009 §5.4](../../specs/0009-pseo-tech-arch.md:379) 要求迁移器、golden fixture、向后兼容/失败策略；0011 §5、§6 要求 exporter schema/version 和确定性 manifest。 | 0011 未定义 envelope v1→下一版的读取兼容、启用顺序、旧 manifest 处理、最低 consumer 版本或回滚协议。现行文字不是完整升级实现合同。 |
| Article | 0011 要求 CMS canonical、人工审核与镜像发布；0009 §5.4 定义独立 Article schema，§8 允许前端读取同一 approved snapshot 的 compiler Article 产物。 | Article CMS 保存、approval/rights/withdrawal、snapshot 读取和镜像导出没有已注册实现。Article HTTP API 也未实现；静态 Blog 路径不依赖先虚构这个 API。 |

无需重新决定“谁是 canonical”或恢复内容 PR 链。需要补充的是现有架构的版本化实现合同。

## 2. 实际不兼容点

| 缺口 | Producer / mirror 现状 | Compiler / backend 现状 | 结果 |
| --- | --- | --- | --- |
| surfaces 缺失 | [PublicSnapshotReadSession](../../cms/src/snapshot/types.ts:40) 只提供 approvals、withdrawals、validateApproval；没有 site/surface 读取。producer 不生成 surfaces；[consumer allowlist](../../prompt-lab/scripts/sync-cms-snapshot.mjs:196) 不允许该路径。 | [validateContent](../../infra/lib/content-pipeline.mjs:1105) 无条件读取 `content/surfaces.json`，第 1119 行要求文件存在。 | 已实测合法 mirror→compiler 在此 ENOENT，尚未进入其他字段校验。 |
| site 字段不同 | [installSiteFile](../../cms/src/snapshot/publicSnapshotService.ts:818) 写固定站名、默认 locale 和支持 locales；没有 `canonicalOrigin`。[validatePublicSite](../../prompt-lab/scripts/sync-cms-snapshot.mjs:605) 用 closed keys 明确不接受 canonicalOrigin。 | [site schema](../../schemas/site.schema.json:7) 和 [backend site model](../../backend/src/pseo/adapters/git_catalog.py:53) 要求 canonicalOrigin。 | 仅补 surfaces 后仍不能形成相同 site 合同；不能从部署 env 或任意 Prompt URL 猜测站点政策。 |
| 空 removal snapshot locale 不同 | `installSiteFile` 从现存 Prompt 计算 publishedLocales；最后一条删除后为 `[]`，consumer 允许。 | site schema 要求至少一个 published locale；root 空内容测试保留已配置 locale，以生成空索引和安全路由。 | 必须定义“站点已启用语言”和“当前语言有内容”的区别，不能用是否存在 Prompt 决定站点语言政策。 |
| Article 不在 active export 类型内 | [CMS 注册集合](../../cms/src/collections/index.ts) 无 Article、Site、Surface；producer 收集 Prompt approved bundles，counts 无 Article。[consumer](../../prompt-lab/scripts/sync-cms-snapshot.mjs:196) 只接 Prompt 与 content-type/model taxonomy。写入 runner 还有独立固定 [allowlist](../../prompt-lab/.github/workflows/sync-cms-snapshot.yml:351)。 | compiler 已有 Article schema、author/category/tag taxonomy 和 Blog 投影。 | 本地 Article compiler 测试通过不代表 CMS Article 发布已接通。不能只扩展正则。 |
| 工程输入与 mirror provenance 未绑定 | envelope/manifest 都是 schemaVersion=1；[exporterVersion 校验](../../prompt-lab/scripts/sync-cms-snapshot.mjs:222) 仅校验字符串格式。 | [backend revision 算法](../../backend/src/pseo/adapters/git_catalog.py:303) 依赖 content/site、surfaces 和工程 schemas；[Worker bundler](../../backend/src/pseo/cloudflare_bundle.py:85) 仍要求同一干净 main checkout。 | generated-only mirror 与工程 schema checkout 是不同来源，需要显式组合和摘要凭证；不能用当前工程 HEAD 代替 mirror SHA。 |

taxonomy 中已有 L2/L3 `surface` 字段只描述该 taxonomy 的路径，不包含完整 L1/L4、站点语言政策、统一 surface revision 或站点 robots 政策。它不能自动替代缺失的 canonical site/surface 模型。

root `surfaces.schema.json` 目前明确是 Internal Beta/noindex 合同。填入真实 CMS 记录之后仍需遵守该资格；“接通编译”不授予 indexable 或正式上线资格。

## 3. 可复用入口与不可直接复用的部分

| 入口 | 可以复用 | 接通前必须补齐 |
| --- | --- | --- |
| `cms/src/snapshot/payloadPublicSnapshotSource.ts` 的一致性读取，`PublicSnapshotSource.readConsistently()` | PostgreSQL 同一读取边界、分页闭合、审批 revision 校验。 | 同一事务内读取已审核 site/surface、Article 及其 revision；不能在事务外临时拼接配置。 |
| `cms/src/snapshot/publicSnapshotService.ts` | approved bundle 投影、rights/audit、确定性排序与 hash、withdrawal 排除。 | 版本化 site/surface 投影、Article 类型、locale 政策和完整 exportRevision 输入。 |
| `validateSnapshotEnvelope()`、`syncValidatedSnapshot()`、`verifyMirrorDirectory()` | 严格 envelope、path/hash/rights 门禁、事务式本地树、幂等与 Git 验证。 | 下一版类型的 closed schemas、路径与关系、计数、旧 manifest 读取策略，以及隔离 writer 的同版本校验。 |
| `validateContent({contentRoot, schemaRoot})`、`buildStaticContent()` | content 与 schema 可来自显式的不同目录；无需把 schema 推进 mirror。 | 调用前验证 exact mirror commit/manifest 和受审工程 schema bundle；禁止混入工程 content fixture。 |
| `GitCatalogRepository`、Worker bundle、前端 public-api client | 完整公共读模型与一致 revision 构建。 | backend 当前布局与 attestation 尚不支持已验证的双来源构建；需要工程 adapter 或构建 workspace receipt，并保留 provenance。 |
| `scripts/check-public-frontend.mjs` | repository fixture→API→固定 revision 前端→静态检查。 | 它明示不消费 CMS snapshot，不能改名当作生产 adapter，也不能拿它的成功替代 CMS→mirror 互操作测试。 |

检索范围为 `cms/src`、`backend/src`、`infra`、`scripts`、`tools` 与 `prompt-lab/scripts`。未发现将 exact CMS mirror 与固定工程 schema 安全组合的既有 adapter。本文不认定其他外部部署系统不存在；外部状态未在本次查询。

## 4. 最低依赖顺序与完成条件

下面是待实施工程任务，全部使用工程分支、CI 和人工 PR。记录名称和版本字段是待设计项，不是已经存在的 API。

1. **补充 PRD/Tech Arch/0011 的实现合同。** 明确 CMS site/surface 的存储、immutable id、locale、审核权限、revision 失效条件；明确 canonicalOrigin、publishedLocales 和空站点行为；区分 envelope schema、内容 schema、rights policy、exporter 与 compiler 版本。定义兼容矩阵与失败策略。完成条件：每个 compiler 必需字段能追溯到已批准 CMS 字段或确定性派生规则；没有 runtime 默认值代替政策。

2. **实现 canonical site/surface 与迁移。** CMS owner 在 draft 语义下迁移有明确出处的设置，新增带 revision 的审核与读取；未知 origin、locale、surface target/robots 保持待确认。由有权限的人审核真实记录。完成条件：修改政策会使相关 snapshot/review 绑定失效；并发变更时整体重读或失败；原有 seed 权利状态不变化。Prompt-only 首阶段可明确不支持 Article；若交付范围含 Blog，继续完成下一项，不能声称全类型已通。

3. **实现 Article CMS 类型（仅在本阶段承诺 Article 时必需）。** 从独立 Article schema 建立草稿、locale、作者/分类/标签、来源、rights、approval 与 withdrawal，扩展一致性读取。完成条件：真实 draft/noindex 负例、合成 approved 正例、stale translation、撤下和空 Blog 全部通过；没有公开真实文章或代填人类权利审核。

4. **实现下一版 snapshot producer 与 consumer，先离线验证。** 更新 site/surface/Article closed schemas、关系和计数；把所需 canonical revision 与 schema/policy 标识绑定 exportRevision/manifest。建议对不兼容变化使用新 envelope 版本，并在第 1 项明确规则后实施；不在 v1 下静默加入字段。同步 library validator、已有 manifest reader、Git tree verifier、workflow 隔离 writer 的路径/版本校验。完成条件：旧/新版本兼容与拒绝行为有 golden tests；未知版本、越界文件、同 revision 不同 bytes、hash 漂移均零写入。

5. **实现 exact mirror→工程 compiler adapter。** 输入固定 mirror SHA+manifest hash、固定工程 schema/compiler commit+文件摘要。验证后在临时 workspace 装配完整 allowlisted content 与独立 schema 输入，复用 compiler，再适配 backend/bundler 的目录与 attestation。产物记录 CMS exportRevision、mirror SHA/hash、schema/compiler 版本和 compiler contentRevision；这些 hash 含义不同，不能互相覆盖。完成条件：构建不查询浮动 main、不复制工程 content fixture、不获取 CMS/Git 写凭据；缺任一来源凭证即失败。

6. **建立真正跨组件的阻断测试。** 输入 CMS producer 的同一合成 approved snapshot，依次执行 strict mirror verify→root validate/build→Backend list/detail→固定 revision frontend→check:static。至少覆盖正常 Prompt、最后一条撤下、启用但空的 locale、缺/漂移 surface、canonicalOrigin 不一致、schema/version 不兼容，以及承诺 Article 时的 Article/Blog。检查 RSS/Sitemap/HTML 同 revision 且资格相符。完成条件：不手工补 site/surfaces，不拼 fixture，任何一层失败都不能生成可部署 receipt。

7. **按兼容合同启用消费者，再启用 producer，随后独立验收发布。** 第 4 项先让消费者具备受控读取能力但不扩大写权限；由 owner 审核迁移、工程版本和启用计划后切换 producer。旧版本可继续作为 last-known-good 静态产物，不能反向导入 CMS；禁止以隐藏 fallback 忽略新字段。完成 mirror 不等于 release：后续仍需 exact-commit 部署、签名 callback、持久化 smoke receipt、CMS release projection；takedown 还需事件派发和 edge suppression。本文没有执行这些外部动作。

## 5. 必须由人确认的内容与边界

- **真实站点政策记录：** canonicalOrigin、启用 locales、默认 locale、L1–L4 surface/target 与 robots 的权威初始值；是否有现存已批准记录可迁移。由 owner/编辑审核，Agent 不从 fixture、域名环境变量或样本数量推断。
- **交付范围：** 本阶段先接通 Prompt，还是必须同时交付 Article/Blog；后者不能省略 Article CMS 审核和导出实现。
- **版本切换与工程审核：** 确认数据迁移、兼容/回滚窗口和固定 schema/exporter/compiler 版本。技术细节可由工程提出完整可审查实现，不需要逐个日常实现步骤询问。
- **公开与生产操作：** 当前 noindex Internal Beta 是否改变、真实内容的 editorial/rights 审核、任何新增生产权限、Bot/Cloudflare 配置或部署均按现有授权边界处理。权限既有授权不能从本审计文档推导。

0011 已要求 canonical CMS 和 generated-only mirror，故“放宽 allowlist”“给 compiler 缺失值”“把 fixture 当已批准 surface”都不是可选迁移方案。

## 6. 本次证据与状态

此前在本轮实际执行：root validate/build 通过，18 个 infra tests 通过；mirror consumer 40 个 tests 通过，但本地 repository verify 是 `legacy-template` 模式。另将现有合法 snapshot fixture 经 `validateSnapshotEnvelope()`、`syncValidatedSnapshot()` 写入操作系统临时目录，再调用 root `validateContent()`，实际失败于缺少 `content/surfaces.json`。该复现没有修改 canonical content 或公开镜像。

本文新增的 canonicalOrigin、空 locale、Article 与版本兼容差异为代码/规范静态证据；未通过偷偷补文件继续测试，不能报告为已修复。本文阶段没有再运行生产查询、审批、镜像 push 或部署。

当前状态分别为：工程 fixture 公共读链已验证；CMS→mirror→root compiler 仍有合同缺口；没有新增 CMS public snapshot、mirror synced、production deployment 或 release receipt。
