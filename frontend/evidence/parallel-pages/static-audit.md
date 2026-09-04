# Parallel-page static audit

Date: 2026-09-04. Final read-only recheck of the rebuilt frontend/out; no build or runtime interaction performed by this audit. Excludes 404, not-found, redirect entry shells, proto harness and Blog from the Prompt parity matrix. All 80 HTML files were inventoried; 72 Prompt product pages were parsed with node-html-parser.

## Coverage

| Page type | Count |
| --- | ---: |
| L1 | 1 |
| L4 | 34 |
| Directory | 2 |
| L2 | 2 |
| Model | 13 |
| Style | 7 |
| Subject | 5 |
| Task | 8 |

## Verified shared structures

- All 72 Prompt pages have the same 27 footer destinations; all destinations exist in the export. Target page content was inspected and every linked category/model/subject or browse directory has real Prompt content. Empty model and style targets are not linked from footer.
- All 13 model/model-family pages contain one Signature, one native textarea and aria-hidden highlight layer; top Generate href is https://bo.ancher.ai/home. All have current two-line copy. No old About section.
- All 34 L4 pages have placeholder radio groups, Custom choices and marked template variables (102 unique per-page variable groups total). All 34 generation links target https://bo.video/home.
- All 8 Task pages omit large Browse tile/category/model/style sections. All 7 Style pages expose category/task/model/style as browse-row horizontal structures.
- No Copy prompt, Read it / Read it all, Send to the scratchpad action or visible Breadcrumb appears on any of the 72 pages.
- Highlight scrolling, draft persistence, CTA events, modal gating and responsive CSS behavior cannot be proven from static HTML; runtime tests are separate.

## Data-dependent differences, expected

| Model route | Prompt entries | Related topic cards |
| --- | ---: | ---: |
| /zh-CN/prompts/model-families/gpt-image | 6 | 6 |
| /zh-CN/prompts/model-families/nano-banana | 17 | 6 |
| /zh-CN/prompts/models/gpt-image-2 | 4 | 6 |
| /zh-CN/prompts/models/gpt-image | 4 | 6 |
| /zh-CN/prompts/models/higgsfield-soul | 4 | 6 |
| /zh-CN/prompts/models/kling | 0 | 0 |
| /zh-CN/prompts/models/nano-banana-2 | 3 | 6 |
| /zh-CN/prompts/models/nano-banana-pro | 14 | 6 |
| /zh-CN/prompts/models/nano-banana | 5 | 6 |
| /zh-CN/prompts/models/seedance | 10 | 6 |
| /zh-CN/prompts/models/sora | 0 | 0 |
| /zh-CN/prompts/models/veo | 0 | 0 |
| /zh-CN/prompts/models/wan | 0 | 0 |

The 4 empty registered model routes omit Related topics and media. The 9 nonempty models show 54 real cards total. Anime / illustrated and Surreal / fantasy are empty Style routes, retaining the shared page shell plus honest empty state; their omission from footer is intentional. Model/series child version links vary by actual registered membership.

## Final recheck

All 72 Prompt pages were reparsed after the parent task rebuilt the export. No static structural violations remain in this matrix. Footer membership remains 27 existing, populated targets on every page; model and L4 CTA destinations remain unchanged. All 13 models, 34 L4 pages (102 variable groups), 8 Task pages and 7 Style pages pass the checks described above.

- Automotive and Web & motion design now use singular Prompt wording for their single-item collections.
- Both empty Style routes show a real Browse all prompts link and no ineffective Clear filters button in their empty state.
- Exact source inspection confirms DeckBrowse now imports and uses isStructuredPrompt instead of the leading-bracket heuristic; the previously reported source risk is resolved.
- The 54 Related topic cards remain confined to the 9 models with real Prompt data.

No implementation files, CMS, content mirror or production state were modified by this audit. Runtime and build results are recorded separately by the parent task.
