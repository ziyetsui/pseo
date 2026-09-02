# Cloudflare Pages Preview 草案

`wrangler.preview.toml` 指向由 `prepare-preview.mjs` 生成的完整静态目录。仓库内的 GitHub workflow 只构建并上传 artifact，不会调用 Cloudflare API。

接入真实 Preview 前，需要由管理员完成：

1. 建立专用的 Cloudflare Pages Preview 项目，并确认构建输出目录为 `infra/generated/preview-site`；
2. 在 Cloudflare Access 中保护 Preview 域名（包括可被猜到的分支 Preview URL）；
3. 在 GitHub Environment 中保存 `CLOUDFLARE_ACCOUNT_ID` 和具备目标 Pages 项目部署权限的 `CLOUDFLARE_API_TOKEN`，禁止写入仓库或日志；
4. 将部署 job 固定到受保护 Environment，只允许可信分支/审核人触发；不要向 fork PR 暴露 secret；
5. 部署时固定 commit SHA 和 artifact，Production 只从已合并的 `main` SHA 发布；回滚时重新部署上一份已验证 artifact/SHA，不从 Payload 草稿重建。

Preview artifact 自带 HTML meta、`X-Robots-Tag` 和 `robots.txt` 三层 noindex。它们只能降低意外收录风险，不能替代 Cloudflare Access。
