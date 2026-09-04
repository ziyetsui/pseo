# 视觉规范替代稿：从 Bauhaus 切换到原型 token + Emil Kowalski 风格

Status: Proposal — awaiting spec owner (BO)
Author: Claude Code (frontend)
Date: 2026-09-03
Supersedes when accepted: `specs/images/0008-bo-pseo-ui.md`、`specs/0008-prd.md` §14.1 / §14.2、`frontend/CLAUDE.md` §7 的 Bauhaus 段落
Implementation reference: frontend commit `37af96a`（`neutral` 主题已是默认，Bauhaus 保留在 `NEXT_PUBLIC_THEME=bauhaus` 后面）

## 0. 为什么要改，以及这份文件是什么

产品负责人于 2026-09-03 决定：放弃 Bauhaus 视觉体系，在 wireframe 原型自带的 token 之上采用 Emil Kowalski 的设计工程风格。

前端已经按此实现并通过门禁，但 **specs 仍描述旧体系**。仓库根 `AGENTS.md` §5 规定 specs 是合同、行为变化必须先改合同再改实现；同时 `docs/handoffs/claude-frontend-mvp.md` §3 禁止前端代理修改 `specs/**`。所以这份文件是**交给规范负责人的替代文本**，不是对 specs 的直接修改。

一个事实更正：`specs/images/0008-bo-pseo-ui.md` 在磁盘上存在，但从未纳入 git（`specs/` 整个目录未跟踪）。请规范负责人在更新时一并决定是否纳入版本控制。

## 1. 决定的依据（实测，不是偏好）

| 依据 | 来源 |
| --- | --- |
| Outfit 是纯拉丁字体；中文下 `font-medium/bold/black` 塌缩为一两个字面，层级压在一个中文里不渲染的字重差上 | `.superpowers/sdd/type-surface-report.md` §I4、`ui-review-report.md` §I4（两份独立审计） |
| 原型 token 的字体栈把 PingFang SC 放在前面；`light-dark()` 原生支持深色，而 Bauhaus 规范把深色推到二期 | `docs/wireframes/flow-proto.html` `:root` |
| 2–4px 黑边 + 硬阴影铺满 40 个磁贴，是首页「重复了 40 次」观感的直接来源；发丝边与 12px 圆角适合密集参考型内容 | `design-eng-critique.md`、`redundancy-audit.md` |
| 对标产品（YouMind、aiforui.dev）都属于中性 + 发丝边这一族 | 实测 DOM / 计算样式 |

## 2. 提议的 PRD §14.1 替换文本（冲突裁决）

> Wireframe 决定：四层 IA；模块顺序；内容密度；搜索、筛选、复制和关系导航；**以及颜色、字体、边框、阴影、圆角与交互节奏**——即 `docs/wireframes/flow-proto.html` 的 `:root` token 集，为唯一视觉事实源。
> 0008 UI Spec 降为**可选对照主题**（`NEXT_PUBLIC_THEME=bauhaus`），仅用于过渡期对比，不参与验收。
> 仍然适用：不能把 UI Spec 中示例性的 Pricing、FAQ、Testimonials 强行加入 Prompt 页面。
> 另一条同日决定：**冗余展示信息应移除**，即使 wireframe 原型有该模块；冗余判定以实测为准（`redundancy-audit.md`），删除项需逐条论证。

## 3. 提议的 PRD §14.2 替换文本（Beta 视觉规则）

> - 三态配色：未标记 = 跟随系统；`data-color-scheme="light|dark"` 显式覆盖；`light-dark()` 承载全部颜色 token。
> - canvas `rgb(250 250 251)` / `rgb(22 22 24)`；card `#fff` / `rgb(32 32 36)`；foreground `rgb(24 26 29)` / `rgb(250 250 252)`。
> - 分隔线为半透明 hairline：11%（密集列表行）与 20%（卡片框与卡内分割），不再使用 2px/4px 实心黑边；≥192dpi 用 0.5px。
> - 强调色区分**墨色**与**填充**两个值（一个值无法同时满足「作为文字过 4.5:1」和「承载白字时保持深色」）：墨色 red `rgb(190 32 42)`/`rgb(255 138 143)`、blue `rgb(29 100 224)`/`rgb(131 180 255)`、amber `rgb(200 142 24)`/`rgb(214 160 58)`；填充在两种配色下均保持深色并承载白字。
> - 字体：`-apple-system, system-ui, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif`；Prompt 正文 `ui-monospace` 系统等宽 + CJK 回退。**层级由字号建立，不依赖字重**（PingFang 无 900 字面）；`font-synthesis: none`。
> - 圆角 12px（卡片/框）、10px（控件）、pill（chip/徽标）；带圆角的框必须 `overflow: clip`。
> - 阴影为分层柔和投影（近层 + 环境层），无 spread ring——边由 hairline 承担；hover 只改 `box-shadow`。
> - 按压反馈为 `scale`：控件 0.97、chrome 0.96、卡片 0.99，120ms；`prefers-reduced-motion` 同时取消位移与缩放。
> - 动效 200–300ms，`ease-out` = `cubic-bezier(.32,.72,0,1)`；退出短于进入；键盘触发的状态变化不做动画。
> - focus ring 用前景色（非品牌色），2px + 2px offset。
> - 颜色不能成为唯一状态信号。

