# 展示数据移除 — 2026-09-04

用户标记 Advertising 卡片中的教程文档截图，要求删除此类没有直观生成效果的数据。已按确定的 immutable id 2066531004924436614 从本地 prototype.json 删除唯一对应记录（35 → 34 条；1187 → 1156 行），其他记录保留。原始 wireframe 历史证据保留，不参与当前展示。

已更新 frontend/AGENTS.md：教程/营销说明截图不作为生成效果展示；实际文字海报不因含字误删，禁止重新引入这条已拒绝数据。正式 CMS 内容仍走 proposal 和审核链。

浏览器确认该图片不再出现；Advertising 变为 4 条，自动采用真实 FIFA 球员海报封面。构建产物中所有 HTML 均不再引用被删记录，其 L4 HTML 已移除。

当前仅本地视觉预览变更，CMS public、mirror 和生产部署未改变。

验证：35 单元测试通过；visual build 含 TypeScript 检查通过；静态检查 77 HTML / 4499 链接通过。未重跑全站 E2E、lint、根 compiler 或 Lighthouse，本轮为单条视觉数据移除。Fixture revision：sha256:d5d7d685a3b67266f2ec317570bf2766df135c5aa9016de105f01572c3956275。
