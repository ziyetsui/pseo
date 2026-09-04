@../AGENTS.md
@AGENTS.md

# cms/CLAUDE.md

Claude Code 在 `cms/**` 维护 Payload canonical 内容、proposal/审核状态机、rights eligibility、public snapshot、Preview、outbox 和 Git mirror 状态投影。自然语言“加/改内容”必须成为 CMS proposal，不得改 `content/**` 或公开镜像，也不要在 CMS 中复制通用 Agent UI 或引入 Claude Agent SDK。

当前受限 adapter 只支持 create-Prompt：`expectedState=absent`，成功结果固定为 draft/noindex/review_required。`agent_proposer` API 身份只能调用该 proposal endpoint，不能通过普通 collection REST 读取或修改 editorial 数据。edit/route 和自然语言/SDK orchestration 未实现时必须 fail closed。

只有授权的人类可完成 editorial/translation/rights review 并推进逐 locale `public`；Claude 不得设置 `cleared`、`community_attributed` 或替人接受 notice-and-takedown 风险。`takedown` 必须立即撤 public projection、写审计/outbox，并触发紧急镜像删除。

per-content PR 发布已废弃；不要保留或恢复可执行 publisher、端点、UI、脚本或环境开关。只有独立 mirror Bot 可以把完整、确定性、验证通过的 CMS public snapshot 以 expected-main-SHA CAS 直推 generated-only 仓库 `main`；普通 Payload hook、请求和 Agent 都不得持有镜像凭据。分别报告 CMS public、mirror synced 和 production deployed，不能用其中一个冒充另一个。
