# 后端协作规范

## 1. 适用范围与优先级

- 本文件适用于 `backend/**` 下的全部代码、测试、迁移、脚本和文档。
- 本文件继承仓库根目录 `../AGENTS.md`；根规则定义双入口、单一事实源和 Agent 权限，本文件补充后端实现边界。
- 后端代理只修改 `backend/**`；未经用户明确授权，不得修改 `frontend/**`。需要前端配合时，在交付说明中列出所需改动和 OpenAPI 差异，不得代替前端实现。
- 开工前先阅读与任务相关的 `specs/`，至少核对 `0001-bo-pseo-constitution.md`、`0006-x-scrape-spec.md`、`0007-x-scrape-acceptance-criteria.md`、`0008-prd.md`、`0009-pseo-tech-arch.md` 和 `0011-promptlab-youmind-cms-publication.md`（文件存在时）。若实现、PRD、架构规范互相冲突，先报告冲突并以最新经确认的 spec 为准，不得自行发明另一套业务语义。
- 保留工作区中他人的改动。不得回滚、覆盖或顺手整理无关文件；禁止使用破坏性 Git 命令。

## 2. 技术基线

- Python `3.12+`。
- HTTP API：FastAPI；数据校验与序列化：Pydantic v2；配置：`pydantic-settings`。
- 所有公开函数、领域对象、端口和 API 模型必须有完整类型标注。禁止用无结构的 `dict[str, Any]` 代替已知业务模型。
- 默认采用异步 I/O；同步 SDK 必须通过明确的适配器隔离，不能在事件循环中执行阻塞调用。
- 时间一律使用带时区的 UTC `datetime`，对外使用 RFC 3339；禁止保存或比较 naive datetime。
- 依赖必须锁定并可复现安装。新增依赖前说明用途，优先标准库和已有依赖，禁止为了一个简单辅助函数引入大型框架。

## 3. 不可破坏的业务事实

### 3.1 CMS canonical 与发布事实

- Payload CMS 中经版本化校验、人工 editorial/translation/rights review 并进入逐 locale `public` 状态的记录，是唯一 canonical 内容事实源。
- 生产 API、索引、RSS、Sitemap 和前端只读取从同一 CMS revision 生成的不可变 public snapshot，不读取任意 draft table，也不把 Git mirror、缓存或 Agent 回复当作权威。
- 公开 Git 仓库是 deterministic generated mirror。其 commit SHA、CMS snapshot revision、manifest hash、部署 id/URL 和 smoke 状态必须分别记录；mirror 落后或失败是显式 drift，不能反向覆盖 CMS 或伪装为成功上线。
- 旧的 per-content branch/PR/merge 发布链已废弃。只有专用 mirror Bot 可以把验证后的完整 snapshot 以 expected-main-SHA compare-and-swap 快进到 generated-only repository 的 `main`；禁止 force push、last-write-wins 和人工/通用 Agent 直推。
- CMS `public`、mirror `synced` 和 production `deployed` 是不同状态。只有匹配 snapshot revision 的部署和 smoke 证据可以证明线上版本；Git 更新本身不是生产发布证据。

### 3.2 Payload 的定位

- 必须区分两个概念：
  - **source/transport payload**：外部来源某次抓取返回的原始数据包；
  - **Payload CMS**：保存 canonical 内容、版本、审核和公开状态的后台系统。
- Payload CMS 保存 canonical 草稿、版本、审核决定、rights 状态、public/withdrawn 状态和 snapshot identity。公开读取必须经过独立 public projection，不得把任意 CMS draft 当成线上内容。
- Agent 和外部 Issue 只能创建 proposal/candidate；只有 RBAC 授权的人类可完成审核并推进 `public`。`cleared` 与 `community_attributed` 都是人类决定，采集器和 Agent 不得自动设置。
- `community_attributed` 必须保留作者、原帖、署名、政策依据和 takedown 入口，且不得把第三方内容声明为 CC BY；`unknown|review_required|restricted|takedown` 一律退出 public projection。
- mirror/deployment 回调只更新派生同步状态和证据，不能改变 canonical 内容或 rights 决定。镜像不一致时以 CMS snapshot 为准，报告 drift 并重建。
- `takedown` 必须立即撤销所有受影响 locale 的 public projection、追加审计/outbox，并触发高优先级 mirror/deployment 删除；定时任务只作 reconciliation。

