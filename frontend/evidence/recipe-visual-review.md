# Recipe L4 视觉验收

日期：2026-09-04。最后采集：13:03（Asia/Shanghai）。范围仅为默认 Country stamp 样本、浅色、未填变量状态的 L4 Recipe，1440×900 与 375×900。**首屏、步骤 02/03 的关键几何和完整正文已对齐；存在已确认的颜色、状态提示与步骤 04 补充内容差异，因此不能声称整页像素完全相等。**

## 基线与方法

- 原型：[l4.html](http://127.0.0.1:8765/l4.html)，来自 `/tmp/pseo-prototype/l4.html`，选中 `variants[1] / v3` Recipe。实际文件 SHA-256：`69a2867c6855ba88391539bcb7649424f018f24d8b82fdcc84aefb07cafc91c4`。
- 实现：[Country stamp](http://127.0.0.1:3000/zh-CN/prompts/country-miniature-stamp-poster)，本地 visual-fixture 数据。
- Chromium `151.0.7922.34`，DPR 1，浅色，`prefers-reduced-motion: reduce`，相同字体条件与样本。375 为浏览器窄视口，不代表真实手机硬件性能。
- 原型 `.recbar` 的 Showing/样本选择器已被确认为 harness。先保留 raw 截图，再仅在比较页面中以 CSS 隐藏 `.recbar`；不改源文件、不隐藏产品差异。实现使用真实页面路由。
- 首屏从 scrollY=0 截取；步骤截图将对应 section 顶部放到 viewport y=76。表中坐标是文档绝对坐标，比较页面总布局；步骤截图另用于比较局部排版。
- 脚本：[recipe-visual-review.mjs](../scripts/recipe-visual-review.mjs)。完整测量：[measurements.json](recipe-visual/measurements.json)。浏览器布局诊断：[layout-diagnostic.json](recipe-visual/layout-diagnostic.json)。初测留档在 `recipe-visual/initial/`。
- 两端均返回 200；两宽均没有页面横向溢出或 `pageerror`；头像与四张结果图共 5/5 加载成功。没有用加载失败的空白图片作为还原依据。

## 截图

| 视口 / 区域 | 参考 | 当前实现 |
| --- | --- | --- |
| 1440 首屏 | [参考](recipe-visual/reference-1440-first-screen.png) | [实现](recipe-visual/implementation-1440-first-screen.png) |
| 1440 步骤 02 | [参考](recipe-visual/reference-1440-step-02.png) | [实现](recipe-visual/implementation-1440-step-02.png) |
| 1440 步骤 03 | [参考](recipe-visual/reference-1440-step-03.png) | [实现](recipe-visual/implementation-1440-step-03.png) |
| 1440 步骤 04 | [参考](recipe-visual/reference-1440-step-04.png) | [实现](recipe-visual/implementation-1440-step-04.png) |
| 375 首屏 | [参考](recipe-visual/reference-375-first-screen.png) | [实现](recipe-visual/implementation-375-first-screen.png) |
| 375 步骤 02 | [参考](recipe-visual/reference-375-step-02.png) | [实现](recipe-visual/implementation-375-step-02.png) |
| 375 步骤 03 | [参考](recipe-visual/reference-375-step-03.png) | [实现](recipe-visual/implementation-375-step-03.png) |
| 375 步骤 04 | [参考](recipe-visual/reference-375-step-04.png) | [实现](recipe-visual/implementation-375-step-04.png) |

未隐藏 harness 的原始参考：[1440](recipe-visual/reference-1440-raw.png)、[375](recipe-visual/reference-375-raw.png)。首屏参考与实现的主要排版一致，但灰色文字对比度调整是可见差异。

## 最终测量

单位为 CSS px。表中“相同”只针对该项测量，不外推为全部像素一致。

| 项目 | 1440 | 375 |
| --- | --- | --- |
| 主 wrap 宽度（两端） | 780 | 375 |
| H1 x / y / 宽 / 高（两端） | 356 / 133 / 728 / 86.625 | 26 / 176 / 323 / 59.25 |
| H1 字号 / 行高（两端） | 38 / 43.32 | 26 / 29.64 |
| 主媒体 x / y / 宽 / 高（两端） | 434 / 412 / 650 / 812.5 | 26 / 502.40625 / 323 / 403.75 |
| 步骤 02 标题 y（两端） | 1538.578125 | 1131.25 |
| 变量 fieldset 高（两端） | 111.234375 | 155.234375 |
| 步骤 03 标题 y（两端） | 1827.78125 | 1507.640625 |
| Prompt 正文区域高（两端） | 395.328125 | 820.328125 |
| 步骤 04 标题 y：原型 → 实现 | 2445.078125 → 2473.46875 | 2597.1875 → 2643.96875 |
| 步骤 04 下移量 | +28.390625 | +46.78125 |
| 步骤 04 区块高：原型 → 实现 | 285.96875 → 562.3125 | 440.9375 → 760.46875 |
| 页尾开始位置差值 | +304.734375 | +366.3125 |

H1 文字、字体栈、字重、字距、宽度与换行一致；步骤标题同为 20px / 25.6px / 600。变量顺序同为 Japan、France、Egypt、Brazil、India、Mexico。两宽均逐字符比较 `[data-prompt].textContent`，与原型完整 1,284 字符一致；Prompt 区块尺寸与换行一致。

## 初测问题及修复

1. **遗留中文 variable.note 已移除。** 初测从旧 fixture 元数据额外带入一段 `[COUNTRY] 同时驱动地标…` 中文说明，母版没有该段。它使步骤 03 初测下移 31.046875px / 49.4375px。主 Agent 已在 visual-fixture mapper 排除 legacy note；当前截图不再出现。公开数据的真实说明字段没有由此次视觉修复删除。
2. **有变量表单的 13.734375px 间距差已修复。** 移除 note 后，步骤 03 两宽均提前 13.734375px。实测原型为 `BackCompat`：`form` 默认 `margin-bottom:15px`，token 标签实际行盒 14.484375px；实现为 `CSS1Compat`，直接 fieldset 且标签行盒 15.75px。经主 Agent 分配，在 `RecipeText.tsx` 只给有变量路径恢复 `recipe-placeholder-form`、显式 15px 下边距和 token 标签 1.38 行高；不切换生产文档模式，不影响无变量路径，也不修改后续步骤 padding。最终复测步骤 03 顶坐标与原型两宽完全一致。

本轮上述局部修复后执行 `pnpm exec vitest run tests/recipe.test.tsx`：1 文件、4 测试通过（全文/重复变量/自由输入、复制失败、无变量与 canCopy）。最终浏览器复测只覆盖这两个 Recipe 视口，没有扩大到其他页面。

## 保留的可见差异

| 差异 | 当前判断 |
| --- | --- |
| muted / faint 文字更深 | 已确认的无障碍修正。例：byline 从 `rgba(24,26,29,0.56)` 改为 `0.70`，faint 从 0.38 改为 0.62；导航、面包屑、编号、说明、指标均有可见影响。首屏几何相同也不能称像素相同。 |
| 步骤 03 增加未填 placeholder 提示 | 已确认的真实性/可用性反馈；桌面占 28.390625px，375 占 46.78125px，恰好解释步骤 04 位置差。未为追求截图一致而隐藏。 |
| Generate in bo 禁用并附解释 | 当前数据没有 tryUrl。按钮变为禁用灰色，新增可见原因；不能把原型无效 `href="#"` 当成已实现生成能力。 |
| 步骤 04 补 required inputs、source、observedAt、同模型关系 | 现行内容合同要求的真实数据补充，原型没有这些行，因此步骤 04 和页尾总高度较原型增加。窄屏长关系标签会换行；仍可读且无横向溢出。 |
| 作者、模型和关系是可用链接 | 保留原版形态但目标为真实路由/原帖，而非原型的 `#`。 |
| Showing 等 harness 不存在 | 已确认移除；raw 与规范化参考均保留以免隐瞒差异。 |

以上保留项由本轮主 Agent 确认或现行内容合同要求，报告不把它们算作“视觉完全一样”。没有对截图给出笼统相似度百分比。

## 未覆盖与发布边界

本报告没有覆盖暗色、其他 Prompt/媒体类型、无媒体、无变量、变量填值后的完整视觉、不同操作系统字体、真实手机、Browser zoom 或 L1–L3。本报告也不是独立 axe/Lighthouse 测试结果，其他门禁由主验证报告记录。

数据模式为隔离的 visual-fixture，不代表这些 X 样本取得权利批准。未修改 CMS、rights/public/released、内容镜像或生产部署状态。此次验收只修改新脚本/证据，并按主 Agent 后续授权修正 `RecipeText.tsx` 的局部表单排版；没有重设计页面或改写定稿文案。
