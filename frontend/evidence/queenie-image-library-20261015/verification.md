# Queenie image library verification

PR: https://github.com/ziyetsui/pseo/pull/42

1,306 real published image cases, 3,321 references, 1,849 total image prompts. 17 original-video source cases excluded. All 3,338 source images decoded and checksummed.

Final source: 3d31b29c5eacb747da222871f823d8bc195fc87b

253 frontend tests, 39 root tests, lint and typecheck passed. Full beta export/static check passed: 4,485 HTML pages, 219,486 local links, 18,867 files, largest asset 20,928,479 bytes.

4 Chrome E2E checks passed across English/Chinese desktop/mobile. Actual reference images decoded. Image contain framing inspected. No-JS prompt body and noindex checked. Final CI passed (frontend 15m44s after job timeout extended to25min; all checks retained). PR42 merged as9fbc511930f1c913ec625c215463f94ffb3b6156. Source tree matches the verified artifact.

Production deployment: https://91b74a65.pseo-internal-beta-preview.pages.dev
Beta deployment: https://60e1c06d.pseo-internal-beta-preview.pages.dev
Public site: https://beta.ancher.site/en/prompts/image

Live receipt revision sha256:2cd248b9ae3c3979a9406e924111908ea37624b1e86dbbfa16af6d2b4632dcb6 confirms1306 image cases/3321 references/1849 image prompts. After deployment propagation, all4 public Beta browser tests passed (56.8sec). Live visual image decode/framing and no-JS/noindex checks passed. Isolated preview retains existing Cloudflare Access protection; no Access settings changed.
