# Public PSEO skill distribution

`python3 tools/pseo-site/build.py` generates the site catalog and a deterministic, content-addressed ZIP from the 25 explicitly allowlisted skills in `catalog.json`. The catalog wording follows the user-selected Linear dark prototype. Source is `.agents/skills/<id>/`; raw Markdown and all linked resources are preserved without translating them.

Outputs:

- `frontend/src/lib/skills/catalog.generated.json`: display metadata, complete source, copy commands and agent instructions.
- `frontend/public/skills/source/`: skill sources and runtime/reference resources.
- `frontend/public/skills/pseo-skills-<sha256-prefix>.zip`: complete distributable toolkit.
- `frontend/public/skills/manifest.json`: full archive SHA-256 and individual source hashes.

The install command pins `skills@1.5.26` and uses its supported direct archive URL mode, without requiring GitHub access or a local path. `--skill '*'` selects the entire allowlisted bundle, preserving sibling dependencies. It installs into the current project and detects supported agents. Individual detail pages install the same complete toolkit and provide a separate agent instruction that activates the selected skill. Node.js 22.20.0+, npm and internet access are prerequisites. The four `pseo-content-create/edit/validate/pr` adapters apply only to PromptLab; they do not install its CMS infrastructure. Design craft skills are optional enhancements, with the prototype-polish checklist usable independently.

Official CLI reference: <https://github.com/vercel-labs/skills#install-a-skill>.

Verification:

```sh
python3 tools/pseo-site/build.py --check
python3 -m unittest discover -s tools/pseo-site -p 'test_*.py'
```

Test the actual CLI against a locally served ZIP in a temporary project before deployment, then repeat against the public URL after deployment. Validate all installed files against `manifest.json` and run the installed wireframe generator on its bundled example. A successful build alone does not prove the public download is accessible.

This is engineering/tool distribution, separate from CMS canonical content and its publication approvals. No third-party design skill sources or credentials are bundled. Historical content-addressed archives may remain so previously copied commands keep working; do not delete them as routine build cleanup.
