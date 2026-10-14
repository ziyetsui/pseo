# Website graph views

User correction: Website maps to distinct views, rather than one flat collection. Continue the authorized Git-beta workflow for this batch.

Follow specs/0003-peso-first-principle-v2.md: Information → Entity / Relation → Graph → Intent/View → Surface. Projects remain stable objects; used_for, designed_for and built_with remain semantic edges. Views are graph queries, not artificial content nodes. Preserve source, creator, demo/code evidence and original IDs.

The Website root becomes a server-rendered directory with purpose, model and technology sections. Each nonempty target gets one independent URL: /zh-CN/prompts/website/views/{use-case|model|tool}/{slug}. /website/views/all retains the complete collection. No Cartesian-product routes, invented classifications or empty views.

Catalog adds a typed WebsiteGraph of Website objects, referenced taxonomy/model/tool nodes and semantic edges. The 59 imported cases traverse the validated intake graph; the existing Website prompt contributes its existing relationships. Labels/slugs come from graph data. Counts use unique object IDs; shared projects may appear in several views.

Directory cards show real previews, exact counts and view links. Scoped galleries reuse existing filters, which cannot escape the view subset. Case details link to their graph-derived views. All-cases preserves unclassified objects. Existing detail URLs and CMS/public-api contracts stay stable.

All views export static HTML with accurate metadata and noindex. Revision policy advances to v2. The receipt records rendered view URLs, axes, targets and counts; static validation independently checks membership against graph edges. No new dependencies.

Use the existing isolated worktree to preserve the parallel Chinese prototype. Update PRD/Tech Arch, implement and verify, then PR/CI/merge and deploy exact source to existing main and frontend-design beta slots. The user already requested continuous completion and direct push; do not repeat permission gates.
