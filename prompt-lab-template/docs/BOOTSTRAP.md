# Bootstrap the public GitHub repository

This is a preparation checklist. Do not create or publish the real repository until the user authenticates with GitHub and confirms the owner, repository name, visibility, and licenses.

## 1. Confirm launch decisions

- GitHub owner or organization
- Repository name
- Public visibility
- Generator-code license
- Prompt-content and translation license
- Maintainer team and private conduct/security contact

Replace the license placeholder and policy contact placeholders before launch.

## 2. Create and seed the repository

After authentication and confirmation, create an empty repository, copy this template to its root, run `npm run verify`, commit, and push a bootstrap branch. Open a pull request rather than pushing the seed directly to the protected default branch.

No CMS database export or preview token belongs in this repository. Only reviewed Markdown produced by the publication workflow belongs under `content/**`.

## 3. Configure branch protection

Protect the default branch with:

- pull requests required before merging;
- at least one approving review and dismissal of stale approvals;
- required status check `validate / content`;
- conversations resolved before merging;
- force pushes and branch deletion disabled;
- administrator bypass restricted and audited;
- CODEOWNERS review required for `content/**`, generator code, and workflows.

## 4. Connect the CMS publisher

Use a GitHub App installed only on the confirmed repository. Grant the minimum permissions needed to create a branch, write content, and open a pull request. Do not grant administration permission.

Keep publisher credentials in the private CMS/deployment environment, never in this public repository. The publisher integration will typically need an App ID, installation ID, private key, and the confirmed `owner/repository` target; use the exact environment-variable names defined by the publisher implementation.

The publisher must open a PR containing reviewed localized Markdown plus regenerated indexes. It must not merge, approve its own PR, read CMS drafts into a public build, or bypass required checks.

## 5. Prove the launch path

1. Submit a test contribution issue and confirm it creates no content commit.
2. Approve a harmless test Prompt in the CMS.
3. Confirm the publisher opens a branch and pull request.
4. Confirm CI rejects stale generated output.
5. Review and merge manually.
6. Confirm `catalog.json`, locale indexes, taxonomy counts, attribution, and content revision match the merged Markdown.
7. Rotate any credential used during setup if it was exposed outside the intended secret store.
