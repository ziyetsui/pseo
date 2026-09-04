# Remove visible breadcrumbs

2026-09-04：按用户“统一去掉”移除公开站可见面包屑。

涉及 Anthology（模型/模型系列）、Deck（图片/视频）、Recipe（L4）、BlogArticle。删除 JSX 和空外层，清理仅由该导航使用的变量；不靠 CSS 隐藏。Header、页内目录、Footer 与真实关系链接继续可用。StructuredData 中的真实 BreadcrumbList 不变，原型参考目录保留。

frontend/AGENTS.md、PRD、Tech Arch 已同步。

验证：typecheck 通过；101 单测通过；lint 0 error、13 既有图片警告；视觉 build/check:static 通过（80 HTML、4675 站内链接）；导出 HTML 中没有可见 Breadcrumb 导航；无障碍 E2E 见 e2e.log。根 compiler validate/build 和 18 项 infra 测试通过。本轮无 CMS、内容镜像或生产部署变更。
