# Model entry → hero composer

2026-09-04 用户要求模型列表 Generate 携带提示词回到首屏生成组件。

AnthologyReader 的模型/模型系列列表 CTA 在普通点击时阻止页面跳转，原样写入完整 prompt.prompt，保留换行/变量，保存当前模型 sessionStorage 草稿；下一帧将输入框聚焦到文本开头并居中平滑滚动。prefers-reduced-motion 时立即定位。所选 Prompt 类型决定首屏 Generate 标签。

条目标题继续进入 L4；无 JS、脚本尚未接管或修饰键点击保留原真实 L4 href。首屏生成链接仍为 https://bo.ancher.ai/home，不传输提示词参数。不恢复 Send to the scratchpad 按钮。

已同步 AGENTS.md、PRD、Tech Arch。无 CMS、内容镜像或部署变更，fixture noindex 不变。

验证：101 单测、typecheck/lint、视觉 build/check:static、compiler validate/build/18 infra 测试通过。模型首屏及图片/视频浏览路径 E2E 见 e2e-final.log；覆盖完整原文、焦点、滚动位置、刷新保存、标题 L4、无 JS 回退和手机布局。首次 e2e.log 包含脚本接管前点击进入 L4 回退的失败，最终测试等待已有图墙交互初始化信号后检查 JS 增强行为。