## 4. 已在实现中做出、需要规范认可的取舍

| 项 | 决定 | 理由 |
| --- | --- | --- |
| 原型 `--muted` 56% | 浅色提高到 62%（4.73–4.89:1）；深色保留 56% | 原值在浅色下 3.91–4.02:1，不过 AA |
| 原型 `--faint` 38% | 改为**非文字** token（≥3:1，用于规则线与惰性图标） | 作为文字连 3:1 都不过 |
| 原型 `--accent` `rgb(51 126 255)` | 浅色加深到 `rgb(29 100 224)`（5.09:1）；深色保留原值 | 原值作为墨色 3.61:1、承载白字 3.77:1，均不过 |
| 几何角标 `GeometricMark` | 中性主题下隐藏 | 直接引用包豪斯的图形语言，软体系里无等价物；不承载信息 |
| 合集卡脊柱 38px 色柱 | 收窄为 4px | 唯一有识别功能的装饰，按 hairline 权重保留 |
| 品牌标（圆/方/三角） | 换为单个圆角墨色方块 | 三原色三图形一排就是对包豪斯的引用本身 |
| 幽灵编号 | 900/负字距 → 600/紧字距，保持 10% 墨 | 软体系里装饰不喊 |
| 状态徽章（黄底黑戳） | 仅换 token：克制的琥珀 + 20% hairline + 软阴影 | class 令牌被测试锁定，语义不变 |

## 5. 已披露的残余问题（规范负责人知情）

1. 琥珀**填充**对白色卡片 **2.86:1**，低于非文字 3:1 下限；徽章始终带文字与 hairline 边，不是唯一信号，但如需过检需加深琥珀或加强边。
2. L1 首屏有六个红色主按钮，是页面上最响的物件；中性体系通常把主动作给墨色、把强调色留出来。改这一项要同时改 `Button` 与 `SearchForm`。
3. 提示词块的内圆角 12px 位于 12px 卡片内、16px 内边距——按派生规则应更小。
4. `--color-faint` 在深色下 38% 正好压在 3:1 线上。

## 6. 完整采用还需要的工作（实现侧，规范认可后执行）

1. `src/app/layout.tsx` 仍下载 Outfit 与 JetBrains Mono（中性主题不用），需按主题门控字体加载。
2. `src/features/**` 里约 40 处内联的 `border-2 border-foreground md:border-4` 包豪斯框，改走 helper，之后删掉 CSS 覆盖块。
3. 四色分类轴映射（`accent.ts`）是否收敛为单一强调色——中性体系通常只留一个。
4. 主按钮颜色（见 §5.2）。
5. 删除 `GeometricMark`、`.shape-triangle`、`BrandMark` 的包豪斯分支。
6. `dividerClassName` 的 `column` 档与 `desktopThick` 在中性主题下已无区别，可收敛。
7. 深色模式下的 axe 全量跑一遍（目前门禁只在浅色下跑）。
8. 同步 `frontend/CLAUDE.md` §7 与 `frontend/AGENTS.md`（这两个文件当前由另一会话持有未提交改动，前端代理未动）。

## 7. 验证证据（提交 `37af96a`）

- `NEXT_PUBLIC_THEME=bauhaus` 构建与切换前构建逐文件对比（55 页）：可见文字差异 0、链接差异 0、class 差异 1——且那一处是单独要求的页脚移动端两列，与主题无关。
- lint / typecheck 干净；vitest 58 文件 / 713 测试；`next build` 55 页；`check:static` 9/9 通过。
- e2e 与截图在该提交上**尚未**由控制方复跑（工作区随后出现其他会话的大量未提交改动，控制方停止在该树上验证，见 `.superpowers/sdd/progress.md`）。

## 8. 交接前的一个阻塞

写这份文件时，工作区里有约 60 个文件的**未提交改动来自其他会话**（删除了 `ExpandToggle`、`AnchorNav`、创作者与合集磁贴等，并把卡片的等宽提示词块换成了三行摘要），其中部分与冗余审计的「保留」结论相反。前端代理未覆盖、未构建、未提交这些改动。哪一方拥有 `frontend/` 的后续，需要产品负责人指定。