### 3.3 原始数据不可变

- 抓取成功的原始响应必须先归档，再进行解析、筛选或规范化。原始页面、原始帖子和运行清单均为 append-only，不得就地修正、去重或覆盖。
- 每份原始记录至少包含：来源、请求身份（去除密钥）、抓取时间、HTTP/提供方状态、内容类型、原始内容或对象存储引用、内容哈希、run id 和 schema version。
- 修复解析规则时，从同一原始档案生成新的派生产物，并记录 parser/version 和父级哈希。不得修改原始档案来让测试通过。
- 日志和原始档案不得包含 API key、Cookie、Authorization header、完整敏感请求头或个人敏感信息。无法安全归档时必须失败并记录原因。

### 3.4 Agent 与人工 proposal 同链

- Agent 和人工编辑都写入同一 CMS proposal/draft 模型，并复用 schema、locale/slug、link、evidence、rights、indexability 和关系门禁。Agent 不直接修改 `content/**` 或公开 Git mirror。
- Agent proposal 接口必须版本化、鉴权、幂等，并绑定 actor、完整 type/id/locale、expected CMS revision 和字段 allowlist；信息不足时保存缺失状态，不能编造或自动批准。
- Agent 不能推进 `public`、批准 rights、触发生产 deploy，也不能借 Backend 凭据更新 Git `main`。mirror Bot 是独立 machine principal，只消费已审核 public snapshot。
- Internal Beta 可使用 Codex/Claude Code 或仓库外层的 Codex SDK proposal wrapper；SDK wrapper 不属于 Backend service。Backend 不引入 Claude Agent SDK/Codex SDK runtime，也不代理通用聊天或任意 shell 执行。

## 4. 架构与目录

采用清晰的分层/六边形架构。推荐结构如下；同义目录可以按 spec 细化，但依赖方向不可改变：

```text
backend/
├── AGENTS.md
├── pyproject.toml
├── src/pseo/
│   ├── main.py                  # composition root，只负责装配
│   ├── api/                     # FastAPI routers、依赖、API schemas、中间件
│   │   └── v1/
│   ├── application/             # use cases、commands/queries、DTO、事务编排
│   ├── domain/                  # entities、value objects、policies、domain errors
│   ├── ports/                   # Protocol/ABC：repo、Git、CMS、source、clock 等
│   ├── adapters/                # GitHub、Payload、抓取源、Markdown、数据库等实现
│   └── infrastructure/          # settings、DB/session、logging、telemetry、security
├── migrations/
├── scripts/
└── tests/
    ├── unit/
    ├── contract/
    ├── integration/
    └── e2e/
```

### 4.1 各层职责

- `api`：解析 HTTP、鉴权、调用一个 application use case、把结果映射为 HTTP 响应。禁止写业务规则、SQL、GitHub/Payload SDK 调用。
- `application`：编排用例、事务、幂等和端口调用；不依赖 FastAPI，不包含具体存储或供应商实现。
- `domain`：承载业务不变量、状态机和纯规则；不得导入 FastAPI、Pydantic API schema、ORM、HTTP 客户端、GitHub 或 Payload SDK。
- `ports`：定义面向业务的最小接口。端口使用领域类型或 application DTO，不向内层泄漏 ORM model、HTTP response 或供应商对象。
- `adapters`：实现端口，负责外部格式与领域格式之间的显式转换。供应商特例只能停留在这里。
- `infrastructure`：进程级配置和技术设施；不得成为放置业务逻辑的杂物间。
- `main.py`：唯一 composition root。对象装配和依赖注入不能散落到领域代码。

### 4.2 依赖方向

允许的核心方向是：

```text
api → application → domain
          ↓
        ports ← adapters
                    ↑
             infrastructure（装配与技术实现）
```

