#!/usr/bin/env python3
"""Publish only the allowlisted PSEO skill sources as reproducible static assets."""
from pathlib import Path
import argparse
import hashlib
import io
import json
import re
import zipfile

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
SOURCE = ROOT / '.agents/skills'
PUBLIC = ROOT / 'frontend/public/skills'
DATA = ROOT / 'frontend/src/lib/skills/catalog.generated.json'
ORIGIN = 'https://beta.ancher.site'
CLI = 'npx --yes skills@1.5.26 add'


def collect(catalog, source=SOURCE):
    names = [s['id'] for s in catalog['skills']]
    if len(names) != len(set(names)) or not all(re.fullmatch(r'pseo(?:-[a-z-]+)?', n) for n in names):
        raise ValueError('Invalid or duplicate allowlisted skill name')
    files = {}
    for name in names:
        base = source / name
        if base.is_symlink():
            raise ValueError(f'Symlink skill: {name}')
        for path in sorted(base.rglob('*')):
            if path.is_symlink():
                raise ValueError(f'Symlink resource: {path.name}')
            if not path.is_file():
                continue
            if path.suffix not in {'.md', '.json', '.js', '.cjs'}:
                raise ValueError(f'Unexpected resource: {path.name}')
            content = path.read_bytes()
            text = content.decode('utf-8')
            if re.search(r'/Users/|/private/var/|(?:sk|ghp|github_pat)-[A-Za-z0-9]{20,}|Bearer\s+[A-Za-z0-9._-]{15,}', text):
                raise ValueError(f'Private path or credential in {path.name}')
            files[path.relative_to(source).as_posix()] = content
        body = files.get(f'{name}/SKILL.md', b'').decode('utf-8')
        if not re.match(r'^---\nname: ' + re.escape(name) + r'\ndescription: .+\n---\n', body):
            raise ValueError(f'Invalid skill header: {name}')
    for name, content in files.items():
        if name.endswith('.md'):
            for link in re.findall(r'\]\(([^)]+)\)', content.decode()):
                if '://' in link or link.startswith('#'):
                    continue
                target = (source / name).parent.joinpath(link.split('#')[0]).resolve()
                if not target.is_relative_to(source.resolve()) or target.relative_to(source.resolve()).as_posix() not in files:
                    raise ValueError(f'Unbundled reference: {name}: {link}')
    return files


def archive(files):
    stream = io.BytesIO()
    with zipfile.ZipFile(stream, 'w', compression=zipfile.ZIP_DEFLATED) as output:
        for name, body in sorted(files.items()):
            entry = zipfile.ZipInfo('pseo-skills/' + name, date_time=(2026, 1, 1, 0, 0, 0))
            entry.compress_type = zipfile.ZIP_DEFLATED
            entry.external_attr = 0o100644 << 16
            output.writestr(entry, body)
    return stream.getvalue()


def agent_prompt(command, skill='pseo'):
    return (f'Install the PSEO skills into this project for the coding agent you are using by running:\n\n{command}\n\n'
            f'Then locate and read the installed {skill}/SKILL.md and use it for my current website or project. '
            'Respect existing project rules and preserve existing files. If no project context is available, ask for my website URL or project and goal. '
            'The four pseo-content-create/edit/validate/pr skills are PromptLab-only adapters; on other projects use pseo-content-workflow. '
            'This toolkit does not grant publishing permissions. Node.js 22.20.0+ and npm are required; if missing, explain the required setup. '
            'Report the installation result before starting; never claim an installation succeeded without checking it.')


def build(check=False):
    catalog = json.loads((HERE / 'catalog.json').read_text())
    files = collect(catalog)
    payload = archive(files)
    digest = hashlib.sha256(payload).hexdigest()
    filename = f'pseo-skills-{digest[:16]}.zip'
    archive_url = f'/skills/{filename}'
    command = f"{CLI} {ORIGIN}{archive_url} --skill '*' --yes"
    skills = []
    for item in catalog['skills']:
        name = item['id']
        # Per-skill installs include the toolkit so entry points and sibling references remain usable.
        skills.append(dict(item, markdown=files[f'{name}/SKILL.md'].decode(),
                           installCommand=command, agentPrompt=agent_prompt(command, name),
                           sourceUrl=f'/skills/source/{name}/SKILL.md'))
    data = dict(phases=catalog['phases'], skills=skills, installCommand=command,
                agentPrompt=agent_prompt(command), archiveUrl=archive_url, sha256=digest)
    outputs = {f'source/{name}': body for name, body in files.items()}
    outputs[filename] = payload
    manifest = {'schemaVersion': 1, 'skillCount': len(skills), 'archive': filename, 'sha256': digest,
                'files': {name: hashlib.sha256(body).hexdigest() for name, body in sorted(files.items())}}
    outputs['manifest.json'] = (json.dumps(manifest, indent=2, sort_keys=True) + '\n').encode()
    generated_data = (json.dumps(data, ensure_ascii=False, indent=2) + '\n').encode()
    expected_sources = {name for name in outputs if name.startswith('source/')}
    actual_sources = {p.relative_to(PUBLIC).as_posix() for p in (PUBLIC / 'source').rglob('*') if p.is_file()}
    extra = actual_sources - expected_sources
    if extra:
        raise ValueError(f'Unexpected public skill assets; review before removal: {sorted(extra)}')
    if check:
        for name, body in outputs.items():
            path = PUBLIC / name
            if not path.is_file() or path.read_bytes() != body:
                raise ValueError(f'Stale generated output: {path.relative_to(ROOT)}')
        if not DATA.is_file() or DATA.read_bytes() != generated_data:
            raise ValueError('Stale generated skill catalog')
    else:
        for name, body in outputs.items():
            path = PUBLIC / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(body)
        DATA.parent.mkdir(parents=True, exist_ok=True)
        DATA.write_bytes(generated_data)
    print(json.dumps({'skills': len(skills), 'resources': len(files), 'archive': archive_url,
                      'bytes': len(payload), 'sha256': digest}))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='Fail on stale outputs without writing files')
    build(check=parser.parse_args().check)
