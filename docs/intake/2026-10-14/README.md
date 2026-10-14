# Website + GPT Image intake — 2026-10-14

This directory is the source-backed intake dataset. Following the owner’s explicit authorization to bypass CMS, its verified graph is consumed by the `git-beta` frontend adapter. It is not a CMS public snapshot or generated mirror. The original manifest fields describe CMS intake state; actual Git beta publication is recorded separately in `frontend-build.json` and the release receipt.

- 59 reviewed website projects (not 5,225 noisy search-result cards).
- 541 upstream gallery records; 13 original categories mapped to use-case nodes.
- 20 identical source/prompt records deduplicated; all their media edges retained.
- 35 additional prompts share a source post with another distinct prompt; retained with conflict flags.
- 58 website projects do not have a supplied prompt and remain website-case intake nodes.
- 522 unique `create_prompt` proposals: 1 website prompt recovered by exact source/author match from the supplied explicit-prompts archive, and 521 image prompts.
- Every proposal passes the **actual** `normalizePromptProposal` contract; no taxonomy/media/rights fields are smuggled into that API.
- Original profile-only source links remain URL evidence; they are not assigned fabricated X status ids.
- All 541 original image paths exist at upstream commit `5cb9109ca2d29476f8e34dbc0cdb43607bdd3f77`; URLs are pinned to that commit. Binary image replication has not been performed.

The original website `prompt` column contains status markers, not executable instructions. All such markers remain case-only; one actual prompt was recovered from the supplied archive and retains its evidence reference and original file hash. Non-X attribution labels are preserved as source evidence without fabricating X profiles. All input files, including media and supplemental prompt evidence, have recorded SHA-256 values.

`graph.json` contains source-backed nodes and edges, `proposals.json` is the draft-only CMS request queue, `reviews.json` reconciles all 600 inputs, and `manifest.json` records counts/input hashes. `UPSTREAM-LICENSE.txt` preserves the upstream MIT notice; it does not establish independent rights to every third-party X image.

Regenerate using Node 24:

```sh
node scripts/import-cases.mjs \
  /Users/ziye/Developer/ancher-x-3d-websites/prototype/tool/display-cases.json \
  /tmp/ancher-image-cases.json docs/intake/2026-10-14 \
  5cb9109ca2d29476f8e34dbc0cdb43607bdd3f77 2026-10-14T04:00:00.000Z \
  /Users/ziye/Developer/ancher-x-3d-websites/docs/pseo/3d-websites/media-manifest.json \
  docs/intake/2026-10-14/website-prompt-evidence.json
```

Retrieve `/tmp/ancher-image-cases.json` from the pinned repository's `data/cases.json`. Verify its SHA-256 against the manifest before regenerating. The optional last input retains source media kinds: a video frame is not mislabeled as an original image.

Submission uses the existing host adapter (`tools/content-agent/src/cms-proposal-cli.ts`) with `PSEO_CMS_BASE_URL`, `PSEO_CMS_API_KEY`, and the existing Access identity if required. Never put credentials in these artifacts. Submission creates drafts only. The current deployed contract cannot apply taxonomy/media relations; `graph.json` is a proposal for editorial reconciliation, not evidence those relations are already in CMS. Website cases without prompts require a separately approved case object contract before canonical publication.

Human editorial/rights review, CMS public snapshot, mirror synchronization and a matching frontend deployment are separate gates; inspect `release.md` for actual results.