- 内层永远不知道外层框架或供应商。
- 禁止 `domain → application/api/adapters/infrastructure`，禁止 `application → api/adapters`。
- 跨层共享概念应放入 `domain` 或 `ports`，不能用循环导入、全局 service locator 或运行时 monkey patch 规避边界。
- 外部副作用必须通过端口发生；测试应可注入 fake clock、fake id generator、fake repository 和 fake provider。

## 5. 内容流水线与状态机

标准链路为：

```text
Source → Fetch → Immutable Raw Payload → Normalize/Validate
       → CMS Proposal/Draft → Human Editorial/Translation/Rights Review
       → CMS Public Snapshot → API/Index/RSS/Sitemap/Frontend
       → Deterministic Git Mirror → Bot CAS Fast-forward of generated main
```

- 每一步均须有稳定 ID、输入/输出哈希、状态、时间戳和失败原因，支持从安全检查点重试。
- 建议任务状态显式建模为 `pending/running/succeeded/partial/failed/cancelled`。由于限流、页数上限、权限、重复游标或解析错误而提前终止的抓取必须是 `partial`，不得标成完整成功。
- 外部 API、数据库和 Git 操作不能假装处于同一个 ACID 事务。需要跨系统一致性时使用 outbox/任务表、可重试状态机和补偿/对账，不使用脆弱的“双写成功”假设。
- 规范化、Markdown 渲染和内容哈希在相同输入与版本下必须确定性输出；禁止把当前时间、随机顺序或机器路径混入内容结果。
- publish/takedown 产生即时 outbox 事件；定时任务只补偿漏投和 drift。相同 CMS snapshot revision 必须幂等 no-op，不能产生重复 mirror commit。

## 6. API 与 OpenAPI 合同

- 所有前端 API 使用带版本前缀的 `/api/v1`；健康检查等基础设施端点除外。
- **生成出的 OpenAPI 文档是前后端唯一接口合同。** 每个公开端点必须声明稳定的 request model、response model、状态码、认证要求、错误响应和示例；不得返回 ORM 对象、Payload CMS 对象或任意字典。
- API schema 与 domain model 分离，并在边界显式映射。内部字段、secret、provider 原始响应默认不对外暴露。
- 列表接口必须明确分页方式、稳定排序和游标语义。游标应不可伪造或经校验；同一快照中不得出现重复或漏项而不报告。
- 对外 JSON 字段统一使用 `camelCase`，与 0009 和生成的 TypeScript client 一致；Python 内部仍使用 `snake_case`，通过 Pydantic alias 显式映射。ID、locale、slug、时间和 nullable 语义在整个 API 中保持一致。
- 破坏性合同变更必须先更新 `specs/0009-pseo-tech-arch.md`，再更新 OpenAPI、合同测试和调用方；优先新增字段或新版本，禁止悄悄改字段含义。
- 每次 API 变更都要生成并比较 OpenAPI artifact。无意的 schema diff、缺少 response model 或文档与运行时不一致，均阻止合并。

### 6.1 统一错误合同

使用 `application/problem+json`，至少包含：

```json
{
  "type": "https://ancher.space/problems/revision-conflict",
  "title": "Revision conflict",
  "status": 409,
  "code": "REVISION_CONFLICT",
  "detail": "The content changed after this draft was created.",
  "instance": "/internal/v1/artifacts/prm_123/proposals",
  "traceId": "tr_123",
  "errors": []
}
```

- `code` 是客户端可依赖的稳定机器码；`detail` 可以变化，前端不得解析 detail 判断逻辑。
- 校验失败使用 `errors[]` 提供字段路径和原因；冲突用 `409`，认证失败用 `401`，权限不足用 `403`，不存在用 `404`，限流用 `429`。
- 未知异常对外只返回通用错误和 `traceId`，不得泄漏堆栈、SQL、文件路径、token 或供应商响应；完整原因只进受控日志。

## 7. 幂等、并发与审计

