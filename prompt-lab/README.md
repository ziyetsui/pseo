<!-- LEGACY TEMPLATE FIXTURE. Run npm run generate:legacy; do not edit directly. -->

# Public Prompt Lab

A public, multilingual mirror of content approved in Payload CMS. CMS records and their versioned editorial and rights decisions are the content source of truth; files on GitHub are generated views and manual content edits are overwritten by the next complete mirror run.

Content revision: `sha256:4f4d8ffbdb94c1cdd58f0288e26df6f44963f4857f33c2b39ed6157a5b52fa06`

## Language editions

| Locale | Approved prompts |
| --- | ---: |
| [en](locales/en/README.md) | 1 |
| [zh-CN](locales/zh-CN/README.md) | 1 |

Machine-readable consumers can use [catalog.json](catalog.json). See the [content contract](docs/CONTENT-CONTRACT.md) for the CMS snapshot and mirror gates.

## Contribute

Use the Issue Forms for an original or authorized Prompt, a community nomination, a correction, a translation, or a takedown request. A maintainer's `approved` label authorizes intake of that exact Issue revision into CMS; content contributors do not edit generated Markdown through pull requests. See [CONTRIBUTING.md](CONTRIBUTING.md).

The v1 Prompt-only mirror consumer is implemented locally, but this template does not deploy the CMS immutable snapshot producer, production migration, credentials, release receipt, or takedown edge automation by itself. Complete the [bootstrap checklist](docs/BOOTSTRAP.md), [security setup](SECURITY.md), and [license decision](LICENSE-DECISION.md) before enabling the scheduled writer.
