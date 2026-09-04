# Final masters — one file per level

Byte-identical copies of the prototypes the user actually selected, gathered
here so the set can be opened without knowing which of the 25 files in
`docs/wireframes/` and which file in `specs/images/` is the live one.

**These are copies, not the source of truth.** `frontend/AGENTS.md` §7 and the
specs still name the originals, and two of them are read by code:
`frontend/scripts/extract-magnetic.mjs` reads `proto-continuous-peek.html` by
explicit path, and `infra/tests/content-pipeline.test.mjs` references
`flow-proto.html`. Nothing was moved or renamed at the source. If a master
changes, re-copy it here — the hashes below are how you find out that it did.

Every one of these files carries its own prototype picker. **The picker is
harness, not product**: §7 is explicit that leftover candidates, sample
selectors and test navigation are not product UI. The query string or hash in
the URL column is what selects the decided variant.

| Level | Open this | Selects | Copied from | SHA-256 |
| --- | --- | --- | --- | --- |
| **L1** Hub | `L1-hub-magnetic.html?v=2` | Magnetic · `variants[1]/vMagnet` | `docs/wireframes/proto-continuous-peek.html` | `6df0025c968a49aea5cd63ba74a15a86aaa0e6f8a657b6de899cb372b49f88a6` |
| **L2** Images deck | `L2-L4-deck-anthology-recipe.html#/l2` | Deck · `variants[2]/v4` | `specs/images/flow-proto-full.html` | `7bc354e93c6399533b48a1bf6681d92a0e895f4b40af486c9b45029292e4256c` |
| **L2** Videos deck | `L2-L4-deck-anthology-recipe.html#/l2v` | Deck · `variants[2]/v4` | (same file) | (same) |
| **L3** Model anthology | `L2-L4-deck-anthology-recipe.html#/l3` | Anthology · `variants[2]/v4` | (same file) | (same) |
| **L3** Task findings | `L3-task-findings.html?v=4` | Findings · `variants[3]/vfd` | `docs/wireframes/proto-l3-task.html` | `257f35cb61ad7a421219fccc289d2b13f476e5c182ff6907e6feb8b72c747dd8` |
| **L3** Style plate | `L3-style-plate.html?v=3` | Plate · `variants[2]/vpl` | `docs/wireframes/proto-l1-editorial.html` | `9dd72a802aa8750d6656b7ac90e3e4f318183e998870c138d0273aece6b94c4a` |
| **L4** Recipe | `L2-L4-deck-anthology-recipe.html#/l4` | Recipe · `variants[1]/v3` | (same file) | (same) |
| — Sign-in gate | `sign-in-gate-weight.html?v=3` | Weight | `docs/wireframes/proto-login-cta.html` | `bccd3ebe83277770b72d4dec415aec4c91b371ff3e91a6e2c95ddf4fb51502e2` |

Two of the source filenames say the wrong thing and are kept as they are
because §7 names them: `proto-l1-editorial.html` is the **L3** style master,
not an L1 one, and `proto-login-cta.html` holds the third round of the gate
exploration, not the login page. The names in this folder say what each one
actually is.

## Verifying nothing has drifted

```bash
cd /Users/ziye/Desktop/pseo
shasum -a 256 \
  docs/wireframes/proto-continuous-peek.html \
  specs/images/flow-proto-full.html \
  docs/wireframes/proto-l3-task.html \
  docs/wireframes/proto-l1-editorial.html \
  docs/wireframes/proto-login-cta.html
```

The first, third and fourth are also recorded independently in
`frontend/evidence/magnetic-reference.json`,
`frontend/evidence/task-findings/review.md` and
`frontend/evidence/style-plate/review.md`. All three matched on
2026-09-04 when this folder was made. `flow-proto-full.html` has no recorded
hash anywhere else; the one above is the first.

## Serving them

`.claude/launch.json`'s `wireframes` config serves `docs/wireframes` on port
8899, so once it is running:

```
http://localhost:8899/final/index.html
```

Its root is `docs/wireframes`, which is why `flow-proto-full.html` — living in
`specs/images/` — was previously unreachable over HTTP. The copy in this
folder is what fixes that. Note the server has no directory listing:
`/final/` returns 404, `/final/index.html` does not.

## What is deliberately not here

- The three in-app pickers at `/proto/model-hero`, `/proto/hub-credit` and
  `/proto/model-credit` on the dev server. Those are live explorations with no
  decision recorded against them, and another session is writing them.
- The 20 other files in `docs/wireframes/`. They are rejected rounds and
  historical references; `specs/0009-pseo-tech-arch.md` §58 says as much.
