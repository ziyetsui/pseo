# 中文首页「静·文楷」接入

用户确认的原型位于本机 `frontend/src/app/(entry)/proto/chinese-library`。原 review.md 明确其仅在 development 渲染且未部署。线上 Hub 没有引入字体规则或字体资产，中文页使用系统回退。

本次将定稿首页标题、三段正文和字体规则接入真实 Hub，仅作用于 interfaceLocale=zh-CN。字体静态自托管，OFL 许可随字体保留；英文、目录关系、原提示词正文和来源保持既有行为。

原样张字体缺少当前 localized-case-copy 使用的 261 个汉字。补充来自 Google Fonts 官方 LXGW WenKai TC Regular，按缺字生成约 79KB WOFF2 子集；来源和哈希见 public/fonts/chinese/provenance.json。

验证过程：

- 回归单元测试先失败，再通过；全套 36 文件、188 测试通过。
- 初次 Turbopack dev 浏览器验收遇到既有仓库外 docs import 根目录解析错误。改为测试实际 webpack 静态产物，未修改 dev 配置。
- 首轮静态版 10 项中英文、无 JS、axe、响应式浏览器检查通过；CDP 发现新标题中的“脚”仍用系统 Kaiti 回退，随后加严格断言并补充字体子集。严格断言在旧产物上复现失败。
- 最终字体覆盖检查：当前 localized-case-copy 汉字零缺字。静态构建和 TypeScript 通过，静态检查通过（1,825 HTML / 121,742 本地链接），lint 零错误、18 项沿用 img 警告，根 compiler validate/build 与 18 项 infra 测试通过。
- 发布回执在部署后补充，当前文档不证明线上已更新。
