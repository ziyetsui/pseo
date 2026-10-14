# ancher.ai PSEO SEO integration handoff

Status: policy prepared; formal-host implementation and deployment deferred by the owner on 2026-10-14 (source under stremifyone, not connected yet). This beta release does not change the existing ancher.ai homepage, hosting, DNS or robots. /zh-CN/prompts currently returns404 on that host. Do not claim Google indexing or formal URLs are live.

## Target architecture

Keep beta.ancher.site noindex. Formal canonical origin must be https://ancher.ai, never beta or a preview deployment URL. Connect only the PSEO prefix and its referenced static assets to the formal host, preserving its existing homepage and sitemap. Inventory asset paths from the final export (including /_next/, /website-previews/, licenses and source-image assets); a prefix-only HTML mount without those assets is insufficient. Expose a dedicated /prompts-sitemap.xml and add it to the existing robots/sitemap configuration after integration.

## Eligibility policy to implement at integration

- Canonical URLs omit filters, tracking queries and fragments. Query variants retain their clean collection canonical. Duplicate Website cases with a supplied Prompt canonicalize to the actual Prompt Recipe URL.
- Nonempty media/category hubs can be indexable. Graph views and taxonomy collections require at least3 unique cases/prompts; smaller views remain usable and noindex,follow.
- Prompt Recipes require a supplied prompt of at least80 characters, real preview and a real HTTPS source. Project-only Website Recipes require real preview, source, demo or code URL, and at least60 characters of meaningful source-backed description. Missing fields must not be fabricated to pass a threshold.
- Library index is a navigation directory: noindex,follow. Unknown routes return404. Noindex URLs remain crawlable so crawlers can see the directive.
- Sitemap contains only indexable clean canonical URLs returning200. No beta hostnames, queries, fragments, thin views, duplicates or unknown routes. lastmod is emitted only from reliable content timestamps.
- Structured data reflects visible content and real source attribution. Use CollectionPage/ItemList for collections and CreativeWork for supplied cases/prompts; do not invent generation steps, reviews, author claims or software capabilities.

## Quantified integration acceptance

1. 100% of eligible pages have exactly1 self-consistent canonical on ancher.ai;100% of query variants canonicalize to a clean URL.
2. 0 sitemap entries resolve to404, redirect, noindex or duplicate canonical;0 beta URLs appear in canonical/sitemap/JSON-LD.
3. Compare all30 Website views,60 Website routes and556 Prompt URLs with the existing graph and deduplicate the615 detail routes. Record actual eligible/excluded counts and reasons after applying the policy.
4.100% of noindex routes expose the directive in fetched HTML or headers; robots does not prevent reading that directive. Preserve all existing formal-site robots and sitemap behavior outside the PSEO integration.
5. Confirm representative L1/L2/L3/L4 pages and all referenced assets load through the formal host; test widths375/768/1440, internal links, JSON-LD and canonical consistency.
6. Submit the PSEO sitemap in the owner's Search Console only after deployment. Report submission separately from actual Google indexing; indexing is not guaranteed by configuration.

References: [Google robots meta](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag), [canonical consolidation](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls), [sitemap rules](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap).
