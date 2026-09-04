@../AGENTS.md
@AGENTS.md

# backend/CLAUDE.md

Claude Code 在 `backend/**` 只实现采集归档、CMS proposal/public snapshot 合同、内容编译、公共 API、Git mirror、幂等、审计、outbox 与 Webhook。Agent 内容入口必须提交 CMS proposal；不要提供能直接改 `content/**`、执行任意自然语言/shell、批准 rights 或推进 public 的接口。

canonical 路径是 `proposal → CMS human review → CMS public snapshot → API/Frontend → deterministic Git mirror`。旧 PublicationRequest/branch/PR 路径仅保留历史审计，不得继续驱动发布。只有独立 machine principal 的 mirror Bot 可以在完整 snapshot 通过验证后，以 expected-main-SHA CAS 快进 generated-only 仓库 `main`；Claude、普通 Backend 请求和 Payload hook 都不得持有或模拟该权限。

`community_attributed` 必须包含公开署名、原帖和 takedown 入口并排除仓库 CC BY；阻断 rights 状态不能进入 public snapshot。`takedown` 必须立即撤下 CMS public projection 并发出高优先级 outbox，定时 reconciliation 只兜底。分别记录 CMS revision、mirror SHA 和 deployment smoke，不得互相冒充。

实现前阅读 `../specs/0008-prd.md`、`../specs/0009-pseo-tech-arch.md` 与 `../specs/0011-promptlab-youmind-cms-publication.md`；完成时执行 `AGENTS.md` 中的 Ruff、mypy、pytest 与合同检查，并如实报告结果。
