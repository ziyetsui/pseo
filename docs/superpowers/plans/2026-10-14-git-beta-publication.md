# Git beta Implementation Plan

> REQUIRED SUB-SKILL: superpowers:executing-plans. 用户已授权直接执行、推送与beta部署。

Goal: Publish the verified image and website cases through explicit Git beta mode.
Spec: ../specs/2026-10-14-git-beta-publication-design.md and acceptance.

- [ ] Task 1: Add tests for real batch counts, media preservation, separate case types and revision binding. Implement typed server catalog mapping and checked preview manifest.
- [ ] Task 2: Add Website case gallery/detail and URL filters using existing tiles; register routes and count union; retain original prompt pages.
- [ ] Task 3: Add git-beta build/finalizer/static gates and regression tests. Run full checks, responsive/no-JS/live navigation tests and independent review.
- [ ] Task 4: Push/merge, deploy same artifact to existing Pages main/frontend-design targets, verify all new routes/counts and store receipt.

Constraints: no CMS writes or invented prompt/rights/model claims; noindex; fail closed on malformed graph/unsafe URLs/dangling relations; exact source attribution. Review focus: duplicated source with multiple images, missing creator labels, media provenance, empty filters/history, large static catalog.
