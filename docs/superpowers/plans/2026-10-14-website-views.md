# Website graph views implementation plan

> Execute inline with superpowers:executing-plans; continuous Git-beta completion authorized.

Goal: Replace flat Website entry with graph views and independent static URLs.
Architecture: typed WebsiteGraph, pure traversal, server directory, scoped existing galleries.
Spec: docs/superpowers/specs/2026-10-14-website-views-{design,acceptance}.md.
Constraints: preserve59 imported/60 total cases, stable URLs, sources and honest prompt state; noindex; no dependencies; preserve concurrent prototype.
Review focus: identity deduplication, baseline prompt, exact scope, invalid paths, scope after history/reload.

1. Test-first graph/directory: website-cases.test.tsx and new website-views.test.tsx. Observe flat-root failure. Add WebsiteGraph/WebsiteView types, Git adapter projection, websiteViews / websiteViewForPath / websiteViewEntries / websiteViewsForCase helpers. Test actual memberships, baseline/dedup and invalid cases.
2. Add WebsiteViews.tsx directory, explicit scoped gallery, detail-view links. Integrate routes, catchall, metadata and footer. Test root0 cases, distinct routes, scoped HTML, metadata and back links.
3. Advance revision policy; finalizer records rendered view contract, static checker verifies exact edge membership. Test corruption and missing routes.
4. Full frontend and root checks; beta/static and legacy exports; browser navigation/history/axe/no-JS/widths; independent branch review. PR/CI/merge, deploy exact source, live all-view smoke and receipt.

Ledger: isolated base7e08aae; baseline153 tests passed. Existing graph supplies semantic relationships; expose views without manufacturing content nodes.
