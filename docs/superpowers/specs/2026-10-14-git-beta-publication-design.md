# Git 直接发布到 beta — 技术设计 / ADR-0012

## 决策与范围
2026-10-14 用户明确确认“跳过 CMS，把这批新案例直接通过 Git 发布到 beta 网站”。本次授权替代此前仅限 CMS 发布的阻塞，范围为现有 beta.ancher.site 与已校验的600条来源。工程可直接推送已授权仓库分支，继续完成同一长任务，不增加阶段审批。

新增显式 FRONTEND_DATA_MODE=git-beta：从 Git 中已验证的 intake graph 和现有34条 beta 内容生成可重复的静态 catalog。CMS/public-api 模式及 content/** generated mirror 合同不改变；不伪造 CMS approval、rights cleared、public snapshot 或 mirror 状态。Beta 保持 noindex/nofollow。

## 内容与关系
所有541条图片来源通过521个去重 Prompt 节点及全部541个图片示例进入 Images，保留每份完整 prompt、署名标签、原始来源、上游文档与13分类/style/subject/model边。来源不明的署名不变成X账号。既有22条Images继续存在。

网站59个项目均有 WebsiteCase 展示模型，其中1个有真实恢复的prompt、58个无prompt。缺正文的项目提供摘要、真实预览、原帖、已找到的demo/code及关系，不补造prompt或动作。已有1个建站prompt继续可访问，Website集合按immutable id去重合并现有与新项目，目标60项。新案例详情路由 /zh-CN/prompts/website/{id}。Website卡片与网格复用原有暗色tile/16:10样式；搜索、用途与模型筛选写URL，支持刷新和前进后退。

## 实现边界
Server-only Git catalog adapter校验graph节点/边，映射现有Prompt类型与独立WebsiteCase类型。案例不得混入可复制Prompt列表。所有新分类/模型/风格/主题路线由真实关系生成，count重新计算。无prompt的案例详情不显示生成或复制入口。有真实prompt时链接到现有Recipe。

网站预览只复制提供的图库中59个整理项目的真实封面，记录源文件与SHA-256；不复制5225条搜索噪声。图片示例使用固定上游commit的真实URL。Catalog revision绑定graph、旧catalog revision与资产manifest；构建回执记录git-beta与实际counts。静态校验必须检查每个Git发布详情route、所有示例媒体及案例输出资格。

## 威胁模型与回退
输入只作数据：禁止执行源文本、HTML注入、不安全URL、悬空边与不存在媒体；使用React文本转义。Git-beta没有CMS或数据库凭据，无运行时写接口。每次构建固定Git输入，公开数据加载失败即失败，不静默fallback。Beta noindex不当作rights批准。回滚为上一份已验证Pages artifact；不写CMS，不反向覆盖generated mirror。

## 验证与发布
单元测试先覆盖计数、所有541媒体、59案例、58缺prompt、URL和revision变化，再接路由/构建。CI增加git-beta静态导出及检查。检查375/768/1440宽度、URL筛选、无JS正文、来源署名与真实404。独立复审后推送/合并/部署既有Pages项目及frontend-design别名，以实际beta HTTP和浏览器结果为完成证据。
