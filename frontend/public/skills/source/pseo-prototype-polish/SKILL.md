---
name: pseo-prototype-polish
description: Polish a working PSEO prototype into a designed page by loading the design-engineering craft skills and, when the visual direction is still open, exploring a few divergent directions behind a picker. 原型已经能用，但看起来像拼出来的，需要把它做成一张有品味的页面。
---

# 把能用的原型做成有品味的页面

原型已经能用，但看起来像拼出来的，需要把它做成一张有品味的页面。

## 输入与范围

`09-prototype-review.md` 与可打开的原型；宿主设计合同（字体、色板、组件习惯，来自 `pseo-prototype` 的 recon）；页面合同 `08-page-spec.md`。

可单独使用，不要求已运行整套流程。本步不改数据、不改字段合同、不改 URL 计划；只改视觉、排版、交互细节与状态表现。默认将新产物保存到 `docs/pseo/prototype/`，用户指定位置优先。不要因使用本 skill 扩大任务、生产权限或费用范围。

## 执行

1. **先读取设计合同，再选用已安装的 craft skills。** 如已安装，加载：`emil-design-eng`（动效与手感决策）、`design-foundations`（层级、留白、克制）、`ui-polish`、`touch-and-accessibility`。按页面内容再加载：文字为主加 `typography`；卡片/层叠加 `surfaces`；有表单加 `forms-and-inputs`；有动效加 `animations`。这些外部 skills 不随 PSEO 套件分发，也不是开始工作的必要条件。未安装时明确说明，直接使用本文件第 3、4 步的真实样本、布局、交互与无障碍检查；不假称已读外部规则。

2. **判断是"一个方向打磨"还是"几个方向比较"。** 视觉方向已由用户或宿主设计系统定死 → 只做一遍打磨。方向未定（首个页面族通常如此）→ 如已安装，调用 `prototype` skill；否则直接按以下方法执行：3 个（最多 5 个）在命名轴上真正不同的方向（布局 / 密度 / 个性 / 动效 / 交互模型），放在 picker 后面让用户全尺寸切换。现有原型作为不改动的基线一起放进去，让比较有真实参照。

3. **真实材料，最坏内容。** 宿主字体、色板与组件习惯照用；数据仍来自 `pseo-prototype` 的真实样本，且必须包含会把版式撑破的记录：最长标题、缺封面/缺合作方/缺教案的条目、集数最多的系列、筛选后的空态。不用漂亮占位内容。

4. **每个方向都完整可用。** 筛选、空态、表单、键盘焦点、375px 窄屏、`prefers-reduced-motion`、无 JS 可读，逐项实测；未实现的外部动作明确禁用并说明。检查清单：`transition: all`、无标签图标按钮、小于 16px 的输入、hover 未按能力查询门控、按压无反馈、焦点环被移除、图片无尺寸。

5. **诚实呈现，把选择留给用户。** 用 变体｜轴｜何时是对的选择｜代价 表格说明；不预选偏好。用户选定后，把选中的值与被否决的方向写进 `10-prototype-polish.md`，并说明哪些决定进入 `08-page-spec.md` 的展示层（不改字段合同）。

## 交付与完成条件

主交付：`10-prototype-polish.md`（设计决策记录：选中的方向、具体数值、被否决方向与原因）+ 更新后的原型文件。记录输入版本、证据位置、实际检查、未知与阻塞。

- 每个方向能说出它的轴，且没有两个方向只是换色或换文案。
- 每个方向都通过第 4 步的实测；已加载的 craft skills 检查项逐条过；未加载时记录原因并完成本文件的完整检查。
- 决策记录能让实现阶段直接照做，不需要再回看原型。

若项目已有 `project.json` 进度记录，只有完成条件有证据时才更新本步骤为 complete；用户未选定方向时保持 in_progress，写明候选与等待项。上游页面合同或数据变化后，受影响的方向标 needsRecheck。

下一步通常是 `pseo-architecture`，但以用户当前目标和真实缺口为准。

## 示例请求

> 原型能用了，但太像模板。按站点风格给我几个方向，我来挑。
