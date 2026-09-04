# Localhost SEO 修复记录

日期：2026-09-04。范围：公开前端 SEO 配置、metadata、编译投影资格与图标；不是内容发布或生产部署。

## 修复状态

| 原审核项 | 状态 | 实现 |
|---|---|---|
| F1 公开域名缺失仍构建成功 | 已修复 | public-api 强制合法 HTTPS origin；缺失、localhost、凭据或非 origin 输入直接失败。fixture 保持 noindex。 |
| F2 Prompt hreflang 丢失/重建 | 已修复 | 领域类型及 metadata 原样投影 API canonical、hreflang（含 x-default）和已批准 SEO 文案；跨站 canonical 与配置冲突则失败。 |
| F3 列表资格与 sitemap 不一致 | 已修复 | L1/Blog 从同 revision、hash 验证的 compiler route/sitemap 获取资格；finalizer 验证每个 sitemap loc 的 HTML robots/canonical。 |
| F4 集合页重复 metadata | 已修复工程兜底 | 模型系列/具体版本区分 title；按任务、风格、主题、图片/视频与真实计数生成 description；不替换 CMS 已提供的 SEO。 |
| F5 运营方与政策页面 | 等待真实资料 | 没有创建假 About/Contact/Privacy/Terms；见 operator-information-needed.md。 |
| F6 favicon 缺失 | 已修复 | 两个入口布局均输出 SVG/ICO 图标，沿用已有方形品牌记号。 |

## 额外发现与处理

真实 API 与 compiler 使用同一 revision，但该 Prompt 的 API SEO 为 index,follow，content surface 仍为 Internal Beta/noindex,nofollow。compiler 的空 sitemap 符合更严格 surface 资格，不能通过合并绕过。

已在配置 FRONTEND_STATIC_DIR 时令 L4 HTML 采用资格交集；canonical/hreflang 不变。public-verification.log 验证国家主题微缩邮票海报 Prompt 输出 noindex,nofollow、原 canonical 与语言链接，sitemap 为零 loc。未改 API 或 canonical 内容；未配置 compiler 目录的模式仍按原 API SEO 合同，不能把它当作已验证 surface 发布资格。

## 实际验证

- 单元测试：15 文件、93 项通过。
- 根 compiler validate/build 通过；infra 测试 18/18。
- 公开 API 构建及 check:static 通过，实际 SEO 输出见 public-seo.json、public-verification.log。
- E2E 全量：44 通过、3 跳过、1 移动端 scratchpad 用例失败；相同用例单独复测通过。保留 e2e.log 与 e2e-mobile-recheck.log，不将这次全量运行写成全绿。此次未修改 scratchpad。
- 最终视觉构建、check:static、typecheck 通过；lint 0 错误、12 条已有图片警告。
- Localhost 再抓取 74 个内容页，4,774 个站内链接/锚点，0 断链、0 未覆盖目标；74 页仍 noindex。仅 Hub 与其 locale 别名保留相同 title/description，模型系列/版本及其他分类页不再重复。
- favicon.ico 实测 HTTP 200，Content-Type: image/x-icon；见 favicon-http.log。

## 发布状态

- API/compiler revision：sha256:133521b6a07f71ad2455e1e4bd25634cabf3f79c5643a2e81ce87c4c90952a01。
- 视觉 fixture revision：sha256:77844116d1d995f31363188f8d829326ca1d56934d2caf0aea3297e0572b7136。
- CMS：没有提交 proposal，没有改状态或权利审核。
- Mirror：没有同步或推送；仅运行已有 compiler 验证。
- Production：没有部署。当前 localhost 继续为禁止索引的视觉 fixture。
- 本轮没有重新执行依赖公网地址和 PageSpeed key 的 seo-audit-full 工作流；没有新增生产 SEO 分数。
