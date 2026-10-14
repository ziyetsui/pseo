# Website 提示词补查与 Git beta 接入

2026-10-14 用户要求重新检索所有公开给出提示词的网站案例，并按现有 spec 加入 beta.ancher.site/zh-CN/prompts/website。本次请求将已授权 Git beta 内容路径扩展到本轮逐条复核通过的网站提示词；CMS、rights approval、content/** mirror 均不变，继续 noindex。

范围：100 场景 Latest 及20组宽词 Top/Latest，共140查询；候选逐条复核，重点讨论串补读。公开正文、同作者回复和可访问外链才构成实际提示词证据；营销说明、纯图片/视频生成、系统提示词及“私信领取”不冒充建站指令。网站设计、文案、开发及浏览器交互可用正文显式目标建立 Website 用途边。搜索集合并不代表全网穷尽。

保留原文、原帖、作者、观察时间、真实日期、分帖来源与原始响应。短提示词保留原长度，不扩写。标题和摘要可用中文编辑描述，原 prompt 不翻译。去重按 source+prompt 及完整正文指纹处理，附加来源不丢弃；冲突独立保留。来源说明和模型声明不冒充已复现结果。

补充 intake 独立于原600条：复用 buildIntake 与 normalizePromptProposal，缺正文和 contract blocked 留审核档案；仅通过者生成附加 graph。节点和边遵循现有合同。新增prompt有L4全文页；无真实预览的条目使用现有空态，不新增占位图或虚构项目页面。与现有案例同原帖的prompt关联到现有案例，Website列表避免重复展示同一prompt。

构建 revision、receipt 与静态路由门禁必须覆盖补充 graph。保持原541图片示例、59网站案例与原有内容。验证 source/prompt exact-match、长正文分帖、去重、图端点、API合同、catalog、build/static及线上HTTP。部署使用现有Pages项目与frontend-design别名，不改DNS/Access。