- 所有创建任务、导入、proposal、审核状态变化、public snapshot 和 mirror job 接口必须支持 `Idempotency-Key`。
- 幂等记录至少绑定 actor/tenant、route/use case、规范化请求哈希和响应。相同 key + 相同请求返回原结果；相同 key + 不同请求返回 `409 IDEMPOTENCY_KEY_REUSED`。
- provider 重试、webhook 重放和 worker 至少一次投递不得创建重复内容、重复 mirror commit 或重复审计事件。使用业务唯一键和数据库约束兜底，不只依赖“先查询再插入”。
- GitHub/Payload/deployment webhook 必须按 provider delivery id 去重；只有处理完成后才标记成功。失败可安全重试。
- 更新可变资源时使用版本号、ETag 或 expected SHA；并发冲突必须显式返回，不得 last-write-wins。
- 每个业务写操作追加不可变审计事件，至少记录：actor、action、target、request/trace/idempotency id、before/after hash、时间、结果，以及相关 snapshot/mirror/deployment run 和 commit SHA。审计日志不得物理覆盖。

## 8. 多语言与 locale

- locale 使用项目配置的 BCP 47 标识，并在路由、内容路径、API 和 Git 文件中保持同一规范形式；禁止同义写法并存。
- 需要 locale 的用例必须显式接收 locale。缺失、不支持或内容不存在时返回明确错误或按 spec 做显式重定向，**不得静默 fallback 到默认语言或另一语言**。
- `Accept-Language` 只能用于用户首次进入时的显式协商，不能把不存在的翻译伪装成目标 locale 的 `200` 响应。
- 每个语言版本是独立 CMS locale 记录，并在 Git mirror 中投影为独立 Markdown；通过稳定的 `translation_key/content_id` 建立关系，slug 在 locale 范围内唯一。
- 翻译记录必须能追踪 source locale、source revision/hash、translation revision 和 freshness。源文更新后旧翻译应标为 `stale`，不得默认为最新。
- 只有真实存在且可发布的语言版本才能生成 `hreflang`、RSS 和 Sitemap 项；canonical 与 `x-default` 规则必须由 spec 明确定义。
- 解析文件时不得根据目录、frontmatter 和请求 locale 中“任选一个”；三者不一致必须校验失败。

## 9. 安全要求

- secret 只来自运行环境或受管 secret store，并通过 settings 注入；禁止提交 `.env`、token、私钥或真实凭据。日志、异常、fixture、快照和 OpenAPI 示例中也不得出现 secret。
- 采用最小权限：mirror GitHub App 只对指定 generated-only repository 具有 Contents read/write 和受限 `main` bypass，不得修改 workflow、规则或其他仓库；Payload、数据库、对象存储和抓取 provider 使用独立凭据。
- 所有受保护端点同时做认证和服务端授权；不得只依赖前端隐藏按钮。管理、导入、发布和重试操作必须有明确 RBAC 权限。
- webhook 必须校验签名、时间/重放窗口和 delivery id；签名比较使用恒定时间方法，校验失败不处理 body。
- URL 抓取必须防 SSRF：只允许 `http/https`（生产优先 HTTPS），解析并阻止 loopback、link-local、私网和云 metadata 地址；每次重定向后重新校验；设置连接/读取超时、响应大小、内容类型和重定向次数上限。
- 所有外部调用设置 timeout、有限重试和指数退避；仅对可安全重试的失败重试，并遵守 `Retry-After`。禁止无限分页和无限重试。
- Markdown/HTML 在展示前按明确 allowlist 清洗；禁止原样执行嵌入脚本、事件属性或危险 URL scheme。
- CORS 使用显式 origin allowlist；生产环境不得使用 `*` 搭配凭据。上传、查询和日志都应设体积/速率限制。
- 数据库查询参数化；迁移必须可审查。不得在请求处理过程中自动修改生产 schema。

## 10. 可观测性与运行保障

- 使用结构化日志，至少包含 `timestamp`、`level`、`service`、`environment`、`trace_id`、`request_id`，异步任务再包含 `run_id/job_id`。不得记录整份敏感 payload。
- 指标至少覆盖请求延迟/错误率、抓取页数与 partial 比例、队列积压、provider 限流、CMS snapshot/mirror/deployment 失败和 projection drift。
- readiness 检查验证关键依赖是否可用；liveness 只反映进程是否存活，不能因临时第三方故障反复重启。
- 每次 public snapshot、mirror 和部署都可追溯到 CMS revision、schema/policy version、manifest hash、应用版本、mirror commit SHA 与 deployment id；排障不能依赖“当前数据库大概是什么状态”。

