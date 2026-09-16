# 0014 · Public PSEO Skills

Date: 2026-09-16
Status: implementation authorized by owner

## Product contract

Add a Skills tab to the existing Prompt Library navigation, opening `/{locale}/skills`. Use the complete main content of `pseo-agents/specs/images/proto-skills-pseo-linear-dark.html` as the visual and catalog reference. Omit its separate p / Flow / Skills / Records / GitHub / Account masthead, per the owner's explicit correction. Keep the site's shared navigation.

Every listed skill must have a working `/{locale}/skills/{slug}` detail page with its actual instructions and installation entry. Preserve the reference's English UI under an explicit English language scope in both supported locale routes. No placeholder links, fabricated availability, or private filesystem dependencies.

The primary copy action supplies instructions that a visitor can paste into a Coding Agent. They must identify a publicly accessible, versioned skill source, install the whole workflow (including entry-point dependencies), and start the PSEO entry point in the visitor's current project. A terminal command is also available. Single-skill instructions must explain/install dependencies where applicable. Clipboard failure is reported honestly; instructions remain selectable without JavaScript.

## Engineering boundary

Skills are versioned engineering tools sourced from the allowlisted `.agents/skills/pseo*` directories, not CMS Prompt/Article records. Generate catalog details and downloadable assets deterministically from these sources. Do not package unrelated skills, private files, credentials, vendor working trees, or local environment data. Keep existing CMS data and immutable content revision unchanged.

Extend the existing static Next.js export with real server-rendered index/detail routes; new tool pages remain noindex and outside the CMS sitemap until independently qualified. The reference prototype is a design source, not an iframe or executable production payload.

## Delivery and verification

The owner explicitly authorized comparison with GitHub, pushing additions, and deployment to `beta.ancher.site`. Use a scoped engineering branch and PR; do not force push or change protection rules. Record source commit, public installation validation, deployed URL/id, and smoke results separately from CMS release state. Preserve unrelated local modifications.

Verify catalog completeness, install into a clean temporary project, full detail text, clipboard success/failure, public downloads, navigation, both locales, narrow layouts, no-JS content, keyboard accessibility, and static link integrity. Run the frontend and compiler required gates. The existing Beta is a visual-fixture Preview (verified live revision `sha256:73d488642d1168a16137b8ec48eb567e032d2393df24c343b26720d99d993948`); retain this exact content revision and noindex protection for this authorized Beta update. Do not relabel it as a CMS public catalog or production release.
