# Frontend API contract verification — 2026-09-04

The rebuilt frontend consumes generated OpenAPI DTOs through `src/lib/api/client.ts`; its serializable page model is `src/lib/catalog/types.ts`. TypeScript and the runtime JSON Schema are generated together from `backend/openapi/openapi.json` by `scripts/generate-api.mjs`. The deterministic `--check` command passed.

## Actual interface surface

All public calls are anonymous, read-only GET requests. Content calls explicitly send `locale`; the locale registry and health check do not.

| Route | Frontend use | Verified |
| --- | --- | --- |
| `/api/v1/locales` | Enabled locales and legitimate static routes | Yes |
| `/api/v1/home` | L1 catalog statistics, featured records and browse references | Yes |
| `/api/v1/prompts` | Complete cursor-closed catalog, search/filter/sort contract | Yes |
| `/api/v1/prompts/{slug}` | Full Prompt text, variables, actions, evidence and SEO | Yes |
| `/api/v1/facets` | Filter counts from the same immutable revision | Yes |
| `/api/v1/models/{slug}` | L3 model metadata and membership count | Yes |
| `/api/v1/categories/{axis}/{slug}` | L2 image category and membership count | Yes |
| `/healthz` | Local read-model availability and revision | Yes |

Success payloads and all required/nullable fields are validated against the generated schema. List/detail identity, terminal cursor consistency, duplicate items, repeated cursors, count mismatches and revision drift fail closed. Header `X-Content-Revision` must equal the response envelope revision. `PromptDetail.revision` has its separate source-record scope and is not used as a replacement for the catalog revision.

`public-api` mode requires both `FRONTEND_API_URL` and a complete `FRONTEND_EXPECTED_REVISION=sha256:…`. Every locale-registry request and every page worker is bound to that externally selected revision. A missing or mismatched pin fails before a catalog can be accepted. There is no fixture fallback.

The standalone API client defaults to `cache: no-store`. Public static generation explicitly uses `force-cache`, with the pinned revision sent as an `X-Content-Revision` request header. Next.js includes request headers in its persistent fetch cache key, so separate snapshot revisions cannot share an entry. Every cached response still passes the same DTO/header/body/expected-revision checks. This follows the bundled Next.js fetch documentation and avoids `no-store` forcing a dynamic route during static export.

The browser works from this complete immutable catalog. Multi-valued axes use OR; separate axes and text use AND. Public `value`/`trending` sorting follows the implemented backend formula including comments/reposts and its date/ID tie-break; `newest` uses publication time. The time window uses **metrics observation time**, matching the backend. The live contract tests compare all four sort modes and all three windows. These are catalog ordering semantics, not evidence of copy analytics.

## Executed checks

- `pnpm exec vitest run tests/api-contract.test.ts`: **14 passed**, including explicit mode/pin, first-read pin mismatch, revision-specific static caching and cached-response mismatch, malformed DTO, cross-read revision drift, problem codes, independent source-record revision, complete text, placeholder substitution, filter conjunction and locale isolation.
- `FRONTEND_CONTRACT_API_URL=http://127.0.0.1:8000 pnpm exec vitest run --config tests/api.integration.config.ts`: **2 passed** against the real local FastAPI process after pinning was added. This covers every route above, complete public catalog loading, all sort/window modes, exact model SEO/locale variants, independent Prompt source revision, missing detail and unpublished locale behavior. Localhost network access required sandbox escalation; the read-only verification was approved.
- `pnpm exec eslint src/lib scripts/generate-api.mjs tests/api-contract.test.ts tests/api.integration.ts tests/api.integration.config.ts`: **passed**.
- `node scripts/generate-api.mjs --check`: **passed**.
- From `cms/`: `node --experimental-strip-types --test tests/wireframeSeed.test.ts tests/previewCatalog.test.ts`: **21 passed**. Restored seed-compatibility data did not break the existing CMS seed/projector contract. No CMS database was read or written by these tests.

The local read model used revision **`sha256:133521b6a07f71ad2455e1e4bd25634cabf3f79c5643a2e81ce87c4c90952a01`**, with one `zh-CN` Prompt at `/zh-CN/prompts/country-miniature-stamp-poster`. Its media collection and unavailable engagement metrics remain empty/null. This is the repository's local contract fixture, not a claim about the deployed CMS, public mirror or production site. `en` is registered but disabled and does not produce content routes.

## Visual fixture versus public content

`visual-fixture` is an explicit design-review mode containing the 35 records extracted by JSON parsing from the supplied prototype. The JSON `DATA`/`ALL` arrays were identical across the five selected reference pages. Current prototype titles, prompt text and images are preserved; the old wireframe modules are retained only for CMS seed compatibility and evidence/metadata absent from the new prototype. Actual literal placeholders are extracted from the new text; existing variable options are retained only when provided, and unconfigured tokens have empty option lists.

Visual records are not public approvals. They must remain noindex and cannot establish license, publication, copy ranking or production availability. Counts are computed from the actual mode-specific catalog, not copied from prototype library-wide statistics.

## Known interface gaps and boundaries

- The backend OpenAPI/router does **not** implement Article, article-category, collection-detail, creator-detail or search-suggestion HTTP endpoints. No calls to these guessed routes were added. Creator and collection navigation uses explicit local catalog filters when those relations exist. Public collections are currently empty.
- The provided prototype's generation actions have no implemented backend write endpoint. Only a supplied `actions.tryUrl` may enable external generation; the adapter does not invent one.
- Public video content is filterable by `contentType=video`; the current verified source contains none. The live L2 projection verification covers the implemented image category. A visual video deck is not evidence of a published video category.
- CMS Preview is a separate protected contract at `/api/internal/v1/preview-catalog?locale=zh-CN`, requiring an independent server-only Bearer and (remotely) Access/RBAC. It returns `CmsPreviewEnvelope` with `promptText`, `media.src`, and `meta.mode=cms-preview`, unlike the public DTO. It is constrained to the 35-record wireframe projection and uses private/no-store/noindex headers. The rebuilt frontend does not enable or call this protected mode.
- `cms/scripts/preview-loop-e2e.ts` still expects a protected frontend with `data-internal-preview` and a CMS revision marker. That end-to-end script is not compatible with the two current frontend modes and was **not run**. Reintroducing protected live draft preview needs a separate server-only adapter and its own routing/deployment contract.
- CMS `/api/internal/v1/public-snapshot` is a read-only, independently authenticated files/base64/manifest export for the mirror worker. It is not a public page catalog endpoint and no credential was loaded.
- No content proposal, CMS rights approval, CMS public transition, Git mirror write, deployment, Access/DNS change or production smoke occurred in this API task.
