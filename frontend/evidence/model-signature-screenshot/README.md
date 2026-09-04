# Signature — screenshot revision

本轮以用户截图 reference.png 为唯一首屏视觉参考，替代上一轮按 URL 得到的 Ticker 布局。

修改：ModelSignatureHero.tsx、model-signature.css、AnthologyReader.tsx；居中大标题、数量/版本行、双署名与手绘曲线、半透明三行输入面板、面板下方的真实版本链接。署名 X 地址来自既有 docs/prototypes/task-l3/credit-shared.tsx；不替代 Prompt 来源或 authors schema。

已查看 1507×834 桌面与 375×834 手机截图。桌面标题、署名、面板与版本按钮位置已按参考比例对照；图墙保留原动效，因此截图帧中的图片位置会随时间变化。手机独立适配，版本按钮自然换行。原型候选栏和无效快捷键不进入产品；暂停按钮、reduced-motion、草稿保存和 L4 链接继续保留。

验证日志：unit.log（101 项）、typecheck.log、lint.log（0 错误/13 条图片警告）、e2e.log（模型首屏与各页面无障碍）、build.log/static.log、compiler-validate.log/compiler-build.log/infra-tests.log。本轮未重新执行全部 E2E；上一轮完整回归记录在 ../model-signature/e2e-final.log。

frontend/AGENTS.md、PRD、Tech Arch 已同步截图定稿。没有修改 CMS、content mirror、SEO 资格或部署；localhost 继续为 noindex visual fixture。桌面旧 MHTML 作为先前快照保留，未覆盖。
