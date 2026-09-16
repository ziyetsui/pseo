import io
import json
from pathlib import Path
import tempfile
import unittest
import zipfile
from build import HERE, SOURCE, archive, collect


class DistributionTests(unittest.TestCase):
    def test_complete_catalog_and_reproducible_archive(self):
        catalog = json.loads((HERE / 'catalog.json').read_text())
        files = collect(catalog)
        self.assertEqual(len(catalog['skills']), 25)
        self.assertEqual(set(s['id'] for s in catalog['skills']),
                         {p.parent.name for p in SOURCE.glob('pseo*/SKILL.md')})
        zipped = archive(files)
        self.assertEqual(zipped, archive(dict(reversed(list(files.items())))))
        with zipfile.ZipFile(io.BytesIO(zipped)) as z:
            self.assertEqual(len([n for n in z.namelist() if n.endswith('/SKILL.md')]), 25)
            self.assertEqual(z.read('pseo-skills/pseo-wireframe/scripts/engine.cjs'),
                             files['pseo-wireframe/scripts/engine.cjs'])
        self.assertLess(len(zipped), 10 * 1024 * 1024)

    def test_reject_symlinks_and_unbundled_references(self):
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory)
            skill = source / 'pseo'
            skill.mkdir()
            md = skill / 'SKILL.md'
            header = '---\nname: pseo\ndescription: Example\n---\n'
            md.write_text(header)
            catalog = {'skills': [{'id': 'pseo'}]}
            collect(catalog, source)
            (skill / 'escape.md').symlink_to(md)
            with self.assertRaisesRegex(ValueError, 'Symlink'):
                collect(catalog, source)
            (skill / 'escape.md').unlink()
            md.write_text(header + '[Missing](../missing/SKILL.md)')
            with self.assertRaisesRegex(ValueError, 'Unbundled reference'):
                collect(catalog, source)
            md.write_text(header + '/Users/example/private-file')
            with self.assertRaisesRegex(ValueError, 'Private path'):
                collect(catalog, source)


if __name__ == '__main__':
    unittest.main()
