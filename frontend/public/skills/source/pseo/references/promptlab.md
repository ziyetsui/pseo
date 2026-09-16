# PromptLab 可选适配

只有目标仓库确认为本套件来源项目 PromptLab，或用户明确选择该适配时加载。不要将这些部署细节施加于其他网站。

先读取宿主根规则、specs/0008-prd.md、specs/0009-pseo-tech-arch.md、specs/0011-promptlab-youmind-cms-publication.md、content/README.md 与目标目录规则。文件缺失时停留在通用方案，不猜当前接口或权限。

- canonical 是 Payload 经人工审核的版本化内容，Git 是 generated mirror。Agent 不编辑 content/** 或公开镜像，不直写 DB。
- 内容顺序为 proposal → CMS draft → schema/来源与权利校验 → 人工 editorial/rights 审核 → immutable public snapshot → 专用 Bot mirror → deployment/smoke receipt。
- 创建声明 expectedState=absent，修改绑定 expected CMS revision；type/id/locale/关系精确限定，Agent 不填 approval/rights/released 字段。
- 只有已部署、已鉴权的 proposal contract 可以提交。代码存在不证明线上可用；缺 adapter 交 proposal-ready artifact 与检查报告。
- 可使用仓库已经存在的 pseo-content-create/edit/validate；pseo-content-pr 是历史兼容名，不得恢复逐内容 branch→PR→merge。
- 0011 对历史规格中的 Git-first 描述有明确 supersession；代码、schema、workflow 与本 skill 包仍走工程 PR。
- 普通内容 Agent 不调用生产发布接口、不取得 mirror/部署凭据。release skill 在此只准备与核验，把受限动作交给授权的人与专用服务。
- 公开 snapshot、mirror synced、deployment 和 smoke 各自有独立证据；旧文档 checkpoint 不证明今天线上仍相同。

该适配没有账号、内网地址、固定部署 ID 或凭据，也不自动启用服务。

