# 分类、媒体类型与全站导航审计

2026-09-04；范围：当前本地 `visual-fixture` 站点的全部 34 条 Prompt、77 个导出 HTML、L1/L2/任务 L3/风格 L3/模型与系列 L3/L4、目录、页脚及筛选。通过 Superpowers 的并行审计、定位根因和完成前验证流程执行。

最终视觉数据 revision：`sha256:77844116d1d995f31363188f8d829326ca1d56934d2caf0aea3297e0572b7136`。此 revision 不是 CMS public snapshot。

## 结论与修正

- 审读 34 条完整正文及本地来源证据，修正 10 条记录上的明确错误标签，并补齐有正文依据的主体、技法与用途关系；合计 23 条记录、40 项字段修改。Prompt 正文、模型关系、媒体 URL、immutable id、slug 和 image/video/unknown 类型未改变。详细 before/after 在 [applied-corrections.json](./applied-corrections.json)。
- 负面提示词中的 cartoon/illustration、不使用 cinematic 的明确约束、背景饮料道具、作为样式参考的网站地址，不再直接触发正向分类。地球镜头最后进入咖啡馆并呈现汉堡/饮料的记录仍属于餐饮。
- 餐饮从 8→5，Cinematic 从 14→12；误标移除后 Anime 暂无记录，保留真实空分类页。Web & motion 从 3→1，Product marketing 由正文证据补齐到 3。系列去重逻辑不变。
- 22 image、11 video、1 unknown。11 条视频只有 JPEG 封面，属于视频 Prompt 的静态预览，不能报告为可播放视频。未知条目继续使用 Generate，不混入 Images/Videos。
- 修复任务页头导航的 25 处失效锚点：改为跳至真实首页对应区块；首页和 Style 页保持有效页内导航。
- 静态校验以前仅验证目标文件存在，现同时检查同页/跨页 hash 的真实目标。不存在的 fragment 会令校验失败。
- 修复 `window=7d/30d` 未计入活动筛选且 Clear filters 无法移除的问题；保留 sort 和固定页面路径。
- 修复目录/Blog 顶部错误标记 Images 为当前页的问题。
- Style 浏览器测试增加返回页已恢复的断言后再刷新，避免移动 Chromium 的页面尚未附着时立即 reload。不是修改应用页面来绕过错误。
- 已同步 `frontend/AGENTS.md` 的分类证据、媒体类型和锚点校验规则。

## 实际验证

| 检查 | 本轮结果 |
| --- | --- |
| 单元/组件测试 | 49/49 通过；包括分类纠错、时间范围清除、真实页头链接和坏锚点拒绝 |
| TypeScript | 首次构建发现新增导航测试的可选值类型错误；修正后独立 typecheck 与构建内 TypeScript 均通过 |
| lint | 0 error，10 条既有 no-img-element warning |
| build:visual | 通过，生成 79 项，最终 77 个 HTML |
| check:static | 77 HTML / 4,948 处本地链接及 hash 校验通过 |
| 实际本地 HTTP | 77 路径状态与 H1 均符合导出产物；包括应返回 404 的页面 |
| 外部资源 | 36 个结果/封面地址及 24 个 fixture 头像地址，60/60 返回 200、image MIME |
| 外部来源链接 | 导出页面中的 34 个唯一外部链接 HEAD 均返回 200；34 个原帖 status ID 与对应记录 id 匹配 |
| 根 compiler | validate、build 通过；18/18 infra tests 通过 |
| 浏览器回归 | 完整套件最后一轮：43 通过、3 个有意跳过、2 个旧筛选按钮断言失败；修正后受影响桌面/手机用例定向复跑 2/2 通过，未再运行完整套件，不称全套单次全绿 |

回归过程透明记录：初始完整运行 44 通过、3 跳过、1 个移动端 reload 协议错误；增加恢复页面等待后该用例连续 3 次通过。分类改动后完整运行有 5 个失败，均为旧 portrait/Food/Cinematic 数量断言；更新数量后完整套件 43 通过、3 跳过、2 失败。剩下两个同源失败是测试仍点击已退出前两位的 Cinematic 筛选，实际页面提供 Photorealistic/Luxury；改为现有 Luxury 后桌面和手机定向回归 2/2 通过，仍验证 style URL、历史返回、清除及 L4 跳转。未删除断言或增加超时掩盖失败。跳过的是触屏无鼠标吸附测试和重复的移动项目 viewport matrix；宽度矩阵已在桌面项目执行。

可重复验证脚本：[check-live.mjs](./check-live.mjs)；最终逐 URL 响应：[live-results.json](./live-results.json)。网络成功只证明当次可达及返回 MIME，不证明 X 返回了完整帖子正文、作者模型声明真实或存在内容使用许可。

## 保留的判断边界

- [taxonomy.md](./taxonomy.md) 覆盖全部 34 条；[taxonomy-corrections.json](./taxonomy-corrections.json) 另列 9 项 medium 建议，涉及模板可选用途、次要背景或风格范围，未自动应用。模型关系与本地来源标签一致，但没有独立证明作者实际使用了这些模型。
- [media-review.md](./media-review.md) 列明全部媒体归属、两条用途歧义、一条未知类型、源媒体时长与指令时长的区别，以及历史 Preview/未来 public examples 接入限制。其文件 hash 是审计前输入 hash；本轮只改 taxonomy，媒体审计结论不受影响。
- [routes-review.md](./routes-review.md) 记录导航与筛选根因。对当前固定数据/渲染链接全量检查，并用浏览器覆盖主要交互旅程；不把有限回归称作所有任意 query 组合已穷举。
- 本次未做新的 Lighthouse/像素还原审计，也未重建正式 public-api 生产站。L4 最终生成服务因样本 `tryUrl=null` 仍诚实禁用；L1–L3 单条 Generate 可进入真实 L4。
- 本次工程及 fixture 修正仅在本地；未提交 CMS proposal、未修改 CMS public、未同步 Git mirror、未部署生产。正式内容改类仍需 CMS revision-bound proposal 与人工审核。
