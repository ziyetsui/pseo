# Website 与图片案例 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver Website navigation, a complete evidence-backed intake graph, CMS-compatible proposals, and an audited engineering release.
**Architecture:** Keep intake outside generated content. Reuse Task Findings with an explicit website task union. Submit only existing allowlisted draft contracts.
**Tech Stack:** Node 24 built-ins, Next/TypeScript, Vitest, existing CMS proposal normalizer.
**Spec:** docs/superpowers/specs/2026-10-14-website-image-import-design.md and matching acceptance spec.

## Global Constraints
- 59 reviewed website projects and 541 gallery cases, 13 source categories.
- No content/** authoring, fabricated prompts, inferred rights approval or silent public-fixture fallback.
- Default branch is codex/cms-preview-integration; user authorizes PR merge/deploy.
- Intake is draft/review_required/noindex; production requires CMS public snapshot.

## Review Focus
- Duplicate X source with different prompt retains distinct artifacts and a conflict report.
- Missing prompt produces a website-case, never a synthesized prompt.
- Unsafe source/media URLs fail validation before output.
- Website membership follows explicit task slugs and deduplicates immutable IDs.
- Empty website collection remains a valid, accessible noindex page.

### Task 1: Deterministic intake and proposals
**Files:** scripts/import-cases.mjs, scripts/lib/case-import.mjs, scripts/tests/case-import.test.mjs; docs/intake/2026-10-14/.
**Interfaces:** buildIntake({websites,gallery,observedAt,upstreamCommit}) returns nodes, edges, proposals, reviews, manifest; validateGraph(graph) throws on duplicate/dangling relations. normalizePromptProposal validates every emitted proposal.
- [ ] Write tests covering exact prompt preservation, no-prompt hold, dedup/conflict, unsafe URLs, deterministic output, graph integrity.
- [ ] Run node --test scripts/tests/case-import.test.mjs; expect missing implementation failure.
- [ ] Implement pure extraction and local CLI; download pinned upstream data/notice and preserve provenance hashes.
- [ ] Run tests and full-input importer; expect 59/59 and 541/541 reconciled, no dangling edges, all proposals normalized.
- [ ] Commit deliverable with actual counts and pending review status.

### Task 2: Website navigation and collection
**Files:** frontend/src/lib/catalog/website.ts; components/Browse.tsx, TaskFindings.tsx; site/routes.ts; app/[locale]/[[...path]]/page.tsx; tests/website-category.test.tsx; shared CSS if necessary.
**Interfaces:** websitePrompts(catalog) returns unique Prompt[] matching explicit tasks; websiteRef(catalog) returns noindex Ref; TaskFindings accepts optional resolved rows for aggregate category.
- [ ] Write consumer tests for Website link/count/routes, explicit task union across image/video/text, duplicate ids and empty state.
- [ ] Run new tests and observe failure.
- [ ] Implement shared category tile and website route using existing Findings design, preserving all other routes.
- [ ] Run frontend lint/typecheck/test/build:visual/check:static and responsive browser smoke.
- [ ] Commit.

### Task 3: Engineering CI and release
**Files:** .github/workflows/*.yml, specs/0008-prd.md, specs/0009-pseo-tech-arch.md, docs/intake/2026-10-14/release.md.
**Interfaces:** Real default branch PR checks, deployment receipt with source SHA and data status.
- [ ] Extend CI base branch and importer gate; retain main compatibility.
- [ ] Run infra validate/build/tests and frontend gates; verify CMS proposal contract without DB writes.
- [ ] Request fresh whole-branch review; fix material findings and rerun affected tests.
- [ ] Create new PR, observe CI, merge after checks pass, deploy only validated artifact to verified existing beta target; smoke category and legacy routes.
- [ ] Record actual CMS proposal/public/mirror/deploy status separately; if publishing blocked by auth/review, retain complete reviewable artifacts and report exact requirement.