## 11. 测试策略

- `tests/unit`：领域不变量、值对象、状态机、规范化规则和 application use case；不访问网络、真实 Git、Payload 或数据库。
- `tests/contract`：OpenAPI schema、成功/错误响应、locale、不 fallback、幂等、分页与认证合同。
- `tests/integration`：数据库 repository、迁移、CMS snapshot、Markdown renderer、Git mirror/Payload/source adapters；默认使用隔离的本地或临时资源，不访问生产服务。
- `tests/e2e`：至少覆盖“固定 source fixture → 原始归档 → 规范化 → CMS proposal → 人工审核模拟 → public snapshot → Git mirror CAS → API 读取”的 happy path，以及 rights 阻断、takedown、base 冲突、partial、重复 webhook 和重试路径。
- 抓取测试使用脱敏的固定 fixture/cassette；普通测试禁止调用付费或不稳定的真实 API。
- 对原始不可变、rights eligibility、takedown 立即退出 public snapshot、相同输入确定性输出、幂等重放、mirror no-op/CAS 和 locale 隔离编写回归测试。这些是不允许只靠人工验收的核心不变量。

## 12. 合并前质量门禁

从 `backend/` 目录使用 `uv.lock` 锁定环境。每次交付至少执行：

```bash
uv run ruff format --check .
uv run ruff check .
uv run mypy --strict src/pseo
uv run pytest
uv run pytest --cov=pseo --cov-branch --cov-report=term-missing
```

- 所有命令必须通过；不得以 `# noqa`、`type: ignore`、跳过测试或降低规则来掩盖问题。确需例外时限定到最小行并写明原因。
- 新增或修改的业务路径必须有测试；domain/application 的新增分支覆盖率目标不低于 90%，整个后端不得低于项目既有阈值。
- API 改动还必须通过 OpenAPI schema diff/合同测试；数据库改动必须从空库升级并验证当前版本升级；安全相关改动必须包含失败用例。
- 若由于仓库尚未具备脚手架而无法运行某项门禁，必须在交付中准确列出“未运行、原因、建立门禁所需动作”，不得声称已通过。

## 13. 代理工作流程

1. 先确认任务涉及的 spec、现有状态和边界；只处理获授权范围。
2. 先定义或更新 domain/application 行为和测试，再实现端口与适配器，最后接入 API/composition root。
3. 涉及前端接口时先写 Pydantic schema、错误码和 OpenAPI 合同，再写路由；不得让前端依赖临时响应形状。
4. 涉及 Git mirror、Payload 或外部 source 时，默认使用 fake/sandbox 验证；未经明确授权不得操作生产仓库、生产 CMS、真实密钥或付费 API。普通 Agent 不模拟 mirror Bot 身份。
5. 完成后运行适用门禁，检查 `git diff`（若仓库已初始化），确认没有 secret、生成垃圾或无关改动。
6. 交付说明必须包含：改了什么、关键设计决定、验证命令及结果、未验证风险、是否产生 OpenAPI/迁移变更。

## 14. 明确禁止

- 不得修改 `frontend/**`。
- 不得把业务逻辑堆在 FastAPI route、ORM model、后台任务入口或供应商 adapter 中。
- 不得把 Git mirror、缓存或任意 draft table 当作 canonical 内容事实源，也不得绕过 CMS RBAC、rights review 和 public snapshot 直接发布。
- 不得让人类或通用 Agent 直推 generated mirror `main`；不得让 mirror Bot 写应用代码、workflow、保护规则或使用 force push。
- 不得覆盖原始抓取数据、伪造 `API-complete`、静默丢弃分页/解析错误或静默 locale fallback。
- 不得在日志、错误、fixture、提交或构建产物中泄漏凭据。
- 不得用 broad exception 后继续返回成功；失败、partial、冲突和重试耗尽必须可见、可审计。
- 不得为让检查变绿而删除测试、放宽合同或改变 spec 含义。
