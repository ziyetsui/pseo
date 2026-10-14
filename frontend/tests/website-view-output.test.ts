import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';
it('checks exported view scopes and rejects corrupt graph memberships and missing output', () => {
  const result = execFileSync(process.execPath, ['--test', fileURLToPath(new URL('../scripts/tests/website-views.test.mjs', import.meta.url))], { encoding:'utf8' });
  expect(result).toContain('fail 0');
});
