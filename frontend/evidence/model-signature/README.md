# Browse by model — selected first screen

用户指定：`http://127.0.0.1:3000/proto/model-hero?v=3`，称其为 Signature picker。本次按再次指定的 URL 当前画面实施；捕获时第三项源码名为 Ticker。原型文件 hash 见 reference.json，未修改该原型目录。

## 应用范围

- `/{locale}/prompts/model-families/{familySlug}` 与 `/{locale}/prompts/models/{modelSlug}`。
- 新 `ModelSignatureHero.tsx` / `model-signature.css` 承载漂移墙、紧凑名称/计数/真实版本链接及首屏输入面板。
- `Anthology` 显式启用该首屏；`AnthologyReader` 保留目录、过滤、全文、来源、Creators/About/Footer，复用已有 sessionStorage 草稿，首屏外不再重复显示输入框或 H1。
- 原型页面继续可比较原始候选；不把 harness/picker 导航、sentinel try URL、无效快捷键复制进产品。
- 只用当前模型集合的媒体与数量。视频页输入文案和 Generate video 正确，混合或未知集合使用 Generate。真实 Prompt CTA 仍到 L4，草稿没有生成合同则保留禁用状态。

## 视觉与行为核对

- reference/family 的 1440×900 与 375×900 截图已人工查看：相同图墙、名称/数量/版本排列、输入面板及目录衔接；移除原型底部候选选择器与无效快捷键，增加可操作的背景暂停按钮。
- Seedance 截图记录视频集合派生效果；页面计数均来自模型数据。
- 自动检查 320、375、768、1440px 无页面横向溢出；真实版本页与 L4 跳转、唯一 H1/输入框、无 JS 目录正文、reduced-motion 与手动暂停均覆盖。
- 无 JS 时背景默认暂停；启用 JS 后仅在屏幕内、标签页可见且用户未暂停时移动。
- 草稿 E2E 显式等待字符状态和筛选 URL 写入后再后退，避免在筛选事件尚未提交时误退到空白前页。初次运行中的断言失败保留在 e2e.log/e2e-recheck.log；最终结果见 e2e-final.log。

## 验证与发布

单测 101/101；typecheck 通过；lint 0 error、13 条 img 警告（含本次装饰图墙）。视觉静态构建通过，check:static 验证 80 HTML / 4,776 站内链接。根 compiler validate/build 与 infra 18 项测试通过。最终全量 E2E：51 passed、3 skipped、0 failed，见 e2e-final.log。

已更新 frontend/AGENTS.md、PRD 与 Tech Arch。仅修改前端工程和设计规则；没有修改 CMS、content mirror、审核资格或生产部署。本地仍为 noindex visual fixture。
